const { fetchHistoricalData } = require('./scanner');

/**
 * Capital Reality Engine — Phase 2 Month 9
 * Feature 69: Capital Scalability Tiers
 * Feature 70: Volume-Adjusted Probability
 * Feature 71: Slippage Estimator (exact Rs breakdown)
 * Feature 72: Liquidity Heat Map
 */

const SPREAD_BY_CAP = {
  LARGE_CAP: 0.05,
  MID_CAP:   0.12,
  SMALL_CAP: 0.30,
  MICRO_CAP: 0.80
};

const IMPACT_CURVE = [
  { pctVol: 0.01, impact: 0.005 },
  { pctVol: 0.05, impact: 0.015 },
  { pctVol: 0.10, impact: 0.030 },
  { pctVol: 0.25, impact: 0.080 },
  { pctVol: 0.50, impact: 0.180 },
  { pctVol: 1.00, impact: 0.400 },
  { pctVol: 2.00, impact: 0.900 },
  { pctVol: 5.00, impact: 2.500 }
];

function interpolateImpact(pctVol) {
  if (pctVol <= IMPACT_CURVE[0].pctVol) return IMPACT_CURVE[0].impact;
  for (let i = 0; i < IMPACT_CURVE.length - 1; i++) {
    const lo = IMPACT_CURVE[i], hi = IMPACT_CURVE[i + 1];
    if (pctVol >= lo.pctVol && pctVol <= hi.pctVol) {
      const t = (pctVol - lo.pctVol) / (hi.pctVol - lo.pctVol);
      return parseFloat((lo.impact + t * (hi.impact - lo.impact)).toFixed(4));
    }
  }
  return IMPACT_CURVE[IMPACT_CURVE.length - 1].impact;
}

function classifyMarketCap(turnover) {
  if (turnover > 50_000_000_000) return 'LARGE_CAP';
  if (turnover >  5_000_000_000) return 'MID_CAP';
  if (turnover >    500_000_000) return 'SMALL_CAP';
  return 'MICRO_CAP';
}

// Feature 69
async function getScalabilityTiers(symbol, baseSuccessRate, targetPct) {
  const candles = await fetchHistoricalData(symbol);
  const recent  = candles.slice(-60);
  const avgVol  = recent.reduce((s, c) => s + (c.volume || 0), 0) / recent.length;
  const price   = candles[candles.length - 1].close;
  const capCat  = classifyMarketCap(avgVol * price);
  const spreadPct = SPREAD_BY_CAP[capCat];

  const TIERS = [
    { label: '10,000',      amount: 10_000,     emoji: '🐣' },
    { label: '50,000',      amount: 50_000,     emoji: '🐥' },
    { label: '1,00,000',    amount: 100_000,    emoji: '🐓' },
    { label: '5,00,000',    amount: 500_000,    emoji: '🦅' },
    { label: '10,00,000',   amount: 1_000_000,  emoji: '🦁' },
    { label: '50,00,000',   amount: 5_000_000,  emoji: '🐉' },
    { label: '1,00,00,000', amount: 10_000_000, emoji: '👑' }
  ];

  const tiers = TIERS.map(t => {
    const shares    = Math.round(t.amount / price);
    const pctOfVol  = avgVol > 0 ? (shares / avgVol) * 100 : 0;
    const impact    = interpolateImpact(pctOfVol);
    const totalCost = spreadPct + impact;
    const adjTarget = parseFloat((targetPct + totalCost).toFixed(2));
    const rateDrop  = parseFloat((totalCost * 1.5).toFixed(1));
    const adjRate   = Math.max(0, Math.round(baseSuccessRate - rateDrop));
    const daysToFill = pctOfVol > 20 ? Math.ceil(pctOfVol / 20) : 1;
    const feasibility = adjRate >= baseSuccessRate * 0.85 ? 'GOOD'
                      : adjRate >= baseSuccessRate * 0.65 ? 'CAUTION' : 'POOR';
    return {
      ...t, displayLabel: `₹${t.label}`,
      shares, pctOfVol: parseFloat(pctOfVol.toFixed(2)),
      impact: parseFloat(impact.toFixed(3)), spreadPct,
      totalCostPct: parseFloat(totalCost.toFixed(3)),
      adjTarget, rateDrop, adjRate, daysToFill, feasibility
    };
  });

  const maxGood = tiers.filter(t => t.feasibility !== 'POOR').slice(-1)[0];
  return {
    symbol, price, avgVolume: Math.round(avgVol),
    capCategory: capCat, spreadPct, tiers,
    maxRecommendedCapital: maxGood?.displayLabel || tiers[0].displayLabel
  };
}

