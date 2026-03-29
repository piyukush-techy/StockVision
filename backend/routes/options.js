// routes/options.js — Options Chain API
// Phase 6 Month 29: Options Chain Analyser
// GET /api/options/:symbol
// GET /api/options/indices  (list of index symbols)

const express = require('express');
const router  = express.Router();
const { fetchOptionChain } = require('../utils/optionsFetcher');

// In-memory cache for options data (expensive call)
const optionsCache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes (options data changes fast)

// GET /api/options/symbols — list of supported F&O symbols
router.get('/symbols', (req, res) => {
  const indices = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'];
  const stocks = [
    'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
    'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK',
    'LT', 'AXISBANK', 'BAJFINANCE', 'MARUTI', 'WIPRO',
    'HCLTECH', 'ASIANPAINT', 'NESTLEIND', 'TITAN', 'SUNPHARMA',
    'POWERGRID', 'NTPC', 'ONGC', 'TATAMOTORS', 'TATASTEEL',
    'ADANIPORTS', 'ULTRACEMCO', 'TECHM', 'INDUSINDBK', 'BAJAJFINSV',
  ];
  res.json({ indices, stocks, total: indices.length + stocks.length });
});

// GET /api/options/:symbol — full option chain
router.get('/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase().replace('.NS', '').replace('.BO', '');

  // Check cache
  const cached = optionsCache.get(symbol);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    return res.json({ ...cached.data, fromCache: true, cachedAt: new Date(cached.ts).toISOString() });
  }

  try {
    const data = await fetchOptionChain(symbol);
    optionsCache.set(symbol, { data, ts: Date.now() });
    res.json(data);
  } catch (err) {
    console.error(`Options route error for ${symbol}:`, err.message);
    res.status(500).json({ error: 'Failed to fetch options data', message: err.message, symbol });
  }
});

module.exports = router;
