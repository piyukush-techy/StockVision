// yfProxy.js — Yahoo Finance proxy to avoid browser CORS blocks
// Used by SentimentPage, RegimeAnalysisPage, SectorHeatmapPage
const express = require('express');
const axios   = require('axios');
const router  = express.Router();

const cache = new Map();
const TTL   = 5 * 60 * 1000; // 5 min

// GET /api/yf-proxy/:symbol?interval=1d&range=2y
router.get('/:symbol', async (req, res) => {
  const symbol   = req.params.symbol;
  const interval = req.query.interval || '1d';
  const range    = req.query.range    || '1y';
  const key      = `${symbol}_${interval}_${range}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return res.json(hit.data);

  try {
    const r = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
      {
        params:  { interval, range },
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept':     'application/json',
        },
      }
    );
    cache.set(key, { data: r.data, ts: Date.now() });
    res.json(r.data);
  } catch (err) {
    console.error('YF Proxy error:', symbol, err.message);
    res.status(502).json({ error: 'Yahoo Finance fetch failed', symbol });
  }
});

module.exports = router;
