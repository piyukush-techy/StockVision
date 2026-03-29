// eventCorrelation.js — Phase 3 Month 15: Event Attribution Engine
// Correlates portfolio performance windows with major market events
// "This portfolio succeeded/failed because of X event"

const axios = require('axios');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
const cache = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2h

function getCached(k)       { const e = cache.get(k); if (!e) return null; if (Date.now() - e.ts > CACHE_TTL) { cache.delete(k); return null; } return e.data; }
function setCached(k, data) { cache.set(k, { data, ts: Date.now() }); }

// ─── Comprehensive Indian & Global Events Database ───────────────────────────
const EVENT_DATABASE = [
  // 2018
  { date: '2018-02-01', label: 'Union Budget 2018 — LTCG Tax',     category: 'budget',   impact: -1, description: 'LTCG of 10% imposed on equity gains over ₹1L, markets fell sharply' },
  { date: '2018-09-21', label: 'IL&FS Crisis Begins',               category: 'crisis',   impact: -2, description: 'IL&FS defaulted, triggering NBFC liquidity crisis across Indian markets' },
  { date: '2018-10-11', label: 'Nifty 8-month Low Hit',             category: 'crash',    impact: -2, description: 'Market crashed on global selloff + NBFC fears, Nifty fell to 10,000' },

  // 2019
  { date: '2019-01-28', label: 'Yes Bank Concerns Surface',         category: 'crisis',   impact: -1, description: 'Yes Bank asset quality issues emerge, banking sector under pressure' },
  { date: '2019-05-23', label: 'Modi Wins Historic Majority',       category: 'election', impact:  2, description: 'BJP wins 303 seats, Nifty surged 800 pts, biggest election day rally' },
  { date: '2019-07-05', label: 'Budget 2019 — Surcharge on FPIs',   category: 'budget',   impact: -1, description: 'FPI surcharge imposed, FIIs began selling, market fell 4%' },
  { date: '2019-08-23', label: 'Corporate Tax Cut Announced',       category: 'policy',   impact:  3, description: 'FM Nirmala Sitharaman slashed corporate tax from 30% to 22%, Sensex +5.3% in one day' },
  { date: '2019-09-20', label: 'Tax Cut Rally',                     category: 'policy',   impact:  2, description: 'Follow-through rally after historic corporate tax cut announcement' },

  // 2020
  { date: '2020-02-01', label: 'Budget 2020 — No Income Tax Cut',  category: 'budget',   impact: -1, description: 'Market disappointed, no major relief; new tax regime introduced' },
  { date: '2020-03-12', label: 'COVID-19 Market Crash',             category: 'crisis',   impact: -3, description: 'Global pandemic declared; Nifty crashed 40% in weeks, circuit breakers triggered' },
  { date: '2020-03-23', label: 'Nifty Hits Bottom — 7,511',         category: 'crash',    impact: -3, description: 'Absolute market bottom of COVID crash; Nifty at 3-year low' },
  { date: '2020-03-27', label: 'RBI Emergency Rate Cut',            category: 'rbi',      impact:  1, description: 'RBI cut repo rate by 75bps, announced ₹3.74L Cr liquidity measures' },
  { date: '2020-05-12', label: '₹20 Lakh Crore Stimulus Package',  category: 'policy',   impact:  2, description: 'PM Modi announced COVID economic stimulus package' },
  { date: '2020-06-01', label: 'COVID Recovery Rally Begins',       category: 'recovery', impact:  2, description: 'Markets begin massive recovery from COVID lows' },
  { date: '2020-11-09', label: 'Pfizer Vaccine Announcement',       category: 'global',   impact:  2, description: 'Pfizer vaccine 90% efficacy announced, global markets surged' },
  { date: '2020-12-01', label: 'Nifty Crosses 13,000 First Time',  category: 'milestone',impact:  1, description: 'Nifty crossed 13,000 for first time ever, marking post-COVID euphoria' },

  // 2021
  { date: '2021-02-01', label: 'Budget 2021 — Infrastructure Push', category: 'budget',  impact:  2, description: 'Budget focused on infra capex, no new taxes; markets jumped 5%' },
  { date: '2021-04-12', label: 'COVID Second Wave India',           category: 'crisis',   impact: -2, description: 'Devastating second wave, lockdowns return, market falls 10%' },
  { date: '2021-05-01', label: 'Vaccination Acceleration',          category: 'recovery', impact:  1, description: 'India accelerates COVID vaccination drive, markets recover' },
  { date: '2021-07-01', label: 'GST Collections Hit Record',        category: 'macro',    impact:  1, description: 'GST revenue hits record ₹1 Lakh Crore, signals economic recovery' },
  { date: '2021-10-18', label: 'Nifty Crosses 18,000 First Time',  category: 'milestone',impact:  1, description: 'Sensex crossed 60K, Nifty 18K — record highs on FII buying' },
  { date: '2021-11-16', label: 'FII Sell-off Begins',               category: 'fii',      impact: -1, description: 'FIIs start massive selling on Fed tapering fears' },
  { date: '2021-11-26', label: 'Omicron Variant Fear',              category: 'global',   impact: -2, description: 'New COVID variant Omicron detected, markets fall globally' },

  // 2022
  { date: '2022-01-12', label: 'US CPI Hits 40-year High',         category: 'global',   impact: -1, description: 'US inflation at 7%, Fed signals aggressive rate hikes, global selloff' },
  { date: '2022-02-24', label: 'Russia Invades Ukraine',            category: 'global',   impact: -3, description: 'Russia invades Ukraine; oil prices spike, global risk-off selloff' },
  { date: '2022-03-04', label: 'Oil Crosses $130/barrel',           category: 'global',   impact: -2, description: 'Crude oil hits 14-year high on Ukraine war, inflation fears surge' },
  { date: '2022-05-04', label: 'US Fed 50bps Rate Hike',            category: 'global',   impact: -1, description: 'Fed hikes by 50bps (largest in 22 years), global tightening cycle' },
  { date: '2022-06-13', label: 'Bear Market Confirmed Globally',   category: 'crash',    impact: -2, description: 'S&P 500 enters bear market; Nifty falls to 8-month low' },
  { date: '2022-09-30', label: 'Nifty 2022 Low — 16,747',          category: 'crash',    impact: -2, description: 'Nifty hits yearly low, 14% below 2022 high' },
  { date: '2022-12-01', label: 'China COVID Reopening',             category: 'global',   impact:  1, description: 'China begins abandoning zero-COVID, markets rally on growth hope' },

  // 2023
  { date: '2023-02-01', label: 'Budget 2023 — Capex Boost',        category: 'budget',   impact:  1, description: 'Capital expenditure increased 33% to ₹10L Cr; fiscal prudence maintained' },
  { date: '2023-02-07', label: 'Adani Group Short-Seller Attack',   category: 'crisis',   impact: -2, description: 'Hindenburg Report on Adani Group, stocks crashed 40-80%' },
  { date: '2023-05-01', label: 'US Regional Bank Crisis',           category: 'global',   impact: -1, description: 'SVB, Signature Bank collapse; India markets fall in sympathy' },
  { date: '2023-06-01', label: 'India GDP Growth Surprise',         category: 'macro',    impact:  1, description: 'India Q4 FY23 GDP at 6.1%, beating expectations; sentiment turns positive' },
  { date: '2023-09-19', label: 'India Nifty Crosses 20,000',       category: 'milestone',impact:  1, description: 'Nifty crosses 20,000 for first time, celebrating strong economic growth' },
  { date: '2023-10-07', label: 'Israel-Hamas War Begins',           category: 'global',   impact: -1, description: 'Middle East conflict; oil prices spike, global uncertainty rises' },
  { date: '2023-12-03', label: 'BJP Wins 3 Key State Elections',   category: 'election', impact:  1, description: 'BJP sweeps Rajasthan, MP, Chhattisgarh, Sensex +1,000 pts on Modi tailwind' },

  // 2024
  { date: '2024-01-22', label: 'Ayodhya Ram Mandir Consecration', category: 'event',    impact:  1, description: 'Historic event, sentiment booster, tourism & infra stocks rally' },
  { date: '2024-02-01', label: 'Interim Budget 2024',              category: 'budget',   impact:  0, description: 'No major announcements; fiscal deficit target maintained at 5.1%' },
  { date: '2024-04-08', label: 'India Election 2024 Announced',    category: 'election', impact:  0, description: 'Election schedule announced; market enters wait-and-watch mode' },
  { date: '2024-05-16', label: 'Nifty All-Time High Pre-Election', category: 'milestone',impact:  1, description: 'Nifty hits 23,000+ on exit poll euphoria' },
  { date: '2024-06-04', label: 'Election Result Shock',             category: 'election', impact: -2, description: 'BJP falls short of majority, needs coalition; Nifty falls 4%, circuit breakers on NSE' },
  { date: '2024-06-10', label: 'Modi 3.0 Government Sworn In',     category: 'election', impact:  1, description: 'NDA government formed with allies; stability returns, markets recover' },
  { date: '2024-07-23', label: 'Union Budget 2024 — LTCG Hike',   category: 'budget',   impact: -1, description: 'LTCG increased to 12.5%, STCG to 20%; STT on F&O doubled; market fell 1,000 pts' },
  { date: '2024-09-18', label: 'US Fed Cuts Rates by 50bps',       category: 'global',   impact:  1, description: 'First US rate cut in 4 years; EMs including India rally on FII inflows' },
  { date: '2024-10-03', label: 'FII Sell-Off October',             category: 'fii',      impact: -2, description: 'FIIs sell ₹1 Lakh Crore in Oct; Nifty falls from 26K to 24K' },
  { date: '2024-11-05', label: 'Trump Wins US Election',           category: 'global',   impact: -1, description: 'Trump victory; USD strengthens, EMs under pressure, India falls 1-2%' },
  { date: '2024-12-01', label: 'RBI Holds Rates at 6.5%',         category: 'rbi',      impact:  0, description: 'RBI keeps repo unchanged; surprises with CRR cut of 50bps' },

  // 2025
  { date: '2025-01-20', label: 'Trump Inauguration & Tariff Fears', category: 'global',  impact: -1, description: 'Trump 2.0 begins with tariff threats; EMs including India under pressure' },
  { date: '2025-02-01', label: 'Union Budget 2025 — Tax Relief',   category: 'budget',   impact:  2, description: 'No income tax up to ₹12L; massive middle class relief; markets rallied' },
  { date: '2025-03-01', label: 'Global Tariff War Fears',          category: 'global',   impact: -2, description: 'US-China tariff war escalates; global trade uncertainty hits Indian IT exports' },
  { date: '2025-04-07', label: 'Global Markets Correction',        category: 'crash',    impact: -2, description: 'Nifty falls below 22,000 on global recession fears from US tariffs' },
  { date: '2025-06-01', label: 'Monsoon Onset — Normal Forecast',  category: 'macro',    impact:  1, description: 'IMD forecasts normal monsoon; rural & FMCG stocks rally' },
  { date: '2025-07-01', label: 'RBI Rate Cut Cycle Begins',        category: 'rbi',      impact:  2, description: 'RBI cuts repo rate as inflation cools; liquidity improves, markets rally' },
  { date: '2025-09-01', label: 'India GDP Growth Rebounds',        category: 'macro',    impact:  1, description: 'GDP growth recovers to 7%+ after slowdown; earnings upgrades begin' },
  { date: '2025-11-01', label: 'Bihar/Delhi Election Results',     category: 'election', impact:  1, description: 'State elections signal political stability; markets react positively' },
  { date: '2025-12-01', label: 'FII Return to India',              category: 'fii',      impact:  2, description: 'FIIs turn net buyers after months of selling; Nifty reclaims 24,000' },

  // 2026
  { date: '2026-01-01', label: 'Strong Q3 FY26 Earnings',         category: 'earnings', impact:  1, description: 'Corporate earnings beat estimates; broad-based rally in large caps' },
  { date: '2026-02-01', label: 'Union Budget 2026',                category: 'budget',   impact:  1, description: 'Infrastructure focus, continued fiscal consolidation' },
];

