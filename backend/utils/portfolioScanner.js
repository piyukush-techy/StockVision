// portfolioScanner.js — Phase 3 Month 14: Portfolio Historical Analysis
// Sliding window scanner: "If you held this portfolio for N days, what happened?"
// Tracks: achievement rates, drawdown periods, growth pattern classification

const axios = require('axios');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

function getCached(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { cache.delete(key); return null; }
  return e.data;
}
function setCached(key, data) { cache.set(key, { data, ts: Date.now() }); }

// ─── Fetch historical closes ──────────────────────────────────────────────────
async function fetchCloses(symbol, range = '5y') {
  const key = `pscan_${symbol}_${range}`;
  const cached = getCached(key);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
  const res = await axios.get(url, {
    params: { interval: '1d', range },
    headers: HEADERS,
    timeout: 15000
  });

  const result = res.data?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const timestamps = result.timestamp || [];
  const closes     = result.indicators?.quote?.[0]?.close || [];

  const data = timestamps.map((ts, i) => ({
    date:  new Date(ts * 1000).toISOString().substring(0, 10),
    close: closes[i] ?? null
  })).filter(d => d.close && d.close > 0);

  if (data.length < 100) throw new Error(`Insufficient data for ${symbol}`);
  setCached(key, data);
  return data;
}

// ─── Align multiple series to common trading dates ───────────────────────────
function alignSeries(seriesMap) {
  const dateSets = Object.values(seriesMap).map(s => new Set(s.map(d => d.date)));
  const commonDates = [...dateSets[0]].filter(d => dateSets.every(ds => ds.has(d))).sort();
  const aligned = {};
  for (const [sym, series] of Object.entries(seriesMap)) {
    const byDate = Object.fromEntries(series.map(d => [d.date, d.close]));
    aligned[sym] = commonDates.map(d => ({ date: d, close: byDate[d] }));
  }
  return { aligned, dates: commonDates };
}

// ─── Compute portfolio value series from weighted stocks ─────────────────────
function buildPortfolioSeries(aligned, symbols, weights, dates) {
  // Normalize: treat entry price = 1 for each stock, track weighted growth
  const entryClosed = symbols.map(sym => aligned[sym][0].close);
  return dates.map((date, i) => {
    const portVal = symbols.reduce((sum, sym, si) => {
      const growth = aligned[sym][i].close / entryClosed[si];
      return sum + weights[si] * growth;
    }, 0);
    return { date, value: portVal };
  });
}

