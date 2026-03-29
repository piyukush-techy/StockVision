const express = require('express');
const router  = express.Router();
const Financials = require('../models/Financials');
const { fetchAllFinancials } = require('../utils/financialsFetcher');

// ── Helper: ensure financials are cached ────────────────────────────────────
async function ensureFinancials(symbol) {
  let fin = await Financials.findOne({ symbol });
  if (!fin || new Date() > fin.expiresAt) {
    const data = await fetchAllFinancials(symbol);
    if (!data.keyStats) throw new Error(`No data for ${symbol}`);
    fin = await Financials.findOneAndUpdate(
      { symbol },
      { symbol, keyStats: data.keyStats, income: data.income, balanceSheet: data.balanceSheet, cashFlow: data.cashFlow, lastFetched: new Date(), expiresAt: new Date(Date.now() + 24*60*60*1000) },
      { upsert: true, new: true }
    );
  }
  return fin;
}

// ── Altman Z-Score (modified for non-manufacturers) ────────────────────────
function calcZScore(bs, is, mktCap) {
  try {
    const latest = bs.annual?.[0] || {};
    const income = is.annual?.[0] || {};

    const totalAssets = latest.totalAssets || 0;
    const currentAssets = latest.totalCurrentAssets || 0;
    const currentLiab   = latest.totalCurrentLiabilities || 0;
    const retainedEarnings = latest.retainedEarnings || 0;
    const totalLiabilities = latest.totalLiabilities || latest.totalLiab || 0;
    const ebit   = income.ebit || income.operatingIncome || 0;
    const revenue = income.totalRevenue || income.revenue || 0;

    if (totalAssets === 0) return null;

    const workingCapital = currentAssets - currentLiab;
    const X1 = workingCapital / totalAssets;
    const X2 = retainedEarnings / totalAssets;
    const X3 = ebit / totalAssets;
    const X4 = (mktCap || 0) / Math.max(totalLiabilities, 1);
    const X5 = revenue / totalAssets;

    // Modified Z-Score (works for service companies too)
    const z = 6.56*X1 + 3.26*X2 + 6.72*X3 + 1.05*X4;

    let zone, color, description;
    if (z > 2.6) {
      zone = 'Safe Zone'; color = 'green';
      description = 'Financially healthy — low bankruptcy risk';
    } else if (z > 1.1) {
      zone = 'Grey Zone'; color = 'amber';
      description = 'Some financial stress — monitor closely';
    } else {
      zone = 'Distress Zone'; color = 'red';
      description = 'High bankruptcy risk — caution advised';
    }

    return {
      score: parseFloat(z.toFixed(2)),
      zone, color, description,
      components: {
        X1: parseFloat(X1.toFixed(3)),
        X2: parseFloat(X2.toFixed(3)),
        X3: parseFloat(X3.toFixed(3)),
        X4: parseFloat(X4.toFixed(3)),
      }
    };
  } catch { return null; }
}

// ── Earnings Quality Score ──────────────────────────────────────────────────
function calcEarningsQuality(is, cf) {
  try {
    const income = is.annual?.[0] || {};
    const cashflow = cf.annual?.[0] || {};
    const prevIncome = is.annual?.[1] || {};

    const netIncome = income.netIncome || 0;
    const cfo = cashflow.totalCashFromOperatingActivities || cashflow.operatingCashflow || 0;
    const totalAssets = income.totalAssets || 1;
    const revenue = income.totalRevenue || income.revenue || 0;
    const prevRevenue = prevIncome.totalRevenue || prevIncome.revenue || 0;
    const receivables = income.netReceivables || 0;
    const prevReceivables = prevIncome.netReceivables || 0;

    if (netIncome === 0 && cfo === 0) return null;

    // 1. Cash conversion: is profit backed by real cash?
    const cashConversion = netIncome !== 0 ? Math.min(cfo / Math.abs(netIncome), 2) : 0;

    // 2. Accrual ratio: lower = better quality (less accrual manipulation)
    const accrualRatio = totalAssets !== 0 ? (netIncome - cfo) / totalAssets : 0;

    // 3. Receivables growth vs revenue growth (red flag if receivables grow faster)
    const revGrowth = prevRevenue !== 0 ? (revenue - prevRevenue) / prevRevenue : 0;
    const recGrowth = prevReceivables !== 0 ? (receivables - prevReceivables) / prevReceivables : 0;
    const recFlag = recGrowth > revGrowth + 0.1; // receivables growing 10% faster than revenue

    // Score 1–10
    let score = 5;
    if (cashConversion > 1.2) score += 2;
    else if (cashConversion > 0.8) score += 1;
    else if (cashConversion < 0.5) score -= 2;
    else if (cashConversion < 0.8) score -= 1;

    if (Math.abs(accrualRatio) < 0.03) score += 1;
    else if (Math.abs(accrualRatio) > 0.08) score -= 1;

    if (recFlag) score -= 1;
    if (cfo > 0 && netIncome > 0) score += 1;

    score = Math.min(10, Math.max(1, score));

    let grade, color, summary;
    if (score >= 8) { grade = 'Excellent'; color = 'green'; summary = 'Profits backed by strong cash flows'; }
    else if (score >= 6) { grade = 'Good'; color = 'green'; summary = 'Generally reliable earnings quality'; }
    else if (score >= 4) { grade = 'Average'; color = 'amber'; summary = 'Some gap between profit and cash flow'; }
    else { grade = 'Poor'; color = 'red'; summary = 'Significant accruals — scrutinise carefully'; }

    return {
      score, grade, color, summary,
      cashConversion: parseFloat(cashConversion.toFixed(2)),
      accrualRatio: parseFloat((accrualRatio * 100).toFixed(2)),
      receivablesFlag: recFlag,
      cashProfit: cfo,
      reportedProfit: netIncome,
    };
  } catch { return null; }
}

// ── GET /api/financials/:symbol ─────────────────────────────────────────────
router.get('/financials/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const fin = await ensureFinancials(symbol);
    res.json({ financials: fin });
  } catch (err) {
    console.error('Financials error:', err);
    res.status(500).json({ error: 'Failed to fetch financials' });
  }
});

// ── GET /api/financials/:symbol/ratios ──────────────────────────────────────
router.get('/financials/:symbol/ratios', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const fin = await ensureFinancials(symbol);
    res.json({ ratios: fin.keyStats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ratios' });
  }
});

// ── GET /api/financials/:symbol/deep-scores  (NEW Month 30) ─────────────────
// Returns Altman Z-Score + Earnings Quality Score
router.get('/financials/:symbol/deep-scores', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const fin = await ensureFinancials(symbol);

    const mktCap = fin.keyStats?.marketCap || null;
    const zScore = calcZScore(fin.balanceSheet, fin.income, mktCap);
    const eqScore = calcEarningsQuality(fin.income, fin.cashFlow);

    res.json({ symbol, zScore, earningsQuality: eqScore });
  } catch (err) {
    console.error('Deep scores error:', err);
    res.status(500).json({ error: 'Failed to compute deep scores' });
  }
});

// ── DELETE /api/financials/:symbol/cache ────────────────────────────────────
router.delete('/financials/:symbol/cache', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    await Financials.deleteOne({ symbol });
    res.json({ success: true, message: `Cache cleared for ${symbol}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

module.exports = router;