const CATEGORY_META = {
  budget:    { emoji: '📋', color: 'blue',    label: 'Budget/Tax Policy' },
  crisis:    { emoji: '⚠️', color: 'red',     label: 'Crisis/Default' },
  crash:     { emoji: '📉', color: 'red',     label: 'Market Crash' },
  recovery:  { emoji: '📈', color: 'green',   label: 'Recovery Rally' },
  election:  { emoji: '🗳️', color: 'purple',  label: 'Election Event' },
  policy:    { emoji: '🏛️', color: 'indigo',  label: 'Government Policy' },
  rbi:       { emoji: '🏦', color: 'yellow',  label: 'RBI Decision' },
  global:    { emoji: '🌍', color: 'gray',    label: 'Global Event' },
  fii:       { emoji: '💱', color: 'orange',  label: 'FII Activity' },
  macro:     { emoji: '📊', color: 'teal',    label: 'Macro Data' },
  milestone: { emoji: '🏆', color: 'gold',    label: 'Market Milestone' },
  earnings:  { emoji: '💰', color: 'green',   label: 'Earnings Season' },
  event:     { emoji: '✨', color: 'pink',    label: 'Special Event' },
};

// ─── Fetch portfolio value timeline ──────────────────────────────────────────
async function fetchCloses(symbol, range = '5y') {
  const key = `evtcorr_${symbol}_${range}`;
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

  setCached(key, data);
  return data;
}