// ─── Sliding window analysis ─────────────────────────────────────────────────
function slidingWindowScan(portSeries, holdingDays, targetPct) {
  const data = portSeries.map(d => d.value);
  const dates = portSeries.map(d => d.date);
  const n = data.length;
  const target = 1 + targetPct / 100;

  if (holdingDays >= n) return null;

  const windows = [];
  let achieved = 0;
  let totalMaxDD = 0;
  let worstMaxDD = 0;
  let worstWindow = null;
  let bestReturn = -Infinity;
  let bestWindow = null;
  const timeToTarget = [];  // days taken to first hit target
  const returnsDistribution = [];

  for (let start = 0; start + holdingDays < n; start++) {
    const end = start + holdingDays;
    const slice = data.slice(start, end + 1);
    const sliceDates = dates.slice(start, end + 1);
    const entryVal = slice[0];
    const exitVal  = slice[slice.length - 1];
    const returnPct = ((exitVal - entryVal) / entryVal) * 100;

    // Did we hit target?
    let hitTarget = false;
    let daysToTarget = null;
    for (let d = 1; d < slice.length; d++) {
      if (slice[d] / entryVal >= target) {
        hitTarget = true;
        daysToTarget = d;
        break;
      }
    }
    if (hitTarget) { achieved++; if (daysToTarget) timeToTarget.push(daysToTarget); }

    // Max drawdown within window
    let peak = slice[0], maxDD = 0;
    for (const v of slice) {
      if (v > peak) peak = v;
      const dd = (peak - v) / peak;
      if (dd > maxDD) maxDD = dd;
    }
    totalMaxDD += maxDD;
    if (maxDD > worstMaxDD) {
      worstMaxDD = maxDD;
      worstWindow = { start: sliceDates[0], end: sliceDates[sliceDates.length - 1], maxDD: parseFloat((maxDD * 100).toFixed(2)), returnPct: parseFloat(returnPct.toFixed(2)) };
    }
    if (returnPct > bestReturn) {
      bestReturn = returnPct;
      bestWindow = { start: sliceDates[0], end: sliceDates[sliceDates.length - 1], returnPct: parseFloat(returnPct.toFixed(2)) };
    }

    returnsDistribution.push(parseFloat(returnPct.toFixed(2)));
    windows.push({
      startDate:  sliceDates[0],
      endDate:    sliceDates[sliceDates.length - 1],
      returnPct:  parseFloat(returnPct.toFixed(2)),
      hitTarget,
      daysToTarget,
      maxDD:      parseFloat((maxDD * 100).toFixed(2))
    });
  }

  const totalWindows = windows.length;
  const successRate = totalWindows > 0 ? (achieved / totalWindows) * 100 : 0;
  const avgMaxDD    = totalWindows > 0 ? (totalMaxDD / totalWindows) * 100 : 0;

  // Time-to-target stats
  const avgDaysToTarget = timeToTarget.length > 0
    ? Math.round(timeToTarget.reduce((s, v) => s + v, 0) / timeToTarget.length) : null;
  const medianDaysToTarget = timeToTarget.length > 0
    ? timeToTarget.sort((a, b) => a - b)[Math.floor(timeToTarget.length / 2)] : null;

  // Returns histogram buckets: <-20, -20 to -10, -10 to 0, 0 to 10, 10 to 20, 20 to 30, >30
  const buckets = [
    { label: '<-20%', min: -Infinity, max: -20, count: 0 },
    { label: '-20% to -10%', min: -20, max: -10, count: 0 },
    { label: '-10% to 0%', min: -10, max: 0, count: 0 },
    { label: '0% to 10%', min: 0, max: 10, count: 0 },
    { label: '10% to 20%', min: 10, max: 20, count: 0 },
    { label: '20% to 30%', min: 20, max: 30, count: 0 },
    { label: '>30%', min: 30, max: Infinity, count: 0 },
  ];
  for (const r of returnsDistribution) {
    const bucket = buckets.find(b => r >= b.min && r < b.max);
    if (bucket) bucket.count++;
  }

  // Sample timeline: monthly snapshots (first window of each month)
  const timelineMap = {};
  for (const w of windows) {
    const month = w.startDate.slice(0, 7);
    if (!timelineMap[month]) timelineMap[month] = w;
  }
  const timeline = Object.values(timelineMap).map(w => ({
    month:     w.startDate.slice(0, 7),
    startDate: w.startDate,
    returnPct: w.returnPct,
    hitTarget: w.hitTarget,
    maxDD:     w.maxDD,
  }));

  // Label success rate
  const rateLabel =
    successRate >= 80 ? 'Very Common' :
    successRate >= 60 ? 'Common' :
    successRate >= 40 ? 'Occasional' :
    successRate >= 20 ? 'Rare' :
    successRate >= 5  ? 'Very Rare' : 'Historically Rare';

  return {
    holdingDays,
    targetPct,
    totalWindows,
    achieved,
    successRate:        parseFloat(successRate.toFixed(2)),
    rateLabel,
    avgMaxDrawdown:     parseFloat(avgMaxDD.toFixed(2)),
    worstMaxDrawdown:   parseFloat((worstMaxDD * 100).toFixed(2)),
    avgDaysToTarget,
    medianDaysToTarget,
    bestWindow,
    worstWindow,
    histogram:          buckets.map(b => ({ label: b.label, count: b.count, pct: parseFloat(((b.count / totalWindows) * 100).toFixed(1)) })),
    timeline,
    returnsDistribution: returnsDistribution.slice(0, 500), // cap for payload size
  };
}

