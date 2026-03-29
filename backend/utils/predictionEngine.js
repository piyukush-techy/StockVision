// predictionEngine.js — Phase 4 Month 21
// Feature 1: Regime Transition Predictor — forward-looking forecasts from current regime
// Feature 2: Delusion Leaderboard        — anonymous crowd data, sector delusion index

const axios = require('axios');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
const cache   = new Map();
const TTL     = 2 * 60 * 60 * 1000;

function getCached(k)    { const e = cache.get(k); if (!e || Date.now() - e.ts > TTL) { cache.delete(k); return null; } return e.data; }
function setCached(k, d) { cache.set(k, { data: d, ts: Date.now() }); }

// ─── Fetch daily OHLCV ────────────────────────────────────────────────────────
async function fetchOHLCV(symbol, range = '5y') {
  const k = `pred_${symbol}_${range}`;
  const c = getCached(k); if (c) return c;

  const res = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
    params: { interval: '1d', range }, headers: HEADERS, timeout: 15000,
  });
  const r = res.data?.chart?.result?.[0];
  if (!r) throw new Error(`No data: ${symbol}`);

  const ts = r.timestamp || [];
  const q  = r.indicators?.quote?.[0] || {};
  const data = ts.map((t, i) => ({
    date:   new Date(t * 1000).toISOString().slice(0, 10),
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

// ─── Technical helpers ────────────────────────────────────────────────────────
function sma(arr, p) {
  return arr.map((_, i) => {
    if (i < p - 1) return null;
    return arr.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0) / p;
  });
}

function ema(arr, p) {
  const k = 2 / (p + 1);
  const out = Array(arr.length).fill(null);
  let seed = arr.slice(0, p).reduce((a, b) => a + b, 0) / p;
  out[p - 1] = seed;
  for (let i = p; i < arr.length; i++) out[i] = arr[i] * k + out[i - 1] * (1 - k);
  return out;
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
  const out = Array(closes.length).fill(null);
  if (closes.length < p + 1) return out;
  let gSum = 0, lSum = 0;
  for (let i = 1; i <= p; i++) { const d = closes[i] - closes[i-1]; d > 0 ? gSum += d : lSum -= d; }
  let avgG = gSum / p, avgL = lSum / p;
  out[p] = 100 - 100 / (1 + (avgL === 0 ? 1e6 : avgG / avgL));
  for (let i = p + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i-1];
    avgG = (avgG * (p-1) + Math.max(d, 0)) / p;
    avgL = (avgL * (p-1) + Math.max(-d, 0)) / p;
    out[i] = 100 - 100 / (1 + (avgL === 0 ? 1e6 : avgG / avgL));
  }
  return out;
}

function macd(closes) {
  const fast = ema(closes, 12);
  const slow = ema(closes, 26);
  const line = fast.map((v, i) => v != null && slow[i] != null ? v - slow[i] : null);
  const validLine = line.filter(v => v != null);
  const signal = [];
  const k = 2 / 10;
  let s = validLine.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
  signal.push(s);
  for (let i = 9; i < validLine.length; i++) { s = validLine[i] * k + s * (1 - k); signal.push(s); }
  // Backfill into full array
  const fullSignal = Array(closes.length).fill(null);
  let si = 0;
  for (let i = 0; i < closes.length; i++) {
    if (line[i] != null && si < signal.length) { fullSignal[i] = signal[si++]; }
  }
  return { line, signal: fullSignal };
}

// ─── Regime classifier ────────────────────────────────────────────────────────
function classifyRegime(close, ma50, ma200, vol, rsiVal, macdLine, macdSig) {
  if (!ma50 || !ma200) return { regime: 'UNKNOWN', strength: 0 };

  const pVsM50  = ((close - ma50)  / ma50)  * 100;
  const pVsM200 = ((close - ma200) / ma200) * 100;
  const m50VsM200 = ((ma50 - ma200) / ma200) * 100;
  const macdBull = macdLine != null && macdSig != null && macdLine > macdSig;

  let regime, strength;

  if (pVsM50 > 5 && pVsM200 > 10 && m50VsM200 > 3 && macdBull) {
    regime = 'STRONG_BULL'; strength = 90;
  } else if (pVsM50 > 2 && pVsM200 > 3 && macdBull) {
    regime = 'BULL'; strength = 70;
  } else if (pVsM50 < -5 && pVsM200 < -10 && m50VsM200 < -3) {
    regime = 'STRONG_BEAR'; strength = 90;
  } else if (pVsM50 < -2 && pVsM200 < -3) {
    regime = 'BEAR'; strength = 70;
  } else if (vol && vol > 25) {
    regime = 'VOLATILE'; strength = 60;
  } else if (Math.abs(pVsM50) < 3 && Math.abs(pVsM200) < 5) {
    regime = 'SIDEWAYS'; strength = 50;
  } else {
    regime = pVsM200 > 0 ? 'BULL' : 'BEAR'; strength = 45;
  }

  return { regime, strength, pVsM50: +pVsM50.toFixed(2), pVsM200: +pVsM200.toFixed(2), m50VsM200: +m50VsM200.toFixed(2), vol, rsi: rsiVal, macdBull };
}

// ─── Historical transition database (what happened after each regime) ─────────
const HISTORICAL_TRANSITIONS = {
  STRONG_BULL: [
    { period: 'Jan 2021 – Oct 2021',    fromRegime: 'STRONG_BULL', outcome: 'BULL',        days: 270, niftyReturn: 42.1,  trigger: 'COVID recovery + FII inflows',          probability: 45 },
    { period: 'Jul 2023 – Dec 2023',    fromRegime: 'STRONG_BULL', outcome: 'STRONG_BULL', days: 150, niftyReturn: 18.3,  trigger: 'Domestic flows + capex recovery',        probability: 30 },
    { period: 'Oct 2020 – Jan 2021',    fromRegime: 'STRONG_BULL', outcome: 'SIDEWAYS',    days: 90,  niftyReturn: -3.2,  trigger: 'Budget anxiety + profit booking',        probability: 25 },
  ],
  BULL: [
    { period: 'Jun 2020 – Dec 2020',    fromRegime: 'BULL', outcome: 'STRONG_BULL', days: 180, niftyReturn: 38.5, trigger: 'Vaccine rally + global liquidity',            probability: 40 },
    { period: 'Sep 2022 – Feb 2023',    fromRegime: 'BULL', outcome: 'SIDEWAYS',    days: 120, niftyReturn: 8.2,  trigger: 'Mixed global cues, RBI tightening',           probability: 35 },
    { period: 'Mar 2023 – Jul 2023',    fromRegime: 'BULL', outcome: 'BEAR',        days: 60,  niftyReturn: -7.8, trigger: 'FII selling + Adani crisis spillover',         probability: 25 },
  ],
  SIDEWAYS: [
    { period: 'Aug 2022 – Oct 2022',    fromRegime: 'SIDEWAYS', outcome: 'BULL',    days: 60,  niftyReturn: 12.4, trigger: 'Fed pivot hopes, RBI pause',                  probability: 50 },
    { period: 'Feb 2022 – Jun 2022',    fromRegime: 'SIDEWAYS', outcome: 'BEAR',    days: 120, niftyReturn: -14.2,trigger: 'Ukraine war escalation + oil shock',           probability: 35 },
    { period: 'Jul 2021 – Nov 2021',    fromRegime: 'SIDEWAYS', outcome: 'STRONG_BULL', days: 90, niftyReturn: 22.1, trigger: 'Omicron fear then relief rally',           probability: 15 },
  ],
  BEAR: [
    { period: 'Feb 2022 – Jun 2022',    fromRegime: 'BEAR', outcome: 'SIDEWAYS',    days: 90,  niftyReturn: 6.3,  trigger: 'Short covering + RBI liquidity',             probability: 45 },
    { period: 'Oct 2021 – Mar 2022',    fromRegime: 'BEAR', outcome: 'BULL',        days: 60,  niftyReturn: 14.8, trigger: 'Budget 2022 positive surprise',               probability: 35 },
    { period: 'Mar 2020 – Jun 2020',    fromRegime: 'BEAR', outcome: 'STRONG_BULL', days: 30,  niftyReturn: 28.9, trigger: 'Unprecedented FII buying post-COVID bottom',  probability: 20 },
  ],
  STRONG_BEAR: [
    { period: 'Mar 2020',               fromRegime: 'STRONG_BEAR', outcome: 'BEAR',  days: 30, niftyReturn: -5.2, trigger: 'Continued COVID fear, lockdown extension',     probability: 55 },
    { period: 'Mar 2020 (recovery)',    fromRegime: 'STRONG_BEAR', outcome: 'BULL',  days: 60, niftyReturn: 22.4, trigger: 'Policy stimulus + global risk-on',             probability: 45 },
  ],
  VOLATILE: [
    { period: 'Nov 2024 – Jan 2025',    fromRegime: 'VOLATILE', outcome: 'BULL',     days: 90, niftyReturn: 9.1, trigger: 'FII return after Trump election clarity',       probability: 50 },
    { period: 'Apr 2022',               fromRegime: 'VOLATILE', outcome: 'BEAR',     days: 45, niftyReturn: -8.3,trigger: 'Oil + inflation shock continuation',            probability: 35 },
    { period: 'Jun 2024',               fromRegime: 'VOLATILE', outcome: 'STRONG_BULL', days: 30, niftyReturn: 12.1, trigger: 'Election shock absorbed, budget hope',     probability: 15 },
  ],
};

const REGIME_META = {
  STRONG_BULL: { emoji: '🚀', label: 'Strong Bull',  color: 'emerald', desc: 'Price well above all MAs, MACD bullish, momentum strong' },
  BULL:        { emoji: '📈', label: 'Bull',          color: 'green',   desc: 'Price above MAs, uptrend intact' },
  SIDEWAYS:    { emoji: '↔️', label: 'Sideways',      color: 'blue',    desc: 'Range-bound, no clear trend' },
  BEAR:        { emoji: '📉', label: 'Bear',          color: 'orange',  desc: 'Price below key MAs, downtrend' },
  STRONG_BEAR: { emoji: '💀', label: 'Strong Bear',   color: 'red',     desc: 'Price far below all MAs, capitulation risk' },
  VOLATILE:    { emoji: '⚡', label: 'Volatile',      color: 'yellow',  desc: 'High volatility, regime unclear' },
  UNKNOWN:     { emoji: '❓', label: 'Unknown',       color: 'gray',    desc: 'Insufficient data' },
};

// ─── Sector indices for regime check ─────────────────────────────────────────
const SECTOR_INDICES = {
  'IT':      'NIFTY_IT.NS',
  'Banking': '^NSEBANK',
  'FMCG':    'NIFTY_FMCG.NS',
  'Pharma':  'NIFTY_PHARMA.NS',
  'Auto':    'NIFTY_AUTO.NS',
  'Metal':   'NIFTY_METAL.NS',
  'Infra':   'NIFTY_INFRA.NS',
  'Realty':  'NIFTY_REALTY.NS',
};


// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 1: REGIME TRANSITION PREDICTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyses current regime for Nifty (or any index/stock),
 * looks up historical transitions from this regime,
 * and generates forward-looking probability forecasts.
 *
 * @param {string}   symbol    - e.g. '^NSEI' or 'RELIANCE.NS'
 * @param {string[]} [sectors] - optional extra sector symbols to analyse
 */
async function runRegimePredictor({ symbol = '^NSEI', sectors = [] }) {
  const data    = await fetchOHLCV(symbol, '5y');
  const closes  = data.map(d => d.close);
  const dates   = data.map(d => d.date);

  const ma50arr  = sma(closes, 50);
  const ma200arr = sma(closes, 200);
  const volArr   = annualVol(closes);
  const rsiArr   = rsi(closes);
  const { line: macdLine, signal: macdSig } = macd(closes);

  const last = closes.length - 1;
  const currentRegime = classifyRegime(
    closes[last], ma50arr[last], ma200arr[last],
    volArr[last], rsiArr[last], macdLine[last], macdSig[last]
  );

  const meta = REGIME_META[currentRegime.regime] || REGIME_META.UNKNOWN;

  // ── Recent regime history (last 90 days) ────────────────────────────────
  const recentHistory = [];
  for (let i = Math.max(0, last - 89); i <= last; i += 5) {
    const fp = classifyRegime(
      closes[i], ma50arr[i], ma200arr[i],
      volArr[i], rsiArr[i], macdLine[i], macdSig[i]
    );
    recentHistory.push({ date: dates[i], regime: fp.regime, close: +closes[i].toFixed(2) });
  }

  // ── Regime change count in last 90 days ─────────────────────────────────
  const last90Regimes = recentHistory.map(r => r.regime);
  const regimeChanges = last90Regimes.filter((r, i) => i > 0 && r !== last90Regimes[i-1]).length;
  const isUnstable    = regimeChanges >= 3;

  // ── Transition forecasts ─────────────────────────────────────────────────
  const transitions = HISTORICAL_TRANSITIONS[currentRegime.regime] || [];

  // Adjust probabilities for current conditions
  const adjustedTransitions = transitions.map(t => {
    let adj = t.probability;
    // Boost bear-escape probability if RSI oversold
    if (t.outcome === 'BULL' && currentRegime.rsi < 35) adj = Math.min(adj + 10, 100);
    // Boost correction probability if RSI overbought
    if ((t.outcome === 'BEAR' || t.outcome === 'SIDEWAYS') && currentRegime.rsi > 70) adj = Math.min(adj + 10, 100);
    // Penalise if regime unstable
    if (isUnstable && t.outcome === 'STRONG_BULL') adj = Math.max(adj - 10, 5);
    return { ...t, probability: adj, outcomeMeta: REGIME_META[t.outcome] };
  });

  // Normalise probabilities
  const total = adjustedTransitions.reduce((s, t) => s + t.probability, 0);
  const normTransitions = adjustedTransitions.map(t => ({
    ...t,
    probability: +((t.probability / total) * 100).toFixed(0),
  }));
  normTransitions.sort((a, b) => b.probability - a.probability);

  // ── Most likely next move ────────────────────────────────────────────────
  const topTransition = normTransitions[0];

  // ── Current indicators snapshot ─────────────────────────────────────────
  const indicators = {
    currentPrice:  +closes[last].toFixed(2),
    ma50:          +ma50arr[last].toFixed(2),
    ma200:         +ma200arr[last].toFixed(2),
    rsi:           +(rsiArr[last] || 0).toFixed(1),
    vol:           +(volArr[last] || 0).toFixed(1),
    macdBull:      currentRegime.macdBull,
    pVsM50:        currentRegime.pVsM50,
    pVsM200:       currentRegime.pVsM200,
    m50VsM200:     currentRegime.m50VsM200,
  };

  // ── Sector regime breakdown (if provided) ────────────────────────────────
  const sectorRegimes = [];
  for (const sym of sectors.slice(0, 6)) {
    try {
      const sd = await fetchOHLCV(sym, '1y');
      const sc = sd.map(d => d.close);
      const sl = sc.length - 1;
      const sm50  = sma(sc, 50); const sm200 = sma(sc, 200);
      const svol  = annualVol(sc); const srsi  = rsi(sc);
      const { line: sml, signal: sms } = macd(sc);
      const sfp = classifyRegime(sc[sl], sm50[sl], sm200[sl], svol[sl], srsi[sl], sml[sl], sms[sl]);
      const smeta = REGIME_META[sfp.regime] || REGIME_META.UNKNOWN;
      sectorRegimes.push({ symbol: sym, regime: sfp.regime, ...smeta, rsi: +(srsi[sl]||0).toFixed(1), pVsM200: sfp.pVsM200 });
    } catch { /* skip if data unavailable */ }
  }

  // ── Prediction confidence ────────────────────────────────────────────────
  const confidence = isUnstable ? 'Low' : currentRegime.strength >= 80 ? 'High' : 'Moderate';
  const confColor  = confidence === 'High' ? 'emerald' : confidence === 'Moderate' ? 'blue' : 'orange';

  return {
    meta: { symbol },
    current: {
      regime:   currentRegime.regime,
      ...meta,
      strength: currentRegime.strength,
      confidence, confColor,
      isUnstable,
      regimeChanges,
      indicators,
      date: dates[last],
    },
    transitions: normTransitions,
    topPrediction: topTransition,
    recentHistory,
    sectorRegimes,
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 2: DELUSION LEADERBOARD (Mongo-backed)
// ═══════════════════════════════════════════════════════════════════════════════
// The leaderboard stores anonymous crowd predictions and actual outcomes.
// "Delusion Index" = avg (predicted return - actual return) per sector.
// High delusion = people overestimate their sector picks by a lot.

/**
 * Record a new prediction entry.
 * @param {object} db    - Mongoose connection (passed in from route)
 * @param {object} entry - { symbol, sector, predictedReturn, holdDays, sessionId }
 */
async function submitPrediction(DelusionModel, { symbol, sector, predictedReturn, holdDays, sessionId }) {
  // Fetch actual current price to anchor prediction
  const data  = await fetchOHLCV(symbol.endsWith('.NS') || symbol.endsWith('.BO') ? symbol : `${symbol}.NS`, '3m');
  const price = data[data.length - 1].close;
  const entryDate = data[data.length - 1].date;

  const doc = new DelusionModel({
    symbol,
    sector,
    predictedReturn: +predictedReturn,
    holdDays:        +holdDays,
    entryPrice:      +price.toFixed(2),
    entryDate,
    sessionId,
    actualReturn:    null,
    resolved:        false,
    createdAt:       new Date(),
  });
  await doc.save();
  return { id: doc._id, symbol, entryPrice: price, entryDate };
}

/**
 * Resolve pending predictions by checking actual returns.
 * Called periodically or on-demand.
 */
async function resolvePredictions(DelusionModel) {
  const pending = await DelusionModel.find({ resolved: false, createdAt: { $lt: new Date(Date.now() - 7 * 86400000) } }).limit(50);
  let resolved = 0;
  for (const pred of pending) {
    try {
      const sym  = pred.symbol.endsWith('.NS') ? pred.symbol : `${pred.symbol}.NS`;
      const data = await fetchOHLCV(sym, '1y');
      const entryCandle = data.find(d => d.date >= pred.entryDate);
      const exitDate    = new Date(pred.createdAt);
      exitDate.setDate(exitDate.getDate() + pred.holdDays);
      const now = new Date();
      if (now < exitDate) continue; // not yet matured

      const exitCandle = data.find(d => d.date >= exitDate.toISOString().slice(0, 10));
      if (!entryCandle || !exitCandle) continue;

      pred.actualReturn = +((exitCandle.close - entryCandle.close) / entryCandle.close * 100).toFixed(2);
      pred.resolved     = true;
      await pred.save();
      resolved++;
    } catch { /* skip */ }
  }
  return resolved;
}

/**
 * Build the Delusion Leaderboard from resolved predictions.
 * Returns sector rankings by delusion index + top individual delusions.
 */
async function getDelusionLeaderboard(DelusionModel) {
  const resolved = await DelusionModel.find({ resolved: true }).sort({ createdAt: -1 }).limit(500);

  // ── Sector delusion index ────────────────────────────────────────────────
  const bySector = {};
  for (const r of resolved) {
    const s = r.sector || 'Other';
    if (!bySector[s]) bySector[s] = { predictions: [], totalDelusion: 0, count: 0 };
    const delusion = r.predictedReturn - r.actualReturn;
    bySector[s].predictions.push({ ...r.toObject(), delusion: +delusion.toFixed(2) });
    bySector[s].totalDelusion += delusion;
    bySector[s].count++;
  }

  const sectorRankings = Object.entries(bySector).map(([sector, data]) => {
    const avgDelusion  = data.count > 0 ? +(data.totalDelusion / data.count).toFixed(2) : 0;
    const avgPredicted = +(data.predictions.reduce((s, p) => s + p.predictedReturn, 0) / data.count).toFixed(2);
    const avgActual    = +(data.predictions.reduce((s, p) => s + p.actualReturn, 0) / data.count).toFixed(2);
    const accuracy     = data.predictions.filter(p => Math.sign(p.predictedReturn) === Math.sign(p.actualReturn)).length;
    const accuracyPct  = +((accuracy / data.count) * 100).toFixed(0);

    return {
      sector,
      count:         data.count,
      avgDelusion,
      avgPredicted,
      avgActual,
      accuracyPct,
      delusionLevel: avgDelusion > 20 ? 'Extreme' : avgDelusion > 10 ? 'High' : avgDelusion > 5 ? 'Moderate' : avgDelusion > 0 ? 'Low' : 'Accurate',
      delusionColor: avgDelusion > 20 ? 'red' : avgDelusion > 10 ? 'orange' : avgDelusion > 5 ? 'yellow' : avgDelusion > 0 ? 'blue' : 'emerald',
    };
  }).sort((a, b) => b.avgDelusion - a.avgDelusion);

  // ── Most deluded individual predictions ─────────────────────────────────
  const allPredictions = resolved.map(r => ({
    symbol:          r.symbol,
    sector:          r.sector,
    predictedReturn: r.predictedReturn,
    actualReturn:    r.actualReturn,
    delusion:        +(r.predictedReturn - r.actualReturn).toFixed(2),
    holdDays:        r.holdDays,
    entryDate:       r.entryDate,
    sessionId:       r.sessionId?.slice(0, 12) + '…', // anonymise
  })).sort((a, b) => Math.abs(b.delusion) - Math.abs(a.delusion));

  // ── Global stats ─────────────────────────────────────────────────────────
  const allDelusions  = resolved.map(r => r.predictedReturn - r.actualReturn);
  const avgGlobalDel  = allDelusions.length > 0 ? +(allDelusions.reduce((s, d) => s + d, 0) / allDelusions.length).toFixed(2) : 0;
  const dirAccuracy   = resolved.filter(r => Math.sign(r.predictedReturn) === Math.sign(r.actualReturn)).length;
  const dirAccuracyPct = resolved.length > 0 ? +((dirAccuracy / resolved.length) * 100).toFixed(0) : 0;

  // ── Pending predictions count ────────────────────────────────────────────
  const pendingCount = await DelusionModel.countDocuments({ resolved: false });

  return {
    sectorRankings,
    topDelusions:    allPredictions.slice(0, 10),
    globalStats: {
      totalResolved:   resolved.length,
      totalPending:    pendingCount,
      avgGlobalDelusion: avgGlobalDel,
      dirAccuracyPct,
      mostDeludedSector: sectorRankings[0]?.sector || 'N/A',
    },
  };
}

/**
 * Get leaderboard entries for the current user (by sessionId).
 */
async function getUserPredictions(DelusionModel, sessionId) {
  const preds = await DelusionModel.find({ sessionId }).sort({ createdAt: -1 }).limit(20);
  return preds.map(p => ({
    id:              p._id,
    symbol:          p.symbol,
    sector:          p.sector,
    predictedReturn: p.predictedReturn,
    actualReturn:    p.actualReturn,
    resolved:        p.resolved,
    holdDays:        p.holdDays,
    entryPrice:      p.entryPrice,
    entryDate:       p.entryDate,
    createdAt:       p.createdAt,
    delusion:        p.resolved ? +(p.predictedReturn - p.actualReturn).toFixed(2) : null,
  }));
}

module.exports = {
  runRegimePredictor,
  submitPrediction,
  resolvePredictions,
  getDelusionLeaderboard,
  getUserPredictions,
};
