// server.js — StockVision Backend
// Phase 5 Month 23: Performance & Reliability enhancements added
require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');

// ── Phase 5 Month 23: Performance & reliability ────────────────────────────
const { cache }                = require('./utils/cacheLayer');
const { rateLimit }            = require('./utils/rateLimiter');
const { errorHandler, requestLogger } = require('./utils/errorMonitor');

// ── Route imports ──────────────────────────────────────────────────────────
const apiRoutes              = require('./routes/api');
const watchlistAlertRoutes   = require('./routes/watchlistAlerts');
const { startPriceUpdates }  = require('./utils/priceScheduler');
const { startAlertChecker }  = require('./utils/alertChecker');
const financialsRoutes       = require('./routes/financials');
const ownershipRoutes        = require('./routes/ownership');
const newsRoutes             = require('./routes/news');
const technicalsRoutes       = require('./routes/technicals');
const sentimentRoutes        = require('./routes/sentiment');
const eventsRoutes           = require('./routes/events');
const scannerRoutes          = require('./routes/scanner');
const regimeRoutes           = require('./routes/regime');
const regimeProxyRoutes      = require('./routes/regimeProxy');
const comparativeRoutes      = require('./routes/comparative');
const deepComparativeRoutes  = require('./routes/deepComparative');
const dataQualityRoutes      = require('./routes/dataQuality');
const executionRealityRoutes = require('./routes/executionReality');
const capitalRoutes          = require('./routes/capital');
const portfolioRoutes        = require('./routes/portfolio');
const psychologyRoutes       = require('./routes/psychology');
const diversificationRoutes  = require('./routes/diversification');
const predictionsRoutes      = require('./routes/predictions');
const capitalWizardRoutes    = require('./routes/capitalWizard');
const healthRoutes           = require('./routes/health');
// Phase 5 Month 24: Enterprise Features
const apiAccessRoutes        = require('./routes/apiAccess');
// Phase 5 Month 25: Integrations
const integrationsRoutes     = require('./routes/integrations');
// Month 28: Real OHLC candlestick data
const ohlcRoutes             = require('./routes/ohlc');
const yfProxyRoutes          = require('./routes/yfProxy');

const app = express();

// ── Security & CORS ────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'https://stockvision-1-7dpj.onrender.com',  // ✅ production frontend
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow curl / non-browser
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Allow any local network IP for testing PWA on phone
    if (/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin)) return callback(null, true);
    callback(new Error('CORS not allowed: ' + origin));
  },
  credentials: true,
}));

// ── Response compression (if compression package available) ───────────────
try {
  const compression = require('compression');
  app.use(compression({ level: 6, threshold: 1024 }));
  console.log('✅ Response compression enabled');
} catch {
  console.log('ℹ️  compression not installed — run: npm install compression');
}

// ── Body parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Phase 5: Request logging & performance tracking ────────────────────────
app.use(requestLogger);

// ── Security headers ───────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Powered-By', 'StockVision');
  next();
});

// ── Health & monitoring routes (no rate limit on health check) ────────────
app.use('/api/health', healthRoutes);

// ── Routes with tiered rate limiting ──────────────────────────────────────
app.use('/api',               rateLimit.standard, apiRoutes);
app.use('/api',               rateLimit.standard, watchlistAlertRoutes);
app.use('/api',               rateLimit.standard, financialsRoutes);
app.use('/api',               rateLimit.standard, ownershipRoutes);
app.use('/api',               rateLimit.standard, newsRoutes);
app.use('/api/technicals',    rateLimit.standard, technicalsRoutes);
app.use('/api/sentiment',     rateLimit.standard, sentimentRoutes);
app.use('/api/events',        rateLimit.standard, eventsRoutes);

// Heavy compute — stricter limits
app.use('/api/scanner',          rateLimit.heavy,    scannerRoutes);
app.use('/api/regime',           rateLimit.heavy,    regimeRoutes);
app.use('/api/regime-proxy',     rateLimit.standard, regimeProxyRoutes);
app.use('/api/comparative',      rateLimit.heavy,    comparativeRoutes);
app.use('/api/deep-comparative', rateLimit.heavy,    deepComparativeRoutes);
app.use('/api/data-quality',     rateLimit.standard, dataQualityRoutes);
app.use('/api/execution-reality',rateLimit.heavy,    executionRealityRoutes);
app.use('/api/capital',          rateLimit.heavy,    capitalRoutes);
app.use('/api/portfolio',        rateLimit.heavy,    portfolioRoutes);
app.use('/api/psychology',       rateLimit.heavy,    psychologyRoutes);
app.use('/api/diversification',  rateLimit.heavy,    diversificationRoutes);
app.use('/api/predictions',      rateLimit.heavy,    predictionsRoutes);
app.use('/api/capital-wizard',   rateLimit.heavy,    capitalWizardRoutes);
// Phase 5 Month 24: Enterprise / API Access
app.use('/api/enterprise',       rateLimit.standard, apiAccessRoutes);
// Phase 5 Month 25: Integrations
app.use('/api/integrations',     rateLimit.standard, integrationsRoutes);
// Month 28: Real OHLC candlestick data
app.use('/api/ohlc',             rateLimit.standard, ohlcRoutes);
app.use('/api/yf-proxy',         rateLimit.standard, yfProxyRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 StockVision API — Phase 5 Enterprise Edition',
    version: '5.24.0',
    status:  'running',
    phase5: {
      caching:         cache.getType() + ' cache active',
      rateLimiting:    'tiered (heavy: 10/min, standard: 60/min)',
      errorMonitor:    'built-in + optional Sentry',
      healthDashboard: 'GET /api/health/detailed',
      enterprise:      'GET /api/enterprise/docs',
      apiAccess:       'POST /api/enterprise/keys',
    },
  });
});

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// ── Phase 5: Centralised error handler ────────────────────────────────────
app.use(errorHandler);

// ── Database & server startup ──────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not set. Create .env file.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  startPriceUpdates();
  startAlertChecker();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`🔔 Alert checker: active`);
    console.log(`🛡️  Rate limiting: active`);
    console.log(`📈 Health: http://localhost:${PORT}/api/health`);
    console.log(`📉 Errors: http://localhost:${PORT}/api/health/errors`);
    console.log(`💾 Cache:  ${cache.getType()} backend`);
  });
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  mongoose.connection.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
