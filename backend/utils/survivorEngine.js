// survivorEngine.js — Phase 4 Month 19: Psychological Tools
// Feature 1: Survivorship Simulator  — day-by-day emotional journey with real events
// Feature 2: FOMO Destroyer          — entry timing sensitivity analysis

const axios = require('axios');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
const cache   = new Map();
const CACHE_TTL = 60 * 60 * 1000;

function getCached(k)     { const e = cache.get(k); if (!e || Date.now() - e.ts > CACHE_TTL) { cache.delete(k); return null; } return e.data; }
function setCached(k, d)  { cache.set(k, { data: d, ts: Date.now() }); }

// ─── Fetch daily candles ──────────────────────────────────────────────────────
async function fetchCandles(symbol, years = 5) {
  const key = `candles_${symbol}_${years}y`;
  const hit = getCached(key);
  if (hit) return hit;

  const res = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
    params: { interval: '1d', range: `${years}y` },
    headers: HEADERS, timeout: 15000
  });

  const result = res.data?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const ts  = result.timestamp || [];
  const q   = result.indicators?.quote?.[0] || {};
  const out = [];
  for (let i = 0; i < ts.length; i++) {
    const c = q.close?.[i];
    if (!c || c <= 0) continue;
    out.push({
      date:   new Date(ts[i] * 1000).toISOString().slice(0, 10),
      open:   q.open?.[i]   || c,
      high:   q.high?.[i]   || c,
      low:    q.low?.[i]    || c,
      close:  c,
      volume: q.volume?.[i] || 0,
    });
  }
  if (out.length < 60) throw new Error('Insufficient historical data');
  setCached(key, out);
  return out;
}

