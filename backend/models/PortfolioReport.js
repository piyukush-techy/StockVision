// PortfolioReport.js — Month 18: Save/Share/Export Portfolio
const mongoose = require('mongoose');

const PortfolioReportSchema = new mongoose.Schema({
  // Public share ID (short, URL-safe)
  shareId: {
    type: String,
    unique: true,
    index: true,
  },
  // Session owner
  sessionId: {
    type: String,
    index: true,
  },
  // Portfolio definition
  name: { type: String, default: 'My Portfolio' },
  symbols: [String],
  weights: [Number],
  totalCapital: { type: Number, default: 100000 },
  range: { type: String, default: '3y' },
  // Snapshot of result data (stored as JSON)
  resultSnapshot: { type: mongoose.Schema.Types.Mixed },
  // Metadata
  createdAt: { type: Date, default: Date.now },
  lastViewed: { type: Date, default: Date.now },
  viewCount: { type: Number, default: 0 },
  isPublic: { type: Boolean, default: true },
});

module.exports = mongoose.model('PortfolioReport', PortfolioReportSchema);
