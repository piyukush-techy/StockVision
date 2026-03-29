// breakoutEngine.js — Month 32: 52-Week Breakout Probability
// "RELIANCE near ₹1450 resistance — broke out 6/9 times historically. Avg gain 30d: +8.2%"
//
// Strategy:
//   1. Fetch 5y daily OHLCV (reuse fetchHistoricalData from scanner)
//   2. On every trading day, compute the rolling 52-week high up to that day
//   3. Identify "near-high events" — days where close is within proximityPct% of 52w high
//   4. Walk forward 30 days from each event and measure: did price exceed the 52w high?
//   5. If yes → breakout success. Record forward returns at 10d / 30d.
//   6. Aggregate into: successRate, attempts, avgGain, bestCase, failureAvgLoss

const { fetchHistoricalData } = require('./scanner');

const PROXIMITY_PCT  = 3;   // "near high" = within 3% of 52w high
const LOOKBACK_DAYS  = 252; // 52 weeks ≈ 252 trading days
const FORWARD_DAYS   = 30;  // measure outcome over next 30 days
const MIN_ATTEMPTS   = 3;   // need at least 3 attempts for meaningful stats

// ── Cache ─────────────────────────────────────────────────────────────────────
const cache = new Map();
const TTL   = 2 * 60 * 60 * 1000; // 2 hours

function getCached(k) {
  const e = cache.get(k);
  if (!e || Date.now() - e.ts > TTL) { cache.delete(k); return null; }
  return e.data;
}
function setCached(k, d) { cache.set(k, { data: d, ts: Date.now() }); }

// ── Label helpers ─────────────────────────────────────────────────────────────
function getStrengthLabel(rate) {
  if (rate >= 75) return { label: 'Very strong breakout history', color: 'green',  signal: 'bullish' };
  if (rate >= 55) return { label: 'Moderate breakout history',    color: 'blue',   signal: 'bullish' };
  if (rate >= 40) return { label: 'Mixed breakout history',       color: 'yellow', signal: 'neutral' };
  return               { label: 'Weak breakout history',          color: 'red',    signal: 'bearish' };
}

function getProximityLabel(pct) {
  if (pct <= 1)  return { zone: 'At resistance', urgency: 'high'   };
  if (pct <= 3)  return { zone: 'Near resistance', urgency: 'medium' };
  if (pct <= 8)  return { zone: 'Approaching resistance', urgency: 'low' };
  return               { zone: 'Far from resistance', urgency: 'none'   };
}

