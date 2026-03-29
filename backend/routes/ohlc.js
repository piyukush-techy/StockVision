// routes/ohlc.js — Real historical OHLC data from Yahoo Finance
const express = require('express');
const axios   = require('axios');
const router  = express.Router();

// ── Period → Yahoo Finance range/interval mapping ─────────────────────────
const PERIOD_MAP = {
  '1M': { range: '1mo',  interval: '1d'  },
  '3M': { range: '3mo',  interval: '1d'  },
  '6M': { range: '6mo',  interval: '1d'  },
  '1Y': { range: '1y',   interval: '1d'  },
  '2Y': { range: '2y',   interval: '1wk' },
};

// ── Simple in-memory cache (5 min TTL) ────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCached(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// GET /api/ohlc/:symbol?period=6M
router.get('/:symbol', async (req, res) => {
  const symbol = req.params.symbol?.toUpperCase();
  const period = req.query.period || '6M';

  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  const config = PERIOD_MAP[period] || PERIOD_MAP['6M'];
  const cacheKey = `${symbol}_${period}`;

  // Return cached if fresh
  const cached = getCached(cacheKey);
  if (cached) return res.json({ symbol, period, candles: cached, source: 'cache' });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const response = await axios.get(url, {
      params: {
        interval: config.interval,
        range:    config.range,
        includePrePost: false,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const result = response.data?.chart?.result?.[0];
    if (!result) {
      return res.status(404).json({ error: `No OHLC data found for ${symbol}` });
    }

    const timestamps = result.timestamp || [];
    const quote      = result.indicators?.quote?.[0] || {};
    const opens      = quote.open   || [];
    const highs      = quote.high   || [];
    const lows       = quote.low    || [];
    const closes     = quote.close  || [];
    const volumes    = quote.volume || [];

    // Build clean candle array, skip any rows with null values
    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i], h = highs[i], l = lows[i], c = closes[i], v = volumes[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({
        time:   timestamps[i],          // Unix seconds — exactly what lightweight-charts needs
        open:   +o.toFixed(2),
        high:   +h.toFixed(2),
        low:    +l.toFixed(2),
        close:  +c.toFixed(2),
        volume: v || 0,
      });
    }

    if (candles.length === 0) {
      return res.status(404).json({ error: `Empty OHLC data for ${symbol}` });
    }

    setCached(cacheKey, candles);
    res.json({ symbol, period, candles, count: candles.length, source: 'yahoo' });

  } catch (err) {
    console.error(`OHLC fetch error for ${symbol}:`, err.message);
    const status = err.response?.status || 500;
    res.status(status).json({
      error: 'Failed to fetch OHLC data',
      message: err.message,
      symbol,
    });
  }
});

module.exports = router;