// ─── Align multiple series ────────────────────────────────────────────────────
function alignSeries(seriesMap) {
  const dateSets = Object.values(seriesMap).map(s => new Set(s.map(d => d.date)));
  const commonDates = [...dateSets[0]].filter(d => dateSets.every(set => set.has(d))).sort();

  const aligned = {};
  for (const [sym, series] of Object.entries(seriesMap)) {
    const byDate = Object.fromEntries(series.map(d => [d.date, d.close]));
    aligned[sym] = commonDates.map(date => ({ date, close: byDate[date] }));
  }
  return { aligned, dates: commonDates };
}

// ─── Compute portfolio returns ────────────────────────────────────────────────
function computePortfolioReturns(aligned, dates, weights) {
  const symbols = Object.keys(aligned);
  const n = dates.length;
  if (n < 2) return [];

  // Normalize weights
  const totalW = weights.reduce((a, b) => a + b, 0);
  const normW  = weights.map(w => w / totalW);

  // Base values (day 0 close = 100 for each stock)
  const baseCloses = symbols.map(sym => aligned[sym][0].close);

  const portfolioValues = dates.map((date, i) => {
    // Weighted portfolio value (equal base)
    const value = symbols.reduce((sum, sym, si) => {
      const ret = aligned[sym][i].close / baseCloses[si];
      return sum + normW[si] * ret;
    }, 0);
    return { date, value: value * 100 }; // 100 = base
  });

  // Daily returns
  const returns = [];
  for (let i = 1; i < portfolioValues.length; i++) {
    const prev = portfolioValues[i - 1].value;
    const curr = portfolioValues[i].value;
    returns.push({
      date:   portfolioValues[i].date,
      dailyReturn: (curr - prev) / prev * 100,
      cumReturn:   (curr / portfolioValues[0].value - 1) * 100
    });
  }

  return { portfolioValues, returns };
}

