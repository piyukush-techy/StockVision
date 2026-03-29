// capitalWizard.js — Phase 4 Month 22
// Feature 1: Kelly Criterion Capital Calculator
// Feature 2: Staged Deployment Strategies
// Feature 3: Barbell Approach (safe + risky portfolio split)

const axios = require('axios');
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
const cache   = new Map();
const TTL     = 3 * 60 * 60 * 1000;

function getCached(k)    { const e = cache.get(k); if (!e || Date.now() - e.ts > TTL) { cache.delete(k); return null; } return e.data; }
function setCached(k, d) { cache.set(k, { data: d, ts: Date.now() }); }

// ─── Fetch historical prices ──────────────────────────────────────────────────
async function fetchPrices(symbol, range = '3y') {
  const k = `cw_${symbol}_${range}`;
  const c = getCached(k); if (c) return c;
  const res = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
    params: { interval: '1d', range }, headers: HEADERS, timeout: 15000,
  });
  const r = res.data?.chart?.result?.[0];
  if (!r) throw new Error(`No data: ${symbol}`);
  const ts = r.timestamp || [];
  const q  = r.indicators?.quote?.[0] || {};
  const data = ts.map((t, i) => ({
    date:  new Date(t * 1000).toISOString().slice(0, 10),
    close: q.close?.[i] ?? null,
    vol:   q.volume?.[i] ?? null,
  })).filter(d => d.close != null);
  setCached(k, data);
  return data;
}

// ─── Compute win rate, avg win, avg loss from rolling windows ─────────────────
async function computeTradeStats(symbol, targetPct, holdDays) {
  const data   = await fetchPrices(symbol, '5y');
  const closes = data.map(d => d.close);
  const N      = closes.length;
  let wins = 0, losses = 0, totalWin = 0, totalLoss = 0;

  for (let i = 0; i + holdDays < N; i++) {
    const ret = (closes[i + holdDays] - closes[i]) / closes[i] * 100;
    if (ret >= targetPct) {
      wins++;
      totalWin += ret;
    } else {
      losses++;
      const loss = Math.min(ret, 0); // cap at 0 for partial loss cases
      totalLoss += Math.abs(loss);
    }
  }

  const total  = wins + losses;
  const winRate = total > 0 ? wins / total : 0.5;
  const avgWin  = wins   > 0 ? totalWin  / wins   : targetPct;
  const avgLoss = losses > 0 ? totalLoss / losses : targetPct * 0.7;

  return { winRate, avgWin, avgLoss, wins, losses, total };
}

// ─── Kelly Criterion ──────────────────────────────────────────────────────────
// Full Kelly = W - (1-W)/R  where R = avg win / avg loss
// Half Kelly = Full * 0.5  (recommended safer version)
// Quarter Kelly = Full * 0.25 (conservative)
function computeKelly({ winRate, avgWin, avgLoss }) {
  if (avgLoss === 0) return { full: 0, half: 0, quarter: 0 };
  const R         = avgWin / avgLoss;
  const W         = winRate;
  const fullKelly = W - (1 - W) / R;
  const half      = fullKelly * 0.5;
  const quarter   = fullKelly * 0.25;

  return {
    full:    +Math.max(0, Math.min(fullKelly, 1)).toFixed(4),
    half:    +Math.max(0, Math.min(half,      1)).toFixed(4),
    quarter: +Math.max(0, Math.min(quarter,   1)).toFixed(4),
    R:       +R.toFixed(3),
    winRate: +(W * 100).toFixed(1),
    avgWin:  +avgWin.toFixed(2),
    avgLoss: +avgLoss.toFixed(2),
  };
}

