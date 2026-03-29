// routes/patterns.js — Candlestick Pattern Detector API
// Phase 6 Month 31 — Route order fixed (specific routes before /:symbol)
// JAI SHREE GANESH 🙏

const express  = require('express');
const router   = express.Router();
const { detectPatterns, confluenceScore, SUCCESS_RATES } = require('../utils/patternDetector');
const { fetchHistoricalData } = require('../utils/priceFetcher');
const { NSE_STOCKS } = require('../utils/screenerEngine');

// In-memory cache
const cache    = new Map();
const CACHE_TTL = 15 * 60 * 1000;
function fromCache(k) {
  const e = cache.get(k);
  if (!e || Date.now() - e.ts > CACHE_TTL) return null;
  return e.data;
}
function toCache(k, data) { cache.set(k, { data, ts: Date.now() }); }

// ─── Simple RSI(14) ───────────────────────────────────────────────────────────
function computeRSI(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const closes = candles.map(c => c.close);
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains  += diff;
    else          losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return +(100 - 100 / (1 + rs)).toFixed(1);
}

// ─── MUST come BEFORE /:symbol ────────────────────────────────────────────────

// GET /api/patterns/info/all — all pattern success rates (education)
router.get('/info/all', (req, res) => {
  try {
    const list = Object.entries(SUCCESS_RATES).map(([name, data]) => ({
      name,
      signal:      data.bullish > 0 ? 'Bullish' : data.bearish > 0 ? 'Bearish' : 'Neutral',
      successRate: data.bullish || data.bearish,
      avgGain:     data.avgGain,
      avgLoss:     data.avgLoss,
      samples:     data.samples,
    }));
    res.json({ patterns: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patterns/scan — scan all NSE stocks for a specific pattern
router.post('/scan', async (req, res) => {
  try {
    const { patternName, signal } = req.body;
    if (!patternName) return res.status(400).json({ error: 'patternName required' });

    const cacheKey = `scan:${patternName}:${signal || 'any'}`;
    const cached   = fromCache(cacheKey);
    if (cached) return res.json(cached);

    const results = [];
    const batch = 5;
    for (let i = 0; i < NSE_STOCKS.length; i += batch) {
      const slice = NSE_STOCKS.slice(i, i + batch);
      await Promise.all(slice.map(async (info) => {
        try {
          const candles = await fetchHistoricalData(info.symbol, '1d', 30);
          if (!candles || candles.length < 5) return;

          const patterns = detectPatterns(candles);
          const today    = candles[candles.length - 1].date;

          const match = patterns.find(p =>
            p.name === patternName &&
            p.date === today &&
            (!signal || p.signal === signal)
          );

          if (match) {
            results.push({
              symbol:   info.symbol.replace('.NS', '').replace('.BO', ''),
              name:     info.name,
              sector:   info.sector,
              pattern:  match,
              price:    candles[candles.length - 1].close,
              volume:   candles[candles.length - 1].volume,
              volRatio: match.volRatio,
            });
          }
        } catch { /* skip failed */ }
      }));
      if (i + batch < NSE_STOCKS.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    results.sort((a, b) => (b.volRatio || 0) - (a.volRatio || 0));
    const out = { patternName, signal: signal || 'any', count: results.length, results };
    toCache(cacheKey, out);
    res.json(out);
  } catch (err) {
    console.error('Pattern scan error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patterns/replay/:symbol — full year patterns for replay
router.get('/replay/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const nseSym = symbol.includes('.') ? symbol : `${symbol}.NS`;
    const days   = parseInt(req.query.days) || 365;

    const cacheKey = `replay:${nseSym}:${days}`;
    const cached   = fromCache(cacheKey);
    if (cached) return res.json(cached);

    const candles = await fetchHistoricalData(nseSym, '1d', days);
    if (!candles || candles.length < 10) {
      return res.json({ symbol, candles: [], patterns: [] });
    }

    const patterns = detectPatterns(candles);
    const result   = { symbol, candles, patterns };
    toCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patterns/:symbol — detect patterns, last N days
// NOTE: This MUST come after all specific routes above
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const nseSym = symbol.includes('.') ? symbol : `${symbol}.NS`;
    const days   = parseInt(req.query.days) || 60;

    const cacheKey = `pat:${nseSym}:${days}`;
    const cached   = fromCache(cacheKey);
    if (cached) return res.json(cached);

    const candles = await fetchHistoricalData(nseSym, '1d', days);
    if (!candles || candles.length < 5) {
      return res.json({ symbol, candles: [], patterns: [], rsi: null, confluence: null });
    }

    const patterns   = detectPatterns(candles);
    const rsi        = computeRSI(candles);
    const confluence = confluenceScore(patterns, rsi);

    // Detect if data is mock (mock data has perfectly round prices from our generator)
    const isMock = candles.length > 0 && !candles[0]._isReal;

    const result = { symbol, candles, patterns, rsi, confluence, isMock };
    toCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Pattern detect error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