// ─── Real Indian market events database ──────────────────────────────────────
const MARKET_EVENTS = [
  // 2020
  { date: '2020-01-30', headline: '🦠 India confirms first COVID-19 case', sentiment: 'fear',    impactPct: -2  },
  { date: '2020-02-28', headline: '📉 Global markets crash on COVID fears', sentiment: 'fear',    impactPct: -8  },
  { date: '2020-03-12', headline: '🌍 WHO declares COVID-19 pandemic',      sentiment: 'panic',   impactPct: -13 },
  { date: '2020-03-23', headline: '🔒 India announces 21-day lockdown',      sentiment: 'panic',   impactPct: -15 },
  { date: '2020-03-24', headline: '📊 Nifty hits circuit breaker — 10% lower', sentiment: 'panic', impactPct: -10 },
  { date: '2020-04-07', headline: '💉 India extends lockdown to May 3',      sentiment: 'fear',    impactPct: -5  },
  { date: '2020-05-12', headline: '💰 PM Modi announces ₹20L Cr relief pkg', sentiment: 'hope',    impactPct: +4  },
  { date: '2020-06-01', headline: '🔓 Unlock 1.0 begins — partial reopening', sentiment: 'hope',   impactPct: +5  },
  { date: '2020-07-01', headline: '📈 FII buying resumes — markets recover',  sentiment: 'greed',   impactPct: +3  },
  { date: '2020-09-07', headline: '😰 Nifty slips 2% on US tech selloff',    sentiment: 'fear',    impactPct: -2  },
  { date: '2020-11-09', headline: '💉 Pfizer vaccine 90% effective — rally!', sentiment: 'euphoria', impactPct: +5 },
  { date: '2020-11-12', headline: '🏆 Nifty crosses 12,000 milestone',       sentiment: 'greed',   impactPct: +2  },
  // 2021
  { date: '2021-02-01', headline: '📜 Union Budget 2021 — infra push',       sentiment: 'greed',   impactPct: +5  },
  { date: '2021-03-25', headline: '🦠 Second COVID wave — cases spike',       sentiment: 'fear',    impactPct: -3  },
  { date: '2021-04-21', headline: '😰 India COVID record: 3L+ daily cases',  sentiment: 'panic',   impactPct: -4  },
  { date: '2021-05-24', headline: '📦 FII outflow ₹10,000 Cr in a week',     sentiment: 'fear',    impactPct: -2  },
  { date: '2021-06-21', headline: '💉 India vaccinates 80L in a day',        sentiment: 'hope',    impactPct: +3  },
  { date: '2021-10-18', headline: '🚀 Nifty crosses 18,000 — record high!',  sentiment: 'euphoria', impactPct: +2 },
  { date: '2021-11-26', headline: '😱 Omicron variant detected — selloff',   sentiment: 'fear',    impactPct: -3  },
  // 2022
  { date: '2022-01-20', headline: '📉 FII sell ₹50,000 Cr in January',       sentiment: 'fear',    impactPct: -5  },
  { date: '2022-02-24', headline: '⚔️ Russia invades Ukraine',                sentiment: 'panic',   impactPct: -4  },
  { date: '2022-03-16', headline: '🏦 Fed hikes rates for 1st time since 2018', sentiment: 'fear',  impactPct: -2  },
  { date: '2022-04-08', headline: '🛢️ Oil hits $130 — inflation fears',       sentiment: 'fear',    impactPct: -3  },
  { date: '2022-05-09', headline: '📉 Nifty breaks below 16,000',             sentiment: 'panic',   impactPct: -5  },
  { date: '2022-06-10', headline: '🇺🇸 US CPI 8.6% — worst in 40 years',      sentiment: 'fear',    impactPct: -3  },
  { date: '2022-07-27', headline: '🏦 Fed raises 75bps again — 4th hike',     sentiment: 'fear',    impactPct: -2  },
  { date: '2022-09-30', headline: '📈 RBI hikes repo to 5.9% — inflation',    sentiment: 'fear',    impactPct: -2  },
  { date: '2022-12-01', headline: '🐂 Nifty recovers to 18,600 — bull back?', sentiment: 'hope',    impactPct: +3  },
  // 2023
  { date: '2023-02-01', headline: '📜 Budget 2023 — capex ₹10 Lakh Cr',      sentiment: 'greed',   impactPct: +4  },
  { date: '2023-03-10', headline: '🏦 SVB collapse — US banking crisis',      sentiment: 'fear',    impactPct: -2  },
  { date: '2023-05-04', headline: '🦅 Fed signals pause in rate hikes',       sentiment: 'hope',    impactPct: +2  },
  { date: '2023-07-17', headline: '📈 Nifty 50 hits all-time high 19,991',    sentiment: 'euphoria', impactPct: +2 },
  { date: '2023-08-02', headline: '🇺🇸 US debt downgrade by Fitch',            sentiment: 'fear',    impactPct: -1  },
  { date: '2023-10-20', headline: '📉 FII pull ₹20,000 Cr on Israel-Gaza',    sentiment: 'fear',    impactPct: -3  },
  { date: '2023-12-01', headline: '🗳️ BJP wins 3 state elections — bullish',   sentiment: 'greed',   impactPct: +2  },
  { date: '2023-12-20', headline: '🚀 Nifty 50 crosses 21,000 milestone!',    sentiment: 'euphoria', impactPct: +2 },
  // 2024
  { date: '2024-02-01', headline: '📜 Interim Budget 2024 — infra focus',     sentiment: 'greed',   impactPct: +3  },
  { date: '2024-03-07', headline: '🔥 Nifty hits record 22,500!',             sentiment: 'euphoria', impactPct: +2 },
  { date: '2024-04-19', headline: '⚠️ Iran-Israel tensions — oil spikes',      sentiment: 'fear',    impactPct: -2  },
  { date: '2024-06-04', headline: '😱 Election result shock — Nifty -5.9%!',  sentiment: 'panic',   impactPct: -6  },
  { date: '2024-07-23', headline: '📜 Budget 2024 — LTCG hike shocks market', sentiment: 'fear',    impactPct: -3  },
  { date: '2024-09-18', headline: '🦅 Fed cuts 50bps — FII buying surge',     sentiment: 'greed',   impactPct: +3  },
  { date: '2024-10-02', headline: '📉 FII mega sell-off begins — ₹1L Cr gone', sentiment: 'panic',   impactPct: -4  },
  { date: '2024-11-05', headline: '🗳️ Trump wins US election — market volatile', sentiment: 'fear',   impactPct: -2  },
  { date: '2024-12-18', headline: '🏦 Fed signals fewer 2025 cuts — selloff', sentiment: 'fear',    impactPct: -3  },
  // 2025
  { date: '2025-01-20', headline: '🇺🇸 Trump inaugurated — tariff fears',      sentiment: 'fear',    impactPct: -2  },
  { date: '2025-02-01', headline: '📜 Budget 2025 — tax relief, capex boost',  sentiment: 'greed',   impactPct: +4  },
  { date: '2025-04-02', headline: '🛃 Trump tariffs: 26% on India exports',    sentiment: 'panic',   impactPct: -5  },
  { date: '2025-04-07', headline: '😱 Global trade war — Nifty -4% in week',   sentiment: 'panic',   impactPct: -4  },
  { date: '2025-04-09', headline: '🎉 Trump pauses tariffs 90 days — rally!',  sentiment: 'euphoria', impactPct: +7 },
];