// ─── Staged Deployment Calculator ────────────────────────────────────────────
// Strategies: Lump Sum, 3-Stage DCA, 4-Week DCA, Signal-Based, Pyramid
function buildStagedDeploymentPlan({ totalCapital, kellyFraction, numStages, strategy }) {
  const deployCapital = +(totalCapital * kellyFraction).toFixed(0);
  const keepSafe      = totalCapital - deployCapital;

  const plans = {

    lump_sum: {
      name:  'Lump Sum',
      emoji: '💰',
      desc:  'Deploy all allocated capital immediately. Best when conviction is high.',
      pros:  ['Maximum exposure from day 1', 'No opportunity cost of waiting', 'Simplest to execute'],
      cons:  ['Full drawdown risk immediately', 'No averaging benefit', 'Emotionally harder to hold'],
      stages: [{ stage: 1, label: 'Day 1', amount: deployCapital, pct: 100, condition: 'Execute immediately at market price' }],
    },

    three_stage: {
      name:  '3-Stage DCA',
      emoji: '📅',
      desc:  'Split into 3 tranches over the hold period. Reduces timing risk.',
      pros:  ['Averages entry cost', 'Reduces timing risk', 'Easier psychologically'],
      cons:  ['Missed gains if stock rises fast', 'More transaction costs', 'Requires discipline'],
      stages: [
        { stage: 1, label: 'Week 1',  amount: +(deployCapital * 0.50).toFixed(0), pct: 50, condition: 'Initial entry — start position' },
        { stage: 2, label: 'Week 3',  amount: +(deployCapital * 0.30).toFixed(0), pct: 30, condition: 'If stock is flat or down from entry' },
        { stage: 3, label: 'Week 6',  amount: +(deployCapital * 0.20).toFixed(0), pct: 20, condition: 'Final tranche — complete position' },
      ],
    },

    signal_based: {
      name:  'Signal-Based Entry',
      emoji: '📡',
      desc:  'Wait for technical confirmation before adding. Maximises entry quality.',
      pros:  ['Entry at better levels', 'Built-in risk filter', 'Only invests on confirmation'],
      cons:  ['May miss fast moves', 'Requires monitoring', 'More complex'],
      stages: [
        { stage: 1, label: 'On signal',      amount: +(deployCapital * 0.40).toFixed(0), pct: 40, condition: 'RSI < 55 AND price above 20-day SMA' },
        { stage: 2, label: 'On breakout',    amount: +(deployCapital * 0.35).toFixed(0), pct: 35, condition: 'Price breaks above recent resistance' },
        { stage: 3, label: 'On pullback',    amount: +(deployCapital * 0.25).toFixed(0), pct: 25, condition: 'Price pulls back to 10-day EMA after breakout' },
      ],
    },

    pyramid: {
      name:  'Pyramid In',
      emoji: '🔺',
      desc:  'Add more as trade goes in your favour. Risk-adjusted compounding.',
      pros:  ['Adds only when right', 'Natural risk management', 'Compounds winning trades'],
      cons:  ['Average cost rises', 'Needs strict rules', 'Underperforms if reversal'],
      stages: [
        { stage: 1, label: 'Initial',       amount: +(deployCapital * 0.50).toFixed(0), pct: 50, condition: 'Enter at current price' },
        { stage: 2, label: '+5% up',        amount: +(deployCapital * 0.30).toFixed(0), pct: 30, condition: 'Add when stock is +5% from entry' },
        { stage: 3, label: '+10% up',       amount: +(deployCapital * 0.20).toFixed(0), pct: 20, condition: 'Final add when stock is +10% from entry' },
      ],
    },

    value_averaging: {
      name:  'Value Averaging',
      emoji: '⚖️',
      desc:  'Invest more when stock is cheap, less when expensive. Mathematically optimal averaging.',
      pros:  ['Systematically buys dips', 'Highest mathematical EV', 'Forces discipline'],
      cons:  ['Complex to calculate', 'Requires cash reserve', 'May feel wrong at bottoms'],
      stages: [
        { stage: 1, label: 'Week 1',  amount: +(deployCapital * 0.25).toFixed(0), pct: 25, condition: 'Initial base position' },
        { stage: 2, label: 'Week 3',  amount: +(deployCapital * 0.35).toFixed(0), pct: 35, condition: 'Larger buy if stock is down (buy more when cheaper)' },
        { stage: 3, label: 'Week 5',  amount: +(deployCapital * 0.25).toFixed(0), pct: 25, condition: 'Standard add if stock is near entry' },
        { stage: 4, label: 'Week 8',  amount: +(deployCapital * 0.15).toFixed(0), pct: 15, condition: 'Final tranche if target not yet reached' },
      ],
    },
  };

  return {
    totalCapital,
    deployCapital,
    keepSafe,
    deployPct:  +(kellyFraction * 100).toFixed(1),
    safePct:    +((1 - kellyFraction) * 100).toFixed(1),
    plans,
    selectedPlan: plans[strategy] || plans.three_stage,
  };
}

