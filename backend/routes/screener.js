// routes/screener.js — Stock Screener Engine API
// Phase 6 Month 30
// JAI SHREE GANESH 🙏

const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const { fetchQuoteBatch, applyFilters, computeSectorStats, NSE_STOCKS, PRESETS } = require('../utils/screenerEngine');

// ─── In-memory cache ──────────────────────────────────────────────────────────
const screenerCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
let warmingInProgress = false;
let warmingPromise     = null;

async function getCachedStocks() {
  const cached = screenerCache.get('all_stocks');
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  // If a warm is already running, wait for it instead of starting another fetch
  if (warmingInProgress && warmingPromise) {
    console.log('⏳ Screener: waiting for in-progress warm...');
    await warmingPromise;
    const fresh = screenerCache.get('all_stocks');
    if (fresh) return fresh.data;
  }

  warmingInProgress = true;
  warmingPromise = fetchQuoteBatch(NSE_STOCKS)
    .then(data => {
      screenerCache.set('all_stocks', { data, ts: Date.now() });
      console.log(`✅ Screener cache set: ${data.length} stocks`);
      return data;
    })
    .catch(err => {
      console.error('❌ Screener fetch failed:', err.message);
      throw err;
    })
    .finally(() => {
      warmingInProgress = false;
      warmingPromise    = null;
    });

  return warmingPromise;
}

// Warm cache 8 seconds after server start
setTimeout(() => {
  console.log('🔍 Screener: starting cache warm...');
  getCachedStocks()
    .then(d => console.log(`✅ Screener warm done: ${d.length} stocks ready`))
    .catch(e => console.log('⚠️  Screener warm failed (will retry on first request):', e.message));
}, 8000);

// ─── Saved Screens ────────────────────────────────────────────────────────────
const savedScreenSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  name:      { type: String, required: true },
  filters:   { type: Object, required: true },
  createdAt: { type: Date,   default: Date.now },
});
const SavedScreen = mongoose.models.SavedScreen || mongoose.model('SavedScreen', savedScreenSchema);

// ─── GET /api/screener/presets ────────────────────────────────────────────────
router.get('/presets', (req, res) => {
  const list = Object.entries(PRESETS).map(([key, p]) => ({
    key,
    name:        p.name,
    description: p.description,
    icon:        p.icon,
    filters:     p.filters,
  }));
  res.json({ presets: list });
});

// ─── GET /api/screener/universe ───────────────────────────────────────────────
router.get('/universe', (req, res) => {
  const sectors = [...new Set(NSE_STOCKS.map(s => s.sector))].sort();
  res.json({ total: NSE_STOCKS.length, sectors, mcapGroups: ['large', 'mid', 'small'] });
});

// ─── POST /api/screener/run ───────────────────────────────────────────────────
router.post('/run', async (req, res) => {
  try {
    const { filters = {}, sort = 'score', order = 'desc', page = 1, limit = 25 } = req.body;
    console.log('📊 Screener /run — filters:', JSON.stringify(filters));

    const allStocks = await getCachedStocks();
    console.log(`   allStocks count: ${allStocks.length}`);

    const filtered = applyFilters(allStocks, filters);
    console.log(`   after filter: ${filtered.length} stocks`);

    const dir = order === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const av = a[sort] ?? -Infinity;
      const bv = b[sort] ?? -Infinity;
      return dir * (bv - av);
    });

    const total  = filtered.length;
    const start  = (page - 1) * limit;
    const stocks = filtered.slice(start, start + limit);
    const sectorStats = computeSectorStats(filtered);

    res.json({ stocks, total, page, pages: Math.ceil(total / limit), sectorStats });
  } catch (err) {
    console.error('❌ /screener/run error:', err);
    res.status(500).json({ error: 'Screener failed', message: err.message });
  }
});

// ─── POST /api/screener/preset/:key ──────────────────────────────────────────
router.post('/preset/:key', async (req, res) => {
  try {
    const preset = PRESETS[req.params.key];
    if (!preset) return res.status(404).json({ error: 'Preset not found' });

    console.log(`📊 Screener preset: ${req.params.key}`, preset.filters);

    const { sort = 'score', order = 'desc', page = 1, limit = 25 } = req.body || {};
    const allStocks = await getCachedStocks();
    console.log(`   allStocks: ${allStocks.length}`);

    const filtered = applyFilters(allStocks, preset.filters);
    console.log(`   after preset filter: ${filtered.length} stocks`);

    // Log a sample to debug filter values
    if (allStocks.length > 0) {
      const sample = allStocks[0];
      console.log(`   Sample stock fields: dividendYield=${sample.dividendYield}, debtToEquity=${sample.debtToEquity}, roe=${sample.roe}, volRatio=${sample.volRatio}`);
    }

    const dir = order === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const av = a[sort] ?? -Infinity;
      const bv = b[sort] ?? -Infinity;
      return dir * (bv - av);
    });

    const total  = filtered.length;
    const start  = (page - 1) * limit;
    const stocks = filtered.slice(start, start + limit);

    res.json({
      preset: { key: req.params.key, ...preset },
      stocks,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('❌ /screener/preset error:', err);
    res.status(500).json({ error: 'Failed to run preset', message: err.message });
  }
});

// ─── GET /api/screener/sectors ────────────────────────────────────────────────
router.get('/sectors', async (req, res) => {
  try {
    const allStocks   = await getCachedStocks();
    const sectorStats = computeSectorStats(allStocks);
    res.json({ sectors: sectorStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/screener/save ──────────────────────────────────────────────────
router.post('/save', async (req, res) => {
  try {
    const { sessionId, name, filters } = req.body;
    if (!sessionId || !name || !filters) {
      return res.status(400).json({ error: 'sessionId, name and filters required' });
    }
    const screen = await SavedScreen.create({ sessionId, name, filters });
    res.json({ success: true, screen });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/screener/saved/:sessionId ───────────────────────────────────────
router.get('/saved/:sessionId', async (req, res) => {
  try {
    const screens = await SavedScreen.find({ sessionId: req.params.sessionId })
      .sort({ createdAt: -1 }).limit(20);
    res.json({ screens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/screener/saved/:sessionId/:id ────────────────────────────────
router.delete('/saved/:sessionId/:id', async (req, res) => {
  try {
    await SavedScreen.deleteOne({ _id: req.params.id, sessionId: req.params.sessionId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
