const mongoose = require('mongoose');

/**
 * Search History Model
 * Tracks user searches for "Recent Searches" feature
 */
const searchHistorySchema = new mongoose.Schema({
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

  searchedAt: {
    type: Date,
    default: Date.now
    // REMOVED: index: true (was causing duplicate index warning)
  }
}, {
  timestamps: true
});

// Single compound index (removed duplicate)
searchHistorySchema.index({ sessionId: 1, searchedAt: -1 });

// Auto-delete after 30 days
searchHistorySchema.index({ searchedAt: 1 }, { expireAfterSeconds: 2592000 });

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);
module.exports = SearchHistory;