// ─── Barbell Strategy Builder ──────────────────────────────────────────────────
// Barbell: X% in ultra-safe (FD/Liquid Fund) + Y% in high-conviction risky bets
// Classic: 90% safe + 10% risky (Taleb original)
// Aggressive: 70% safe + 30% risky
// Custom: user-defined split

const SAFE_INSTRUMENTS = [
  { name: 'SBI Fixed Deposit',       expectedReturn: 7.1,  risk: 'Zero',    liquidity: 'Low (lock-in)',   type: 'fd' },
  { name: 'Liquid Mutual Fund',      expectedReturn: 7.3,  risk: 'Zero',    liquidity: 'T+1 day',         type: 'mf' },
  { name: 'Overnight Fund',          expectedReturn: 6.9,  risk: 'Zero',    liquidity: 'Same day',        type: 'mf' },
  { name: 'PPF',                     expectedReturn: 7.1,  risk: 'Zero',    liquidity: 'Low (15yr)',      type: 'ppf' },
  { name: 'T-Bills (91 day)',        expectedReturn: 6.8,  risk: 'Zero',    liquidity: 'Medium',          type: 'govt' },
  { name: 'RBI Floating Rate Bond',  expectedReturn: 7.35, risk: 'Zero',    liquidity: 'Low (7yr)',       type: 'govt' },
];

const RISKY_PROFILES = {
  large_cap_momentum: {
    label:       'Large Cap Momentum',
    emoji:       '🔵',
    desc:        'High-quality large caps in strong uptrends',
    expectedRet: 18,
    maxDD:       -28,
    betaVsNifty: 1.1,
    examples:    ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS'],
  },
  mid_cap_growth: {
    label:       'Mid Cap Growth',
    emoji:       '🟡',
    desc:        'Growing midcaps with strong earnings momentum',
    expectedRet: 28,
    maxDD:       -40,
    betaVsNifty: 1.4,
    examples:    ['POLYCAB.NS', 'ALKYLAMINE.NS', 'SYNGENE.NS', 'DMART.NS'],
  },
  small_cap_high_conviction: {
    label:       'Small Cap High Conviction',
    emoji:       '🔴',
    desc:        'Deep value or high-growth small caps',
    expectedRet: 40,
    maxDD:       -55,
    betaVsNifty: 1.8,
    examples:    ['IDFCFIRSTB.NS', 'ROUTE.NS', 'HERITGFOOD.NS'],
  },
  sector_thematic: {
    label:       'Sector/Thematic Bet',
    emoji:       '🎯',
    desc:        'Concentrated sector bet (e.g., defence, railways, EV)',
    expectedRet: 35,
    maxDD:       -45,
    betaVsNifty: 1.6,
    examples:    ['HAL.NS', 'BEL.NS', 'IRFC.NS', 'TATAMOTORS.NS'],
  },
};

