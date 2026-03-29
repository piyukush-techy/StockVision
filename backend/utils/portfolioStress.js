// portfolioStress.js — Phase 3 Month 17: Portfolio Scalability
// Stress testing, What-If simulator, Rebalancing analysis, Benchmark comparison

const axios = require('axios');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
const cache   = new Map();
const TTL     = 60 * 60 * 1000; // 1h

function getCached(k)       { const e = cache.get(k); if (!e || Date.now() - e.ts > TTL) { cache.delete(k); return null; } return e.data; }
function setCached(k, data) { cache.set(k, { data, ts: Date.now() }); }

// ─── Fetch daily closes ───────────────────────────────────────────────────────
async function fetchCloses(symbol, range = '5y') {
  const k = `stress_${symbol}_${range}`;
  const c = getCached(k); if (c) return c;

  const res = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
    params: { interval: '1d', range }, headers: HEADERS, timeout: 15000
  });

  const r = res.data?.chart?.result?.[0];
  if (!r) throw new Error(`No data for ${symbol}`);

  const ts     = r.timestamp || [];
  const closes = r.indicators?.quote?.[0]?.close || [];
  const data   = ts.map((t, i) => ({
    date:  new Date(t * 1000).toISOString().slice(0, 10),
    close: closes[i] ?? null
  })).filter(d => d.close != null && d.close > 0);

  setCached(k, data);
  return data;
}

// ─── Align series to common trading dates ────────────────────────────────────
function alignSeries(seriesMap) {
  const dateSets = Object.values(seriesMap).map(s => new Set(s.map(d => d.date)));
  const common   = [...dateSets[0]].filter(d => dateSets.every(ds => ds.has(d))).sort();
  const aligned  = {};
  for (const [sym, series] of Object.entries(seriesMap)) {
    const byDate = Object.fromEntries(series.map(d => [d.date, d.close]));
    aligned[sym] = common.map(d => ({ date: d, close: byDate[d] }));
  }
  return { aligned, dates: common };
}

// ─── Build weighted portfolio returns ─────────────────────────────────────────
function buildPortfolioReturns(aligned, symbols, weights, dates) {
  const entry = symbols.map(sym => aligned[sym][0].close);
  const vals  = dates.map((_, i) =>
    symbols.reduce((s, sym, si) => s + weights[si] * (aligned[sym][i].close / entry[si]), 0)
  );
  return { vals, dates };
}

function pct(a, b) { return ((b - a) / a) * 100; }

// ═══════════════════════════════════════════════════════════════════════════
// 1. STRESS TEST ENGINE
// ═══════════════════════════════════════════════════════════════════════════

