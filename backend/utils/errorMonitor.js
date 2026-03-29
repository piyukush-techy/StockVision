// errorMonitor.js — Phase 5 Month 23
// Lightweight error monitoring:
//   - Works standalone (no Sentry account needed in dev)
//   - Automatically integrates with Sentry if DSN is set
//   - Error aggregation, deduplication, and trend tracking
//   - Provides /api/health/errors endpoint for the dashboard

const os = require('os');

// ─── In-process error store ───────────────────────────────────────────────────
class ErrorStore {
  constructor(maxErrors = 500) {
    this.errors   = [];           // recent individual errors
    this.counts   = new Map();    // fingerprint → count
    this.maxErrors = maxErrors;
    this.startedAt = Date.now();
  }

  add(error, context = {}) {
    const fingerprint = this._fingerprint(error);
    const count       = (this.counts.get(fingerprint) || 0) + 1;
    this.counts.set(fingerprint, count);

    const entry = {
      id:          Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      fingerprint,
      message:     error.message || String(error),
      stack:       error.stack?.split('\n').slice(0, 5).join('\n'),  // first 5 lines only
      type:        error.constructor?.name || 'Error',
      timestamp:   new Date().toISOString(),
      count,
      path:        context.path,
      method:      context.method,
      statusCode:  context.statusCode,
      userAgent:   context.userAgent?.slice(0, 100),
    };

    this.errors.unshift(entry);
    if (this.errors.length > this.maxErrors) this.errors.pop();
    return entry;
  }

  _fingerprint(error) {
    // Group errors by message + first stack frame
    const msg   = (error.message || '').replace(/\b\d+\b/g, 'N');  // normalise numbers
    const frame = error.stack?.split('\n')[1]?.trim().replace(/:\d+:\d+\)/, ')') || '';
    return require('crypto').createHash('md5').update(msg + frame).digest('hex').slice(0, 8);
  }

  summary(limit = 20) {
    // Deduplicated error groups sorted by count
    const seen     = new Set();
    const groups   = [];
    for (const e of this.errors) {
      if (!seen.has(e.fingerprint)) {
        seen.add(e.fingerprint);
        groups.push({ ...e, total: this.counts.get(e.fingerprint) || e.count });
      }
    }
    groups.sort((a, b) => b.total - a.total);
    return groups.slice(0, limit);
  }

  recent(limit = 10) { return this.errors.slice(0, limit); }

  stats() {
    const total    = [...this.counts.values()].reduce((s, c) => s + c, 0);
    const uptimeMs = Date.now() - this.startedAt;
    const errRate  = +(total / (uptimeMs / 60000)).toFixed(2); // errors/min
    return {
      total,
      unique:     this.counts.size,
      errorsPerMin: errRate,
      uptimeHours: +(uptimeMs / 3_600_000).toFixed(2),
    };
  }

  clear() { this.errors = []; this.counts.clear(); }
}

const store = new ErrorStore();

// ─── Sentry integration (optional) ───────────────────────────────────────────
let Sentry = null;
if (process.env.SENTRY_DSN) {
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn:         process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,  // 10% transaction tracing
      beforeSend(event) {
        // Strip PII from request data
        if (event.request?.headers?.authorization) {
          event.request.headers.authorization = '[REDACTED]';
        }
        return event;
      },
    });
    console.log('✅ Sentry error monitoring initialised');
  } catch {
    console.log('ℹ️  @sentry/node not installed — using built-in error monitor only');
  }
}

// ─── Express error handler middleware ─────────────────────────────────────────
function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;

  // Log to our store
  store.add(err, {
    path:       req.path,
    method:     req.method,
    statusCode,
    userAgent:  req.headers['user-agent'],
  });

  // Log to Sentry if configured
  if (Sentry) Sentry.captureException(err);

  // Console log in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`❌ [${statusCode}] ${req.method} ${req.path} — ${err.message}`);
  }

  // Don't leak internals in production
  res.status(statusCode).json({
    error:   statusCode >= 500 ? 'Internal Server Error' : err.message,
    message: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    path:    req.path,
  });
}

// ─── Request logger with timing ───────────────────────────────────────────────
const requestMetrics = {
  total:       0,
  errors:      0,
  totalDuration: 0,
  byRoute:     new Map(),   // route → { count, totalDuration, errors }
  slowest:     [],          // top 10 slowest requests
};

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  requestMetrics.total++;

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    requestMetrics.totalDuration += durationMs;

    const route = `${req.method} ${req.route?.path || req.path}`;
    const rm    = requestMetrics.byRoute.get(route) || { count: 0, totalDuration: 0, errors: 0 };
    rm.count++;
    rm.totalDuration += durationMs;
    if (res.statusCode >= 400) { rm.errors++; requestMetrics.errors++; }
    requestMetrics.byRoute.set(route, rm);

    // Track slow requests (> 2s)
    if (durationMs > 2000) {
      requestMetrics.slowest.unshift({
        route, durationMs: Math.round(durationMs), status: res.statusCode,
        timestamp: new Date().toISOString(),
      });
      if (requestMetrics.slowest.length > 10) requestMetrics.slowest.pop();
    }

    // Log slow requests
    if (durationMs > 3000) {
      console.warn(`⚠️  SLOW: ${route} took ${Math.round(durationMs)}ms`);
    }
  });

  next();
}

function getRequestMetrics() {
  const routes = [...requestMetrics.byRoute.entries()]
    .map(([route, data]) => ({
      route,
      count:      data.count,
      avgMs:      data.count > 0 ? +(data.totalDuration / data.count).toFixed(1) : 0,
      errorRate:  data.count > 0 ? +((data.errors / data.count) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    total:         requestMetrics.total,
    errors:        requestMetrics.errors,
    errorRate:     requestMetrics.total > 0 ? +((requestMetrics.errors / requestMetrics.total) * 100).toFixed(2) : 0,
    avgDurationMs: requestMetrics.total > 0 ? +(requestMetrics.totalDuration / requestMetrics.total).toFixed(1) : 0,
    topRoutes:     routes,
    slowestRoutes: requestMetrics.slowest,
  };
}

// ─── System health ────────────────────────────────────────────────────────────
function getSystemHealth() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const loadAvg  = os.loadavg();

  return {
    uptime:    process.uptime(),
    pid:       process.pid,
    node:      process.version,
    platform:  process.platform,
    memory: {
      heapUsedMB:   +(memUsage.heapUsed  / 1024 / 1024).toFixed(1),
      heapTotalMB:  +(memUsage.heapTotal / 1024 / 1024).toFixed(1),
      rssMB:        +(memUsage.rss       / 1024 / 1024).toFixed(1),
      externalMB:   +(memUsage.external  / 1024 / 1024).toFixed(1),
      heapUsedPct:  +(memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(1),
    },
    cpu: {
      userMs:   +(cpuUsage.user   / 1000).toFixed(1),
      systemMs: +(cpuUsage.system / 1000).toFixed(1),
      loadAvg1m:  +loadAvg[0].toFixed(2),
      loadAvg5m:  +loadAvg[1].toFixed(2),
      cores:    os.cpus().length,
    },
    os: {
      hostname:  os.hostname(),
      freeMem:   +(os.freemem()  / 1024 / 1024).toFixed(0) + 'MB',
      totalMem:  +(os.totalmem() / 1024 / 1024).toFixed(0) + 'MB',
    },
  };
}

module.exports = {
  errorHandler,
  requestLogger,
  getRequestMetrics,
  getSystemHealth,
  errorStore: store,
  Sentry,
};
