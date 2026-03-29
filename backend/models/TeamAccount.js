// models/TeamAccount.js — Institutional Team Accounts
// Phase 5 Month 24: Enterprise Features
const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  userId: String,
  email:  { type: String, required: true, lowercase: true },
  name:   String,
  role:   { type: String, enum: ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'], default: 'ANALYST' },
  status: { type: String, enum: ['ACTIVE', 'INVITED', 'SUSPENDED'], default: 'INVITED' },
  inviteToken: String,
  joinedAt: Date,
  addedAt:  { type: Date, default: Date.now },
}, { _id: false });

const teamAccountSchema = new mongoose.Schema({
  teamId:   { type: String, unique: true, index: true },
  orgName:  { type: String, required: true },
  orgType:  {
    type: String,
    enum: ['HEDGE_FUND', 'FAMILY_OFFICE', 'BROKERAGE', 'RESEARCH', 'FINTECH', 'CORPORATE', 'OTHER'],
    default: 'OTHER',
  },
  ownerId:  { type: String, required: true, index: true },
  ownerEmail: String,

  // Team members (max 10 for INSTITUTIONAL)
  members:  [teamMemberSchema],
  maxMembers: { type: Number, default: 10 },

  // Shared resources
  sharedWatchlists:   [String],
  sharedPortfolios:   [String],
  sharedApiKeyId:     String,

  // Custom branding (white-label)
  whiteLabel: {
    enabled:      { type: Boolean, default: false },
    orgLogoUrl:   String,
    orgColorHex:  String,
    customDomain: String,
    orgTagline:   String,
  },

  // Subscription
  tier:      { type: String, default: 'INSTITUTIONAL' },
  status:    { type: String, enum: ['ACTIVE', 'SUSPENDED', 'EXPIRED'], default: 'ACTIVE' },
  expiresAt: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

teamAccountSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate a unique team ID
teamAccountSchema.statics.generateTeamId = function(orgName) {
  const slug  = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
  const rand  = Math.random().toString(36).substring(2, 7);
  return `${slug}-${rand}`;
};

module.exports = mongoose.model('TeamAccount', teamAccountSchema);
