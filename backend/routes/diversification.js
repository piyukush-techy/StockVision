// diversification.js — Phase 4 Month 20: Correlation Killer + Opportunity Cost API
const express = require('express');
const router  = express.Router();
const { runCorrelationKiller, runOpportunityCost } = require('../utils/diversificationEngine');

/**
 * POST /api/diversification/correlation-killer
 * Deep diversification analysis — expose hidden correlations
 * Body: { symbols: ['RELIANCE.NS', 'TCS.NS', ...], range: '2y' }
 */
router.post('/correlation-killer', async (req, res) => {
  try {
    const { symbols, range } = req.body;
    if (!symbols || !Array.isArray(symbols) || symbols.length < 2)
      return res.status(400).json({ error: 'At least 2 symbols required' });
    if (symbols.length > 12)
      return res.status(400).json({ error: 'Maximum 12 stocks supported' });

    const clean = symbols.map(s => {
      const u = s.trim().toUpperCase();
      return u.endsWith('.NS') || u.endsWith('.BO') ? u : `${u}.NS`;
    });

    const result = await runCorrelationKiller({ symbols: clean, range: range || '2y' });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Correlation killer error:', err.message);
    res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
});

/**
 * POST /api/diversification/opportunity-cost
 * Find better alternatives — grade A-F vs peers & benchmarks
 * Body: { symbol, range, capital }
 */
router.post('/opportunity-cost', async (req, res) => {
  try {
    const { symbol, range, capital } = req.body;
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });

    const s = symbol.trim().toUpperCase();
    const clean = s.endsWith('.NS') || s.endsWith('.BO') ? s : `${s}.NS`;

    const result = await runOpportunityCost({
      symbol:  clean,
      range:   range   || '2y',
      capital: Number(capital) || 100000,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Opportunity cost error:', err.message);
    res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
});

/**
 * GET /api/diversification/popular-portfolios
 * Returns pre-built portfolios for quick testing
 */
router.get('/popular-portfolios', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        label: '🏦 Nifty Top 5',
        symbols: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS'],
        desc: 'Top 5 Nifty 50 by market cap — looks diversified, but is it?',
      },
      {
        label: '💻 IT Concentrated',
        symbols: ['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS'],
        desc: 'All IT — extreme sector concentration',
      },
      {
        label: '🌈 Sector Spread',
        symbols: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'SUNPHARMA.NS', 'MARUTI.NS', 'ITC.NS'],
        desc: 'One stock from 6 different sectors',
      },
      {
        label: '🔥 High Beta Bets',
        symbols: ['TATAMOTORS.NS', 'ADANIENT.NS', 'ZOMATO.NS', 'TATASTEEL.NS', 'BHARTIARTL.NS'],
        desc: 'High-growth, high-volatility picks',
      },
      {
        label: '🛡️ Defensive Mix',
        symbols: ['HINDUNILVR.NS', 'ITC.NS', 'NESTLEIND.NS', 'DRREDDY.NS', 'BHARTIARTL.NS'],
        desc: 'Defensive consumer + pharma + telecom',
      },
    ],
  });
});

module.exports = router;
