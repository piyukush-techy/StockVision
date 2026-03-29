// psychology.js — Phase 4 Month 19: Psychological Tools API Routes
const express = require('express');
const router  = express.Router();
const { runSurvivorSimulation, runFomoDestroyer } = require('../utils/survivorEngine');

/**
 * POST /api/psychology/survivor
 * Run Survivorship Simulator
 * Body: { symbol, entryDate, holdDays, target, stopLoss }
 */
router.post('/survivor', async (req, res) => {
  try {
    const { symbol, entryDate, holdDays, target, stopLoss } = req.body;

    if (!symbol)    return res.status(400).json({ error: 'symbol is required' });
    if (!entryDate) return res.status(400).json({ error: 'entryDate is required (YYYY-MM-DD)' });

    const sym = symbol.trim().toUpperCase();
    const cleanSym = sym.endsWith('.NS') || sym.endsWith('.BO') ? sym : `${sym}.NS`;

    const result = await runSurvivorSimulation({
      symbol:    cleanSym,
      entryDate: entryDate.trim(),
      holdDays:  Math.min(Math.max(parseInt(holdDays) || 180, 30), 365),
      target:    parseFloat(target)   || 20,
      stopLoss:  parseFloat(stopLoss) || -15,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Survivor simulation error:', err.message);
    res.status(500).json({ error: 'Simulation failed', detail: err.message });
  }
});

/**
 * POST /api/psychology/fomo
 * Run FOMO Destroyer
 * Body: { symbol, referenceDate, windowDays, holdDays, target }
 */
router.post('/fomo', async (req, res) => {
  try {
    const { symbol, referenceDate, windowDays, holdDays, target } = req.body;

    if (!symbol)        return res.status(400).json({ error: 'symbol is required' });
    if (!referenceDate) return res.status(400).json({ error: 'referenceDate is required (YYYY-MM-DD)' });

    const sym = symbol.trim().toUpperCase();
    const cleanSym = sym.endsWith('.NS') || sym.endsWith('.BO') ? sym : `${sym}.NS`;

    const result = await runFomoDestroyer({
      symbol:        cleanSym,
      referenceDate: referenceDate.trim(),
      windowDays:    Math.min(Math.max(parseInt(windowDays) || 15, 5), 30),
      holdDays:      Math.min(Math.max(parseInt(holdDays)   || 180, 30), 365),
      target:        parseFloat(target) || 20,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('FOMO destroyer error:', err.message);
    res.status(500).json({ error: 'FOMO analysis failed', detail: err.message });
  }
});

/**
 * GET /api/psychology/popular-dates
 * Returns a list of famous historical entry opportunities (for quick-select)
 */
router.get('/popular-dates', (req, res) => {
  res.json({
    success: true,
    data: [
      { label: '🦠 COVID Bottom',        date: '2020-03-24', reason: 'Nifty bottomed during lockdown announcement' },
      { label: '💉 Vaccine Rally',       date: '2020-11-09', reason: 'Pfizer vaccine news triggered massive rally' },
      { label: '📜 Budget 2021',         date: '2021-02-01', reason: 'Infra budget surprised markets positively' },
      { label: '🦠 Wave 2 Fear',         date: '2021-04-21', reason: '3L+ daily COVID cases — peak fear' },
      { label: '⚔️ Ukraine War Bottom',  date: '2022-03-08', reason: 'Nifty dip after Russia-Ukraine war started' },
      { label: '📉 FII Selloff Low',     date: '2022-06-17', reason: 'FII outflow bottom — Nifty at 15,200' },
      { label: '📈 Budget 2023',         date: '2023-02-01', reason: 'Capex budget — market rallied' },
      { label: '🗳️ Election Shock',      date: '2024-06-04', reason: 'Election result day — -5.9% in one day' },
      { label: '🛃 Tariff Crash',        date: '2025-04-07', reason: 'Trump tariffs crashed global markets' },
    ]
  });
});

module.exports = router;
