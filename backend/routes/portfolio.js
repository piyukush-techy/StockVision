// portfolio.js — Phase 3 Month 13–18: Portfolio Optimizer + Scanner + Events + Regime + Scalability + Launch
const express = require('express');
const router  = express.Router();
const { analyzePortfolio }        = require('../utils/portfolioOptimizer');
const { scanPortfolio }           = require('../utils/portfolioScanner');
const { analyzeEventAttribution } = require('../utils/eventCorrelation');
const { matchPortfolioRegime }    = require('../utils/regimeMatcher');
const { analyzeScalability }      = require('../utils/portfolioStress');
const { generatePortfolioCSV, generateShareId, buildShareSummary } = require('../utils/portfolioExport');
const PortfolioReport             = require('../models/PortfolioReport');

/**
 * POST /api/portfolio/analyze
 * Full portfolio analysis — correlation, optimization, allocation
 * Body: { symbols: ['RELIANCE.NS','TCS.NS',...], totalCapital: 100000, range: '3y' }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { symbols, totalCapital, range } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0)
      return res.status(400).json({ error: 'symbols array is required' });
    if (symbols.length > 10)
      return res.status(400).json({ error: 'Maximum 10 stocks supported' });
    if (symbols.length < 2)
      return res.status(400).json({ error: 'At least 2 stocks required for portfolio analysis' });

    // Ensure .NS suffix
    const cleanSymbols = symbols.map(s => {
      const up = s.trim().toUpperCase();
      return up.endsWith('.NS') || up.endsWith('.BO') ? up : `${up}.NS`;
    });

    const result = await analyzePortfolio({
      symbols:      cleanSymbols,
      totalCapital: totalCapital || 100000,
      range:        range        || '3y'
    });

    res.json({ success: true, data: result });

  } catch (err) {
    console.error('Portfolio analyze error:', err.message);
    res.status(500).json({ error: 'Failed to analyze portfolio', detail: err.message });
  }
});

/**
 * POST /api/portfolio/quick-compare
 * Quick per-stock stats only (no full optimization) — used for fast preview
 */
router.post('/quick-compare', async (req, res) => {
  try {
    const { symbols, range } = req.body;
    if (!symbols || symbols.length < 1)
      return res.status(400).json({ error: 'symbols required' });

    const cleanSymbols = symbols.map(s => {
      const up = s.trim().toUpperCase();
      return up.endsWith('.NS') || up.endsWith('.BO') ? up : `${up}.NS`;
    });

    // Run full analysis but only return per-stock metrics
    const result = await analyzePortfolio({
      symbols: cleanSymbols,
      totalCapital: 100000,
      range: range || '1y'
    });

    res.json({
      success: true,
      data: {
        stocks:       result.stockAnalysis,
        currentPrices: result.currentPrices
      }
    });

  } catch (err) {
    console.error('Quick compare error:', err.message);
    res.status(500).json({ error: 'Failed to compare stocks', detail: err.message });
  }
});

/**
 * GET /api/portfolio/presets
 * Returns suggested portfolio presets for common strategies
 */
router.get('/presets', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        name:    'Nifty Giants',
        emoji:   '🏔️',
        symbols: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS'],
        desc:    'Top 5 Nifty 50 heavyweights — stability + growth'
      },
      {
        name:    'IT Powerhouse',
        emoji:   '💻',
        symbols: ['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS'],
        desc:    'Pure-play Indian IT sector basket'
      },
      {
        name:    'Banking Basket',
        emoji:   '🏦',
        symbols: ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS'],
        desc:    'Top Indian private + public sector banks'
      },
      {
        name:    'Consumer Champions',
        emoji:   '🛒',
        symbols: ['HINDUNILVR.NS', 'ITC.NS', 'NESTLEIND.NS', 'BRITANNIA.NS', 'DABUR.NS'],
        desc:    'FMCG leaders — defensive, consistent performers'
      },
      {
        name:    'Auto & Infra',
        emoji:   '🚗',
        symbols: ['MARUTI.NS', 'TATAMOTORS.NS', 'BAJAJ-AUTO.NS', 'HEROMOTOCO.NS', 'EICHERMOT.NS'],
        desc:    'Indian auto sector across segments'
      }
    ]
  });
});

