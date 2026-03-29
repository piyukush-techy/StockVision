const axios = require('axios');

/**
 * Historical Scanner Engine — Phase 2 Month 7
 * Core sliding-window backtester for Indian stocks
 *
 * Answers: "If someone bought at price X on day D,
 *           what % of the time did they hit +Y% within Z days?"
 */

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// ─── Cache (1 hour TTL for historical data) ───────────────────────────────────
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCached(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ─── Fetch Historical OHLCV from Yahoo Finance ────────────────────────────────
async function fetchHistoricalData(symbol, years = 5) {
  const cacheKey = `hist_${symbol}_${years}y`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const range = `${years}y`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

    const res = await axios.get(url, {
      params: { interval: '1d', range },
      headers: HEADERS,
      timeout: 15000
    });

    const result = res.data?.chart?.result?.[0];
    if (!result) throw new Error('No historical data');

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];
    const highs  = quotes.high  || [];
    const lows   = quotes.low   || [];
    const opens  = quotes.open  || [];
    const vols   = quotes.volume || [];

    // Build clean candle array
    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (!c || c <= 0) continue;
      candles.push({
        date: new Date(timestamps[i] * 1000).toISOString().substring(0, 10),
        open:   opens[i]  || c,
        high:   highs[i]  || c,
        low:    lows[i]   || c,
        close:  c,
        volume: vols[i]   || 0
      });
    }

    if (candles.length < 100) throw new Error('Insufficient data (<100 candles)');

    setCached(cacheKey, candles);
    return candles;

  } catch (err) {
    console.error(`fetchHistoricalData(${symbol}):`, err.message);
    throw err;
  }
}

// ─── Label from success rate ──────────────────────────────────────────────────
function getSuccessLabel(rate) {
  if (rate <= 10) return { label: 'Historically Impossible', color: 'red',       emoji: '🚫' };
  if (rate <= 25) return { label: 'Very Rare',               color: 'orange',    emoji: '⚠️' };
  if (rate <= 40) return { label: 'Rare',                    color: 'yellow',    emoji: '🟡' };
  if (rate <= 60) return { label: 'Occasional',              color: 'blue',      emoji: '🔵' };
  if (rate <= 80) return { label: 'Common',                  color: 'green',     emoji: '✅' };
  return              { label: 'Very Common',                color: 'darkgreen', emoji: '🚀' };
}

// ─── Feature 1: Sliding Window Scanner ───────────────────────────────────────
async function runSlidingWindowScan(symbol, targetPct, windowDays) {
  const candles = await fetchHistoricalData(symbol);
  const n = candles.length;

  let totalEntries  = 0;
  let successCount  = 0;
  const timesToTarget = []; // days taken for successful trades
  const maxDrawdowns  = []; // max drawdown before target hit or window ends

  for (let i = 0; i < n - windowDays; i++) {
    const entryPrice = candles[i].close;
    if (!entryPrice || entryPrice <= 0) continue;

    const targetPrice = entryPrice * (1 + targetPct / 100);
    totalEntries++;

    let hit         = false;
    let daysTaken   = null;
    let maxDD       = 0;
    let lowestSeen  = entryPrice;

    // Walk forward windowDays candles
    for (let j = i + 1; j <= i + windowDays && j < n; j++) {
      const day     = candles[j];
      const dayHigh = day.high  || day.close;
      const dayLow  = day.low   || day.close;

      // Track max drawdown (using intraday low)
      if (dayLow < lowestSeen) {
        lowestSeen = dayLow;
        const dd = ((dayLow - entryPrice) / entryPrice) * 100;
        if (dd < maxDD) maxDD = dd;
      }

      // Check if target was hit (using intraday high)
      if (dayHigh >= targetPrice) {
        hit       = true;
        daysTaken = j - i;
        break;
      }
    }

    if (hit) {
      successCount++;
      timesToTarget.push(daysTaken);
    }
    maxDrawdowns.push(maxDD);
  }

  const successRate = totalEntries > 0
    ? Math.round((successCount / totalEntries) * 100)
    : 0;

  const labelInfo = getSuccessLabel(successRate);

  return {
    symbol,
    targetPct,
    windowDays,
    totalEntries,
    successCount,
    failCount:    totalEntries - successCount,
    successRate,
    ...labelInfo,
    // Pass raw arrays to other features
    _timesToTarget: timesToTarget,
    _maxDrawdowns:  maxDrawdowns,
    _candles:       candles
  };
}