// ─── Growth pattern classifier (portfolio-level) ─────────────────────────────
function classifyPortfolioGrowthPattern(results) {
  // Use 1-year holding period as reference if available, else longest
  const ref = results.find(r => r.holdingDays >= 250) || results[results.length - 1];
  if (!ref) return { label: 'Unknown', color: 'gray', emoji: '❓', desc: 'Insufficient data' };

  const { successRate, avgMaxDrawdown, worstMaxDrawdown } = ref;

  if (successRate >= 75 && avgMaxDrawdown < 15 && worstMaxDrawdown < 30)
    return { label: 'Regular Growth', color: 'emerald', emoji: '📈', desc: 'Consistently achieves targets with controlled drawdowns' };
  if (successRate >= 60 && worstMaxDrawdown > 40)
    return { label: 'Volatile Growth', color: 'orange', emoji: '🎢', desc: 'Good success rate but painful drawdown periods' };
  if (successRate >= 75 && worstMaxDrawdown < 20)
    return { label: 'Stable Compounder', color: 'blue', emoji: '🏦', desc: 'Low volatility, steady accumulation profile' };
  if (successRate >= 50 && avgMaxDrawdown < 12)
    return { label: 'Steady Performer', color: 'green', emoji: '✅', desc: 'Above average success with moderate risk' };
  if (successRate < 30 && worstMaxDrawdown > 50)
    return { label: 'High Risk', color: 'red', emoji: '⚠️', desc: 'Low success rate with severe drawdowns — consider rebalancing' };
  if (successRate >= 60)
    return { label: 'Moderate Growth', color: 'yellow', emoji: '📊', desc: 'Decent success rate — portfolio has room for improvement' };

  return { label: 'Underperformer', color: 'red', emoji: '📉', desc: 'Low historical success rate — review portfolio composition' };
}

// ─── Year-by-year portfolio performance breakdown ────────────────────────────
function yearlyBreakdown(aligned, symbols, weights, dates) {
  const years = [...new Set(dates.map(d => d.slice(0, 4)))].sort();
  return years.map(yr => {
    const yIdxStart = dates.indexOf(dates.find(d => d.startsWith(yr)));
    const yIdxEnd   = dates.lastIndexOf(dates.slice().reverse().find(d => d.startsWith(yr)));
    if (yIdxStart < 0 || yIdxEnd <= yIdxStart) return null;

    // Each stock's return that year
    const stockReturns = symbols.map((sym, si) => {
      const entry = aligned[sym][yIdxStart].close;
      const exit  = aligned[sym][yIdxEnd].close;
      return (exit - entry) / entry;
    });

    // Weighted portfolio return
    const portReturn = weights.reduce((s, w, i) => s + w * stockReturns[i], 0);

    // Max intra-year drawdown (using portfolio series)
    const yCloses = dates.reduce((arr, date, i) => {
      if (date.startsWith(yr)) {
        const portVal = symbols.reduce((s, sym, si) => {
          const base = aligned[sym][yIdxStart].close;
          return s + weights[si] * (aligned[sym][i].close / base);
        }, 0);
        arr.push(portVal);
      }
      return arr;
    }, []);

    let peak = yCloses[0] || 1, maxDD = 0;
    for (const v of yCloses) {
      if (v > peak) peak = v;
      const dd = (peak - v) / peak;
      if (dd > maxDD) maxDD = dd;
    }

    return {
      year: yr,
      portReturn:    parseFloat((portReturn * 100).toFixed(2)),
      maxDD:         parseFloat((maxDD * 100).toFixed(2)),
      stockReturns:  symbols.map((sym, si) => ({
        symbol:    sym,
        returnPct: parseFloat((stockReturns[si] * 100).toFixed(2))
      })),
      label: portReturn >= 0.25 ? '🚀 Exceptional' :
             portReturn >= 0.12 ? '📈 Good' :
             portReturn >= 0    ? '✅ Positive' :
             portReturn >= -0.15 ? '⚠️ Down Year' : '🔻 Rough Year'
    };
  }).filter(Boolean);
}

// ─── Correlation-adjusted diversification timeline ───────────────────────────
function correlationTimeline(aligned, symbols, dates) {
  // Rolling 90-day correlation between each pair
  const window = 90;
  const monthly = [];
  const monthSet = new Set(dates.map(d => d.slice(0, 7)));

  for (const month of [...monthSet].sort()) {
    const idx = dates.indexOf(dates.find(d => d.startsWith(month)));
    if (idx < window) continue;

    // Average pairwise correlation for this window
    let pairCount = 0, corrSum = 0;
    for (let a = 0; a < symbols.length; a++) {
      for (let b = a + 1; b < symbols.length; b++) {
        const retA = [], retB = [];
        for (let i = idx - window + 1; i <= idx; i++) {
          if (i > 0) {
            retA.push((aligned[symbols[a]][i].close - aligned[symbols[a]][i - 1].close) / aligned[symbols[a]][i - 1].close);
            retB.push((aligned[symbols[b]][i].close - aligned[symbols[b]][i - 1].close) / aligned[symbols[b]][i - 1].close);
          }
        }
        if (retA.length < 20) continue;
        const mA = retA.reduce((s, v) => s + v, 0) / retA.length;
        const mB = retB.reduce((s, v) => s + v, 0) / retB.length;
        const cov = retA.reduce((s, v, i) => s + (v - mA) * (retB[i] - mB), 0) / retA.length;
        const sA = Math.sqrt(retA.reduce((s, v) => s + Math.pow(v - mA, 2), 0) / retA.length);
        const sB = Math.sqrt(retB.reduce((s, v) => s + Math.pow(v - mB, 2), 0) / retB.length);
        if (sA && sB) { corrSum += Math.abs(cov / (sA * sB)); pairCount++; }
      }
    }
    if (!pairCount) continue;
    const avgCorr = corrSum / pairCount;
    monthly.push({
      month,
      avgCorrelation: parseFloat((avgCorr).toFixed(3)),
      diversificationScore: Math.round((1 - avgCorr) * 100),
    });
  }
  return monthly;
}

