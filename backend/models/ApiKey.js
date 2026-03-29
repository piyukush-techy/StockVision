// models/ApiKey.js — Developer & Institutional API Key Management
// Phase 5 Month 24: Enterprise Features
const mongoose = require('mongoose');
const crypto   = require('crypto');

const apiKeySchema = new mongoose.Schema({
  // Key itself
  key: {
    type: String,
    unique: true,
    index: true,
  },
  keyPrefix: String,   // First 8 chars shown in UI (sv_live_abcd1234...)

  // Owner
  userId: { type: String, required: true, index: true }, // Firebase UID or sessionId
  email:  { type: String, required: true, lowercase: true },
  name:   String,
  orgName: String,

  // Tier
  tier: {
    type: String,
    enum: ['DEVELOPER', 'PRO_API', 'INSTITUTIONAL'],
    default: 'DEVELOPER',
  },

  // Quota limits (per month)
  monthlyLimit: { type: Number, default: 1000 },   // API calls/month
  rateLimit:    { type: Number, default: 60 },      // calls/minute

  // Usage tracking
  totalCalls:    { type: Number, default: 0 },
  monthlyCalls:  { type: Number, default: 0 },
  lastResetDate: { type: Date, default: Date.now },
  lastUsedAt:    Date,
  lastUsedFrom:  String, // IP

  // Allowed endpoints (null = all)
  allowedEndpoints: [String],

  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'REVOKED'],
    default: 'ACTIVE',
  },
  isTestKey: { type: Boolean, default: false },

  // Custom friction model (uploaded brokerage rates)
  customFrictionModel: {
    brokeragePercent:   { type: Number, default: 0.03 },
    sttPercent:         { type: Number, default: 0.001 },
    gstPercent:         { type: Number, default: 18 },
    exchangeTxnPercent: { type: Number, default: 0.00345 },
    dpCharges:          { type: Number, default: 13.5 },
    stampDutyPercent:   { type: Number, default: 0.003 },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save hook
apiKeySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate a new API key
apiKeySchema.statics.generateKey = function(tier = 'DEVELOPER') {
  const prefix  = tier === 'INSTITUTIONAL' ? 'sv_inst_' : tier === 'PRO_API' ? 'sv_pro_' : 'sv_dev_';
  const secret  = crypto.randomBytes(24).toString('hex');
  const key     = `${prefix}${secret}`;
  const keyPrefix = key.substring(0, 16) + '...';
  return { key, keyPrefix };
};

// Hash key for DB storage (optional — store raw for simplicity at MVP stage)
apiKeySchema.statics.hashKey = function(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
};

// Reset monthly usage if needed
apiKeySchema.methods.resetMonthlyIfNeeded = function() {
  const now       = new Date();
  const lastReset = this.lastResetDate || this.createdAt;
  const monthsPassed =
    (now.getMonth() - lastReset.getMonth()) +
    12 * (now.getFullYear() - lastReset.getFullYear());
  if (monthsPassed >= 1) {
    this.monthlyCalls = 0;
    this.lastResetDate = now;
    this.save();
  }
};

// Check quota
apiKeySchema.methods.hasQuota = function() {
  if (this.status !== 'ACTIVE') return false;
  this.resetMonthlyIfNeeded();
  return this.monthlyCalls < this.monthlyLimit;
};

// Increment usage
apiKeySchema.methods.incrementUsage = function(ip) {
  this.totalCalls++;
  this.monthlyCalls++;
  this.lastUsedAt   = new Date();
  this.lastUsedFrom = ip;
  return this.save();
};

// Tier limits
apiKeySchema.statics.getTierConfig = function(tier) {
  return {
    DEVELOPER: {
      monthlyLimit: 1_000,
      rateLimit:    60,
      priceINR:     0,
      label:        'Developer (Free)',
      features:     ['stocks', 'search', 'financials', 'news'],
    },
    PRO_API: {
      monthlyLimit: 50_000,
      rateLimit:    300,
      priceINR:     2_999,
      label:        'Pro API',
      features:     ['ALL_BASIC', 'scanner', 'regime', 'portfolio', 'capital'],
    },
    INSTITUTIONAL: {
      monthlyLimit: 1_000_000,
      rateLimit:    1_000,
      priceINR:     9_999,
      label:        'Institutional',
      features:     ['ALL', 'bulk_export', 'custom_friction', 'team_accounts', 'white_label'],
    },
  }[tier] || {
    monthlyLimit: 1_000,
    rateLimit:    60,
    features:     [],
  };
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