// ── Core engine ───────────────────────────────────────────────────────────────
async function computeBreakoutProbability(symbol) {
  const cacheKey = `breakout_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const candles = await fetchHistoricalData(symbol, 5);
  const n = candles.length;

  if (n < LOOKBACK_DAYS + FORWARD_DAYS + 10) {
    throw new Error(`Insufficient data for ${symbol}`);
  }

  // ── Step 1: identify near-52w-high events ────────────────────────────────
  // Deduplicate: only one event per 15-day window to avoid clustering
  const DEDUP_WINDOW = 15;
  let lastEventIdx = -DEDUP_WINDOW;

  const events = [];

  for (let i = LOOKBACK_DAYS; i < n - FORWARD_DAYS; i++) {
    // Rolling 52w high = max close over previous LOOKBACK_DAYS candles
    let rolling52High = 0;
    for (let j = i - LOOKBACK_DAYS; j < i; j++) {
      if (candles[j].high > rolling52High) rolling52High = candles[j].high;
    }

    if (rolling52High <= 0) continue;

    const close = candles[i].close;
    const distPct = ((rolling52High - close) / rolling52High) * 100;

    // Near high = within PROXIMITY_PCT%
    if (distPct > PROXIMITY_PCT) continue;
    if (i - lastEventIdx < DEDUP_WINDOW) continue; // deduplicate

    lastEventIdx = i;

    // ── Step 2: measure forward outcome ────────────────────────────────────
    let broke = false;
    let maxHigh10d = close;
    let maxHigh30d = close;
    let minLow30d  = close;

    for (let f = 1; f <= FORWARD_DAYS; f++) {
      const fc = candles[i + f];
      if (!fc) break;
      if (f <= 10 && fc.high > maxHigh10d) maxHigh10d = fc.high;
      if (fc.high > maxHigh30d) maxHigh30d = fc.high;
      if (fc.low  < minLow30d)  minLow30d  = fc.low;
      if (!broke && fc.close > rolling52High) broke = true;
    }

    const ret10d  = ((maxHigh10d - close) / close) * 100;
    const ret30d  = ((maxHigh30d - close) / close) * 100;
    const maxDD   = ((minLow30d  - close) / close) * 100;

    events.push({
      date: candles[i].date,
      close,
      rolling52High,
      distPct:   parseFloat(distPct.toFixed(2)),
      broke,
      ret10d:    parseFloat(ret10d.toFixed(2)),
      ret30d:    parseFloat(ret30d.toFixed(2)),
      maxDD:     parseFloat(maxDD.toFixed(2)),
    });
  }

  if (events.length < MIN_ATTEMPTS) {
    // Not enough near-high events — return a low-confidence result
    return {
      symbol,
      attempts:       events.length,
      successCount:   0,
      successRate:    null,
      lowConfidence:  true,
      message:        `Only ${events.length} near-high events in 5 years — insufficient data`,
      currentProximity: null,
      proximityLabel:   null,
      strengthLabel:    null,
      recentEvents:     [],
      fromCache:        false,
    };
  }

  // ── Step 3: aggregate ───────────────────────────────────────────────────
  const successes = events.filter(e => e.broke);
  const failures  = events.filter(e => !e.broke);

  const avg = (arr, key) => {
    const vals = arr.map(e => e[key]).filter(v => v !== null);
    if (!vals.length) return null;
    return parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1));
  };

  const successRate   = Math.round((successes.length / events.length) * 100);
  const strengthInfo  = getStrengthLabel(successRate);

  // ── Step 4: current proximity ──────────────────────────────────────────
  const currentClose = candles[n - 1].close;
  let current52High  = 0;
  for (let j = n - LOOKBACK_DAYS; j < n; j++) {
    if (candles[j].high > current52High) current52High = candles[j].high;
  }
  const currentDistPct = current52High > 0
    ? parseFloat(((current52High - currentClose) / current52High * 100).toFixed(1))
    : null;

  const proximityInfo = currentDistPct !== null ? getProximityLabel(currentDistPct) : null;
  const isNearNow = currentDistPct !== null && currentDistPct <= PROXIMITY_PCT;

  const result = {
    symbol,
    attempts:       events.length,
    successCount:   successes.length,
    failCount:      failures.length,
    successRate,
    lowConfidence:  false,

    // Success stats
    avgGain10d:     avg(successes, 'ret10d'),
    avgGain30d:     avg(successes, 'ret30d'),
    bestGain30d:    successes.length ? Math.max(...successes.map(e => e.ret30d)) : null,

    // Failure stats
    avgLoss30d:     avg(failures, 'ret30d'),
    avgMaxDD:       avg(events, 'maxDD'),
    worstDD:        events.length ? Math.min(...events.map(e => e.maxDD)) : null,

    // Strength
    ...strengthInfo,

    // Current state
    currentClose,
    current52High:    parseFloat(current52High.toFixed(2)),
    currentDistPct,
    proximityLabel:   proximityInfo,
    isNearNow,

    // Recent events (last 5 for display)
    recentEvents: events.slice(-5).reverse().map(e => ({
      date:  e.date,
      dist:  e.distPct,
      broke: e.broke,
      ret30: e.ret30d,
    })),

    scannedAt: new Date().toISOString(),
    fromCache: false,
  };

  setCached(cacheKey, result);
  return result;
}

function clearBreakoutCache(symbol) {
  cache.delete(`breakout_${symbol}`);
}

module.exports = { computeBreakoutProbability, clearBreakoutCache };
