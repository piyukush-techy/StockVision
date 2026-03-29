// regimeMatcher.js — Phase 3 Month 16: Regime Matching Engine
// Compares current market conditions against historical regime snapshots
// "Current market looks like Oct 2020 — here's what happened next"

const axios = require('axios');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
const cache   = new Map();
const TTL     = 2 * 60 * 60 * 1000;  // 2h

function getCached(k)       { const e = cache.get(k); if (!e || Date.now() - e.ts > TTL) { cache.delete(k); return null; } return e.data; }
function setCached(k, data) { cache.set(k, { data, ts: Date.now() }); }

// ─── Fetch OHLCV from Yahoo ───────────────────────────────────────────────────
async function fetchOHLCV(symbol, range = '5y') {
  const k = `rm_${symbol}_${range}`;
  const c = getCached(k); if (c) return c;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
  const res = await axios.get(url, {
    params:  { interval: '1d', range },
    headers: HEADERS,
    timeout: 15000,
  });

  const r = res.data?.chart?.result?.[0];
  if (!r) throw new Error(`No data for ${symbol}`);

  const ts  = r.timestamp || [];
  const q   = r.indicators?.quote?.[0] || {};
  const data = ts.map((t, i) => ({
    date:   new Date(t * 1000).toISOString().substring(0, 10),
    open:   q.open?.[i]   ?? null,
    high:   q.high?.[i]   ?? null,
    low:    q.low?.[i]    ?? null,
    close:  q.close?.[i]  ?? null,
    volume: q.volume?.[i] ?? null,
  })).filter(d => d.close != null);

  if (data.length < 200) throw new Error(`Insufficient data for ${symbol}`);
  setCached(k, data);
  return data;
}

// ─── Indicators ───────────────────────────────────────────────────────────────
function sma(arr, p) {
  return arr.map((_, i) => {
    if (i < p - 1) return null;
    const s = arr.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0);
    return s / p;
  });
}

function annualVol(closes, p = 20) {
  return closes.map((_, i) => {
    if (i < p + 1) return null;
    const rets = [];
    for (let j = i - p + 1; j <= i; j++) rets.push(Math.log(closes[j] / closes[j - 1]));
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const std  = Math.sqrt(rets.reduce((a, r) => a + (r - mean) ** 2, 0) / rets.length);
    return std * Math.sqrt(252) * 100;
  });
}

function rsi(closes, p = 14) {
  const rsiArr = Array(closes.length).fill(null);
  if (closes.length < p + 1) return rsiArr;
  let gains = 0, losses = 0;
  for (let i = 1; i <= p; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains  += d;
    else       losses -= d;
  }
  let avgG = gains / p, avgL = losses / p;
  rsiArr[p] = 100 - 100 / (1 + (avgL === 0 ? 1000 : avgG / avgL));
  for (let i = p + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (p - 1) + Math.max(d, 0)) / p;
    avgL = (avgL * (p - 1) + Math.max(-d, 0)) / p;
    rsiArr[i] = 100 - 100 / (1 + (avgL === 0 ? 1000 : avgG / avgL));
  }
  return rsiArr;
}

// Slope of last N days linear regression (as % per day)
function slope(arr, n = 20) {
  if (arr.length < n) return 0;
  const s = arr.slice(-n);
  const xm = (n - 1) / 2;
  const ym = s.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  s.forEach((y, i) => { num += (i - xm) * (y - ym); den += (i - xm) ** 2; });
  return den === 0 ? 0 : (num / den / ym) * 100;
}

// ─── Build regime fingerprint at index i ─────────────────────────────────────
function buildFingerprint(closes, vols, rsiArr, ma50arr, ma200arr, i) {
  const price = closes[i];
  const m50   = ma50arr[i];
  const m200  = ma200arr[i];
  const vol   = vols[i];
  const r     = rsiArr[i];
  if (!m50 || !m200 || !vol || !r) return null;

  const pVsM50   = (price - m50)   / m50   * 100;
  const pVsM200  = (price - m200)  / m200  * 100;
  const m50VsM200 = (m50  - m200)  / m200  * 100;

  // Classify regime
  let regime;
  if      (pVsM50 > 3  && pVsM200 > 5  && m50VsM200 > 2)    regime = 'BULL';
  else if (pVsM50 < -3 && pVsM200 < -5 && m50VsM200 < -2)   regime = 'BEAR';
  else if (pVsM50 > 0  && pVsM200 > 0)                       regime = 'BULL';
  else if (pVsM50 < 0  && pVsM200 < 0)                       regime = 'BEAR';
  else                                                         regime = 'SIDEWAYS';

  // momentum score: -100 → +100
  const momentum = Math.max(-100, Math.min(100, pVsM50 * 4 + m50VsM200 * 6));

  return { regime, pVsM50, pVsM200, m50VsM200, vol, rsi: r, momentum };
}

