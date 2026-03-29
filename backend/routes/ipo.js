// routes/ipo.js — IPO Tracker & Grey Market API
// Phase 6 Month 33
// JAI SHREE GANESH 🙏

const express = require('express');
const router  = express.Router();
const {
  STATIC_IPOS,
  allotmentProbability,
  gmpAnalysis,
  ipoPerformanceStats,
  enrichWithLivePrice,
} = require('../utils/ipoFetcher');

// Simple in-memory cache
const cache = new Map();
const TTL   = 5 * 60 * 1000;
function fromCache(k) { const e = cache.get(k); if (!e || Date.now() - e.ts > TTL) return null; return e.data; }
function toCache(k, d) { cache.set(k, { data: d, ts: Date.now() }); }

// ─── GET /api/ipo ─────────────────────────────────────────────────────────────
// Returns all IPOs with enrichment: allotment probability, GMP analysis
router.get('/', async (req, res) => {
  try {
    const { status, sector } = req.query;
    const cached = fromCache('all_ipos');
    if (cached) return res.json(cached);

    let ipos = STATIC_IPOS.map(ipo => ({
      ...ipo,
      allotmentProbability: allotmentProbability(ipo.subscriptionTotal),
      gmpAnalysis: gmpAnalysis(ipo.gmp, ipo.issuePrice),
      expectedListingPrice: ipo.issuePrice && ipo.gmp != null ? ipo.issuePrice + ipo.gmp : null,
    }));

    const result = {
      ipos,
      stats: ipoPerformanceStats(),
      filters: {
        sectors: [...new Set(STATIC_IPOS.map(i => i.sector))],
        statuses: ['upcoming', 'open', 'allotment', 'listed'],
      },
    };

    toCache('all_ipos', result);
    res.json(result);
  } catch (err) {
    console.error('IPO list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch IPOs' });
  }
});

// ─── GET /api/ipo/stats ────────────────────────────────────────────────────────
// Overall IPO performance statistics
router.get('/stats', (req, res) => {
  try {
    res.json(ipoPerformanceStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ipo/gmp ─────────────────────────────────────────────────────────
// GMP tracker — all IPOs with GMP data
router.get('/gmp', (req, res) => {
  try {
    const gmpList = STATIC_IPOS
      .filter(i => i.gmp !== null && i.gmp !== undefined)
      .map(i => ({
        id: i.id,
        company: i.company,
        status: i.status,
        issuePrice: i.issuePrice,
        gmp: i.gmp,
        gmpPercent: i.issuePrice ? +(i.gmp / i.issuePrice * 100).toFixed(1) : null,
        expectedListingPrice: i.issuePrice ? i.issuePrice + i.gmp : null,
        openDate: i.openDate,
        listingDate: i.listingDate,
        analysis: gmpAnalysis(i.gmp, i.issuePrice),
        sector: i.sector,
        badge: i.badge,
        badgeColor: i.badgeColor,
      }))
      .sort((a, b) => (b.gmpPercent || 0) - (a.gmpPercent || 0));

    res.json({ gmpList, updatedAt: new Date().toISOString(), disclaimer: 'GMP data is indicative only — sourced from grey market traders. Not guaranteed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ipo/performance ──────────────────────────────────────────────────
// Historical IPO listing performance
router.get('/performance', (req, res) => {
  try {
    const listed = STATIC_IPOS
      .filter(i => i.status === 'listed' && i.listingGain !== null)
      .map(i => ({
        id: i.id,
        company: i.company,
        sector: i.sector,
        issuePrice: i.issuePrice,
        listingPrice: i.listingPrice,
        listingGain: i.listingGain,
        cmp: i.cmp,
        currentGain: i.issuePrice && i.cmp ? +(((i.cmp - i.issuePrice) / i.issuePrice) * 100).toFixed(1) : null,
        issueSize: i.issueSize,
        subscriptionTotal: i.subscriptionTotal,
        listingDate: i.listingDate,
        badge: i.badge,
        badgeColor: i.badgeColor,
      }))
      .sort((a, b) => new Date(b.listingDate) - new Date(a.listingDate));

    const stats = ipoPerformanceStats();
    res.json({ ipos: listed, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ipo/upcoming ────────────────────────────────────────────────────
// Only upcoming IPOs
router.get('/upcoming', (req, res) => {
  try {
    const upcoming = STATIC_IPOS
      .filter(i => i.status === 'upcoming' || i.status === 'open')
      .map(i => ({
        ...i,
        allotmentProbability: null,
        gmpAnalysis: gmpAnalysis(i.gmp, i.issuePrice),
        expectedListingPrice: i.issuePrice && i.gmp != null ? i.issuePrice + i.gmp : null,
      }))
      .sort((a, b) => new Date(a.openDate) - new Date(b.openDate));

    res.json({ upcoming });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ipo/:id ─────────────────────────────────────────────────────────
// Single IPO detail with live price enrichment
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ipo = STATIC_IPOS.find(i => i.id === id);
    if (!ipo) return res.status(404).json({ error: 'IPO not found' });

    const cacheKey = `ipo_${id}`;
    const cached = fromCache(cacheKey);
    if (cached) return res.json(cached);

    const enriched = await enrichWithLivePrice(ipo);
    const result = {
      ...enriched,
      allotmentProbability: allotmentProbability(ipo.subscriptionTotal),
      gmpAnalysis: gmpAnalysis(ipo.gmp, ipo.issuePrice),
      expectedListingPrice: ipo.issuePrice && ipo.gmp != null ? ipo.issuePrice + ipo.gmp : null,
    };

    toCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('IPO detail error:', err.message);
    res.status(500).json({ error: 'Failed to fetch IPO details' });
  }
});

module.exports = router;