// ─── Helper: find nearest events within a window ──────────────────────────────
function findNearbyEvents(dateStr, windowDays = 7) {
  const d = new Date(dateStr).getTime();
  return MARKET_EVENTS.filter(e => {
    const diff = Math.abs(new Date(e.date).getTime() - d);
    return diff <= windowDays * 86400000;
  });
}

// ─── Emotion model based on running P&L ───────────────────────────────────────
function getEmotionState(pnlPct, daysSinceEntry, maxDD, inDrawdown) {
  if (pnlPct > 30)  return { emoji: '🤩', label: 'Euphoric',    color: 'emerald', quit: 5  };
  if (pnlPct > 20)  return { emoji: '😁', label: 'Very Happy',  color: 'green',   quit: 8  };
  if (pnlPct > 10)  return { emoji: '😊', label: 'Happy',       color: 'green',   quit: 12 };
  if (pnlPct > 5)   return { emoji: '🙂', label: 'Optimistic',  color: 'blue',    quit: 18 };
  if (pnlPct > 0)   return { emoji: '😐', label: 'Neutral',     color: 'gray',    quit: 25 };
  if (pnlPct > -5)  return { emoji: '😟', label: 'Worried',     color: 'yellow',  quit: 38 };
  if (pnlPct > -10) return { emoji: '😰', label: 'Very Worried',color: 'orange',  quit: 52 };
  if (pnlPct > -15) return { emoji: '😨', label: 'Fearful',     color: 'red',     quit: 68 };
  if (pnlPct > -20) return { emoji: '😱', label: 'Panicking',   color: 'red',     quit: 82 };
  return               { emoji: '💀', label: 'Capitulating',    color: 'red',     quit: 94 };
}

// ─── Internal thought bubbles ─────────────────────────────────────────────────
function getThought(pnlPct, daysSinceEntry, events) {
  const eventThought = events.length > 0 ? `"${events[0].headline}... should I sell?"` : null;
  if (pnlPct > 25)  return eventThought || '"Should I book profit or hold for more?"';
  if (pnlPct > 10)  return eventThought || '"This is going great! Maybe double my position?"';
  if (pnlPct > 0)   return eventThought || '"Looks okay so far. Let\'s wait and watch."';
  if (pnlPct > -5)  return eventThought || '"It\'s down a bit, but should recover..."';
  if (pnlPct > -10) return eventThought || '"Why is it not recovering?! Everyone else is selling!"';
  if (pnlPct > -15) return '"I should have sold earlier. Will it go further down?"';
  if (pnlPct > -20) return '"I can\'t watch this anymore. Maybe just cut losses..."';
  return '"That\'s it. I\'m selling everything and never investing again."';
}

// ─── FEATURE 1: Survivorship Simulator ───────────────────────────────────────
/**
 * Simulates a buy on a specific historical date and plays out the journey
 * day-by-day with emotion states, market events, and quit probability.
 *
 * @param {string} symbol     - e.g. "RELIANCE.NS"
 * @param {string} entryDate  - "YYYY-MM-DD"
 * @param {number} holdDays   - how many days to simulate (max 365)
 * @param {number} target     - profit target % (e.g. 20)
 * @param {number} stopLoss   - stop-loss % (e.g. -15)
 */