// ─── Cosine similarity between two fingerprints ───────────────────────────────
function similarity(a, b) {
  // Weighted feature vector: [pVsM50, pVsM200, m50VsM200, vol/5, (rsi-50)/25, momentum/50]
  const fa = [a.pVsM50, a.pVsM200, a.m50VsM200, a.vol / 5, (a.rsi - 50) / 25, a.momentum / 50];
  const fb = [b.pVsM50, b.pVsM200, b.m50VsM200, b.vol / 5, (b.rsi - 50) / 25, b.momentum / 50];

  const dot   = fa.reduce((s, v, i) => s + v * fb[i], 0);
  const normA = Math.sqrt(fa.reduce((s, v) => s + v * v, 0));
  const normB = Math.sqrt(fb.reduce((s, v) => s + v * v, 0));
  if (normA === 0 || normB === 0) return 0;

  return Math.max(0, Math.min(1, (dot / (normA * normB) + 1) / 2)); // map [-1,1] → [0,1]
}

// ─── Named historical market periods ─────────────────────────────────────────
const KNOWN_PERIODS = [
  { name: 'COVID Crash Bottom',      date: '2020-03-23', desc: 'Absolute lows of COVID sell-off — recovery began here' },
  { name: 'Post-COVID Bull Run',     date: '2020-07-01', desc: 'Massive liquidity-driven rally, low rates, FOMO buying' },
  { name: 'Pre-Budget Rally 2021',   date: '2021-01-15', desc: 'Sensex at all-time highs ahead of infrastructure budget' },
  { name: 'COVID 2nd Wave Dip',      date: '2021-04-20', desc: 'Delta wave panic, markets sold off sharply' },
  { name: 'FII Sell-Off 2021',       date: '2021-11-20', desc: 'Fed tapering fears, FIIs pulled out aggressively' },
  { name: 'Russia-Ukraine Crash',    date: '2022-03-07', desc: 'Oil shock, war fear, global risk-off sell-off' },
  { name: 'Bear Market 2022',        date: '2022-06-20', desc: 'Rising rates crush valuations, prolonged downtrend' },
  { name: 'Recovery Rally 2022',     date: '2022-12-05', desc: 'China reopening + rate hike peak hopes' },
  { name: 'Pre-Election Bull 2024',  date: '2024-05-10', desc: 'Markets at all-time highs on Modi 3.0 optimism' },
  { name: 'Election Shock 2024',     date: '2024-06-05', desc: 'BJP fails majority, circuit breakers triggered on NSE' },
  { name: 'FII Mega Sell-Off 2024',  date: '2024-10-10', desc: 'FIIs sell ₹1 Lakh Crore in October — Nifty falls 8%' },
  { name: 'Budget Relief Rally 2025',date: '2025-02-03', desc: 'No income tax upto ₹12L, middle class relief, euphoria' },
  { name: 'Tariff War Crash 2025',   date: '2025-04-08', desc: 'US tariff war, Nifty crashes below 22,000' },
  { name: 'RBI Rate Cut Cycle 2025', date: '2025-07-05', desc: 'RBI begins cutting rates, liquidity improves' },
];

// ─── Forward return calculator ────────────────────────────────────────────────
function forwardReturn(closes, dates, fromDate, days) {
  const i = dates.findIndex(d => d >= fromDate);
  if (i < 0 || i + days >= closes.length) return null;
  return (closes[i + days] - closes[i]) / closes[i] * 100;
}