// ─── Month 14: Portfolio Historical Scanner ───────────────────────────────────

/**
 * POST /api/portfolio/scan
 * Sliding window historical scanner
 * Body: {
 *   symbols: ['RELIANCE.NS', 'TCS.NS', ...],
 *   weights: [40, 30, 30],          ← percentages (will be normalized)
 *   totalCapital: 100000,
 *   targets: [10, 15, 20],
 *   holdingDaysList: [90, 180, 365],
 *   range: '5y'
 * }
 */
router.post('/scan', async (req, res) => {
  try {
    const { symbols, weights, totalCapital, targets, holdingDaysList, range } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length < 2)
      return res.status(400).json({ error: 'At least 2 symbols required' });
    if (symbols.length > 10)
      return res.status(400).json({ error: 'Maximum 10 stocks supported' });
    if (!weights || weights.length !== symbols.length)
      return res.status(400).json({ error: 'Weights array must match symbols length' });

    const cleanSymbols = symbols.map(s => {
      const up = s.trim().toUpperCase();
      return up.endsWith('.NS') || up.endsWith('.BO') ? up : `${up}.NS`;
    });

    const numWeights = weights.map(w => parseFloat(w));
    if (numWeights.some(w => isNaN(w) || w <= 0))
      return res.status(400).json({ error: 'All weights must be positive numbers' });

    const result = await scanPortfolio({
      symbols:         cleanSymbols,
      weights:         numWeights,
      totalCapital:    totalCapital    || 100000,
      targets:         targets         || [10, 15, 20],
      holdingDaysList: holdingDaysList || [90, 180, 365],
      range:           range           || '5y'
    });

    res.json({ success: true, data: result });

  } catch (err) {
    console.error('Portfolio scan error:', err.message);
    res.status(500).json({ error: 'Failed to scan portfolio', detail: err.message });
  }
});

/**
 * POST /api/portfolio/scan/timeline
 * Lighter: just portfolio value timeline + yearly breakdown (faster preview)
 */
router.post('/scan/timeline', async (req, res) => {
  try {
    const { symbols, weights, range } = req.body;

    if (!symbols || symbols.length < 2)
      return res.status(400).json({ error: 'At least 2 symbols required' });

    const cleanSymbols = symbols.map(s => {
      const up = s.trim().toUpperCase();
      return up.endsWith('.NS') || up.endsWith('.BO') ? up : `${up}.NS`;
    });

    const numWeights = (weights || symbols.map(() => 1)).map(w => parseFloat(w));

    const result = await scanPortfolio({
      symbols:         cleanSymbols,
      weights:         numWeights,
      totalCapital:    100000,
      targets:         [15],
      holdingDaysList: [365],
      range:           range || '3y'
    });

    res.json({
      success: true,
      data: {
        portfolioTimeline:       result.portfolioTimeline,
        yearlyBreakdown:         result.yearlyBreakdown,
        growthPattern:           result.growthPattern,
        diversificationTimeline: result.diversificationTimeline,
        summary:                 result.summary,
        meta:                    result.meta
      }
    });

  } catch (err) {
    console.error('Timeline error:', err.message);
    res.status(500).json({ error: 'Failed to generate timeline', detail: err.message });
  }
});

// ─── Month 15: Event Attribution Engine ─────────────────────────────────────

/**
 * POST /api/portfolio/event-attribution
 * Correlate portfolio performance with major market events
 * Body: {
 *   symbols: ['RELIANCE.NS', 'TCS.NS', ...],
 *   weights: [40, 30, 30],
 *   range: '5y'
 * }
 */
