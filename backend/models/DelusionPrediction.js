// DelusionPrediction.js — Phase 4 Month 21
// Schema for anonymous crowd predictions used in Delusion Leaderboard

const mongoose = require('mongoose');

const DelusionPredictionSchema = new mongoose.Schema({
  symbol:          { type: String, required: true, index: true },
  sector:          { type: String, default: 'Other' },
  predictedReturn: { type: Number, required: true },   // what user predicted in %
  holdDays:        { type: Number, required: true },   // prediction horizon
  entryPrice:      { type: Number, required: true },   // price when prediction was made
  entryDate:       { type: String, required: true },   // YYYY-MM-DD
  actualReturn:    { type: Number, default: null },    // filled in after holdDays
  resolved:        { type: Boolean, default: false, index: true },
  sessionId:       { type: String, index: true },      // anonymous user ID
  createdAt:       { type: Date, default: Date.now, index: true },
  resolvedAt:      { type: Date, default: null },
});

module.exports = mongoose.model('DelusionPrediction', DelusionPredictionSchema);
