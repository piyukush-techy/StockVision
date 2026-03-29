// predictions.js — Phase 4 Month 21: Regime Predictor + Delusion Leaderboard API
const express  = require('express');
const router   = express.Router();
const DelusionPrediction = require('../models/DelusionPrediction');
const {
  runRegimePredictor,
  submitPrediction,
  resolvePredictions,
  getDelusionLeaderboard,
  getUserPredictions,
} = require('../utils/predictionEngine');

// ── Sector list helper ────────────────────────────────────────────────────────
const SECTORS = ['IT', 'Banking', 'FMCG', 'Pharma', 'Energy', 'Metals', 'Auto', 'Telecom', 'Infra', 'Realty', 'NBFC', 'Specialty Chemicals', 'Consumer', 'Other'];
const SECTOR_INDICES = ['^NSEBANK', 'NIFTY_IT.NS', '^NSEI'];

/**
 * POST /api/predictions/regime
 * Regime Transition Predictor
 * Body: { symbol?, sectors?: [] }
 */
router.post('/regime', async (req, res) => {
  try {
    const { symbol = '^NSEI', sectors = [] } = req.body;
    const result = await runRegimePredictor({ symbol, sectors });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Regime predictor error:', err.message);
    res.status(500).json({ error: 'Prediction failed', detail: err.message });
  }
});

/**
 * GET /api/predictions/regime/presets
 * Pre-built regime analysis presets
 */
router.get('/regime/presets', (req, res) => {
  res.json({
    success: true,
    data: [
      { label: '🇮🇳 Nifty 50',       symbol: '^NSEI',        desc: 'Benchmark broad market' },
      { label: '🏦 Nifty Bank',      symbol: '^NSEBANK',     desc: 'Banking sector index' },
      { label: '💻 Nifty IT',        symbol: 'NIFTY_IT.NS',  desc: 'IT sector index' },
      { label: '💊 Nifty Pharma',    symbol: 'NIFTY_PHARMA.NS', desc: 'Pharma sector index' },
      { label: '🚗 Nifty Auto',      symbol: 'NIFTY_AUTO.NS', desc: 'Auto sector index' },
      { label: '⚡ RELIANCE',        symbol: 'RELIANCE.NS',  desc: 'Largest Indian company' },
      { label: '💻 TCS',             symbol: 'TCS.NS',       desc: 'IT bellwether' },
      { label: '🏦 HDFC Bank',       symbol: 'HDFCBANK.NS',  desc: 'Largest private bank' },
    ],
  });
});

/**
 * POST /api/predictions/delusion/submit
 * Submit a new prediction
 * Body: { symbol, sector, predictedReturn, holdDays, sessionId }
 */
router.post('/delusion/submit', async (req, res) => {
  try {
    const { symbol, sector, predictedReturn, holdDays, sessionId } = req.body;
    if (!symbol)          return res.status(400).json({ error: 'symbol required' });
    if (!predictedReturn) return res.status(400).json({ error: 'predictedReturn required' });
    if (!sessionId)       return res.status(400).json({ error: 'sessionId required' });

    const sym = symbol.trim().toUpperCase();
    const result = await submitPrediction(DelusionPrediction, {
      symbol:          sym.endsWith('.NS') || sym.endsWith('.BO') ? sym : `${sym}.NS`,
      sector:          sector || 'Other',
      predictedReturn: parseFloat(predictedReturn),
      holdDays:        parseInt(holdDays) || 30,
      sessionId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Delusion submit error:', err.message);
    res.status(500).json({ error: 'Submission failed', detail: err.message });
  }
});

/**
 * GET /api/predictions/delusion/leaderboard
 * Get the full Delusion Leaderboard
 */
router.get('/delusion/leaderboard', async (req, res) => {
  try {
    // Resolve any matured predictions first
    await resolvePredictions(DelusionPrediction).catch(() => {});
    const result = await getDelusionLeaderboard(DelusionPrediction);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Delusion leaderboard error:', err.message);
    res.status(500).json({ error: 'Leaderboard failed', detail: err.message });
  }
});

/**
 * GET /api/predictions/delusion/my/:sessionId
 * Get the current user's prediction history
 */
router.get('/delusion/my/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await getUserPredictions(DelusionPrediction, sessionId);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('User predictions error:', err.message);
    res.status(500).json({ error: 'Failed to load predictions', detail: err.message });
  }
});

/**
 * GET /api/predictions/sectors
 * Sector list for dropdowns
 */
router.get('/sectors', (req, res) => {
  res.json({ success: true, data: SECTORS });
});

module.exports = router;
