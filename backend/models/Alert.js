const mongoose = require('mongoose');

/**
 * Alert Model - Phase 1 Month 2
 * Price alerts - notify when stock goes above/below target
 */
const alertSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },

  symbol: {
    type: String,
    required: true,
    uppercase: true
  },

  stockName: {
    type: String,
    required: true
  },

  condition: {
    type: String,
    enum: ['above', 'below'],
    required: true
  },

  targetPrice: {
    type: Number,
    required: true
  },

  currentPriceWhenSet: {
    type: Number,
    default: 0
  },

  isActive: {
    type: Boolean,
    default: true
  },

  triggered: {
    type: Boolean,
    default: false
  },

  triggeredAt: {
    type: Date,
    default: null
  },

  triggeredPrice: {
    type: Number,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

alertSchema.index({ sessionId: 1, isActive: 1 });
alertSchema.index({ symbol: 1, isActive: 1 });

const Alert = mongoose.model('Alert', alertSchema);
module.exports = Alert;