// ─── Main regime matcher ──────────────────────────────────────────────────────
async function matchRegime({ symbol, benchmarkSymbol = '^NSEI' }) {
  // Fetch stock + Nifty benchmark
  const [stockData, niftyData] = await Promise.all([
    fetchOHLCV(symbol, '5y'),
    fetchOHLCV(benchmarkSymbol, '5y').catch(() => null),
  ]);

  const data = niftyData && niftyData.length > stockData.length ? niftyData : stockData;

  const closes = data.map(d => d.close);
  const dates  = data.map(d => d.date);
  const n      = closes.length;

  const ma50arr  = sma(closes, 50);
  const ma200arr = sma(closes, 200);
  const volArr2  = annualVol(closes, 20);
  const rsiArr2  = rsi(closes, 14);

  // ── Current fingerprint ──────────────────────────────────────────────────
  const currentFP = buildFingerprint(closes, volArr2, rsiArr2, ma50arr, ma200arr, n - 1);
  if (!currentFP) throw new Error('Cannot build current fingerprint — insufficient data');

  // ── Scan all historical windows (step every 5 days for perf) ─────────────
  const matches = [];
  for (let i = 250; i < n - 90; i += 5) {
    const fp = buildFingerprint(closes, volArr2, rsiArr2, ma50arr, ma200arr, i);
    if (!fp) continue;
    if (fp.regime !== currentFP.regime) continue; // only same-regime matches

    const sim = similarity(currentFP, fp);
    if (sim < 0.75) continue; // threshold

    const fwd30  = forwardReturn(closes, dates, dates[i], 30);
    const fwd90  = forwardReturn(closes, dates, dates[i], 90);
    const fwd180 = forwardReturn(closes, dates, dates[i], 180);

    // Find nearest named period
    const nearestPeriod = KNOWN_PERIODS.reduce((best, p) => {
      const diff = Math.abs(new Date(dates[i]) - new Date(p.date));
      return diff < (best ? Math.abs(new Date(dates[i]) - new Date(best.date)) : Infinity) ? p : best;
    }, null);

    matches.push({
      date:     dates[i],
      sim:      parseFloat(sim.toFixed(3)),
      regime:   fp.regime,
      fwd30,
      fwd90,
      fwd180,
      namedPeriod: nearestPeriod && Math.abs(new Date(dates[i]) - new Date(nearestPeriod.date)) < 60 * 86400000
        ? nearestPeriod : null,
      fingerprint: {
        pVsM50:    parseFloat(fp.pVsM50.toFixed(2)),
        pVsM200:   parseFloat(fp.pVsM200.toFixed(2)),
        m50VsM200: parseFloat(fp.m50VsM200.toFixed(2)),
        vol:       parseFloat(fp.vol.toFixed(2)),
        rsi:       parseFloat(fp.rsi.toFixed(1)),
        momentum:  parseFloat(fp.momentum.toFixed(1)),
      },
    });
  }

  // Sort by similarity desc, take top 10
  matches.sort((a, b) => b.sim - a.sim);
  const top = matches.slice(0, 10);

  // ── Aggregate forward return stats from all matches ─────────────────────
  const validFwd30  = matches.filter(m => m.fwd30  != null).map(m => m.fwd30);
  const validFwd90  = matches.filter(m => m.fwd90  != null).map(m => m.fwd90);
  const validFwd180 = matches.filter(m => m.fwd180 != null).map(m => m.fwd180);

  function aggStats(arr) {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mean   = arr.reduce((a, b) => a + b, 0) / arr.length;
    const pos    = arr.filter(v => v > 0).length;
    return {
      mean:   parseFloat(mean.toFixed(2)),
      median: parseFloat(sorted[Math.floor(sorted.length / 2)].toFixed(2)),
      p25:    parseFloat(sorted[Math.floor(sorted.length * 0.25)].toFixed(2)),
      p75:    parseFloat(sorted[Math.floor(sorted.length * 0.75)].toFixed(2)),
      min:    parseFloat(sorted[0].toFixed(2)),
      max:    parseFloat(sorted[sorted.length - 1].toFixed(2)),
      winPct: parseFloat((pos / arr.length * 100).toFixed(1)),
      n:      arr.length,
    };
  }

  const stats = {
    fwd30:  aggStats(validFwd30),
    fwd90:  aggStats(validFwd90),
    fwd180: aggStats(validFwd180),
  };

  // ── Feasibility score ────────────────────────────────────────────────────
  // Based on: % of matches with positive fwd90, regime strength, match quality
  const topSim    = top.length > 0 ? top[0].sim : 0;
  const winPct90  = stats.fwd90?.winPct ?? 50;
  const avgReturn = stats.fwd90?.mean   ?? 0;
  const matchCount = matches.length;

  let feasibility = 0;
  feasibility += topSim * 30;                                  // 0-30: match quality
  feasibility += Math.min(matchCount / 2, 20);                 // 0-20: match count
  feasibility += (winPct90 - 50) * 0.6 + 30;                  // 0-60: win rate
  feasibility  = Math.max(0, Math.min(100, feasibility));

  let feasibilityLabel, feasibilityColor;
  if      (feasibility >= 80) { feasibilityLabel = 'Excellent';  feasibilityColor = 'green'; }
  else if (feasibility >= 65) { feasibilityLabel = 'Good';       feasibilityColor = 'teal'; }
  else if (feasibility >= 50) { feasibilityLabel = 'Moderate';   feasibilityColor = 'blue'; }
  else if (feasibility >= 35) { feasibilityLabel = 'Cautious';   feasibilityColor = 'yellow'; }
  else                        { feasibilityLabel = 'Unfavorable';feasibilityColor = 'red'; }

  // ── Regime transition probability ────────────────────────────────────────
  // Look at matches: after X days, what % changed regime?
  const regimeTransitions = matches.slice(0, 20).filter(m => m.fwd90 != null);
  const transitionRisk = regimeTransitions.length > 0
    ? Math.round(regimeTransitions.filter(m => Math.abs(m.fwd90) > 15).length / regimeTransitions.length * 100)
    : 50;

  // ── Best match narrative ─────────────────────────────────────────────────
  const bestMatch = top[0];
  const bestNarrative = bestMatch?.namedPeriod
    ? `Current market most closely resembles ${bestMatch.namedPeriod.name} (${bestMatch.date.substring(0, 7)}) — "${bestMatch.namedPeriod.desc}"`
    : bestMatch
      ? `Current market most closely resembles ${bestMatch.date.substring(0, 7)} conditions (similarity: ${(bestMatch.sim * 100).toFixed(0)}%)`
      : 'No strong historical match found in the dataset';

  // ── Current fingerprint human-readable ──────────────────────────────────
  const currentMetrics = {
    pVsM50:    parseFloat(currentFP.pVsM50.toFixed(2)),
    pVsM200:   parseFloat(currentFP.pVsM200.toFixed(2)),
    m50VsM200: parseFloat(currentFP.m50VsM200.toFixed(2)),
    vol:       parseFloat(currentFP.vol.toFixed(2)),
    rsi:       parseFloat(currentFP.rsi.toFixed(1)),
    momentum:  parseFloat(currentFP.momentum.toFixed(1)),
    regime:    currentFP.regime,
  };

  return {
    symbol,
    currentMetrics,
    feasibility:       Math.round(feasibility),
    feasibilityLabel,
    feasibilityColor,
    bestNarrative,
    transitionRisk,
    stats,
    topMatches:        top,
    totalMatches:      matches.length,
    meta: {
      dataPoints: n,
      dateRange: { start: dates[0], end: dates[n - 1] },
      analysisDate: new Date().toISOString().substring(0, 10),
    },
  };
}