// Known crash/event periods with Nifty benchmarks
const STRESS_SCENARIOS = [
  {
    id: 'covid_crash',
    name: 'COVID Crash',
    emoji: '🦠',
    description: 'Feb 19 – Mar 23, 2020 — Nifty lost 38% in 33 days',
    startDate: '2020-02-19', endDate: '2020-03-23',
    niftyReturn: -38.0,
    category: 'crash', severity: 'extreme'
  },
  {
    id: 'covid_recovery',
    name: 'COVID Recovery',
    emoji: '🚀',
    description: 'Mar 23, 2020 – Feb 2021 — Nifty doubled from bottom',
    startDate: '2020-03-23', endDate: '2021-02-01',
    niftyReturn: 100.0,
    category: 'rally', severity: 'extreme'
  },
  {
    id: 'fii_selloff_2022',
    name: 'FII Sell-Off 2022',
    emoji: '📉',
    description: 'Jan – Jun 2022 — FIIs sold ₹1.5L Cr, Nifty fell 18%',
    startDate: '2022-01-17', endDate: '2022-06-17',
    niftyReturn: -17.9,
    category: 'crash', severity: 'moderate'
  },
  {
    id: 'russia_ukraine',
    name: 'Russia–Ukraine War',
    emoji: '⚔️',
    description: 'Feb 24 – Mar 7, 2022 — Crude spike, Nifty fell 8%',
    startDate: '2022-02-24', endDate: '2022-03-07',
    niftyReturn: -8.2,
    category: 'crash', severity: 'moderate'
  },
  {
    id: 'bull_2023',
    name: 'Bull Run 2023',
    emoji: '🐂',
    description: 'Jul 2023 – Sep 2023 — PSU/Defence rally, Nifty +12%',
    startDate: '2023-07-01', endDate: '2023-09-30',
    niftyReturn: 12.3,
    category: 'rally', severity: 'moderate'
  },
  {
    id: 'election_shock_2024',
    name: 'Election Shock 2024',
    emoji: '🗳️',
    description: 'Jun 4–5, 2024 — BJP misses majority, Nifty –4.5% then recovers',
    startDate: '2024-06-04', endDate: '2024-06-07',
    niftyReturn: -4.5,
    category: 'crash', severity: 'mild'
  },
  {
    id: 'fii_selloff_2024',
    name: 'FII Mega Sell-Off 2024',
    emoji: '💸',
    description: 'Oct–Nov 2024 — FIIs sold ₹90K Cr, Nifty fell 10%',
    startDate: '2024-10-01', endDate: '2024-11-21',
    niftyReturn: -10.4,
    category: 'crash', severity: 'moderate'
  },
  {
    id: 'tariff_crash_2025',
    name: 'Trump Tariff Crash',
    emoji: '🛃',
    description: 'Apr 2–11, 2025 — US tariffs announced, global selloff –5%',
    startDate: '2025-04-02', endDate: '2025-04-08',
    niftyReturn: -5.1,
    category: 'crash', severity: 'moderate'
  },
];