async function runSurvivorSimulation({ symbol, entryDate, holdDays = 180, target = 20, stopLoss = -15 }) {
  const candles = await fetchCandles(symbol, 5);

  // Find entry index
  const entryIdx = candles.findIndex(c => c.date >= entryDate);
  if (entryIdx < 0) throw new Error(`No data found at or after ${entryDate}`);

  const entryPrice = candles[entryIdx].close;
  const endIdx     = Math.min(entryIdx + holdDays, candles.length - 1);
  const actualDays = endIdx - entryIdx;

  if (actualDays < 5) throw new Error('Not enough data after entry date');

  // ── Build day-by-day journey ─────────────────────────────────────────────
  const journey = [];
  let maxPrice   = entryPrice;
  let minPrice   = entryPrice;
  let peakPnl    = 0;
  let troughPnl  = 0;
  let hitTarget  = false;
  let hitStop    = false;
  let exitDay    = null;
  let exitReason = null;

  // Milestone days to include in journey (every ~2 weeks + daily for first month)
  const milestones = new Set();
  for (let i = 0; i <= Math.min(actualDays, 22); i++) milestones.add(i);     // daily for first month
  for (let i = 22; i <= actualDays; i += 14)         milestones.add(i);      // bi-weekly after
  milestones.add(actualDays);

  for (let d = 0; d <= actualDays; d++) {
    const candle   = candles[entryIdx + d];
    const price    = candle.close;
    const pnlPct   = ((price - entryPrice) / entryPrice) * 100;
    const dayDate  = candle.date;

    maxPrice = Math.max(maxPrice, price);
    minPrice = Math.min(minPrice, price);
    peakPnl  = Math.max(peakPnl,  pnlPct);
    troughPnl= Math.min(troughPnl, pnlPct);

    // Drawdown from peak
    const ddFromPeak = ((price - maxPrice) / maxPrice) * 100;
    const inDD       = ddFromPeak < -3;

    // Check exits
    if (!hitTarget && pnlPct >= target)   { hitTarget = true; exitDay = d; exitReason = 'TARGET_HIT'; }
    if (!hitStop  && pnlPct <= stopLoss)  { hitStop   = true; exitDay = d; exitReason = 'STOP_LOSS';  }

    if (!milestones.has(d)) continue; // skip non-milestone days for journey

    const events  = findNearbyEvents(dayDate, 5);
    const emotion = getEmotionState(pnlPct, d, ddFromPeak, inDD);
    const thought = getThought(pnlPct, d, events);

    journey.push({
      day:       d,
      date:      dayDate,
      price:     +price.toFixed(2),
      pnlPct:    +pnlPct.toFixed(2),
      pnlRs:     +((price - entryPrice)).toFixed(2),
      ddFromPeak: +ddFromPeak.toFixed(2),
      emotion,
      thought,
      events:    events.slice(0, 2),
      volume:    candle.volume,
    });
  }

  // ── Final outcome ────────────────────────────────────────────────────────
  const finalPrice  = candles[endIdx].close;
  const finalPnl    = ((finalPrice - entryPrice) / entryPrice) * 100;
  const totalReturn = +finalPnl.toFixed(2);

  // Would typical investor have survived?
  const avgQuitProb  = journey.reduce((s, j) => s + j.emotion.quit, 0) / journey.length;
  const maxQuitProb  = Math.max(...journey.map(j => j.emotion.quit));
  const survivedLikely = maxQuitProb < 60;

  // Key milestones
  const worstMoment = journey.reduce((w, j) => j.pnlPct < w.pnlPct ? j : w, journey[0]);
  const bestMoment  = journey.reduce((b, j) => j.pnlPct > b.pnlPct ? j : b, journey[0]);

  return {
    meta: {
      symbol,
      entryDate: candles[entryIdx].date,
      entryPrice: +entryPrice.toFixed(2),
      holdDays:   actualDays,
      target,
      stopLoss,
    },
    journey,
    outcome: {
      finalPrice:     +finalPrice.toFixed(2),
      totalReturn,
      hitTarget,
      hitStop,
      exitDay,
      exitReason,
      peakPnl:        +peakPnl.toFixed(2),
      troughPnl:      +troughPnl.toFixed(2),
      maxDrawdown:    +Math.abs(troughPnl).toFixed(2),
      survivedLikely,
      avgQuitProb:    +avgQuitProb.toFixed(0),
      maxQuitProb:    +maxQuitProb.toFixed(0),
    },
    keyMoments: {
      worst: worstMoment,
      best:  bestMoment,
    },
    verdict: buildVerdict(totalReturn, hitTarget, hitStop, maxQuitProb, peakPnl, troughPnl),
  };
}

