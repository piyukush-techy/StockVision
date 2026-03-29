const mongoose = require('mongoose');

const ownershipSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  
  // Shareholding Pattern (%)
  shareholding: {
    promoter: { type: Number, default: 0 },
    fii: { type: Number, default: 0 },
    dii: { type: Number, default: 0 },
    retail: { type: Number, default: 0 },
    pledgedShares: { type: Number, default: 0 }, // % of promoter holding
  },
  
  // Quarterly changes (% points change)
  changes: {
    promoter: { type: Number, default: 0 },
    fii: { type: Number, default: 0 },
    dii: { type: Number, default: 0 },
  },
  
  // Top shareholders
  topShareholders: [{
    name: String,
    percentage: Number
  }],
  
  // Company info for peer comparison
  companyInfo: {
    sector: String,
    industry: String,
    marketCap: Number,
    marketCapCategory: String // Large/Mid/Small cap
  },
  
  // Peer stocks (same sector)
  peers: [String], // Array of symbols
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// TTL index - delete after 24 hours
ownershipSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 86400 });

// Index for quick lookups
ownershipSchema.index({ symbol: 1 });

module.exports = mongoose.model('Ownership', ownershipSchema);