// ─── Main export ─────────────────────────────────────────────────────────────
async function scanPortfolio({ symbols, weights, totalCapital = 100000, targets = [10, 15, 20], holdingDaysList = [90, 180, 365], range = '5y' }) {
  if (!symbols || symbols.length < 2) throw new Error('At least 2 symbols required');
  if (!weights || weights.length !== symbols.length) throw new Error('Weights must match symbols count');

  // Normalize weights
  const wSum = weights.reduce((s, v) => s + v, 0);
  const normWeights = weights.map(w => w / wSum);

  // 1. Fetch all data in parallel
  const seriesMap = {};
  await Promise.all(symbols.map(async sym => {
    seriesMap[sym] = await fetchCloses(sym, range);
  }));

  // 2. Align
  const { aligned, dates } = alignSeries(seriesMap);

  // 3. Build portfolio value series (entry = day 0)
  const portSeries = buildPortfolioSeries(aligned, symbols, normWeights, dates);

  // 4. Run sliding window for each holding period × each target
  const scanResults = [];
  for (const holdDays of holdingDaysList) {
    for (const targetPct of targets) {
      const result = slidingWindowScan(portSeries, holdDays, targetPct);
      if (result) scanResults.push(result);
    }
  }

  // 5. Growth pattern
  const yearlyRef = scanResults.filter(r => r.holdingDays === 365);
  const growthPattern = classifyPortfolioGrowthPattern(yearlyRef.length > 0 ? yearlyRef : scanResults);

  // 6. Year-by-year breakdown
  const yearly = yearlyBreakdown(aligned, symbols, normWeights, dates);

  // 7. Rolling correlation timeline (diversification health)
  const divTimeline = symbols.length >= 2 ? correlationTimeline(aligned, symbols, dates) : [];

  // 8. Portfolio value timeline (monthly snapshots for chart)
  const portTimeline = [];
  const monthSeen = new Set();
  for (const pt of portSeries) {
    const m = pt.date.slice(0, 7);
    if (!monthSeen.has(m)) {
      monthSeen.add(m);
      portTimeline.push({
        date:    pt.date,
        value:   parseFloat((pt.value * 100 - 100).toFixed(2)), // as % gain from entry
        portVal: parseFloat(pt.value.toFixed(4))
      });
    }
  }

  // 9. Best & worst 1-year windows summary
  const oneYearResults = scanResults.find(r => r.holdingDays === 365 && r.targetPct === targets[0]);

  return {
    meta: {
      symbols,
      weights:      normWeights.map(w => parseFloat((w * 100).toFixed(2))),
      totalCapital,
      range,
      dataPoints:   dates.length,
      dateRange:    { from: dates[0], to: dates[dates.length - 1] },
      analyzedAt:   new Date().toISOString()
    },
    scanResults,
    growthPattern,
    yearlyBreakdown: yearly,
    portfolioTimeline: portTimeline,
    diversificationTimeline: divTimeline,
    summary: {
      totalTradingDays: dates.length,
      years:            parseFloat((dates.length / 252).toFixed(1)),
      bestYear:         yearly.length > 0 ? yearly.reduce((b, y) => y.portReturn > b.portReturn ? y : b) : null,
      worstYear:        yearly.length > 0 ? yearly.reduce((b, y) => y.portReturn < b.portReturn ? y : b) : null,
      posYears:         yearly.filter(y => y.portReturn >= 0).length,
      negYears:         yearly.filter(y => y.portReturn < 0).length,
    }
  };
}

module.exports = { scanPortfolio };