function buildBarbellStrategy({ totalCapital, safePct, riskyProfile, kellyFraction }) {
  const safeCapital  = +(totalCapital * (safePct / 100)).toFixed(0);
  const riskyCapital = totalCapital - safeCapital;
  const riskyPct     = 100 - safePct;

  const profile = RISKY_PROFILES[riskyProfile] || RISKY_PROFILES.large_cap_momentum;

  // Expected portfolio-level return
  const safeInst  = SAFE_INSTRUMENTS[1]; // Liquid MF as default
  const expReturn = +(safeCapital / totalCapital * safeInst.expectedReturn + riskyCapital / totalCapital * profile.expectedRet).toFixed(1);

  // Portfolio-level max drawdown (only risky portion draws down)
  const portMaxDD = +(riskyCapital / totalCapital * profile.maxDD).toFixed(1);

  // Scenarios: bear, base, bull
  const scenarios = [
    {
      name:   'Bear Case',
      emoji:  '🐻',
      color:  'red',
      riskyReturn:  profile.maxDD,
      safeReturn:   safeInst.expectedReturn,
      portReturn:   +(riskyCapital / totalCapital * profile.maxDD + safeCapital / totalCapital * safeInst.expectedReturn).toFixed(1),
      portPL:       +((riskyCapital * profile.maxDD / 100) + (safeCapital * safeInst.expectedReturn / 100)).toFixed(0),
    },
    {
      name:   'Base Case',
      emoji:  '➡️',
      color:  'blue',
      riskyReturn:  profile.expectedRet * 0.6,
      safeReturn:   safeInst.expectedReturn,
      portReturn:   +(riskyCapital / totalCapital * profile.expectedRet * 0.6 + safeCapital / totalCapital * safeInst.expectedReturn).toFixed(1),
      portPL:       +((riskyCapital * profile.expectedRet * 0.6 / 100) + (safeCapital * safeInst.expectedReturn / 100)).toFixed(0),
    },
    {
      name:   'Bull Case',
      emoji:  '🚀',
      color:  'green',
      riskyReturn:  profile.expectedRet,
      safeReturn:   safeInst.expectedReturn,
      portReturn:   +(riskyCapital / totalCapital * profile.expectedRet + safeCapital / totalCapital * safeInst.expectedReturn).toFixed(1),
      portPL:       +((riskyCapital * profile.expectedRet / 100) + (safeCapital * safeInst.expectedReturn / 100)).toFixed(0),
    },
  ];

  // Barbell archetypes
  const archetypes = [
    { name: 'Nassim Taleb Classic',  safePct: 90, desc: 'Maximum protection, lottery-ticket upside',  emoji: '🛡️' },
    { name: 'Conservative Indian',   safePct: 80, desc: 'FD + SGB + select quality stocks',           emoji: '🪙' },
    { name: 'Balanced Barbell',      safePct: 70, desc: 'Equal emphasis on safety and growth',        emoji: '⚖️' },
    { name: 'Aggressive Barbell',    safePct: 60, desc: 'More risk, still anchored by safe portion',  emoji: '⚡' },
    { name: 'Kelly Suggested',       safePct: +((1 - kellyFraction) * 100).toFixed(0), desc: 'Kelly-optimal safe allocation for your win rate', emoji: '🧮' },
  ];

  return {
    totalCapital,
    safeCapital,
    riskyCapital,
    safePct,
    riskyPct,
    safeInstrument: safeInst,
    allSafeInstruments: SAFE_INSTRUMENTS,
    riskyProfile:   profile,
    allRiskyProfiles: RISKY_PROFILES,
    expReturn,
    portMaxDD,
    scenarios,
    archetypes,
  };
}

// ─── Multi-stock Kelly comparison ─────────────────────────────────────────────
async function compareKellyAcrossStocks({ symbols, totalCapital, targetPct, holdDays }) {
  const results = [];
  for (const sym of symbols.slice(0, 5)) {
    try {
      const s     = sym.trim().toUpperCase();
      const full  = s.endsWith('.NS') || s.endsWith('.BO') ? s : `${s}.NS`;
      const stats = await computeTradeStats(full, targetPct, holdDays);
      const kelly = computeKelly(stats);
      const alloc = +(totalCapital * kelly.half).toFixed(0);   // use half kelly
      results.push({
        symbol:   full.replace('.NS', ''),
        winRate:  kelly.winRate,
        avgWin:   kelly.avgWin,
        avgLoss:  kelly.avgLoss,
        R:        kelly.R,
        fullKelly: +(kelly.full * 100).toFixed(1),
        halfKelly: +(kelly.half * 100).toFixed(1),
        quarterKelly: +(kelly.quarter * 100).toFixed(1),
        suggestedAlloc: alloc,
        trades:   stats.total,
        grade:    kelly.half > 0.12 ? 'A' : kelly.half > 0.07 ? 'B' : kelly.half > 0.03 ? 'C' : 'D',
        gradeColor: kelly.half > 0.12 ? 'emerald' : kelly.half > 0.07 ? 'green' : kelly.half > 0.03 ? 'yellow' : 'red',
      });
    } catch { /* skip */ }
  }

  // Sort by half Kelly desc
  results.sort((a, b) => b.halfKelly - a.halfKelly);

  // Optimal diversified allocation (equal Half-Kelly weights)
  const totalKellyWeight = results.reduce((s, r) => s + r.halfKelly, 0);
  const withAlloc = results.map(r => ({
    ...r,
    portfolioWeight:  totalKellyWeight > 0 ? +(r.halfKelly / totalKellyWeight * 100).toFixed(1) : 0,
    portfolioAmount:  totalKellyWeight > 0 ? +(r.halfKelly / totalKellyWeight * totalCapital).toFixed(0) : 0,
  }));

  const totalAllocated = withAlloc.reduce((s, r) => s + r.portfolioAmount, 0);
  const cashReserve    = totalCapital - totalAllocated;

  return {
    stocks:        withAlloc,
    totalCapital,
    totalAllocated,
    cashReserve,
    cashReservePct: +(cashReserve / totalCapital * 100).toFixed(1),
    params: { targetPct, holdDays },
  };
}

