const mongoose = require('mongoose');

/**
 * Watchlist Model - Phase 1 Month 2
 * Stores user watchlists with multiple stocks
 */
const watchlistSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },

  name: {
    type: String,
    required: true,
    default: 'My Watchlist',
    trim: true
  },

  stocks: [{
    symbol: {
      type: String,
      required: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index
watchlistSchema.index({ sessionId: 1, name: 1 });

const Watchlist = mongoose.model('Watchlist', watchlistSchema);
module.exports = Watchlist;
