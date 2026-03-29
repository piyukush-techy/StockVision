// models/Portfolio.js — Month 32: Advanced Portfolio Tracker
// Stores actual buy trades (not hypothetical allocations like PortfolioReport)
// Each sessionId can have one portfolio with multiple holdings, each with multiple trades
// JAI SHREE GANESH 🙏

const mongoose = require('mongoose');

// Individual trade (one buy transaction)
const TradeSchema = new mongoose.Schema({
  tradeId:   { type: String, required: true },   // uuid-style client ID
  symbol:    { type: String, required: true, uppercase: true },
  name:      { type: String, default: '' },
  quantity:  { type: Number, required: true, min: 0 },
  buyPrice:  { type: Number, required: true, min: 0 },
  buyDate:   { type: Date,   required: true },
  exchange:  { type: String, default: 'NSE' },
  notes:     { type: String, default: '' },
}, { _id: false });

// Main portfolio document (one per session)
const PortfolioSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  name:      { type: String, default: 'My Portfolio' },
  trades:    [TradeSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

PortfolioSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Portfolio', PortfolioSchema);