// ─── Master Capital Wizard ─────────────────────────────────────────────────────
async function runCapitalWizard({
  symbol, symbols = [],
  totalCapital,
  targetPct   = 15,
  holdDays    = 30,
  safePct     = 80,
  riskyProfile = 'large_cap_momentum',
  deployStrategy = 'three_stage',
  kellyMode   = 'half',     // full | half | quarter
}) {
  const sym    = symbol ? (symbol.endsWith('.NS') ? symbol : `${symbol}.NS`) : null;
  const stats  = sym ? await computeTradeStats(sym, targetPct, holdDays) : { winRate: 0.52, avgWin: 14.2, avgLoss: 9.1, wins: 52, losses: 48, total: 100 };
  const kelly  = computeKelly(stats);

  const kFraction = kelly[kellyMode] || kelly.half;

  const deployment = buildStagedDeploymentPlan({
    totalCapital, kellyFraction: kFraction,
    numStages: 3, strategy: deployStrategy,
  });

  const barbell = buildBarbellStrategy({
    totalCapital, safePct, riskyProfile, kellyFraction: kFraction,
  });

  // Multi-stock comparison if provided
  let multiStockComparison = null;
  if (symbols.length >= 2) {
    multiStockComparison = await compareKellyAcrossStocks({ symbols, totalCapital, targetPct, holdDays });
  }

  // ── Risk of ruin estimate ─────────────────────────────────────────────────
  // Rough estimate: with fraction f, win rate W, n trades
  // Ruin (portfolio < 25%) using simulation-based formula
  const f   = kFraction;
  const W   = stats.winRate;
  const b   = stats.avgWin / 100;
  const a   = stats.avgLoss / 100;
  const n   = 20; // over 20 trades
  // Simple compounding formula to estimate ruin probability
  const avgGrowth  = Math.pow((1 + f*b) ** W * (1 - f*a) ** (1-W), n);
  const riskOfRuin = +(Math.max(0, 1 - avgGrowth) * 100).toFixed(1);

  // ── Capital growth projections ────────────────────────────────────────────
  const projections = [3, 6, 12, 24].map(months => {
    const tradesPerMonth = Math.floor(holdDays > 0 ? 22 / holdDays : 1);
    const nTrades        = months * tradesPerMonth;
    const growthFactor   = Math.pow((1 + f*b) ** W * (1 - f*a) ** (1-W), nTrades);
    const projected      = +(totalCapital * growthFactor).toFixed(0);
    return { months, projected, growthFactor: +growthFactor.toFixed(3), trades: nTrades };
  });

  return {
    meta: { symbol: sym?.replace('.NS','') || 'Custom', totalCapital, targetPct, holdDays },
    stats,
    kelly: {
      ...kelly,
      mode:       kellyMode,
      fraction:   kFraction,
      fractionPct: +(kFraction * 100).toFixed(1),
      deployAmount: +(totalCapital * kFraction).toFixed(0),
    },
    riskOfRuin,
    projections,
    deployment,
    barbell,
    multiStockComparison,
  };
}

module.exports = {
  runCapitalWizard,
  computeTradeStats,
  computeKelly,
  buildStagedDeploymentPlan,
  buildBarbellStrategy,
  compareKellyAcrossStocks,
  SAFE_INSTRUMENTS,
  RISKY_PROFILES,
};
