// routes/apiAccess.js — Public Developer & Institutional API
// Phase 5 Month 24: Enterprise Features
//
// Endpoints:
//   POST   /api/enterprise/keys                  — Generate API key
//   GET    /api/enterprise/keys                  — List my keys
//   DELETE /api/enterprise/keys/:keyId           — Revoke key
//   GET    /api/enterprise/keys/:keyId/usage     — Usage stats
//   POST   /api/enterprise/keys/:keyId/friction  — Upload custom friction model
//   GET    /api/enterprise/team                  — Get team account
//   POST   /api/enterprise/team                  — Create/update team
//   POST   /api/enterprise/team/invite           — Invite team member
//   GET    /api/enterprise/docs                  — API documentation
//   GET    /api/enterprise/bulk-export           — Bulk stock data export (requires key)
//   GET    /api/enterprise/tiers                 — Tier info (public)
//
// Middleware:
//   requireApiKey  — validates X-API-Key header or ?apiKey= query param

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');

const ApiKey      = require('../models/ApiKey');
const TeamAccount = require('../models/TeamAccount');
const { cache, TTL } = require('../utils/cacheLayer');
const { rateLimit }  = require('../utils/rateLimiter');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
}

// Middleware: Authenticate via API Key header
async function requireApiKey(req, res, next) {
  const rawKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!rawKey) {
    return res.status(401).json({
      error:   'API key required',
      hint:    'Add X-API-Key header or ?apiKey= query param',
      docs:    '/api/enterprise/docs',
    });
  }

  const apiKey = await ApiKey.findOne({ key: rawKey });
  if (!apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  if (apiKey.status !== 'ACTIVE') {
    return res.status(403).json({ error: `API key is ${apiKey.status.toLowerCase()}` });
  }
  if (!apiKey.hasQuota()) {
    return res.status(429).json({
      error:        'Monthly quota exceeded',
      monthlyLimit: apiKey.monthlyLimit,
      monthlyCalls: apiKey.monthlyCalls,
      resetDate:    new Date(apiKey.lastResetDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Track usage async (don't await — keep response fast)
  apiKey.incrementUsage(getIp(req)).catch(() => {});

  // Attach to request for downstream use
  req.apiKey = apiKey;
  next();
}

// Middleware: require userId in body or query (basic auth for dashboard)
function requireUserId(req, res, next) {
  const userId = req.body?.userId || req.query?.userId || req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'userId required' });
  req.userId = userId;
  next();
}

// ─── Tier Info (PUBLIC) ───────────────────────────────────────────────────────
router.get('/tiers', rateLimit.light, (req, res) => {
  res.json({
    success: true,
    tiers: [
      {
        id:           'DEVELOPER',
        name:         'Developer',
        badge:        'Free Forever',
        priceINR:     0,
        monthlyLimit: 1_000,
        rateLimit:    '60 req/min',
        features: [
          'Stock prices & OHLC',
          'Search & autocomplete',
          'Financial ratios',
          'News feed',
          'NSE/BSE market data',
        ],
        ideal: 'Side projects, learning, prototypes',
      },
      {
        id:           'PRO_API',
        name:         'Pro API',
        badge:        '₹2,999/month',
        priceINR:     2_999,
        monthlyLimit: 50_000,
        rateLimit:    '300 req/min',
        features: [
          'Everything in Developer',
          'Historical Scanner API',
          'Regime Analysis API',
          'Portfolio optimization endpoints',
          'Capital Reality & scalability',
          'Execution Reality (friction model)',
          'Bulk data export (CSV/JSON)',
          'Priority support',
        ],
        ideal: 'Quant researchers, algo traders, fintech startups',
      },
      {
        id:           'INSTITUTIONAL',
        name:         'Institutional',
        badge:        '₹9,999/month',
        priceINR:     9_999,
        monthlyLimit: 1_000_000,
        rateLimit:    '1,000 req/min',
        features: [
          'Everything in Pro API',
          'Team accounts (up to 10 members)',
          'Custom friction model upload',
          'White-label option',
          'Dedicated API subdomain',
          'Custom rate limit negotiation',
          'SLA guarantee (99.5% uptime)',
          'Dedicated account manager',
          'API usage analytics dashboard',
        ],
        ideal: 'Hedge funds, family offices, brokerages, research firms',
      },
    ],
  });
});

// ─── API Documentation (PUBLIC) ───────────────────────────────────────────────
router.get('/docs', rateLimit.light, (req, res) => {
  res.json({
    success:  true,
    version:  '1.0.0',
    baseUrl:  '/api',
    auth:     'X-API-Key header or ?apiKey= query param',
    docs_url: 'https://stockvision.in/docs/api',
    endpoints: [
      {
        path:    '/stocks/:symbol',
        method:  'GET',
        desc:    'Live price, OHLC, 52w H/L, volume',
        example: '/api/stocks/RELIANCE.NS',
        tier:    'DEVELOPER',
        params:  { symbol: 'NSE symbol with .NS suffix (e.g. TCS.NS)' },
      },
      {
        path:    '/search',
        method:  'GET',
        desc:    'Autocomplete stock search',
        example: '/api/search?q=reliance',
        tier:    'DEVELOPER',
        params:  { q: 'Search query' },
      },
      {
        path:    '/financials/:symbol',
        method:  'GET',
        desc:    'P&L, Balance Sheet, Cash Flow, Ratios',
        example: '/api/financials/TCS.NS',
        tier:    'DEVELOPER',
        params:  { symbol: 'NSE symbol' },
      },
      {
        path:    '/news/:symbol',
        method:  'GET',
        desc:    'Latest stock news',
        example: '/api/news/INFY.NS',
        tier:    'DEVELOPER',
        params:  { limit: 'Number of articles (default 10)' },
      },
      {
        path:    '/indices',
        method:  'GET',
        desc:    'Nifty 50, Sensex, Bank Nifty, Gold prices',
        example: '/api/indices',
        tier:    'DEVELOPER',
        params:  {},
      },
      {
        path:    '/scanner/analyze',
        method:  'POST',
        desc:    'Historical scanner — success rate for buy/sell strategy',
        example: 'POST /api/scanner/analyze',
        tier:    'PRO_API',
        body:    { symbol: 'TCS.NS', targetPercent: 15, holdingDays: 30 },
      },
      {
        path:    '/regime/current',
        method:  'GET',
        desc:    'Current market regime (Bull/Bear/Sideways)',
        example: '/api/regime/current',
        tier:    'PRO_API',
        params:  {},
      },
      {
        path:    '/portfolio/analyze',
        method:  'POST',
        desc:    'Portfolio historical analysis & optimization',
        example: 'POST /api/portfolio/analyze',
        tier:    'PRO_API',
        body:    { stocks: [{ symbol: 'TCS.NS', weight: 50 }, { symbol: 'INFY.NS', weight: 50 }], capital: 100000 },
      },
      {
        path:    '/enterprise/bulk-export',
        method:  'GET',
        desc:    'Bulk download multiple stock prices',
        example: '/api/enterprise/bulk-export?symbols=TCS.NS,INFY.NS,RELIANCE.NS',
        tier:    'PRO_API',
        params:  { symbols: 'Comma-separated symbols (max 50 for PRO_API, 500 for INSTITUTIONAL)', format: 'json | csv' },
      },
      {
        path:    '/capital/analyze',
        method:  'POST',
        desc:    'Capital scalability analysis by amount tier',
        example: 'POST /api/capital/analyze',
        tier:    'PRO_API',
        body:    { symbol: 'HDFC.NS', amounts: [10000, 100000, 1000000] },
      },
    ],
    rate_limits: {
      DEVELOPER:    '60 requests/minute, 1,000/month',
      PRO_API:      '300 requests/minute, 50,000/month',
      INSTITUTIONAL: '1,000 requests/minute, 1,000,000/month',
    },
    errors: {
      401: 'Missing or invalid API key',
      403: 'Key suspended or endpoint not allowed for your tier',
      429: 'Rate limit or monthly quota exceeded',
      500: 'Server error',
    },
    sdks: {
      javascript: 'npm install stockvision-sdk  (coming soon)',
      python:     'pip install stockvision       (coming soon)',
    },
  });
});

// ─── Generate API Key ─────────────────────────────────────────────────────────
router.post('/keys', rateLimit.standard, requireUserId, async (req, res) => {
  try {
    const { email, name, tier = 'DEVELOPER', orgName } = req.body;
    const { userId } = req;

    if (!email) return res.status(400).json({ error: 'email is required' });

    // Limit keys per user
    const existing = await ApiKey.countDocuments({ userId, status: { $ne: 'REVOKED' } });
    const maxKeys  = tier === 'INSTITUTIONAL' ? 5 : tier === 'PRO_API' ? 3 : 2;
    if (existing >= maxKeys) {
      return res.status(400).json({
        error:   `Maximum ${maxKeys} active API keys allowed for ${tier} tier`,
        current: existing,
      });
    }

    // Generate key
    const { key, keyPrefix } = ApiKey.generateKey(tier);
    const tierConfig = ApiKey.getTierConfig(tier);

    const newKey = await ApiKey.create({
      key,
      keyPrefix,
      userId,
      email,
      name: name || `${tier} Key ${existing + 1}`,
      orgName,
      tier,
      monthlyLimit: tierConfig.monthlyLimit,
      rateLimit:    tierConfig.rateLimit,
      isTestKey:    req.body.isTestKey || false,
    });

    res.status(201).json({
      success: true,
      message: 'API key created. Store it securely — it will NOT be shown again.',
      apiKey: {
        id:           newKey._id,
        key:          key,   // Only time we return the full key!
        keyPrefix:    keyPrefix,
        tier,
        monthlyLimit: tierConfig.monthlyLimit,
        rateLimit:    tierConfig.rateLimit,
        createdAt:    newKey.createdAt,
      },
    });
  } catch (err) {
    console.error('[apiAccess] generateKey error:', err.message);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// ─── List My Keys ─────────────────────────────────────────────────────────────
router.get('/keys', rateLimit.standard, requireUserId, async (req, res) => {
  try {
    const keys = await ApiKey.find(
      { userId: req.userId, status: { $ne: 'REVOKED' } },
      '-key'   // Never return the full key in list view
    ).lean();

    const tierConfig = (tier) => ApiKey.getTierConfig(tier);

    res.json({
      success: true,
      keys: keys.map(k => ({
        id:           k._id,
        keyPrefix:    k.keyPrefix,
        name:         k.name,
        tier:         k.tier,
        tierLabel:    tierConfig(k.tier).label || k.tier,
        status:       k.status,
        totalCalls:   k.totalCalls,
        monthlyCalls: k.monthlyCalls,
        monthlyLimit: k.monthlyLimit,
        usagePercent: Math.round((k.monthlyCalls / k.monthlyLimit) * 100),
        lastUsedAt:   k.lastUsedAt,
        createdAt:    k.createdAt,
        isTestKey:    k.isTestKey,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list keys' });
  }
});

// ─── Get Key Usage ────────────────────────────────────────────────────────────
router.get('/keys/:keyId/usage', rateLimit.standard, requireUserId, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({ _id: req.params.keyId, userId: req.userId }, '-key');
    if (!apiKey) return res.status(404).json({ error: 'Key not found' });

    const tierConfig = ApiKey.getTierConfig(apiKey.tier);
    const resetDate  = new Date(apiKey.lastResetDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysToReset = Math.ceil((resetDate - Date.now()) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      usage: {
        keyPrefix:     apiKey.keyPrefix,
        tier:          apiKey.tier,
        totalCalls:    apiKey.totalCalls,
        monthlyCalls:  apiKey.monthlyCalls,
        monthlyLimit:  apiKey.monthlyLimit,
        remaining:     Math.max(0, apiKey.monthlyLimit - apiKey.monthlyCalls),
        usagePercent:  Math.round((apiKey.monthlyCalls / apiKey.monthlyLimit) * 100),
        resetDate:     resetDate.toISOString(),
        daysToReset,
        lastUsedAt:    apiKey.lastUsedAt,
        lastUsedFrom:  apiKey.lastUsedFrom,
        status:        apiKey.status,
        features:      tierConfig.features,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

// ─── Revoke Key ───────────────────────────────────────────────────────────────
router.delete('/keys/:keyId', rateLimit.standard, requireUserId, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({ _id: req.params.keyId, userId: req.userId });
    if (!apiKey) return res.status(404).json({ error: 'Key not found' });

    apiKey.status = 'REVOKED';
    await apiKey.save();

    res.json({ success: true, message: 'API key revoked successfully', keyPrefix: apiKey.keyPrefix });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke key' });
  }
});

// ─── Upload Custom Friction Model ─────────────────────────────────────────────
router.post('/keys/:keyId/friction', rateLimit.standard, requireUserId, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({ _id: req.params.keyId, userId: req.userId });
    if (!apiKey) return res.status(404).json({ error: 'Key not found' });
    if (apiKey.tier !== 'INSTITUTIONAL') {
      return res.status(403).json({ error: 'Custom friction models require Institutional tier' });
    }

    const {
      brokeragePercent   = 0.03,
      sttPercent         = 0.001,
      gstPercent         = 18,
      exchangeTxnPercent = 0.00345,
      dpCharges          = 13.5,
      stampDutyPercent   = 0.003,
    } = req.body;

    apiKey.customFrictionModel = {
      brokeragePercent,
      sttPercent,
      gstPercent,
      exchangeTxnPercent,
      dpCharges,
      stampDutyPercent,
    };
    await apiKey.save();

    res.json({
      success: true,
      message: 'Custom friction model saved',
      model:   apiKey.customFrictionModel,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save friction model' });
  }
});

// ─── Create / Get Team Account ────────────────────────────────────────────────
router.get('/team', rateLimit.standard, requireUserId, async (req, res) => {
  try {
    const team = await TeamAccount.findOne({ ownerId: req.userId });
    if (!team) return res.json({ success: true, team: null });

    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get team' });
  }
});

router.post('/team', rateLimit.standard, requireUserId, async (req, res) => {
  try {
    const { orgName, orgType, ownerEmail, whiteLabel } = req.body;
    if (!orgName) return res.status(400).json({ error: 'orgName required' });

    // Check user has institutional-tier API key
    const instKey = await ApiKey.findOne({ userId: req.userId, tier: 'INSTITUTIONAL', status: 'ACTIVE' });
    if (!instKey) {
      return res.status(403).json({
        error: 'Team accounts require an active Institutional API key',
        hint:  'Upgrade at /institutional to get a key first',
      });
    }

    let team = await TeamAccount.findOne({ ownerId: req.userId });
    if (team) {
      // Update existing
      team.orgName   = orgName || team.orgName;
      team.orgType   = orgType || team.orgType;
      if (whiteLabel) team.whiteLabel = { ...team.whiteLabel, ...whiteLabel };
      await team.save();
    } else {
      // Create new
      const teamId = TeamAccount.generateTeamId(orgName);
      team = await TeamAccount.create({
        teamId,
        orgName,
        orgType: orgType || 'OTHER',
        ownerId: req.userId,
        ownerEmail: ownerEmail || '',
        members: [{
          userId: req.userId,
          email:  ownerEmail || '',
          role:   'OWNER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        }],
        sharedApiKeyId: instKey._id.toString(),
      });
    }

    res.json({ success: true, team });
  } catch (err) {
    console.error('[apiAccess] createTeam error:', err.message);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// ─── Invite Team Member ───────────────────────────────────────────────────────
router.post('/team/invite', rateLimit.standard, requireUserId, async (req, res) => {
  try {
    const team = await TeamAccount.findOne({ ownerId: req.userId });
    if (!team) return res.status(404).json({ error: 'Team not found. Create a team first.' });

    const { email, role = 'ANALYST' } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({ error: `Team is at maximum capacity (${team.maxMembers} members)` });
    }

    const alreadyMember = team.members.find(m => m.email === email.toLowerCase());
    if (alreadyMember) return res.status(400).json({ error: 'This email is already a team member' });

    const inviteToken = crypto.randomBytes(16).toString('hex');
    team.members.push({
      email:       email.toLowerCase(),
      role,
      status:      'INVITED',
      inviteToken,
      addedAt:     new Date(),
    });
    await team.save();

    // In production: send invite email here
    // For now: return the invite link
    const inviteLink = `/join-team?token=${inviteToken}&team=${team.teamId}`;

    res.json({
      success:    true,
      message:    `Invitation sent to ${email}`,
      inviteLink, // For dev/testing — in production this would be emailed
      teamId:     team.teamId,
      orgName:    team.orgName,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

// ─── Bulk Export (requires API Key) ───────────────────────────────────────────
router.get('/bulk-export', rateLimit.standard, requireApiKey, async (req, res) => {
  try {
    const symbols = (req.query.symbols || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const format  = req.query.format === 'csv' ? 'csv' : 'json';

    if (!symbols.length) {
      return res.status(400).json({ error: 'symbols query param required (comma-separated)' });
    }

    // Limit by tier
    const maxSymbols = req.apiKey.tier === 'INSTITUTIONAL' ? 500 : req.apiKey.tier === 'PRO_API' ? 50 : 10;
    if (symbols.length > maxSymbols) {
      return res.status(400).json({
        error:   `Your tier allows max ${maxSymbols} symbols per bulk export`,
        tier:    req.apiKey.tier,
        hint:    'Upgrade to Institutional for up to 500 symbols',
      });
    }

    // Fetch from cache / DB
    const Stock = require('../models/Stock');
    const cacheKey = `bulk:${symbols.sort().join(',')}`;
    const cached   = await cache.get(cacheKey);
    let stocks;

    if (cached) {
      stocks = cached;
    } else {
      stocks = await Stock.find({ symbol: { $in: symbols } }).lean();
      await cache.set(cacheKey, stocks, TTL.SHORT);
    }

    // Build results (include nulls for missing symbols)
    const results = symbols.map(sym => {
      const s = stocks.find(x => x.symbol === sym);
      if (!s) return { symbol: sym, error: 'Not found' };
      return {
        symbol:        s.symbol,
        name:          s.name,
        price:         s.currentPrice,
        open:          s.open,
        high:          s.high,
        low:           s.low,
        close:         s.previousClose,
        change:        s.change,
        changePercent: s.changePercent,
        volume:        s.volume,
        high52w:       s.high52w,
        low52w:        s.low52w,
        marketCap:     s.marketCap,
        lastUpdated:   s.lastUpdated,
      };
    });

    if (format === 'csv') {
      const headers = ['symbol','name','price','open','high','low','close','change','changePercent','volume','high52w','low52w','marketCap','lastUpdated'];
      const rows    = results.map(r =>
        headers.map(h => {
          const v = r[h];
          return v === undefined ? '' : typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
        }).join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="stockvision-bulk-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json({
      success:   true,
      count:     results.length,
      timestamp: new Date().toISOString(),
      data:      results,
      usage: {
        tier:         req.apiKey.tier,
        monthlyCalls: req.apiKey.monthlyCalls,
        monthlyLimit: req.apiKey.monthlyLimit,
      },
    });
  } catch (err) {
    console.error('[apiAccess] bulkExport error:', err.message);
    res.status(500).json({ error: 'Bulk export failed' });
  }
});

// ─── API Key Validate (public check endpoint) ─────────────────────────────────
router.get('/keys/validate', rateLimit.standard, requireApiKey, (req, res) => {
  const tierConfig = ApiKey.getTierConfig(req.apiKey.tier);
  res.json({
    success: true,
    valid:   true,
    key: {
      keyPrefix:    req.apiKey.keyPrefix,
      tier:         req.apiKey.tier,
      tierLabel:    tierConfig.label,
      features:     tierConfig.features,
      monthlyCalls: req.apiKey.monthlyCalls,
      monthlyLimit: req.apiKey.monthlyLimit,
      status:       req.apiKey.status,
    },
  });
});

module.exports = router;
module.exports.requireApiKey = requireApiKey;
