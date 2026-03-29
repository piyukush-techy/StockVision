// health.js routes — Phase 5 Month 23
// Comprehensive health & performance dashboard endpoints

const express   = require('express');
const router    = express.Router();
const mongoose  = require('mongoose');
const { cache, TTL } = require('../utils/cacheLayer');
const { rateLimit }  = require('../utils/rateLimiter');
const { getSystemHealth, getRequestMetrics, errorStore } = require('../utils/errorMonitor');

// ─── GET /api/health ──────────────────────────────────────────────────────────
// Quick health check — used by load balancers / uptime monitors
router.get('/', rateLimit.light, async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }[dbState] || 'unknown';

  const cacheStats  = await cache.stats();
  const sysHealth   = getSystemHealth();
  const rateLimitStats = rateLimit.stats();

  const overall = dbState === 1 ? 'healthy' : 'degraded';

  res.status(dbState === 1 ? 200 : 503).json({
    status:   overall,
    timestamp: new Date().toISOString(),
    version:  process.env.npm_package_version || '1.0.0',
    uptime:   +sysHealth.uptime.toFixed(0),
    services: {
      database: { status: dbStatus,        type: 'MongoDB' },
      cache:    { status: cacheStats.status, type: cacheStats.type, hitRate: cacheStats.hitRate + '%' },
      server:   { status: 'running',        memory: sysHealth.memory.heapUsedMB + 'MB / ' + sysHealth.memory.heapTotalMB + 'MB' },
    },
    rateLimit: {
      total:     rateLimitStats.total,
      blocked:   rateLimitStats.blocked,
      blockRate: rateLimitStats.blockRate + '%',
    },
  });
});

// ─── GET /api/health/detailed ─────────────────────────────────────────────────
// Full system health — memory, CPU, DB connection pool
router.get('/detailed', rateLimit.light, async (req, res) => {
  const sysHealth  = getSystemHealth();
  const cacheStats = await cache.stats();
  const reqMetrics = getRequestMetrics();
  const errStats   = errorStore.stats();
  const dbState    = mongoose.connection.readyState;

  res.json({
    status:    dbState === 1 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    system:    sysHealth,
    cache:     cacheStats,
    requests:  {
      total:     reqMetrics.total,
      errors:    reqMetrics.errors,
      errorRate: reqMetrics.errorRate + '%',
      avgMs:     reqMetrics.avgDurationMs + 'ms',
    },
    errors:   errStats,
    database: {
      status:    { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }[dbState],
      host:      mongoose.connection.host,
      name:      mongoose.connection.name,
    },
    environment: {
      node:      process.version,
      env:       process.env.NODE_ENV || 'development',
      pid:       process.pid,
    },
  });
});

// ─── GET /api/health/metrics ──────────────────────────────────────────────────
// Request metrics — top routes, error rates, slow endpoints
router.get('/metrics', rateLimit.light, (req, res) => {
  const metrics = getRequestMetrics();
  res.json({
    success:   true,
    data:      metrics,
    timestamp: new Date().toISOString(),
  });
});

// ─── GET /api/health/errors ───────────────────────────────────────────────────
// Recent errors — aggregated and deduplicated
router.get('/errors', rateLimit.light, (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
  const mode   = req.query.mode || 'grouped';  // grouped | recent
  res.json({
    success:   true,
    data: {
      stats:   errorStore.stats(),
      errors:  mode === 'recent' ? errorStore.recent(limit) : errorStore.summary(limit),
      mode,
    },
    timestamp: new Date().toISOString(),
  });
});

// ─── GET /api/health/cache ────────────────────────────────────────────────────
// Cache stats + pattern flushing
router.get('/cache', rateLimit.light, async (req, res) => {
  const stats = await cache.stats();
  res.json({ success: true, data: { ...stats, type: cache.getType() } });
});

// ─── DELETE /api/health/cache/:pattern ───────────────────────────────────────
// Flush cache by pattern (admin use)
router.delete('/cache/:pattern', rateLimit.standard, async (req, res) => {
  const { pattern } = req.params;
  // Security: only allow simple patterns, no full flushes without explicit key
  if (pattern === 'all') {
    const keys = await cache.keys('*');
    for (const k of keys) await cache.del(k);
    return res.json({ success: true, flushed: keys.length, pattern: 'all' });
  }
  const flushed = await cache.flushPattern(pattern + '*');
  res.json({ success: true, flushed, pattern });
});

// ─── GET /api/health/rate-limits ─────────────────────────────────────────────
router.get('/rate-limits', rateLimit.light, (req, res) => {
  const { TIERS } = require('../utils/rateLimiter');
  res.json({
    success: true,
    data: {
      stats: rateLimit.stats(),
      tiers: Object.entries(TIERS).map(([name, cfg]) => ({
        name,
        max:       cfg.max,
        windowSec: cfg.windowMs / 1000,
        blockSec:  cfg.blockDurationMs / 1000,
        message:   cfg.message,
      })),
    },
  });
});

module.exports = router;