router.post('/event-attribution', async (req, res) => {
  try {
    const { symbols, weights, range } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length < 2)
      return res.status(400).json({ error: 'At least 2 symbols required' });
    if (symbols.length > 10)
      return res.status(400).json({ error: 'Maximum 10 stocks supported' });
    if (!weights || weights.length !== symbols.length)
      return res.status(400).json({ error: 'Weights array must match symbols length' });

    const cleanSymbols = symbols.map(s => {
      const up = s.trim().toUpperCase();
      return up.endsWith('.NS') || up.endsWith('.BO') ? up : `${up}.NS`;
    });

    const numWeights = weights.map(w => parseFloat(w));
    if (numWeights.some(w => isNaN(w) || w <= 0))
      return res.status(400).json({ error: 'All weights must be positive numbers' });

    const result = await analyzeEventAttribution({
      symbols:  cleanSymbols,
      weights:  numWeights,
      range:    range || '5y',
    });

    res.json({ success: true, data: result });

  } catch (err) {
    console.error('Event attribution error:', err.message);
    res.status(500).json({ error: 'Failed to run event attribution', detail: err.message });
  }
});

// ─── Month 16: Regime Matching ───────────────────────────────────────────────

/**
 * POST /api/portfolio/regime-match
 * Match current market regime against historical conditions
 * Body: { symbols: ['RELIANCE.NS', 'TCS.NS', ...], weights: [40, 30, 30] }
 */
router.post('/regime-match', async (req, res) => {
  try {
    const { symbols, weights } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length < 1)
      return res.status(400).json({ error: 'At least 1 symbol required' });
    if (symbols.length > 10)
      return res.status(400).json({ error: 'Maximum 10 stocks supported' });
    if (weights && weights.length !== symbols.length)
      return res.status(400).json({ error: 'Weights array must match symbols length' });

    const cleanSymbols = symbols.map(s => {
      const up = s.trim().toUpperCase();
      return up.endsWith('.NS') || up.endsWith('.BO') ? up : `${up}.NS`;
    });

    const numWeights = (weights || symbols.map(() => 1)).map(w => parseFloat(w));

    const result = await matchPortfolioRegime({
      symbols: cleanSymbols,
      weights: numWeights,
    });

    res.json({ success: true, data: result });

  } catch (err) {
    console.error('Regime match error:', err.message);
    res.status(500).json({ error: 'Failed to run regime match', detail: err.message });
  }
});

