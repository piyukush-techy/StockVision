// capitalWizard.js routes — Phase 4 Month 22
const express = require('express');
const router  = express.Router();
const {
  runCapitalWizard,
  computeKelly,
  buildBarbellStrategy,
  buildStagedDeploymentPlan,
  SAFE_INSTRUMENTS,
  RISKY_PROFILES,
} = require('../utils/capitalWizard');

/**
 * POST /api/capital-wizard/analyze
 * Full Capital Wizard — Kelly + Barbell + Staged Deployment
 * Body: { symbol?, symbols?, totalCapital, targetPct, holdDays, safePct, riskyProfile, deployStrategy, kellyMode }
 */
router.post('/analyze', async (req, res) => {
  try {
    const {
      symbol,
      symbols       = [],
      totalCapital  = 100000,
      targetPct     = 15,
      holdDays      = 30,
      safePct       = 80,
      riskyProfile  = 'large_cap_momentum',
      deployStrategy = 'three_stage',
      kellyMode     = 'half',
    } = req.body;

    if (!totalCapital || isNaN(totalCapital) || totalCapital < 1000) {
      return res.status(400).json({ error: 'totalCapital must be ≥ ₹1,000' });
    }

    const result = await runCapitalWizard({
      symbol, symbols, totalCapital: +totalCapital,
      targetPct: +targetPct, holdDays: +holdDays,
      safePct: +safePct, riskyProfile, deployStrategy, kellyMode,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Capital Wizard error:', err.message);
    res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
});

/**
 * GET /api/capital-wizard/quick-kelly
 * Quick Kelly calculation without stock data (manual win rate input)
 * Query: winRate, avgWin, avgLoss, totalCapital
 */
router.get('/quick-kelly', (req, res) => {
  try {
    const { winRate = 0.55, avgWin = 15, avgLoss = 10, totalCapital = 100000 } = req.query;
    const kelly = computeKelly({
      winRate: +winRate,
      avgWin:  +avgWin,
      avgLoss: +avgLoss,
    });
    res.json({
      success: true,
      data: {
        ...kelly,
        recommendations: {
          full:    { pct: +(kelly.full*100).toFixed(1),    amount: +(totalCapital*kelly.full).toFixed(0),    label: 'Full Kelly — maximum mathematical EV, very volatile' },
          half:    { pct: +(kelly.half*100).toFixed(1),    amount: +(totalCapital*kelly.half).toFixed(0),    label: 'Half Kelly — recommended for most traders' },
          quarter: { pct: +(kelly.quarter*100).toFixed(1), amount: +(totalCapital*kelly.quarter).toFixed(0), label: 'Quarter Kelly — conservative, very safe' },
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/capital-wizard/barbell
 * Barbell-only calculator
 * Body: { totalCapital, safePct, riskyProfile }
 */
router.post('/barbell', (req, res) => {
  try {
    const { totalCapital = 100000, safePct = 80, riskyProfile = 'large_cap_momentum', kellyFraction = 0.1 } = req.body;
    const result = buildBarbellStrategy({ totalCapital: +totalCapital, safePct: +safePct, riskyProfile, kellyFraction: +kellyFraction });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/capital-wizard/meta
 * Returns reference data — safe instruments + risky profiles
 */
router.get('/meta', (req, res) => {
  res.json({
    success: true,
    data: {
      safeInstruments: SAFE_INSTRUMENTS,
      riskyProfiles: Object.entries(RISKY_PROFILES).map(([key, val]) => ({ key, ...val })),
      kellyModes: [
        { key: 'full',    label: 'Full Kelly',    desc: 'Maximum EV — very aggressive' },
        { key: 'half',    label: 'Half Kelly',    desc: 'Recommended — halves volatility' },
        { key: 'quarter', label: 'Quarter Kelly', desc: 'Conservative — minimal risk' },
      ],
      deployStrategies: [
        { key: 'lump_sum',        label: 'Lump Sum',           emoji: '💰' },
        { key: 'three_stage',     label: '3-Stage DCA',        emoji: '📅' },
        { key: 'signal_based',    label: 'Signal-Based',       emoji: '📡' },
        { key: 'pyramid',         label: 'Pyramid In',         emoji: '🔺' },
        { key: 'value_averaging', label: 'Value Averaging',    emoji: '⚖️' },
      ],
    },
  });
});

/**
 * GET /api/capital-wizard/presets
 * Quick-start presets for common investor profiles
 */
router.get('/presets', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id:             'conservative',
        label:          '🛡️ Conservative',
        desc:           'Capital preservation first. Minimal equity risk.',
        safePct:        90,
        riskyProfile:   'large_cap_momentum',
        kellyMode:      'quarter',
        deployStrategy: 'three_stage',
        targetPct:      12,
        holdDays:       90,
      },
      {
        id:             'balanced',
        label:          '⚖️ Balanced',
        desc:           'Balance between safety and growth.',
        safePct:        75,
        riskyProfile:   'large_cap_momentum',
        kellyMode:      'half',
        deployStrategy: 'three_stage',
        targetPct:      15,
        holdDays:       60,
      },
      {
        id:             'growth',
        label:          '📈 Growth',
        desc:           'Tilt towards equity with Kelly discipline.',
        safePct:        65,
        riskyProfile:   'mid_cap_growth',
        kellyMode:      'half',
        deployStrategy: 'signal_based',
        targetPct:      20,
        holdDays:       45,
      },
      {
        id:             'aggressive',
        label:          '⚡ Aggressive',
        desc:           'High risk-reward. Strict Kelly discipline required.',
        safePct:        50,
        riskyProfile:   'small_cap_high_conviction',
        kellyMode:      'full',
        deployStrategy: 'pyramid',
        targetPct:      30,
        holdDays:       30,
      },
      {
        id:             'taleb_barbell',
        label:          '🎲 Taleb Barbell',
        desc:           '90% hyper-safe + 10% asymmetric high-risk bets.',
        safePct:        90,
        riskyProfile:   'small_cap_high_conviction',
        kellyMode:      'quarter',
        deployStrategy: 'lump_sum',
        targetPct:      50,
        holdDays:       90,
      },
    ],
  });
});

module.exports = router;