// ─── Feature 2: Time-to-Target Distribution ──────────────────────────────────
function buildTimeDistribution(timesToTarget, windowDays) {
  if (!timesToTarget || timesToTarget.length === 0) {
    return { buckets: [], median: null, mean: null, fastest: null, slowest: null };
  }

  const sorted = [...timesToTarget].sort((a, b) => a - b);
  const total  = sorted.length;

  // Build milestone cumulative percentages
  const milestones = [
    Math.round(windowDays * 0.1),
    Math.round(windowDays * 0.25),
    Math.round(windowDays * 0.5),
    Math.round(windowDays * 0.75),
    windowDays
  ].filter((v, i, arr) => arr.indexOf(v) === i && v > 0);

  const buckets = milestones.map(days => {
    const count = sorted.filter(t => t <= days).length;
    return {
      days,
      count,
      pct: Math.round((count / total) * 100)
    };
  });

  const median  = sorted[Math.floor(total / 2)];
  const mean    = Math.round(sorted.reduce((s, v) => s + v, 0) / total);

  return {
    buckets,
    median,
    mean,
    fastest: sorted[0],
    slowest: sorted[sorted.length - 1],
    total
  };
}

// ─── Feature 3: Drawdown Severity Analysis ───────────────────────────────────
function buildDrawdownAnalysis(maxDrawdowns) {
  if (!maxDrawdowns || maxDrawdowns.length === 0) {
    return { buckets: [], avgDrawdown: 0, worstDrawdown: 0, pctWithinFive: 0 };
  }

  const total = maxDrawdowns.length;

  const buckets = [
    { label: '0% to -5%',    min: -5,   max: 0   },
    { label: '-5% to -10%',  min: -10,  max: -5  },
    { label: '-10% to -15%', min: -15,  max: -10 },
    { label: '-15% to -20%', min: -20,  max: -15 },
    { label: 'Below -20%',   min: -Infinity, max: -20 }
  ].map(b => {
    const count = maxDrawdowns.filter(d => d >= b.min && d < b.max).length;
    return { ...b, count, pct: Math.round((count / total) * 100) };
  });

  const sum = maxDrawdowns.reduce((s, v) => s + v, 0);
  const avgDrawdown   = parseFloat((sum / total).toFixed(2));
  const worstDrawdown = parseFloat(Math.min(...maxDrawdowns).toFixed(2));
  const pctWithinFive = Math.round((maxDrawdowns.filter(d => d >= -5).length / total) * 100);

  return { buckets, avgDrawdown, worstDrawdown, pctWithinFive };
}

// ─── Feature 4: Gap Risk Detection ───────────────────────────────────────────
function calculateGapRisk(candles) {
  if (!candles || candles.length < 30) {
    return { gapRiskPct: 0, level: 'LOW', marketAvg: 28 };
  }

  let gapCount  = 0;
  let bigMoves  = 0;

  for (let i = 1; i < candles.length; i++) {
    const prev  = candles[i - 1].close;
    const open  = candles[i].open;
    const close = candles[i].close;
    if (!prev || !open || !close) continue;

    const intradayMove = Math.abs((close - open) / open) * 100;
    const overnightGap = Math.abs((open  - prev) / prev) * 100;
    const totalMove    = Math.abs((close - prev) / prev) * 100;

    if (totalMove > 3) {
      bigMoves++;
      if (overnightGap >= intradayMove) gapCount++;
    }
  }

  const gapRiskPct = bigMoves > 0 ? Math.round((gapCount / bigMoves) * 100) : 0;
  const level = gapRiskPct >= 50 ? 'HIGH' : gapRiskPct >= 30 ? 'MEDIUM' : 'LOW';

  return { gapRiskPct, level, marketAvg: 28, bigMovesTotal: bigMoves };
}