// ─── Find which events fall within a date range ───────────────────────────────
function getEventsInRange(startDate, endDate) {
  return EVENT_DATABASE.filter(e => e.date >= startDate && e.date <= endDate);
}

// ─── Compute rolling 30-day returns around each event ────────────────────────
function computeEventImpact(portfolioValues, event) {
  const eventIdx = portfolioValues.findIndex(p => p.date >= event.date);
  if (eventIdx < 0) return null;

  const pre  = Math.max(0, eventIdx - 10);
  const post = Math.min(portfolioValues.length - 1, eventIdx + 30);

  if (post <= pre) return null;

  const preValue   = portfolioValues[pre].value;
  const eventValue = portfolioValues[eventIdx].value;
  const postValue  = portfolioValues[post].value;

  return {
    preDrop:   ((eventValue - preValue)  / preValue) * 100,
    postMove:  ((postValue  - eventValue) / eventValue) * 100,
    totalMove: ((postValue  - preValue)   / preValue) * 100,
    eventDate: portfolioValues[eventIdx].date,
    preDate:   portfolioValues[pre].date,
    postDate:  portfolioValues[post].date,
  };
}

// ─── Classify best/worst periods and correlate with events ───────────────────
function findSignificantPeriods(portfolioValues, windowDays = 90) {
  const n = portfolioValues.length;
  if (n < windowDays + 1) return [];

  const windows = [];
  for (let i = 0; i + windowDays < n; i++) {
    const startVal = portfolioValues[i].value;
    const endVal   = portfolioValues[i + windowDays].value;
    const ret      = (endVal - startVal) / startVal * 100;
    windows.push({
      startDate: portfolioValues[i].date,
      endDate:   portfolioValues[i + windowDays].date,
      return:    ret,
      startIdx:  i,
      endIdx:    i + windowDays,
    });
  }

  // Sort and get top/bottom 5
  windows.sort((a, b) => b.return - a.return);
  const best  = windows.slice(0, 5);
  const worst = windows.slice(-5).reverse();

  return { best, worst };
}