// Feature 70
async function getVolumeAdjustedProbability(symbol, baseSuccessRate, targetPct, capitalAmount) {
  const candles = await fetchHistoricalData(symbol);
  const recent  = candles.slice(-60);
  const avgVol  = recent.reduce((s, c) => s + (c.volume || 0), 0) / recent.length;
  const price   = candles[candles.length - 1].close;
  const shares  = Math.round(capitalAmount / price);
  const pctOfVol = avgVol > 0 ? (shares / avgVol) * 100 : 0;
  const capCat  = classifyMarketCap(avgVol * price);
  const spread  = SPREAD_BY_CAP[capCat];
  const entryImpact = interpolateImpact(pctOfVol);
  const exitImpact  = entryImpact * 1.2;
  const entrySlip   = entryImpact + spread / 2;
  const exitSlip    = exitImpact  + spread / 2;
  const totalSlip   = parseFloat((entrySlip + exitSlip).toFixed(3));
  const effectiveTarget = parseFloat((targetPct + totalSlip).toFixed(2));
  const adjRate = Math.max(0, Math.round(baseSuccessRate - totalSlip * 1.5));
  const fillOK  = recent.filter(c => (c.volume || 0) >= shares).length;
  const fillPct = Math.round((fillOK / recent.length) * 100);
  return {
    capitalAmount, shares, avgDailyVolume: Math.round(avgVol),
    pctOfVol: parseFloat(pctOfVol.toFixed(2)),
    entrySlippage: parseFloat(entrySlip.toFixed(3)),
    exitSlippage:  parseFloat(exitSlip.toFixed(3)),
    totalSlippage: totalSlip,
    effectiveTarget, baseSuccessRate, adjRate,
    oneDayFillPct: fillPct,
    verdict: adjRate >= baseSuccessRate - 5 ? 'MINIMAL'
           : adjRate >= baseSuccessRate - 15 ? 'MODERATE' : 'SIGNIFICANT',
    note: `Order is ${pctOfVol.toFixed(1)}% of avg daily volume`
  };
}

// Feature 71
async function getSlippageEstimate(symbol, capitalAmount) {
  const candles = await fetchHistoricalData(symbol);
  const recent  = candles.slice(-60);
  const avgVol  = recent.reduce((s, c) => s + (c.volume || 0), 0) / recent.length;
  const price   = candles[candles.length - 1].close;
  const shares  = Math.round(capitalAmount / price);
  const pctOfVol = avgVol > 0 ? (shares / avgVol) * 100 : 0;
  const capCat  = classifyMarketCap(avgVol * price);
  const spread  = SPREAD_BY_CAP[capCat];
  const impact  = interpolateImpact(pctOfVol);
  const exitImpact = impact * 1.2;
  const entrySlipRs = ((spread / 2 + impact) / 100) * capitalAmount;
  const exitSlipRs  = ((spread / 2 + exitImpact) / 100) * capitalAmount;
  const totalSlipRs = entrySlipRs + exitSlipRs;
  // Zerodha delivery charges
  const brokerage = Math.min(20, capitalAmount * 0.0003) * 2;
  const stt       = capitalAmount * 0.001 * 2;
  const exchange  = capitalAmount * 2 * 0.0000345;
  const gst       = (brokerage + exchange) * 0.18;
  const sebi      = capitalAmount * 2 * 0.000001;
  const stamp     = capitalAmount * 0.00015;
  const totalReg  = brokerage + stt + exchange + gst + sebi + stamp;
  const grandTotal = totalSlipRs + totalReg;
  const breakEvenPct = parseFloat(((grandTotal / capitalAmount) * 100).toFixed(3));
  return {
    symbol, capitalAmount, price, shares, capCategory: capCat,
    slippage: {
      entryRs: parseFloat(entrySlipRs.toFixed(2)),
      exitRs:  parseFloat(exitSlipRs.toFixed(2)),
      totalRs: parseFloat(totalSlipRs.toFixed(2)),
      pct:     parseFloat(((totalSlipRs / capitalAmount) * 100).toFixed(3))
    },
    regulatory: {
      brokerageRs: parseFloat(brokerage.toFixed(2)),
      sttRs:       parseFloat(stt.toFixed(2)),
      exchangeRs:  parseFloat(exchange.toFixed(2)),
      gstRs:       parseFloat(gst.toFixed(2)),
      sebiRs:      parseFloat(sebi.toFixed(2)),
      stampRs:     parseFloat(stamp.toFixed(2)),
      totalRs:     parseFloat(totalReg.toFixed(2))
    },
    summary: {
      grandTotalRs: parseFloat(grandTotal.toFixed(2)),
      breakEvenPct,
      message: `Need +${breakEvenPct}% gross just to break even on all costs`
    }
  };
}

