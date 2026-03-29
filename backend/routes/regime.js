// routes/regime.js - Regime Analysis API
const express = require('express');
const router = express.Router();
const { 
  classifyCurrentRegime, 
  analyzeRegimeHistory, 
  getSectorRegime 
} = require('../utils/regimeClassifier');

// In-memory cache
let cache = {
  currentRegime: new Map(), // symbol -> { data, timestamp }
  regimeHistory: new Map(),
  sectorRegime: new Map()
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour (regimes don't change quickly)

function isCacheValid(timestamp) {
  if (!timestamp) return false;
  return (Date.now() - timestamp) < CACHE_DURATION;
}

// POST /api/regime/classify - Classify current regime for a stock
router.post('/classify', async (req, res) => {
  try {
    const { symbol } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol required' });
    }

    const upperSymbol = symbol.toUpperCase();

    // Check cache
    const cached = cache.currentRegime.get(upperSymbol);
    if (cached && isCacheValid(cached.timestamp)) {
      return res.json({
        ...cached.data,
        cached: true,
        cacheAge: Math.round((Date.now() - cached.timestamp) / 1000)
      });
    }

    // Classify regime
    console.log(`Classifying regime for ${upperSymbol}...`);
    const regime = await classifyCurrentRegime(upperSymbol);

    // Cache result
    cache.currentRegime.set(upperSymbol, {
      data: regime,
      timestamp: Date.now()
    });

    res.json({
      ...regime,
      cached: false
    });

  } catch (error) {
    console.error('Regime classification error:', error);
    res.status(500).json({ 
      error: 'Failed to classify regime',
      regime: 'UNKNOWN'
    });
  }
});

// POST /api/regime/history - Get regime history for a stock
router.post('/history', async (req, res) => {
  try {
    const { symbol } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol required' });
    }

    const upperSymbol = symbol.toUpperCase();

    // Check cache
    const cached = cache.regimeHistory.get(upperSymbol);
    if (cached && isCacheValid(cached.timestamp)) {
      return res.json({
        ...cached.data,
        cached: true
      });
    }

    // Analyze history
    console.log(`Analyzing regime history for ${upperSymbol}...`);
    const history = await analyzeRegimeHistory(upperSymbol);

    if (!history) {
      return res.status(500).json({ error: 'Failed to analyze regime history' });
    }

    // Cache result
    cache.regimeHistory.set(upperSymbol, {
      data: history,
      timestamp: Date.now()
    });

    res.json({
      ...history,
      cached: false
    });

  } catch (error) {
    console.error('Regime history error:', error);
    res.status(500).json({ error: 'Failed to analyze regime history' });
  }
});

// GET /api/regime/sector/:sector - Get sector regime
router.get('/sector/:sector', async (req, res) => {
  try {
    const { sector } = req.params;

    // Check cache
    const cached = cache.sectorRegime.get(sector);
    if (cached && isCacheValid(cached.timestamp)) {
      return res.json({
        ...cached.data,
        cached: true
      });
    }

    // Get sector regime
    console.log(`Getting regime for ${sector} sector...`);
    const regime = await getSectorRegime(sector);

    // Cache result
    cache.sectorRegime.set(sector, {
      data: { sector, ...regime },
      timestamp: Date.now()
    });

    res.json({
      sector,
      ...regime,
      cached: false
    });

  } catch (error) {
    console.error('Sector regime error:', error);
    res.status(500).json({ error: 'Failed to get sector regime' });
  }
});

// DELETE /api/regime/cache/:symbol - Clear cache for a symbol
router.delete('/cache/:symbol', (req, res) => {
  const { symbol } = req.params;
  const upperSymbol = symbol.toUpperCase();

  cache.currentRegime.delete(upperSymbol);
  cache.regimeHistory.delete(upperSymbol);

  res.json({ 
    success: true, 
    message: `Cache cleared for ${upperSymbol}` 
  });
});

// DELETE /api/regime/cache - Clear all caches
router.delete('/cache', (req, res) => {
  cache.currentRegime.clear();
  cache.regimeHistory.clear();
  cache.sectorRegime.clear();

  res.json({ 
    success: true, 
    message: 'All regime caches cleared' 
  });
});

module.exports = router;