// ─── Feature 5: Event Cooldown Analysis ──────────────────────────────────────
async function fetchEventCooldown(symbol) {
  // Uses historical data to estimate post-earnings / post-dividend behaviour
  // We detect large single-day moves (>3%) as proxy for events
  // and measure the 30-day return afterward

  try {
    const candles = await fetchHistoricalData(symbol);
    const n = candles.length;
    const events = [];

    for (let i = 1; i < n - 30; i++) {
      const prev  = candles[i - 1].close;
      const curr  = candles[i].close;
      if (!prev || !curr) continue;

      const movePct = ((curr - prev) / prev) * 100;
      if (Math.abs(movePct) < 3) continue;

      // Measure 7-day, 15-day, 30-day forward return
      const r7  = i + 7  < n ? ((candles[i + 7].close  - curr) / curr) * 100 : null;
      const r15 = i + 15 < n ? ((candles[i + 15].close - curr) / curr) * 100 : null;
      const r30 = i + 30 < n ? ((candles[i + 30].close - curr) / curr) * 100 : null;

      events.push({ date: candles[i].date, movePct, r7, r15, r30 });
    }

    if (events.length === 0) return null;

    const positiveEvents = events.filter(e => e.movePct > 0);
    const negativeEvents = events.filter(e => e.movePct < 0);

    const avg = (arr, key) => {
      const valid = arr.filter(e => e[key] !== null);
      if (!valid.length) return null;
      return parseFloat((valid.reduce((s, e) => s + e[key], 0) / valid.length).toFixed(2));
    };

    return {
      totalEvents: events.length,
      afterPositiveMove: {
        count:   positiveEvents.length,
        avg7d:   avg(positiveEvents, 'r7'),
        avg15d:  avg(positiveEvents, 'r15'),
        avg30d:  avg(positiveEvents, 'r30')
      },
      afterNegativeMove: {
        count:   negativeEvents.length,
        avg7d:   avg(negativeEvents, 'r7'),
        avg15d:  avg(negativeEvents, 'r15'),
        avg30d:  avg(negativeEvents, 'r30')
      },
      note: 'Large moves (>3%) used as proxy for earnings/events'
    };

  } catch (err) {
    console.error('fetchEventCooldown error:', err.message);
    return null;
  }
}

// ─── Master scan function (runs all 5 features together) ─────────────────────
async function runFullScan(symbol, targetPct, windowDays) {
  // Feature 1 — sliding window (also returns raw data for other features)
  const scan = await runSlidingWindowScan(symbol, targetPct, windowDays);

  // Feature 2 — time distribution
  const timeDistribution = buildTimeDistribution(scan._timesToTarget, windowDays);

  // Feature 3 — drawdown analysis
  const drawdownAnalysis = buildDrawdownAnalysis(scan._maxDrawdowns);

  // Feature 4 — gap risk (uses candle data)
  const gapRisk = calculateGapRisk(scan._candles);

  // Feature 5 — event cooldown (separate analysis)
  const eventCooldown = await fetchEventCooldown(symbol);

  // Compute survival score: |avgDrawdown| × (windowDays / 2 proxy for days in pain)
  const avgDD          = Math.abs(drawdownAnalysis.avgDrawdown);
  const survivalScore  = Math.min(10, parseFloat((avgDD * (windowDays / 30)).toFixed(1)));

  // Clean up raw arrays before returning
  delete scan._timesToTarget;
  delete scan._maxDrawdowns;
  delete scan._candles;

  return {
    scan,
    timeDistribution,
    drawdownAnalysis,
    gapRisk,
    eventCooldown,
    survivalScore,
    meta: {
      scannedAt: new Date().toISOString(),
      dataYears: 5
    }
  };
}

// ─── Invalidate cache ─────────────────────────────────────────────────────────
function clearCache(symbol) {
  for (const key of cache.keys()) {
    if (key.includes(symbol)) cache.delete(key);
  }
}

module.exports = {
  runFullScan,
  runSlidingWindowScan,
  buildTimeDistribution,
  buildDrawdownAnalysis,
  calculateGapRisk,
  fetchEventCooldown,
  fetchHistoricalData,
  clearCache
};