function buildVerdict(totalReturn, hitTarget, hitStop, maxQuitProb, peak, trough) {
  if (hitStop) return {
    emoji: '💔', color: 'red',
    title: 'Stop Loss Hit',
    summary: `The stock triggered the stop loss. Most investors would have exited earlier due to panic.`,
    lesson: 'Stop losses protect capital, but emotional exits often happen before them.',
  };
  if (hitTarget) return {
    emoji: '🏆', color: 'emerald',
    title: 'Target Achieved!',
    summary: `The target was hit! But the journey had a ${Math.abs(trough).toFixed(1)}% drawdown that would have shaken most investors out.`,
    lesson: `The hardest part wasn't the strategy — it was surviving the ${Math.abs(trough).toFixed(1)}% dip to get here.`,
  };
  if (totalReturn > 15) return {
    emoji: '🎉', color: 'green',
    title: 'Strong Profit!',
    summary: `The position ended +${totalReturn.toFixed(1)}%. But ${maxQuitProb}% of investors would have quit during the journey.`,
    lesson: 'Patience is a rare and extremely valuable edge in Indian markets.',
  };
  if (totalReturn > 0) return {
    emoji: '🙂', color: 'blue',
    title: 'Modest Profit',
    summary: `Small gain of +${totalReturn.toFixed(1)}% — was it worth the emotional stress of holding through a ${Math.abs(trough).toFixed(1)}% drawdown?`,
    lesson: 'Sometimes the real cost of investing is psychological, not financial.',
  };
  return {
    emoji: '📉', color: 'orange',
    title: 'Loss Position',
    summary: `The position is at ${totalReturn.toFixed(1)}%. Peak was +${peak.toFixed(1)}% — the real pain is what you missed by not selling at the top.`,
    lesson: 'Knowing when to exit is as hard as knowing when to enter.',
  };
}


// ─── FEATURE 2: FOMO Destroyer ────────────────────────────────────────────────
/**
 * Shows how sensitive returns are to entry timing.
 * For each day in the entry window, calculates return over holdDays.
 * Reveals how much "luck" plays into outcomes.
 *
 * @param {string} symbol
 * @param {string} referenceDate  - The "ideal" entry date (what user is FOMO-ing about)
 * @param {number} windowDays     - How many days to test around reference (e.g. ±15)
 * @param {number} holdDays       - Holding period
 * @param {number} target         - Target % return
 */
