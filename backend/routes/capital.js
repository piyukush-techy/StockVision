const express = require('express');
const router  = express.Router();
const {
  runCapitalAnalysis,
  getSlippageEstimate,
  getLiquidityHeatmap
} = require('../utils/capitalEngine');

const cache = new Map();
const TTL   = 30 * 60 * 1000;
const gc = k => { const e = cache.get(k); if (!e) return null; if (Date.now()-e.ts>TTL){cache.delete(k);return null;} return e.data; };
const sc = (k,d) => cache.set(k,{data:d,ts:Date.now()});

// POST /api/capital/analyze — full analysis (all 4 features)
router.post('/analyze', async (req, res) => {
  try {
    let { symbol, baseSuccessRate, targetPct, capitalAmount } = req.body;
    if (!symbol) return res.status(400).json({ error: 'symbol required' });
    if (baseSuccessRate == null) return res.status(400).json({ error: 'baseSuccessRate required (run scanner first)' });

    symbol          = symbol.toUpperCase().replace(/[^A-Z.]/g, '');
    baseSuccessRate = parseFloat(baseSuccessRate);
    targetPct       = parseFloat(targetPct) || 15;
    capitalAmount   = parseInt(capitalAmount) || 100_000;

    if (!symbol.includes('.')) symbol += '.NS';
    if (isNaN(baseSuccessRate) || baseSuccessRate < 0 || baseSuccessRate > 100)
      return res.status(400).json({ error: 'baseSuccessRate must be 0–100' });

    const key    = `cap_${symbol}_${baseSuccessRate}_${targetPct}_${capitalAmount}`;
    const cached = gc(key);
    if (cached) return res.json({ ...cached, fromCache: true });

    console.log(`💰 Capital: ${symbol} ₹${capitalAmount.toLocaleString('en-IN')} base=${baseSuccessRate}%`);
    const result = await runCapitalAnalysis(symbol, baseSuccessRate, targetPct, capitalAmount);
    sc(key, result);
    res.json(result);
  } catch (err) {
    console.error('Capital analyze:', err.message);
    res.status(500).json({ error: 'Capital analysis failed. Try again.' });
  }
});

// POST /api/capital/slippage — quick slippage estimate
router.post('/slippage', async (req, res) => {
  try {
    let { symbol, capitalAmount } = req.body;
    if (!symbol) return res.status(400).json({ error: 'symbol required' });
    symbol        = symbol.toUpperCase();
    capitalAmount = parseInt(capitalAmount) || 100_000;
    if (!symbol.includes('.')) symbol += '.NS';
    const result = await getSlippageEstimate(symbol, capitalAmount);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Slippage estimation failed.' });
  }
});

// GET /api/capital/heatmap/:symbol — liquidity heatmap
router.get('/heatmap/:symbol', async (req, res) => {
  try {
    let symbol = req.params.symbol.toUpperCase();
    if (!symbol.includes('.')) symbol += '.NS';
    const key = `hm_${symbol}`;
    const cached = gc(key);
    if (cached) return res.json({ ...cached, fromCache: true });
    const result = await getLiquidityHeatmap(symbol);
    if (!result) return res.status(404).json({ error: 'Insufficient data' });
    sc(key, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Heatmap failed.' });
  }
});

// DELETE /api/capital/cache/:symbol
router.delete('/cache/:symbol', (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  for (const k of cache.keys()) { if (k.includes(sym)) cache.delete(k); }
  res.json({ message: `Capital cache cleared for ${sym}` });
});

module.exports = router;
