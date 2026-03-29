// portfolioExport.js — Month 18: Portfolio Export Engine (CSV + JSON)
// Generates CSV data for portfolio reports without external PDF libs

/**
 * Generate CSV for the full portfolio report
 */
function generatePortfolioCSV(data, portfolioName = 'My Portfolio') {
  const rows = [];
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // ── Header block ─────────────────────────────────────────────────────────
  rows.push(['StockVision — Portfolio Analysis Report']);
  rows.push([`Portfolio: ${portfolioName}`]);
  rows.push([`Generated: ${now} IST`]);
  rows.push([`Capital: ₹${Number(data.meta?.totalCapital || 0).toLocaleString('en-IN')}`]);
  rows.push([`Historical Range: ${data.meta?.range || '3y'}`]);
  rows.push([]);

  // ── Growth Pattern ────────────────────────────────────────────────────────
  if (data.growthPattern) {
    rows.push(['PORTFOLIO CLASSIFICATION']);
    rows.push(['Pattern', data.growthPattern.label]);
    rows.push(['Best Strategy', data.bestStrategy?.name]);
    rows.push(['Reason', data.bestStrategy?.reason]);
    rows.push([]);
  }

  // ── Strategy Summary ──────────────────────────────────────────────────────
  if (data.strategies?.length) {
    rows.push(['STRATEGY COMPARISON']);
    rows.push(['Strategy', 'CAGR %', 'Sharpe Ratio', 'Max Drawdown %', 'Ann. Volatility %', 'Total Return %']);
    data.strategies.forEach(s => {
      const isBest = s.name === data.bestStrategy?.name;
      rows.push([
        isBest ? `★ ${s.name}` : s.name,
        Number(s.metrics.cagr).toFixed(2),
        Number(s.metrics.sharpe).toFixed(2),
        Number(s.metrics.maxDrawdown).toFixed(2),
        Number(s.metrics.annualVol).toFixed(2),
        Number(s.metrics.totalReturn).toFixed(2),
      ]);
    });
    rows.push([]);
  }

  // ── Individual Stock Analysis ─────────────────────────────────────────────
  if (data.stockAnalysis?.length) {
    rows.push(['INDIVIDUAL STOCK ANALYSIS']);
    rows.push(['Symbol', 'Current Price (₹)', 'CAGR %', 'Ann. Return %', 'Ann. Volatility %', 'Sharpe Ratio', 'Max Drawdown %']);
    data.stockAnalysis.forEach(s => {
      rows.push([
        s.symbol,
        Number(s.currentPrice).toFixed(2),
        Number(s.cagr).toFixed(2),
        Number(s.annualReturn).toFixed(2),
        Number(s.annualVol).toFixed(2),
        Number(s.sharpeRatio).toFixed(2),
        Number(s.maxDrawdown).toFixed(2),
      ]);
    });
    rows.push([]);
  }

  // ── Allocation Table (Best Strategy) ──────────────────────────────────────
  const bestKey = data.bestStrategy?.name === 'Equal Weight' ? 'equalWeight'
    : data.bestStrategy?.name === 'Risk-Parity' ? 'riskParity'
    : data.bestStrategy?.name === 'Min Volatility' ? 'minVolatility'
    : 'equalWeight';

  const allocRows = data.allocations?.[bestKey] || [];
  if (allocRows.length) {
    rows.push([`EXACT ALLOCATION — ${data.bestStrategy?.name || 'Best Strategy'}`]);
    rows.push(['Symbol', 'Weight %', 'Target Amount (₹)', 'Shares to Buy', 'Actual Amount (₹)', 'Price per Share (₹)']);
    allocRows.forEach(r => {
      rows.push([
        r.symbol,
        Number(r.weight).toFixed(2),
        Number(r.targetAmount).toFixed(0),
        r.shares,
        Number(r.actualAmount).toFixed(0),
        Number(r.pricePerShare).toFixed(2),
      ]);
    });
    const totalDeployed = allocRows.reduce((s, r) => s + r.actualAmount, 0);
    rows.push(['TOTAL', '', '', allocRows.reduce((s, r) => s + r.shares, 0), Number(totalDeployed).toFixed(0), '']);
    rows.push([]);
  }

  // ── Diversification ───────────────────────────────────────────────────────
  if (data.diversification) {
    rows.push(['DIVERSIFICATION ANALYSIS']);
    rows.push(['Score', data.diversification.score + '/100']);
    rows.push(['Label', data.diversification.label]);
    rows.push(['Avg Correlation', data.diversification.avgCorrelation + '%']);
    rows.push(['Effective Stocks', data.diversification.effectiveStocks]);
    if (data.diversification.warning) rows.push(['Warning', data.diversification.warning]);
    rows.push([]);
  }

  // ── Year-by-Year ──────────────────────────────────────────────────────────
  if (data.yearlyPerformance?.length) {
    rows.push(['YEAR-BY-YEAR RETURNS (Equal Weight Portfolio)']);
    rows.push(['Year', 'Return %']);
    data.yearlyPerformance.forEach(y => {
      rows.push([y.year, Number(y.return).toFixed(2)]);
    });
    rows.push([]);
  }

  // ── Correlation Matrix ────────────────────────────────────────────────────
  if (data.correlationMatrix && data.meta?.symbols) {
    const syms = data.meta.symbols.map(s => s.replace('.NS', '').replace('.BO', ''));
    rows.push(['CORRELATION MATRIX']);
    rows.push(['', ...syms]);
    data.correlationMatrix.forEach((row, i) => {
      rows.push([syms[i], ...row.map(v => Number(v).toFixed(2))]);
    });
    rows.push([]);
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  rows.push(['DISCLAIMER']);
  rows.push(['Historical performance is not a guarantee of future returns.']);
  rows.push(['Data sourced from Yahoo Finance. Not SEBI registered. Not financial advice.']);
  rows.push(['Generated by StockVision — stockvision.in']);

  // Convert to CSV string
  return rows.map(row =>
    row.map(cell => {
      const str = String(cell ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  ).join('\n');
}

/**
 * Generate a short share ID (8 chars, alphanumeric)
 */
function generateShareId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Build a human-readable text summary for WhatsApp/Telegram sharing
 */
function buildShareSummary(data, portfolioName = 'My Portfolio', shareUrl = '') {
  const meta = data.meta || {};
  const best = data.bestStrategy || {};
  const div  = data.diversification || {};
  const pattern = data.growthPattern || {};
  const bestStrat = data.strategies?.find(s => s.name === best.name) || data.strategies?.[0];
  const m = bestStrat?.metrics || {};

  const fmtP = (n) => (n >= 0 ? '+' : '') + Number(n).toFixed(1) + '%';
  const fmtC = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const symbols = (meta.symbols || []).map(s => s.replace('.NS', '').replace('.BO', '')).join(', ');

  let txt = `📊 *${portfolioName}* — StockVision Analysis\n\n`;
  txt += `💼 *Stocks:* ${symbols}\n`;
  txt += `💰 *Capital:* ${fmtC(meta.totalCapital || 0)}\n`;
  txt += `📅 *Period:* ${meta.range || '3y'}\n\n`;
  txt += `${pattern.emoji || '📈'} *Pattern:* ${pattern.label || 'Growth'} Portfolio\n`;
  txt += `⭐ *Best Strategy:* ${best.name || 'Equal Weight'}\n\n`;
  txt += `📈 *CAGR:* ${fmtP(m.cagr || 0)}\n`;
  txt += `📉 *Max Drawdown:* -${Number(m.maxDrawdown || 0).toFixed(1)}%\n`;
  txt += `⚡ *Sharpe Ratio:* ${Number(m.sharpe || 0).toFixed(2)}\n`;
  txt += `🧩 *Diversification:* ${div.score || 0}/100 (${div.label || 'N/A'})\n\n`;

  if (shareUrl) {
    txt += `🔗 *Full Analysis:* ${shareUrl}\n\n`;
  }

  txt += `_StockVision · Not financial advice · Data: Yahoo Finance_`;
  return txt;
}

module.exports = { generatePortfolioCSV, generateShareId, buildShareSummary };