// ─── Main Attribution Engine ──────────────────────────────────────────────────
async function analyzeEventAttribution({ symbols, weights, range = '5y' }) {
  // Fetch all series
  const seriesMap = {};
  await Promise.all(symbols.map(async sym => {
    seriesMap[sym] = await fetchCloses(sym, range);
  }));

  const { aligned, dates } = alignSeries(seriesMap);
  if (dates.length < 100) throw new Error('Not enough overlapping data for event attribution');

  const { portfolioValues, returns } = computePortfolioReturns(aligned, dates, weights);

  const startDate = dates[0];
  const endDate   = dates[dates.length - 1];

  // Get all events in this range
  const eventsInRange = getEventsInRange(startDate, endDate);

  // Compute impact of each event
  const eventImpacts = eventsInRange.map(event => {
    const impact = computeEventImpact(portfolioValues, event);
    if (!impact) return null;

    const meta = CATEGORY_META[event.category] || { emoji: '📌', color: 'gray', label: event.category };

    return {
      ...event,
      ...impact,
      meta,
      significance: Math.abs(impact.totalMove),
    };
  }).filter(Boolean).sort((a, b) => b.significance - a.significance);

  // Find best/worst periods
  const { best: bestPeriods, worst: worstPeriods } = findSignificantPeriods(portfolioValues, 90);

  // For each best/worst period, find the most impactful event
  const attributeBestPeriods = bestPeriods.map(period => {
    const eventsInWindow = eventsInRange.filter(
      e => e.date >= period.startDate && e.date <= period.endDate
    );
    const positiveEvents = eventsInWindow.filter(e => e.impact > 0);
    const topEvent = positiveEvents.sort((a, b) => b.impact - a.impact)[0];
    return {
      ...period,
      explanation: topEvent
        ? `Driven by: ${topEvent.label}`
        : 'Organic market strength (no major events identified)',
      event: topEvent || null,
    };
  });

  const attributeWorstPeriods = worstPeriods.map(period => {
    const eventsInWindow = eventsInRange.filter(
      e => e.date >= period.startDate && e.date <= period.endDate
    );
    const negativeEvents = eventsInWindow.filter(e => e.impact < 0);
    const topEvent = negativeEvents.sort((a, b) => a.impact - b.impact)[0];
    return {
      ...period,
      explanation: topEvent
        ? `Caused by: ${topEvent.label}`
        : 'Organic market weakness (no major events identified)',
      event: topEvent || null,
    };
  });

  // High impact events (top 10 by significance)
  const topEvents = eventImpacts.slice(0, 10);

  // Timeline for charting (monthly portfolio value)
  const monthlyTimeline = [];
  let prevMonth = null;
  for (const pv of portfolioValues) {
    const month = pv.date.substring(0, 7);
    if (month !== prevMonth) {
      monthlyTimeline.push({ date: pv.date, value: pv.value, month });
      prevMonth = month;
    }
  }

  // Category breakdown
  const categoryStats = {};
  for (const ev of eventsInRange) {
    const cat = ev.category;
    if (!categoryStats[cat]) categoryStats[cat] = { count: 0, positiveImpact: 0, negativeImpact: 0 };
    categoryStats[cat].count++;
    const impact = ev.impact;
    if (impact > 0) categoryStats[cat].positiveImpact += impact;
    else            categoryStats[cat].negativeImpact += Math.abs(impact);
  }

  const categorySummary = Object.entries(categoryStats).map(([cat, stats]) => ({
    category: cat,
    meta: CATEGORY_META[cat] || { emoji: '📌', color: 'gray', label: cat },
    ...stats,
    netImpact: stats.positiveImpact - stats.negativeImpact,
  })).sort((a, b) => Math.abs(b.netImpact) - Math.abs(a.netImpact));

  // Overall stats
  const totalReturn   = portfolioValues.length > 1
    ? ((portfolioValues[portfolioValues.length - 1].value / portfolioValues[0].value) - 1) * 100
    : 0;

  const allPositiveEvents = eventImpacts.filter(e => e.postMove > 1 && e.impact > 0);
  const allNegativeEvents = eventImpacts.filter(e => e.postMove < -1 && e.impact < 0);

  const biggestBoost  = allPositiveEvents.sort((a, b) => b.postMove  - a.postMove )[0] || null;
  const biggestDrag   = allNegativeEvents.sort((a, b) => a.postMove  - b.postMove )[0] || null;

  return {
    summary: {
      totalReturn,
      startDate,
      endDate,
      eventsAnalyzed:  eventsInRange.length,
      positiveEvents:  eventsInRange.filter(e => e.impact > 0).length,
      negativeEvents:  eventsInRange.filter(e => e.impact < 0).length,
      biggestBoost,
      biggestDrag,
    },
    topEvents,
    monthlyTimeline,
    categorySummary,
    bestPeriods:  attributeBestPeriods,
    worstPeriods: attributeWorstPeriods,
    allEventsInRange: eventsInRange,
    meta: {
      symbols,
      weights,
      range,
      dataPoints: dates.length,
    }
  };
}

module.exports = { analyzeEventAttribution, EVENT_DATABASE, CATEGORY_META };