async function runFomoDestroyer({ symbol, referenceDate, windowDays = 15, holdDays = 180, target = 20 }) {
  const candles = await fetchCandles(symbol, 5);

  const refIdx = candles.findIndex(c => c.date >= referenceDate);
  if (refIdx < 0) throw new Error(`No data for ${referenceDate}`);

  // Test all entry days in window
  const startIdx = Math.max(0, refIdx - windowDays);
  const endIdx   = Math.min(candles.length - 1, refIdx + windowDays);

  const scenarios = [];
  let hitTargetCount = 0;
  let bestReturn     = -Infinity;
  let worstReturn    = +Infinity;
  let bestEntry      = null;
  let worstEntry     = null;

  for (let i = startIdx; i <= endIdx; i++) {
    const exitIdx = Math.min(i + holdDays, candles.length - 1);
    if (exitIdx === i) continue;

    const entryPrice = candles[i].close;
    const exitPrice  = candles[exitIdx].close;
    const ret        = ((exitPrice - entryPrice) / entryPrice) * 100;

    // Max drawdown during hold
    let maxPr = entryPrice;
    let maxDD  = 0;
    let hitTgt = false;
    for (let j = i; j <= exitIdx; j++) {
      const p = candles[j].close;
      maxPr   = Math.max(maxPr, p);
      const dd = ((p - maxPr) / maxPr) * 100;
      if (dd < maxDD) maxDD = dd;
      if (((p - entryPrice) / entryPrice) * 100 >= target) hitTgt = true;
    }

    const daysFromRef = i - refIdx; // negative = before, positive = after
    const isRef       = i === refIdx;

    if (hitTgt) hitTargetCount++;
    if (ret > bestReturn)  { bestReturn  = ret;  bestEntry  = candles[i].date; }
    if (ret < worstReturn) { worstReturn = ret;  worstEntry = candles[i].date; }

    scenarios.push({
      date:        candles[i].date,
      daysFromRef,
      entryPrice:  +entryPrice.toFixed(2),
      exitPrice:   +exitPrice.toFixed(2),
      returnPct:   +ret.toFixed(2),
      maxDrawdown: +Math.abs(maxDD).toFixed(2),
      hitTarget:   hitTgt,
      isReference: isRef,
      label:       daysFromRef === 0 ? 'Reference day' : daysFromRef < 0 ? `${Math.abs(daysFromRef)}d before` : `${daysFromRef}d after`,
    });
  }

  const refScenario  = scenarios.find(s => s.isReference) || scenarios[Math.floor(scenarios.length / 2)];
  const returnSpread = +(bestReturn - worstReturn).toFixed(2);
  const hitTargetPct = +((hitTargetCount / scenarios.length) * 100).toFixed(1);

  // Timing luck score: how much does ±1 week change the outcome?
  const week1Scenarios = scenarios.filter(s => Math.abs(s.daysFromRef) <= 5);
  const week1Returns   = week1Scenarios.map(s => s.returnPct);
  const week1Range     = week1Returns.length > 1
    ? +(Math.max(...week1Returns) - Math.min(...week1Returns)).toFixed(2)
    : 0;

  const timingLuck = week1Range > 20 ? 'Very High' : week1Range > 12 ? 'High' : week1Range > 6 ? 'Moderate' : 'Low';
  const timingLuckColor = week1Range > 20 ? 'red' : week1Range > 12 ? 'orange' : week1Range > 6 ? 'yellow' : 'green';

  // FOMO verdict
  const refReturn = refScenario.returnPct;
  const aboveRef  = scenarios.filter(s => s.returnPct > refReturn + 5).length;
  const belowRef  = scenarios.filter(s => s.returnPct < refReturn - 5).length;

  return {
    meta: { symbol, referenceDate: refScenario.date, holdDays, target, windowDays },
    scenarios,
    refScenario,
    stats: {
      totalScenarios: scenarios.length,
      hitTargetCount,
      hitTargetPct,
      bestReturn:  +bestReturn.toFixed(2),
      worstReturn: +worstReturn.toFixed(2),
      returnSpread,
      bestEntry,
      worstEntry,
      week1Range,
      timingLuck,
      timingLuckColor,
    },
    verdict: buildFomoVerdict(refReturn, returnSpread, timingLuck, hitTargetPct, week1Range, bestReturn, worstReturn),
  };
}

function buildFomoVerdict(refReturn, spread, luck, hitPct, week1, best, worst) {
  const emoji = spread > 30 ? '🎲' : spread > 15 ? '⚠️' : '✅';
  const color = spread > 30 ? 'red' : spread > 15 ? 'orange' : 'green';

  let title, summary, lesson;

  if (luck === 'Very High') {
    title   = 'Timing is Almost Pure Luck Here';
    summary = `Entering just 1 week earlier vs later changes outcome by ${week1.toFixed(1)}%. Best day returned +${best.toFixed(1)}%, worst returned ${worst.toFixed(1)}%.`;
    lesson  = 'This stock is so timing-sensitive that FOMO or overthinking the entry is genuinely dangerous. Small timing differences = huge outcome differences.';
  } else if (luck === 'High') {
    title   = 'Timing Matters a Lot';
    summary = `A ±${Math.round(week1/2)}% swing exists just from entering 1 week differently. The reference entry returned ${refReturn.toFixed(1)}% over the period.`;
    lesson  = `The "perfect entry" myth is strong here. ${hitPct}% of entry days hit the ${hitPct}% target — timing luck is real.`;
  } else if (luck === 'Moderate') {
    title   = 'Timing Has Some Impact';
    summary = `Entry timing explains about ${week1.toFixed(1)}% of outcome variation. You didn't need the exact right day — but you needed the right week.`;
    lesson  = 'Moderate timing sensitivity — a reasonable entry within 1-2 weeks would have given similar results.';
  } else {
    title   = 'Timing Barely Mattered!';
    summary = `Any entry within the window would have given similar results. The reference entry returned ${refReturn.toFixed(1)}%, within ${week1.toFixed(1)}% of alternatives.`;
    lesson  = 'The FOMO was unfounded — this stock\'s returns were more about holding period than entry precision.';
  }

  return { emoji, color, title, summary, lesson };
}


module.exports = { runSurvivorSimulation, runFomoDestroyer };