// ─── Month 17: Portfolio Scalability ─────────────────────────────────────────
router.post('/scalability', async (req, res) => {
  try {
    const { symbols, weights, totalCapital, range, whatIfScenarios } = req.body;
    if (!symbols || symbols.length < 2) return res.status(400).json({ error: 'At least 2 symbols required' });

    const clean = symbols.map(s => {
      const u = s.trim().toUpperCase();
      return u.endsWith('.NS') || u.endsWith('.BO') ? u : `${u}.NS`;
    });
    const numWeights = (weights || clean.map(() => 1)).map(Number);

    const result = await analyzeScalability({
      symbols: clean,
      weights: numWeights,
      totalCapital: Number(totalCapital) || 100000,
      range: range || '3y',
      whatIfScenarios,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Scalability error:', err.message);
    res.status(500).json({ error: 'Scalability analysis failed', detail: err.message });
  }
});

// ─── Month 18: Save Portfolio ─────────────────────────────────────────────────
/**
 * POST /api/portfolio/save
 * Save a portfolio snapshot so it can be loaded later & shared
 * Body: { sessionId, name, symbols, weights, totalCapital, range, resultSnapshot }
 */
router.post('/save', async (req, res) => {
  try {
    const { sessionId, name, symbols, weights, totalCapital, range, resultSnapshot } = req.body;
    if (!symbols || symbols.length < 2) return res.status(400).json({ error: 'At least 2 symbols required' });

    // Generate unique shareId
    let shareId;
    let attempts = 0;
    do {
      shareId = generateShareId();
      attempts++;
      if (attempts > 20) throw new Error('Could not generate unique ID');
    } while (await PortfolioReport.findOne({ shareId }));

    const report = await PortfolioReport.create({
      shareId,
      sessionId: sessionId || 'anonymous',
      name: (name || 'My Portfolio').slice(0, 80),
      symbols: symbols.slice(0, 10),
      weights: weights || symbols.map(() => 1),
      totalCapital: Number(totalCapital) || 100000,
      range: range || '3y',
      resultSnapshot: resultSnapshot || null,
    });

    res.json({ success: true, data: { shareId: report.shareId, name: report.name, id: report._id } });
  } catch (err) {
    console.error('Portfolio save error:', err.message);
    res.status(500).json({ error: 'Failed to save portfolio', detail: err.message });
  }
});

// ─── Month 18: Load portfolio by shareId ──────────────────────────────────────
/**
 * GET /api/portfolio/share/:shareId
 * Load a shared portfolio snapshot
 */
router.get('/share/:shareId', async (req, res) => {
  try {
    const report = await PortfolioReport.findOne({ shareId: req.params.shareId });
    if (!report) return res.status(404).json({ error: 'Portfolio not found or link expired' });

    // Update view stats
    await PortfolioReport.updateOne({ _id: report._id }, {
      $inc: { viewCount: 1 },
      $set: { lastViewed: new Date() },
    });

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Portfolio share load error:', err.message);
    res.status(500).json({ error: 'Failed to load shared portfolio', detail: err.message });
  }
});

// ─── Month 18: List saved portfolios for session ───────────────────────────────
/**
 * GET /api/portfolio/saved/:sessionId
 */
router.get('/saved/:sessionId', async (req, res) => {
  try {
    const reports = await PortfolioReport
      .find({ sessionId: req.params.sessionId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('shareId name symbols totalCapital range createdAt viewCount');
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch saved portfolios' });
  }
});

// ─── Month 18: Delete saved portfolio ─────────────────────────────────────────
/**
 * DELETE /api/portfolio/saved/:sessionId/:shareId
 */
router.delete('/saved/:sessionId/:shareId', async (req, res) => {
  try {
    await PortfolioReport.deleteOne({ shareId: req.params.shareId, sessionId: req.params.sessionId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete portfolio' });
  }
});

// ─── Month 18: Export portfolio as CSV ─────────────────────────────────────────
/**
 * POST /api/portfolio/export/csv
 * Body: { name, resultSnapshot }
 * Returns: CSV file
 */
router.post('/export/csv', (req, res) => {
  try {
    const { name, resultSnapshot } = req.body;
    if (!resultSnapshot) return res.status(400).json({ error: 'resultSnapshot is required' });

    const csv = generatePortfolioCSV(resultSnapshot, name || 'My Portfolio');
    const filename = `StockVision_${(name || 'Portfolio').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel
  } catch (err) {
    console.error('CSV export error:', err.message);
    res.status(500).json({ error: 'CSV export failed', detail: err.message });
  }
});

// ─── Month 18: Get share text summary ─────────────────────────────────────────
/**
 * POST /api/portfolio/share-text
 * Body: { name, resultSnapshot, shareId }
 * Returns: { text } — WhatsApp/Telegram ready summary
 */
router.post('/share-text', (req, res) => {
  try {
    const { name, resultSnapshot, shareId } = req.body;
    if (!resultSnapshot) return res.status(400).json({ error: 'resultSnapshot required' });

    const shareUrl = shareId
      ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portfolio/share/${shareId}`
      : '';

    const text = buildShareSummary(resultSnapshot, name || 'My Portfolio', shareUrl);
    res.json({ success: true, data: { text, shareUrl } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate share text', detail: err.message });
  }
});

// ─── Month 18: Compare two portfolios side by side ────────────────────────────
/**
 * POST /api/portfolio/compare
 * Body: { portfolioA: { symbols, weights, name }, portfolioB: { symbols, weights, name }, totalCapital, range }
 */
router.post('/compare', async (req, res) => {
  try {
    const { portfolioA, portfolioB, totalCapital, range } = req.body;
    if (!portfolioA?.symbols?.length || !portfolioB?.symbols?.length)
      return res.status(400).json({ error: 'Both portfolioA and portfolioB with symbols are required' });

    const clean = (syms) => syms.map(s => {
      const u = s.trim().toUpperCase();
      return u.endsWith('.NS') || u.endsWith('.BO') ? u : `${u}.NS`;
    });

    const [resultA, resultB] = await Promise.all([
      analyzePortfolio({ symbols: clean(portfolioA.symbols), totalCapital: Number(totalCapital) || 100000, range: range || '3y' }),
      analyzePortfolio({ symbols: clean(portfolioB.symbols), totalCapital: Number(totalCapital) || 100000, range: range || '3y' }),
    ]);

    // Build comparison summary
    const getBest = (r) => r.strategies?.find(s => s.name === r.bestStrategy?.name) || r.strategies?.[0];
    const mA = getBest(resultA)?.metrics || {};
    const mB = getBest(resultB)?.metrics || {};

    const winner = (field, higherIsBetter = true) => {
      const a = Number(mA[field] || 0);
      const b = Number(mB[field] || 0);
      return higherIsBetter ? (a > b ? 'A' : b > a ? 'B' : 'TIE') : (a < b ? 'A' : b < a ? 'B' : 'TIE');
    };

    const comparison = {
      metrics: [
        { label: 'CAGR',          fieldA: mA.cagr,        fieldB: mB.cagr,        format: 'pct', winner: winner('cagr'),        higherIsBetter: true  },
        { label: 'Ann. Return',   fieldA: mA.annualReturn, fieldB: mB.annualReturn, format: 'pct', winner: winner('annualReturn'), higherIsBetter: true  },
        { label: 'Sharpe Ratio',  fieldA: mA.sharpe,       fieldB: mB.sharpe,       format: 'num', winner: winner('sharpe'),      higherIsBetter: true  },
        { label: 'Max Drawdown',  fieldA: mA.maxDrawdown,  fieldB: mB.maxDrawdown,  format: 'pct', winner: winner('maxDrawdown',false), higherIsBetter: false },
        { label: 'Ann. Volatility', fieldA: mA.annualVol,  fieldB: mB.annualVol,    format: 'pct', winner: winner('annualVol',false),  higherIsBetter: false },
        { label: 'Total Return',  fieldA: mA.totalReturn,  fieldB: mB.totalReturn,  format: 'pct', winner: winner('totalReturn'), higherIsBetter: true  },
      ],
      winsA: 0, winsB: 0,
      portfolioA: { name: portfolioA.name || 'Portfolio A', symbols: clean(portfolioA.symbols), bestStrategy: resultA.bestStrategy, diversification: resultA.diversification, growthPattern: resultA.growthPattern },
      portfolioB: { name: portfolioB.name || 'Portfolio B', symbols: clean(portfolioB.symbols), bestStrategy: resultB.bestStrategy, diversification: resultB.diversification, growthPattern: resultB.growthPattern },
    };

    comparison.metrics.forEach(m => {
      if (m.winner === 'A') comparison.winsA++;
      if (m.winner === 'B') comparison.winsB++;
    });
    comparison.overallWinner = comparison.winsA > comparison.winsB ? 'A' : comparison.winsB > comparison.winsA ? 'B' : 'TIE';

    res.json({ success: true, data: { comparison, resultA, resultB } });
  } catch (err) {
    console.error('Portfolio compare error:', err.message);
    res.status(500).json({ error: 'Comparison failed', detail: err.message });
  }
});

module.exports = router;

