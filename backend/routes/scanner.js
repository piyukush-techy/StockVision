const express = require('express');
const router  = express.Router();
const {
  runFullScan,
  fetchHistoricalData,
  clearCache
} = require('../utils/scanner');
const { computeBreakoutProbability, clearBreakoutCache } = require('../utils/breakoutEngine');

// ─── In-memory result cache (avoid re-scanning same params) ───────────────────
const resultCache = new Map();
const RESULT_TTL  = 30 * 60 * 1000; // 30 minutes

function getCached(key) {
  const e = resultCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > RESULT_TTL) { resultCache.delete(key); return null; }
  return e.data;
}
function setCached(key, data) {
  resultCache.set(key, { data, ts: Date.now() });
}

// ─── POST /api/scanner/run ────────────────────────────────────────────────────
// Main scanner endpoint - runs all 5 features
router.post('/run', async (req, res) => {
  try {
    let { symbol, targetPct, windowDays } = req.body;

    // Validation
    if (!symbol)      return res.status(400).json({ error: 'symbol is required' });
    if (!targetPct)   return res.status(400).json({ error: 'targetPct is required' });
    if (!windowDays)  return res.status(400).json({ error: 'windowDays is required' });

    symbol     = symbol.toUpperCase().trim();
    targetPct  = parseFloat(targetPct);
    windowDays = parseInt(windowDays);

    if (isNaN(targetPct)  || targetPct  < 1  || targetPct  > 200)
      return res.status(400).json({ error: 'targetPct must be 1–200' });
    if (isNaN(windowDays) || windowDays < 5  || windowDays > 365)
      return res.status(400).json({ error: 'windowDays must be 5–365' });

    // Ensure .NS suffix for NSE stocks
    if (!symbol.includes('.') ) symbol = symbol + '.NS';

    const cacheKey = `${symbol}_${targetPct}_${windowDays}`;
    const cached   = getCached(cacheKey);
    if (cached) {
      return res.json({ ...cached, fromCache: true });
    }

    console.log(`🔍 Scanner: ${symbol} +${targetPct}% in ${windowDays} days`);

    const result = await runFullScan(symbol, targetPct, windowDays);

    setCached(cacheKey, result);
    res.json(result);

  } catch (err) {
    console.error('Scanner run error:', err.message);
    if (err.message.includes('Insufficient data') || err.message.includes('No historical')) {
      return res.status(404).json({ error: `No historical data for this symbol. Try a major NSE stock like RELIANCE.NS` });
    }
    res.status(500).json({ error: 'Scanner failed. Please try again.' });
  }
});

// ─── GET /api/scanner/presets ─────────────────────────────────────────────────
// Common target/window preset combos for the UI
router.get('/presets', (req, res) => {
  res.json({
    targets: [5, 10, 15, 20, 25, 30],
    windows: [
      { days: 30,  label: '1 Month'  },
      { days: 60,  label: '2 Months' },
      { days: 90,  label: '3 Months' },
      { days: 180, label: '6 Months' },
      { days: 252, label: '1 Year'   }
    ],
    suggestedStocks: [
      'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS',
      'ICICIBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS',
      'KOTAKBANK.NS', 'LT.NS', 'AXISBANK.NS', 'WIPRO.NS'
    ]
  });
});

// ─── GET /api/scanner/history/:symbol ────────────────────────────────────────
// Fetch raw historical OHLCV (for chart display)
router.get('/history/:symbol', async (req, res) => {
  try {
    let { symbol } = req.params;
    symbol = symbol.toUpperCase();
    if (!symbol.includes('.')) symbol += '.NS';

    const candles = await fetchHistoricalData(symbol);

    // Return last 252 candles (1 year) for chart display
    res.json({
      symbol,
      candles: candles.slice(-252),
      total:   candles.length
    });

  } catch (err) {
    console.error('History fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

// ─── GET /api/scanner/breakout/:symbol ───────────────────────────────────────
// 52-Week Breakout Probability
// Returns: successRate, attempts, avgGain, currentProximity, recentEvents
router.get('/breakout/:symbol', async (req, res) => {
  try {
    let { symbol } = req.params;
    symbol = symbol.toUpperCase().trim();
    if (!symbol.includes('.')) symbol += '.NS';

    const result = await computeBreakoutProbability(symbol);
    res.json({ success: true, data: result });

  } catch (err) {
    console.error('Breakout probability error:', err.message);
    if (err.message.includes('Insufficient') || err.message.includes('No historical')) {
      return res.status(404).json({ error: `No data for this symbol. Try a major NSE stock like RELIANCE.NS` });
    }
    res.status(500).json({ error: 'Breakout analysis failed. Please try again.' });
  }
});

// ─── DELETE /api/scanner/cache/:symbol ───────────────────────────────────────
router.delete('/cache/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  clearCache(symbol);
  clearBreakoutCache(symbol);
  // Also clear result cache entries for this symbol
  for (const key of resultCache.keys()) {
    if (key.startsWith(symbol)) resultCache.delete(key);
  }
  res.json({ message: `Cache cleared for ${symbol}` });
});

module.exports = router;