// Feature 72
async function getLiquidityHeatmap(symbol) {
  const candles = await fetchHistoricalData(symbol, 2);
  if (candles.length < 60) return null;
  const avgVol = candles.reduce((s, c) => s + (c.volume || 0), 0) / candles.length;
  const dayBuckets = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  candles.forEach(c => {
    const dow = new Date(c.date + 'T00:00:00').getDay();
    if (dow >= 1 && dow <= 5 && c.volume > 0)
      dayBuckets[dow].push(c.volume / avgVol);
  });
  const dayNames = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' };
  const byDay = Object.entries(dayBuckets).map(([d, arr]) => {
    const rel = arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 1;
    return { day: dayNames[d], relVol: parseFloat(rel.toFixed(2)),
      rating: rel >= 1.1 ? 'HIGH' : rel >= 0.9 ? 'NORMAL' : 'LOW' };
  });
  const intraday = [
    { time: '9:15–9:45',   relVol: 1.8, label: 'Opening rush',    rating: 'HIGH'   },
    { time: '9:45–10:30',  relVol: 1.4, label: 'Post-open',       rating: 'HIGH'   },
    { time: '10:30–12:00', relVol: 0.9, label: 'Mid-morning',     rating: 'NORMAL' },
    { time: '12:00–13:30', relVol: 0.6, label: 'Lunch lull',      rating: 'LOW'    },
    { time: '13:30–14:30', relVol: 0.8, label: 'Afternoon',       rating: 'NORMAL' },
    { time: '14:30–15:00', relVol: 1.3, label: 'Pre-close rally', rating: 'HIGH'   },
    { time: '15:00–15:30', relVol: 1.9, label: 'Closing surge',   rating: 'HIGH'   }
  ];
  return {
    symbol, avgDailyVolume: Math.round(avgVol), byDay, intraday,
    bestWindow:  '9:15–10:30 AM or 2:30–3:00 PM IST',
    worstWindow: '12:00–1:30 PM IST (widest spreads)',
    tips: [
      'Split large orders: half at open (9:15), half at close (2:45)',
      'Avoid 12–2 PM — spreads widen and fills worsen',
      'Thursday: ~30% higher volume from F&O weekly expiry',
      'Monday open and Friday close have thinner order books'
    ]
  };
}

async function runCapitalAnalysis(symbol, baseSuccessRate, targetPct, capitalAmount) {
  const [scalability, volAdj, slippage, heatmap] = await Promise.all([
    getScalabilityTiers(symbol, baseSuccessRate, targetPct),
    getVolumeAdjustedProbability(symbol, baseSuccessRate, targetPct, capitalAmount),
    getSlippageEstimate(symbol, capitalAmount),
    getLiquidityHeatmap(symbol)
  ]);
  return { scalability, volAdj, slippage, heatmap,
    meta: { symbol, capitalAmount, analysedAt: new Date().toISOString() } };
}

module.exports = {
  runCapitalAnalysis, getScalabilityTiers,
  getVolumeAdjustedProbability, getSlippageEstimate, getLiquidityHeatmap
};