// ─── Portfolio regime match ───────────────────────────────────────────────────
// Run matchRegime for Nifty50 (benchmark), then score portfolio stocks vs it
async function matchPortfolioRegime({ symbols, weights }) {
  // Always use Nifty50 as the market benchmark
  const benchResult = await matchRegime({ symbol: '^NSEI', benchmarkSymbol: '^NSEI' });

  // Also run individual stock regime checks (just current fingerprint, no full match)
  const stockFingerprints = await Promise.allSettled(
    symbols.map(async sym => {
      try {
        const data   = await fetchOHLCV(sym, '2y');
        const closes = data.map(d => d.close);
        const n      = closes.length;
        const m50    = sma(closes, 50);
        const m200   = sma(closes, 200);
        const v      = annualVol(closes, 20);
        const r      = rsi(closes, 14);
        const fp     = buildFingerprint(closes, v, r, m50, m200, n - 1);
        return { symbol: sym, fingerprint: fp, currentPrice: closes[n - 1] };
      } catch { return { symbol: sym, fingerprint: null, currentPrice: null }; }
    })
  );

  const stockResults = stockFingerprints
    .filter(r => r.status === 'fulfilled' && r.value.fingerprint)
    .map(r => r.value);

  // Regime alignment: how many stocks align with market regime?
  const marketRegime = benchResult.currentMetrics.regime;
  const aligned = stockResults.filter(s => s.fingerprint?.regime === marketRegime);
  const alignmentScore = stockResults.length > 0
    ? Math.round(aligned.length / stockResults.length * 100) : 0;

  return {
    ...benchResult,
    portfolioAlignment: {
      marketRegime,
      alignedStocks:     aligned.map(s => s.symbol),
      misalignedStocks:  stockResults.filter(s => s.fingerprint?.regime !== marketRegime).map(s => s.symbol),
      alignmentScore,
      stockDetails:      stockResults.map(s => ({
        symbol: s.symbol,
        regime: s.fingerprint?.regime || 'UNKNOWN',
        aligned: s.fingerprint?.regime === marketRegime,
        rsi:     s.fingerprint?.rsi    || null,
        momentum:s.fingerprint?.momentum || null,
        pVsM50:  s.fingerprint?.pVsM50  || null,
      })),
    },
  };
}

module.exports = { matchRegime, matchPortfolioRegime };
