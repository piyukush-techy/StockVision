// models/Subscription.js - User Subscription Management
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  name: String,
  tier: {
    type: String,
    enum: ['FREE', 'PRO', 'PREMIUM', 'ADMIN'],
    default: 'FREE'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  
  // Razorpay
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySubscriptionId: String,
  
  // Billing
  amount: Number,
  currency: { type: String, default: 'INR' },
  billingCycle: {
    type: String,
    enum: ['MONTHLY', 'YEARLY'],
    default: 'MONTHLY'
  },
  
  // Dates
  startDate: { type: Date, default: Date.now },
  expiryDate: Date,
  lastPaymentDate: Date,
  
  // Usage (resets monthly)
  monthlyUsage: {
    scannerRuns: { type: Number, default: 0 },
    regimeChecks: { type: Number, default: 0 },
    portfolioAnalyses: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now }
  },
  
  // ADMIN OVERRIDE (FOR YOU!)
  isAdmin: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

subscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Check active
subscriptionSchema.methods.isActive = function() {
  if (this.isAdmin || this.tier === 'ADMIN') return true; // ADMIN ALWAYS ACTIVE
  if (this.status !== 'ACTIVE') return false;
  if (this.expiryDate && this.expiryDate < new Date()) return false;
  return true;
};

// Tier limits
subscriptionSchema.statics.getTierLimits = function(tier) {
  return {
    'FREE': {
      scannerRuns: 5,
      regimeChecks: 10,
      portfolioAnalyses: 0,
      watchlists: 1,
      alerts: 5,
      features: ['search', 'watchlist', 'alerts', 'live_prices', 'news']
    },
    'PRO': {
      scannerRuns: 50,
      regimeChecks: 100,
      portfolioAnalyses: 10,
      watchlists: 5,
      alerts: 25,
      features: ['ALL_BASIC', 'financials', 'scanner', 'regime', 'sentiment']
    },
    'PREMIUM': {
      scannerRuns: 'UNLIMITED',
      regimeChecks: 'UNLIMITED',
      portfolioAnalyses: 'UNLIMITED',
      watchlists: 'UNLIMITED',
      alerts: 'UNLIMITED',
      features: ['ALL']
    },
    'ADMIN': {
      scannerRuns: 'UNLIMITED',
      regimeChecks: 'UNLIMITED',
      portfolioAnalyses: 'UNLIMITED',
      watchlists: 'UNLIMITED',
      alerts: 'UNLIMITED',
      features: ['ALL']
    }
  }[tier] || {
    scannerRuns: 5,
    regimeChecks: 10,
    features: []
  };
};

// Check feature access
subscriptionSchema.methods.hasFeatureAccess = function(feature) {
  if (this.isAdmin || this.tier === 'ADMIN') return true; // ADMIN HAS ALL
  const limits = this.constructor.getTierLimits(this.tier);
  return limits.features.includes('ALL') || limits.features.includes(feature);
};

// Can use feature
subscriptionSchema.methods.canUseFeature = function(featureName) {
  if (this.isAdmin || this.tier === 'ADMIN') return true; // NO LIMITS FOR ADMIN
  
  const limits = this.constructor.getTierLimits(this.tier);
  const limit = limits[featureName];
  
  if (limit === 'UNLIMITED') return true;
  if (!limit || limit === 0) return false;
  
  this.resetMonthlyUsageIfNeeded();
  return (this.monthlyUsage[featureName] || 0) < limit;
};

// Reset monthly
subscriptionSchema.methods.resetMonthlyUsageIfNeeded = function() {
  const now = new Date();
  const lastReset = this.monthlyUsage.lastResetDate || this.createdAt;
  const monthsPassed = (now.getMonth() - lastReset.getMonth()) + 
                       (12 * (now.getFullYear() - lastReset.getFullYear()));
  
  if (monthsPassed >= 1) {
    this.monthlyUsage = {
      scannerRuns: 0,
      regimeChecks: 0,
      portfolioAnalyses: 0,
      lastResetDate: now
    };
    this.save();
  }
};

// Increment usage
subscriptionSchema.methods.incrementUsage = function(featureName) {
  if (this.isAdmin || this.tier === 'ADMIN') return; // Don't track admin
  this.monthlyUsage[featureName] = (this.monthlyUsage[featureName] || 0) + 1;
  this.save();
};

// Get remaining
subscriptionSchema.methods.getRemainingUsage = function(featureName) {
  if (this.isAdmin || this.tier === 'ADMIN') return 'UNLIMITED';
  const limits = this.constructor.getTierLimits(this.tier);
  const limit = limits[featureName];
  if (limit === 'UNLIMITED') return 'UNLIMITED';
  if (!limit) return 0;
  this.resetMonthlyUsageIfNeeded();
  return Math.max(0, limit - (this.monthlyUsage[featureName] || 0));
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