async function runStressTest({ symbols, weights }) {
  // Fetch all stock data
  const seriesMap = {};
  await Promise.all(symbols.map(async sym => {
    seriesMap[sym] = await fetchCloses(sym, '5y');
  }));
  const { aligned, dates } = alignSeries(seriesMap);
  const { vals } = buildPortfolioReturns(aligned, symbols, weights, dates);
  const dateToIdx = Object.fromEntries(dates.map((d, i) => [d, i]));

  // Per-stock data
  const stockSeries = {};
  for (const sym of symbols) {
    stockSeries[sym] = aligned[sym].map(d => d.close);
  }

  const results = STRESS_SCENARIOS.map(scenario => {
    // Find closest dates in our data
    let startIdx = -1, endIdx = -1;
    for (let i = 0; i < dates.length; i++) {
      if (dates[i] >= scenario.startDate && startIdx === -1) startIdx = i;
      if (dates[i] <= scenario.endDate) endIdx = i;
    }

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      return { ...scenario, available: false, portfolioReturn: null, alpha: null, stockReturns: {} };
    }

    const portReturn = pct(vals[startIdx], vals[endIdx]);

    // Per-stock returns
    const stockReturns = {};
    for (const sym of symbols) {
      const s = stockSeries[sym];
      stockReturns[sym] = parseFloat(pct(s[startIdx], s[endIdx]).toFixed(2));
    }

    // Max drawdown during this period
    let peak = vals[startIdx], maxDD = 0;
    for (let i = startIdx; i <= endIdx; i++) {
      if (vals[i] > peak) peak = vals[i];
      const dd = (peak - vals[i]) / peak * 100;
      if (dd > maxDD) maxDD = dd;
    }

    const alpha = portReturn - scenario.niftyReturn;

    return {
      ...scenario,
      available:       true,
      portfolioReturn: parseFloat(portReturn.toFixed(2)),
      niftyReturn:     scenario.niftyReturn,
      alpha:           parseFloat(alpha.toFixed(2)),
      maxDrawdown:     parseFloat(maxDD.toFixed(2)),
      stockReturns,
      startDateActual: dates[startIdx],
      endDateActual:   dates[endIdx],
    };
  });

  // Summary stats
  const available     = results.filter(r => r.available);
  const crashScens    = available.filter(r => r.category === 'crash');
  const rallyScens    = available.filter(r => r.category === 'rally');
  const avgCrashAlpha = crashScens.length ? crashScens.reduce((s,r) => s+r.alpha, 0) / crashScens.length : null;
  const avgRallyAlpha = rallyScens.length ? rallyScens.reduce((s,r) => s+r.alpha, 0) / rallyScens.length : null;
  const bestScenario  = available.reduce((b,r) => r.portfolioReturn > (b?.portfolioReturn ?? -Infinity) ? r : b, null);
  const worstScenario = available.reduce((w,r) => r.portfolioReturn < (w?.portfolioReturn ?? Infinity) ? r : w, null);

  return {
    scenarios: results,
    summary: {
      totalScenarios:  available.length,
      crashAlpha:      avgCrashAlpha != null ? parseFloat(avgCrashAlpha.toFixed(2)) : null,
      rallyAlpha:      avgRallyAlpha != null ? parseFloat(avgRallyAlpha.toFixed(2)) : null,
      bestScenario:    bestScenario ? { name: bestScenario.name, return: bestScenario.portfolioReturn } : null,
      worstScenario:   worstScenario ? { name: worstScenario.name, return: worstScenario.portfolioReturn } : null,
      defensiveScore:  crashScens.length ? Math.round(50 + avgCrashAlpha * 2) : null, // vs Nifty in crashes
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. WHAT-IF SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════

async function runWhatIf({ symbols, baseWeights, scenarios: weightScenarios, range = '3y' }) {
  const seriesMap = {};
  await Promise.all(symbols.map(async sym => {
    seriesMap[sym] = await fetchCloses(sym, range);
  }));
  const { aligned, dates } = alignSeries(seriesMap);

  const evaluate = (weights) => {
    const { vals } = buildPortfolioReturns(aligned, symbols, weights, dates);
    const totalReturn = pct(vals[0], vals[vals.length - 1]);

    // CAGR
    const years = dates.length / 252;
    const cagr  = (Math.pow(vals[vals.length - 1] / vals[0], 1 / years) - 1) * 100;

    // Annualised volatility
    const rets  = [];
    for (let i = 1; i < vals.length; i++) rets.push(Math.log(vals[i] / vals[i-1]));
    const mean  = rets.reduce((a, b) => a + b, 0) / rets.length;
    const std   = Math.sqrt(rets.reduce((a, r) => a + (r - mean) ** 2, 0) / rets.length);
    const vol   = std * Math.sqrt(252) * 100;

    // Max drawdown
    let peak = vals[0], maxDD = 0;
    for (const v of vals) {
      if (v > peak) peak = v;
      const dd = (peak - v) / peak * 100;
      if (dd > maxDD) maxDD = dd;
    }

    // Sharpe (risk-free 6.5%)
    const sharpe = (cagr - 6.5) / vol;

    return {
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      cagr:        parseFloat(cagr.toFixed(2)),
      vol:         parseFloat(vol.toFixed(2)),
      maxDD:       parseFloat(maxDD.toFixed(2)),
      sharpe:      parseFloat(sharpe.toFixed(3)),
      // Monthly timeline (every 30 days)
      timeline:    vals.filter((_, i) => i % 30 === 0 || i === vals.length - 1)
                       .map((v, i) => ({ i, value: parseFloat(((v - 1) * 100).toFixed(2)) }))
    };
  };

  const baseResult = evaluate(baseWeights);

  const scenarioResults = (weightScenarios || []).map(sc => ({
    name:    sc.name,
    weights: sc.weights,
    ...evaluate(sc.weights)
  }));

  return {
    base:      { name: 'Current (Best Strategy)', weights: baseWeights, ...baseResult },
    scenarios: scenarioResults,
    meta:      { symbols, dateRange: { from: dates[0], to: dates[dates.length - 1] }, dataPoints: dates.length }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. REBALANCING SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════

async function runRebalancing({ symbols, weights, capital = 100000, range = '3y' }) {
  const seriesMap = {};
  await Promise.all(symbols.map(async sym => {
    seriesMap[sym] = await fetchCloses(sym, range);
  }));
  const { aligned, dates } = alignSeries(seriesMap);

  const n = symbols.length;
  const entry = symbols.map(sym => aligned[sym][0].close);

  // ── Buy & Hold ────────────────────────────────────────────────────────────
  const bhValue = dates.map((_, i) => {
    return symbols.reduce((s, sym, si) =>
      s + weights[si] * capital * (aligned[sym][i].close / entry[si]), 0);
  });

  // ── Rebalancing strategies ─────────────────────────────────────────────────
  function simulate(rebalFreqDays, label) {
    let cash    = 0;
    let shares  = symbols.map((sym, si) => (weights[si] * capital) / entry[si]);
    let lastReb = 0;
    const vals  = [];
    let totalCost = 0; // transaction costs (0.1% per trade)

    for (let i = 0; i < dates.length; i++) {
      const prices   = symbols.map(sym => aligned[sym][i].close);
      const portVal  = shares.reduce((s, sh, si) => s + sh * prices[si], 0);

      if (i > 0 && (i - lastReb) >= rebalFreqDays) {
        // Rebalance: sell all, buy target weights
        const cost     = portVal * 0.001 * n; // 0.1% per stock traded
        totalCost     += cost;
        const netVal   = portVal - cost;
        shares         = symbols.map((_, si) => (weights[si] * netVal) / prices[si]);
        lastReb        = i;
      }

      vals.push(portVal);
    }

    const finalVal      = vals[vals.length - 1];
    const totalReturn   = pct(capital, finalVal);
    const years         = dates.length / 252;
    const cagr          = (Math.pow(finalVal / capital, 1/years) - 1) * 100;

    // Max drawdown
    let peak = capital, maxDD = 0;
    for (const v of vals) {
      if (v > peak) peak = v;
      const dd = (peak - v) / peak * 100;
      if (dd > maxDD) maxDD = dd;
    }

    return {
      label,
      freqDays:      rebalFreqDays,
      vals:          vals.filter((_, i) => i % 30 === 0 || i === vals.length - 1),
      dates:         dates.filter((_, i) => i % 30 === 0 || i === vals.length - 1),
      finalValue:    parseFloat(finalVal.toFixed(0)),
      totalReturn:   parseFloat(totalReturn.toFixed(2)),
      cagr:          parseFloat(cagr.toFixed(2)),
      maxDD:         parseFloat(maxDD.toFixed(2)),
      totalCost:     parseFloat(totalCost.toFixed(0)),
      netGain:       parseFloat((finalVal - capital - totalCost).toFixed(0)),
    };
  }

  const bhFinal  = bhValue[bhValue.length - 1];
  const bhReturn = pct(capital, bhFinal);
  const years    = dates.length / 252;
  const bhCagr   = (Math.pow(bhFinal / capital, 1/years) - 1) * 100;
  let bhPeak = capital, bhMaxDD = 0;
  for (const v of bhValue) {
    if (v > bhPeak) bhPeak = v;
    const dd = (bhPeak - v) / bhPeak * 100;
    if (dd > bhMaxDD) bhMaxDD = dd;
  }

  const strategies = [
    {
      label:       'Buy & Hold',
      freqDays:    0,
      vals:        bhValue.filter((_, i) => i % 30 === 0 || i === bhValue.length - 1),
      dates:       dates.filter((_, i) => i % 30 === 0 || i === bhValue.length - 1),
      finalValue:  parseFloat(bhFinal.toFixed(0)),
      totalReturn: parseFloat(bhReturn.toFixed(2)),
      cagr:        parseFloat(bhCagr.toFixed(2)),
      maxDD:       parseFloat(bhMaxDD.toFixed(2)),
      totalCost:   0,
      netGain:     parseFloat((bhFinal - capital).toFixed(0)),
    },
    simulate(30,  'Monthly Rebalance'),
    simulate(90,  'Quarterly Rebalance'),
    simulate(180, 'Semi-Annual Rebalance'),
    simulate(365, 'Annual Rebalance'),
  ];

  const best = strategies.reduce((b, s) => s.netGain > b.netGain ? s : b);
  const winner = best.label;

  return {
    strategies,
    winner,
    meta: {
      symbols, capital,
      dateRange:  { from: dates[0], to: dates[dates.length - 1] },
      dataPoints: dates.length,
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. BENCHMARK COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

const BENCHMARKS = [
  { symbol: '^NSEI',   name: 'Nifty 50',  emoji: '📊', color: 'blue'   },
  { symbol: '^BSESN',  name: 'Sensex',    emoji: '🏛️', color: 'indigo' },
  { symbol: 'GLD',     name: 'Gold (GLD)', emoji: '🥇', color: 'yellow' },
  { symbol: '^NSMIDCP', name: 'Midcap',   emoji: '🏢', color: 'purple' },
];

async function runBenchmarkComparison({ symbols, weights, range = '3y' }) {
  // Fetch portfolio stocks + benchmarks
  const allSymbols = [...symbols, ...BENCHMARKS.map(b => b.symbol)];
  const seriesMap  = {};

  await Promise.all(allSymbols.map(async sym => {
    try { seriesMap[sym] = await fetchCloses(sym, range); }
    catch (e) { console.warn(`Benchmark fetch failed for ${sym}:`, e.message); }
  }));

  // Align portfolio stocks only
  const portMap = {};
  for (const sym of symbols) if (seriesMap[sym]) portMap[sym] = seriesMap[sym];
  const { aligned, dates } = alignSeries(portMap);
  const { vals: portVals } = buildPortfolioReturns(aligned, symbols, weights, dates);

  const calcMetrics = (vals, label, emoji, color) => {
    if (!vals || vals.length < 10) return null;
    const years       = vals.length / 252;
    const totalReturn = pct(vals[0], vals[vals.length - 1]);
    const cagr        = (Math.pow(vals[vals.length - 1] / vals[0], 1 / years) - 1) * 100;

    const rets = [];
    for (let i = 1; i < vals.length; i++) rets.push(Math.log(vals[i] / vals[i-1]));
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const std  = Math.sqrt(rets.reduce((a, r) => a + (r - mean) ** 2, 0) / rets.length);
    const vol  = std * Math.sqrt(252) * 100;

    let peak = vals[0], maxDD = 0;
    for (const v of vals) {
      if (v > peak) peak = v;
      const dd = (peak - v) / peak * 100;
      if (dd > maxDD) maxDD = dd;
    }

    const sharpe = (cagr - 6.5) / (vol || 1);

    // Monthly snapshots aligned to portfolio dates
    const timeline = vals.filter((_, i) => i % 30 === 0 || i === vals.length - 1)
                         .map(v => parseFloat(((v / vals[0] - 1) * 100).toFixed(2)));

    return {
      label, emoji, color,
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      cagr:        parseFloat(cagr.toFixed(2)),
      vol:         parseFloat(vol.toFixed(2)),
      maxDD:       parseFloat(maxDD.toFixed(2)),
      sharpe:      parseFloat(sharpe.toFixed(3)),
      timeline,
    };
  };

  // Portfolio metrics
  const portfolio = calcMetrics(portVals, 'My Portfolio', '💼', 'emerald');

  // Benchmark metrics — align each benchmark to portfolio date range
  const benchResults = [];
  for (const bm of BENCHMARKS) {
    const bmSeries = seriesMap[bm.symbol];
    if (!bmSeries) continue;

    // Slice benchmark to match portfolio date range
    const bmMap  = Object.fromEntries(bmSeries.map(d => [d.date, d.close]));
    const bmVals = dates.map(d => bmMap[d]).filter(v => v != null);
    if (bmVals.length < dates.length * 0.8) continue; // need 80% overlap

    // Fill missing with last known
    const bmAligned = [];
    let lastVal = null;
    for (const d of dates) {
      if (bmMap[d]) { lastVal = bmMap[d]; bmAligned.push(lastVal); }
      else if (lastVal) bmAligned.push(lastVal);
    }

    const m = calcMetrics(bmAligned, bm.name, bm.emoji, bm.color);
    if (m) benchResults.push(m);
  }

  // Year-by-year comparison
  const years = [...new Set(dates.map(d => d.slice(0, 4)))];
  const yearlyComparison = years.map(yr => {
    const yrDates = dates.filter(d => d.startsWith(yr));
    if (yrDates.length < 10) return null;
    const startI = dates.indexOf(yrDates[0]);
    const endI   = dates.indexOf(yrDates[yrDates.length - 1]);

    const portRet = pct(portVals[startI], portVals[endI]);
    const bmRets  = {};
    for (const bm of BENCHMARKS) {
      const bmSeries = seriesMap[bm.symbol];
      if (!bmSeries) continue;
      const bmMap = Object.fromEntries(bmSeries.map(d => [d.date, d.close]));
      const s = bmMap[dates[startI]], e = bmMap[dates[endI]];
      if (s && e) bmRets[bm.name] = parseFloat(pct(s, e).toFixed(2));
    }

    return {
      year:      yr,
      portfolio: parseFloat(portRet.toFixed(2)),
      benchmarks: bmRets,
    };
  }).filter(Boolean);

  // Timeline for chart (monthly, as % gain from start)
  const portTimeline = portVals.filter((_, i) => i % 30 === 0 || i === portVals.length - 1)
                               .map(v => parseFloat(((v / portVals[0] - 1) * 100).toFixed(2)));
  const timelineDates = dates.filter((_, i) => i % 30 === 0 || i === dates.length - 1);

  return {
    portfolio: { ...portfolio, timeline: portTimeline },
    benchmarks: benchResults,
    yearlyComparison,
    timelineDates,
    meta: {
      symbols, weights,
      dateRange:  { from: dates[0], to: dates[dates.length - 1] },
      dataPoints: dates.length,
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MASTER ENTRY: run all 4 modules
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeScalability({ symbols, weights, totalCapital = 100000, range = '3y', whatIfScenarios }) {
  if (!symbols || symbols.length < 2) throw new Error('At least 2 symbols required');

  const wSum   = weights.reduce((a, b) => a + b, 0);
  const normW  = weights.map(w => w / wSum);

  // Build what-if scenarios from user data OR defaults
  const wiScenarios = whatIfScenarios || [
    { name: 'Equal Weight',  weights: symbols.map(() => 1 / symbols.length) },
    { name: 'Top Heavy',     weights: normW.map((w, i) => i === 0 ? Math.min(w * 1.5, 0.5) : w * 0.7).map((w, _, a) => w / a.reduce((s,v)=>s+v,0)) },
    { name: 'Defensive (30% cash)', weights: normW.map(w => w * 0.7) }, // remaining is "cash" = flat 0
  ];

  // Run all 4 in parallel
  const [stressResult, whatIfResult, rebalResult, benchResult] = await Promise.all([
    runStressTest({ symbols, weights: normW }),
    runWhatIf({ symbols, baseWeights: normW, scenarios: wiScenarios, range }),
    runRebalancing({ symbols, weights: normW, capital: totalCapital, range }),
    runBenchmarkComparison({ symbols, weights: normW, range }),
  ]);

  return {
    stress:     stressResult,
    whatIf:     whatIfResult,
    rebalance:  rebalResult,
    benchmark:  benchResult,
    meta: {
      symbols,
      weights:   normW.map(w => parseFloat((w * 100).toFixed(2))),
      capital:   totalCapital,
      range,
      analyzedAt: new Date().toISOString(),
    }
  };
}

module.exports = { analyzeScalability };
