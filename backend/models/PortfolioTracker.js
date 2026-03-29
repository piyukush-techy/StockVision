// models/PortfolioTracker.js — Advanced Portfolio Tracker
// Phase 6 Month 32 — Real trade entries with P&L, XIRR, tax harvesting
// JAI SHREE GANESH 🙏

const mongoose = require('mongoose');

// Individual trade entry
const tradeSchema = new mongoose.Schema({
  symbol:    { type: String, required: true, uppercase: true },
  name:      { type: String, default: '' },
  quantity:  { type: Number, required: true, min: 1 },
  buyPrice:  { type: Number, required: true, min: 0 },
  buyDate:   { type: Date,   required: true },
  exchange:  { type: String, default: 'NSE', enum: ['NSE', 'BSE'] },
  notes:     { type: String, default: '' },
}, { _id: true });

const portfolioTrackerSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  name:      { type: String, default: 'My Portfolio', trim: true },
  trades:    [tradeSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

portfolioTrackerSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('PortfolioTracker', portfolioTrackerSchema);
