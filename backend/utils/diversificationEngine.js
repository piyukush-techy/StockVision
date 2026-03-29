// diversificationEngine.js — Phase 4 Month 20
// Feature 1: Correlation Killer    — true diversification scoring, hidden correlations exposed
// Feature 2: Opportunity Cost Calc — find better alternatives with A-F grades

const axios = require('axios');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
const cache   = new Map();
const CACHE_TTL = 60 * 60 * 1000;

function getCached(k)    { const e = cache.get(k); if (!e || Date.now() - e.ts > CACHE_TTL) { cache.delete(k); return null; } return e.data; }
function setCached(k, d) { cache.set(k, { data: d, ts: Date.now() }); }

// ─── Fetch daily closes ───────────────────────────────────────────────────────
async function fetchCloses(symbol, years = 3) {
  const key = `closes_${symbol}_${years}y`;
  const hit  = getCached(key);
  if (hit) return hit;

  const res = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
    params: { interval: '1d', range: `${years}y` },
    headers: HEADERS, timeout: 15000
  });

  const result = res.data?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const ts  = result.timestamp || [];
  const cls = result.indicators?.quote?.[0]?.close || [];
  const out = [];
  for (let i = 0; i < ts.length; i++) {
    if (cls[i] && cls[i] > 0) out.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), close: cls[i] });
  }
  if (out.length < 60) throw new Error(`Insufficient data for ${symbol}`);
  setCached(key, out);
  return out;
}

// ─── Daily returns array ──────────────────────────────────────────────────────
function dailyReturns(closes) {
  const r = [];
  for (let i = 1; i < closes.length; i++) {
    r.push((closes[i].close - closes[i - 1].close) / closes[i - 1].close);
  }
  return r;
}

// ─── Align two series by date ─────────────────────────────────────────────────
function alignSeries(a, b) {
  const mapB = new Map(b.map(x => [x.date, x.close]));
  const aligned = a.filter(x => mapB.has(x.date)).map(x => ({ date: x.date, closeA: x.close, closeB: mapB.get(x.date) }));
  return aligned;
}

// ─── Pearson correlation ──────────────────────────────────────────────────────
function pearson(x, y) {
  const n  = Math.min(x.length, y.length);
  if (n < 10) return 0;
  const meanX = x.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanY = y.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX, dy = y[i] - meanY;
    num  += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

// ─── Annualised metrics ───────────────────────────────────────────────────────
function calcMetrics(closes) {
  if (closes.length < 30) return null;
  const rets   = dailyReturns(closes);
  const total  = closes[closes.length - 1].close / closes[0].close - 1;
  const years  = closes.length / 252;
  const cagr   = (Math.pow(1 + total, 1 / years) - 1) * 100;
  const mean   = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
  const vol    = Math.sqrt(variance * 252) * 100;
  const sharpe = vol > 0 ? (cagr - 6) / vol : 0;

  let peak = closes[0].close, maxDD = 0;
  for (const c of closes) {
    peak = Math.max(peak, c.close);
    const dd = (c.close - peak) / peak * 100;
    if (dd < maxDD) maxDD = dd;
  }

  return {
    cagr:       +cagr.toFixed(2),
    totalReturn: +(total * 100).toFixed(2),
    annualVol:  +vol.toFixed(2),
    sharpe:     +sharpe.toFixed(2),
    maxDrawdown: +Math.abs(maxDD).toFixed(2),
    currentPrice: +closes[closes.length - 1].close.toFixed(2),
  };
}

// ─── Opportunity Grade (A-F) ──────────────────────────────────────────────────
function gradeStock(metrics, benchmarkMetrics) {
  if (!metrics || !benchmarkMetrics) return { grade: 'N/A', color: 'gray', score: 0 };

  // Score 0-100 across 5 dimensions
  const cagrScore   = Math.min(100, Math.max(0, (metrics.cagr   / (benchmarkMetrics.cagr   || 1)) * 40));
  const sharpeScore = Math.min(100, Math.max(0, (metrics.sharpe / (benchmarkMetrics.sharpe || 1)) * 30));
  const ddScore     = Math.min(100, Math.max(0, (1 - metrics.maxDrawdown / 100) * 30));

  const total = cagrScore * 0.4 + sharpeScore * 0.35 + ddScore * 0.25;
  const score = +total.toFixed(0);

  if (score >= 80) return { grade: 'A', color: 'emerald', score, label: 'Excellent — Strong buy candidate' };
  if (score >= 65) return { grade: 'B', color: 'green',   score, label: 'Good — Worth considering' };
  if (score >= 50) return { grade: 'C', color: 'blue',    score, label: 'Average — Compare carefully' };
  if (score >= 35) return { grade: 'D', color: 'yellow',  score, label: 'Below average — Significant concerns' };
  if (score >= 20) return { grade: 'E', color: 'orange',  score, label: 'Poor — Major red flags' };
  return              { grade: 'F', color: 'red',    score, label: 'Fail — Avoid or exit immediately' };
}


// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 1: CORRELATION KILLER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deep diversification analysis for a portfolio of stocks.
 * Exposes hidden correlations, calculates true effective stock count,
 * identifies redundant positions, and scores genuine diversification.
 *
 * @param {string[]} symbols  - e.g. ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS']
 * @param {string}   range    - '1y' | '2y' | '3y'
 */
async function runCorrelationKiller({ symbols, range = '2y' }) {
  const years  = range === '1y' ? 1 : range === '2y' ? 2 : 3;
  const nifty  = '^NSEI';

  // Fetch all in parallel
  const [niftyCloses, ...stockCloses] = await Promise.all([
    fetchCloses(nifty, years),
    ...symbols.map(s => fetchCloses(s, years)),
  ]);

  const niftyRets = dailyReturns(niftyCloses);

  // ── Per-stock metrics + beta ─────────────────────────────────────────────
  const stockData = symbols.map((sym, i) => {
    const closes  = stockCloses[i];
    const metrics = calcMetrics(closes);
    const rets    = dailyReturns(closes);

    // Beta vs Nifty
    const aligned = alignSeries(closes, niftyCloses);
    const sRets   = [];
    const bRets   = [];
    for (let j = 1; j < aligned.length; j++) {
      sRets.push((aligned[j].closeA - aligned[j - 1].closeA) / aligned[j - 1].closeA);
      bRets.push((aligned[j].closeB - aligned[j - 1].closeB) / aligned[j - 1].closeB);
    }
    const corrNifty = +pearson(sRets, bRets).toFixed(3);
    const betaVsNifty = bRets.reduce((s, v) => s + v * v, 0) > 0
      ? +(pearson(sRets, bRets) * (
            Math.sqrt(sRets.reduce((s, v) => s + v * v, 0) / sRets.length) /
            Math.sqrt(bRets.reduce((s, v) => s + v * v, 0) / bRets.length)
          )).toFixed(2)
      : 1;

    return { symbol: sym, short: sym.replace('.NS', '').replace('.BO', ''), closes, rets, metrics, corrNifty, betaVsNifty };
  });

  // ── Full correlation matrix ──────────────────────────────────────────────
  const n      = symbols.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  const pairs  = [];

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) { matrix[i][j] = 1; continue; }
      const aligned = alignSeries(stockCloses[i], stockCloses[j]);
      const rA = [], rB = [];
      for (let k = 1; k < aligned.length; k++) {
        rA.push((aligned[k].closeA - aligned[k - 1].closeA) / aligned[k - 1].closeA);
        rB.push((aligned[k].closeB - aligned[k - 1].closeB) / aligned[k - 1].closeB);
      }
      const corr = +pearson(rA, rB).toFixed(3);
      matrix[i][j] = corr;
      if (j > i) {
        const absC = Math.abs(corr);
        pairs.push({
          symbolA: stockData[i].short,
          symbolB: stockData[j].short,
          correlation: corr,
          absCorr: absC,
          risk: absC > 0.8 ? 'Critical' : absC > 0.6 ? 'High' : absC > 0.4 ? 'Moderate' : 'Low',
          riskColor: absC > 0.8 ? 'red' : absC > 0.6 ? 'orange' : absC > 0.4 ? 'yellow' : 'green',
          insight: buildPairInsight(stockData[i].short, stockData[j].short, corr),
        });
      }
    }
  }

  // Sort pairs by absolute correlation desc
  pairs.sort((a, b) => b.absCorr - a.absCorr);

  // ── Effective number of stocks (diversification ratio) ─────────────────
  // Effective N = 1 / sum(weight_i^2) adjusted for correlations
  // Simple: eigenvalue method approximation using avg correlation
  const offDiag    = pairs.map(p => p.correlation);
  const avgCorr    = offDiag.length > 0 ? offDiag.reduce((s, c) => s + c, 0) / offDiag.length : 0;
  const effectiveN = n > 1 ? +(n / (1 + (n - 1) * Math.max(avgCorr, 0))).toFixed(1) : 1;

  // ── Redundant pairs (>0.7 correlation) ────────────────────────────────
  const redundantPairs = pairs.filter(p => p.absCorr > 0.7);

  // ── Diversification score (0-100) ────────────────────────────────────
  const avgAbsCorr = pairs.length > 0 ? pairs.reduce((s, p) => s + p.absCorr, 0) / pairs.length : 0;
  const rawScore   = (1 - avgAbsCorr) * 60 + (effectiveN / n) * 40;
  const divScore   = Math.round(Math.min(100, Math.max(0, rawScore)));

  const divLabel = divScore > 75 ? 'Excellent Diversification'
    : divScore > 60 ? 'Good Diversification'
    : divScore > 45 ? 'Moderate Diversification'
    : divScore > 30 ? 'Poor Diversification'
    : 'Highly Concentrated';

  // ── Sector clustering ──────────────────────────────────────────────────
  const sectorMap = buildSectorMap();
  const sectors   = symbols.map(s => sectorMap[s.replace('.NS','').replace('.BO','')] || 'Other');
  const sectorCount = {};
  sectors.forEach(s => { sectorCount[s] = (sectorCount[s] || 0) + 1; });
  const sectorConcentration = Object.entries(sectorCount)
    .map(([sector, count]) => ({ sector, count, pct: Math.round(count / n * 100) }))
    .sort((a, b) => b.count - a.count);

  // ── Alternatives for redundant stocks ─────────────────────────────────
  const suggestions = buildDiversificationSuggestions(redundantPairs, sectors, sectorMap);

  return {
    meta:   { symbols, range, stockCount: n },
    stocks: stockData.map(s => ({
      symbol: s.symbol,
      short:  s.short,
      corrNifty:  s.corrNifty,
      betaVsNifty: s.betaVsNifty,
      ...s.metrics,
    })),
    matrix,
    pairs,
    redundantPairs,
    diversification: {
      score:     divScore,
      label:     divLabel,
      effectiveN,
      actualN:   n,
      avgCorr:   +avgAbsCorr.toFixed(3),
      color:     divScore > 75 ? 'emerald' : divScore > 60 ? 'green' : divScore > 45 ? 'yellow' : divScore > 30 ? 'orange' : 'red',
    },
    sectorConcentration,
    suggestions,
  };
}

function buildPairInsight(symA, symB, corr) {
  if (corr > 0.85)  return `${symA} and ${symB} move almost identically — holding both adds near-zero diversification benefit.`;
  if (corr > 0.7)   return `${symA} and ${symB} are highly correlated — likely same sector or theme exposure.`;
  if (corr > 0.5)   return `${symA} and ${symB} have moderate correlation — some overlap in market exposure.`;
  if (corr > 0.2)   return `${symA} and ${symB} have low correlation — reasonable diversification.`;
  if (corr > -0.1)  return `${symA} and ${symB} are near-uncorrelated — solid diversification.`;
  return `${symA} and ${symB} move in opposite directions — excellent portfolio hedge.`;
}

function buildSectorMap() {
  return {
    RELIANCE: 'Energy/Conglomerate', IOC: 'Energy', BPCL: 'Energy', ONGC: 'Energy', GAIL: 'Energy', NTPC: 'Power', POWERGRID: 'Power', ADANIPOWER: 'Power',
    TCS: 'IT', INFY: 'IT', WIPRO: 'IT', HCLTECH: 'IT', TECHM: 'IT', LTIM: 'IT', MPHASIS: 'IT', PERSISTENT: 'IT', COFORGE: 'IT',
    HDFCBANK: 'Banking', ICICIBANK: 'Banking', SBIN: 'Banking', KOTAKBANK: 'Banking', AXISBANK: 'Banking', BANDHANBNK: 'Banking', INDUSINDBK: 'Banking', PNB: 'Banking', BANKBARODA: 'Banking',
    HINDUNILVR: 'FMCG', ITC: 'FMCG', NESTLEIND: 'FMCG', BRITANNIA: 'FMCG', DABUR: 'FMCG', MARICO: 'FMCG', GODREJCP: 'FMCG',
    SUNPHARMA: 'Pharma', DRREDDY: 'Pharma', CIPLA: 'Pharma', DIVISLAB: 'Pharma', APOLLOHOSP: 'Pharma', AUROPHARMA: 'Pharma',
    TATASTEEL: 'Metals', JSWSTEEL: 'Metals', HINDALCO: 'Metals', VEDL: 'Metals', COALINDIA: 'Metals',
    MARUTI: 'Auto', TATAMOTORS: 'Auto', BAJAJ_AUTO: 'Auto', EICHERMOT: 'Auto', HEROMOTOCO: 'Auto', M_M: 'Auto',
    BHARTIARTL: 'Telecom', IDEA: 'Telecom',
    LT: 'Infra/Capital Goods', SIEMENS: 'Infra/Capital Goods', ABB: 'Infra/Capital Goods', BEL: 'Infra/Capital Goods',
    ADANIENT: 'Conglomerate', ADANIPORTS: 'Ports/Logistics',
    BAJFINANCE: 'NBFC', BAJAJFINSV: 'NBFC', HDFCLIFE: 'Insurance', SBILIFE: 'Insurance', ICICIPRULI: 'Insurance',
    ASIANPAINT: 'Paints', BERGER: 'Paints',
    ULTRACEMCO: 'Cement', SHREECEM: 'Cement', AMBUJACEM: 'Cement', ACC: 'Cement',
    TITAN: 'Consumer Discretionary', TATACONSUM: 'FMCG',
    ZOMATO: 'Internet', PAYTM: 'Fintech', POLICYBZR: 'Fintech', NYKAA: 'Internet',
    PIDILITIND: 'Specialty Chemicals', SRF: 'Specialty Chemicals', DEEPAKNTR: 'Specialty Chemicals',
  };
}

function buildDiversificationSuggestions(redundantPairs, currentSectors, sectorMap) {
  if (redundantPairs.length === 0) return [];

  // Sectors with no representation
  const allSectors = ['IT', 'Banking', 'FMCG', 'Pharma', 'Energy/Conglomerate', 'Metals', 'Auto', 'Telecom', 'Infra/Capital Goods', 'Specialty Chemicals'];
  const missingSectors = allSectors.filter(s => !currentSectors.includes(s));

  const suggestions = [];

  // Suggest replacing one of each redundant pair
  redundantPairs.slice(0, 3).forEach(pair => {
    suggestions.push({
      action: 'Replace',
      from:   pair.symbolA,
      reason: `${pair.symbolA} & ${pair.symbolB} are ${(pair.absCorr * 100).toFixed(0)}% correlated — redundant`,
      alternatives: getAlternativesForSector(missingSectors[0] || 'Pharma'),
    });
  });

  // Suggest adding from missing sectors
  missingSectors.slice(0, 2).forEach(sector => {
    suggestions.push({
      action: 'Add',
      from:   null,
      reason: `No ${sector} exposure — adds true diversification`,
      alternatives: getAlternativesForSector(sector),
    });
  });

  return suggestions.slice(0, 4);
}

function getAlternativesForSector(sector) {
  const map = {
    'IT':                   [{ symbol: 'TCS.NS', name: 'TCS' }, { symbol: 'INFY.NS', name: 'Infosys' }, { symbol: 'WIPRO.NS', name: 'Wipro' }],
    'Banking':              [{ symbol: 'HDFCBANK.NS', name: 'HDFC Bank' }, { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' }, { symbol: 'KOTAKBANK.NS', name: 'Kotak Bank' }],
    'FMCG':                 [{ symbol: 'HINDUNILVR.NS', name: 'HUL' }, { symbol: 'ITC.NS', name: 'ITC' }, { symbol: 'NESTLEIND.NS', name: 'Nestle' }],
    'Pharma':               [{ symbol: 'SUNPHARMA.NS', name: 'Sun Pharma' }, { symbol: 'DRREDDY.NS', name: 'Dr Reddy\'s' }, { symbol: 'CIPLA.NS', name: 'Cipla' }],
    'Energy/Conglomerate':  [{ symbol: 'RELIANCE.NS', name: 'Reliance' }, { symbol: 'ONGC.NS', name: 'ONGC' }],
    'Metals':               [{ symbol: 'TATASTEEL.NS', name: 'Tata Steel' }, { symbol: 'JSWSTEEL.NS', name: 'JSW Steel' }, { symbol: 'HINDALCO.NS', name: 'Hindalco' }],
    'Auto':                 [{ symbol: 'MARUTI.NS', name: 'Maruti Suzuki' }, { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' }, { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto' }],
    'Telecom':              [{ symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' }],
    'Infra/Capital Goods':  [{ symbol: 'LT.NS', name: 'L&T' }, { symbol: 'SIEMENS.NS', name: 'Siemens' }],
    'Specialty Chemicals':  [{ symbol: 'PIDILITIND.NS', name: 'Pidilite' }, { symbol: 'SRF.NS', name: 'SRF' }],
  };
  return map[sector] || [{ symbol: 'NSEI.NS', name: 'Nifty ETF (diversified)' }];
}


// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 2: OPPORTUNITY COST CALCULATOR (Enhanced)
// ═══════════════════════════════════════════════════════════════════════════════

// Peer universe by stock category
const PEER_UNIVERSE = {
  IT:          ['TCS.NS','INFY.NS','WIPRO.NS','HCLTECH.NS','TECHM.NS','LTIM.NS','PERSISTENT.NS','COFORGE.NS'],
  Banking:     ['HDFCBANK.NS','ICICIBANK.NS','SBIN.NS','KOTAKBANK.NS','AXISBANK.NS','INDUSINDBK.NS','BANDHANBNK.NS'],
  FMCG:        ['HINDUNILVR.NS','ITC.NS','NESTLEIND.NS','BRITANNIA.NS','DABUR.NS','MARICO.NS','GODREJCP.NS'],
  Pharma:      ['SUNPHARMA.NS','DRREDDY.NS','CIPLA.NS','DIVISLAB.NS','AUROPHARMA.NS','APOLLOHOSP.NS'],
  Energy:      ['RELIANCE.NS','ONGC.NS','BPCL.NS','IOC.NS','GAIL.NS'],
  Metals:      ['TATASTEEL.NS','JSWSTEEL.NS','HINDALCO.NS','VEDL.NS','COALINDIA.NS'],
  Auto:        ['MARUTI.NS','TATAMOTORS.NS','BAJAJ-AUTO.NS','EICHERMOT.NS','HEROMOTOCO.NS','M&M.NS'],
  Telecom:     ['BHARTIARTL.NS'],
  Infra:       ['LT.NS','SIEMENS.NS','ABB.NS','BEL.NS','NTPC.NS','POWERGRID.NS'],
  Cement:      ['ULTRACEMCO.NS','SHREECEM.NS','AMBUJACEM.NS','ACC.NS'],
  NBFC:        ['BAJFINANCE.NS','BAJAJFINSV.NS','HDFCLIFE.NS','SBILIFE.NS'],
  Default:     ['TCS.NS','HDFCBANK.NS','RELIANCE.NS','HINDUNILVR.NS','SUNPHARMA.NS','LT.NS','BHARTIARTL.NS','ITC.NS'],
};

const BENCHMARKS = ['^NSEI', '^BSESN', 'GLD'];

/**
 * Full opportunity cost analysis for a stock.
 * Answers: "What if you had bought X instead? Was it worth it vs peers and benchmarks?"
 *
 * @param {string} symbol     - e.g. "WIPRO.NS"
 * @param {string} range      - '1y' | '2y' | '3y'
 * @param {number} capital    - investment amount in ₹
 */
async function runOpportunityCost({ symbol, range = '2y', capital = 100000 }) {
  const years    = range === '1y' ? 1 : range === '2y' ? 2 : 3;
  const sectorMap = buildSectorMap();
  const shortSym  = symbol.replace('.NS','').replace('.BO','');
  const sector    = sectorMap[shortSym] || 'Default';

  // Get peer universe (exclude the stock itself)
  const sectorKey  = Object.keys(PEER_UNIVERSE).find(k => sector.includes(k)) || 'Default';
  const peers      = PEER_UNIVERSE[sectorKey].filter(s => s !== symbol).slice(0, 6);

  // Fetch target stock + all peers + benchmarks in parallel
  const allSymbols   = [symbol, ...peers, ...BENCHMARKS];
  const allClosesArr = await Promise.allSettled(allSymbols.map(s => fetchCloses(s, years)));

  const closesMap = {};
  allSymbols.forEach((s, i) => {
    if (allClosesArr[i].status === 'fulfilled') closesMap[s] = allClosesArr[i].value;
  });

  // ── Main stock metrics ─────────────────────────────────────────────────
  if (!closesMap[symbol]) throw new Error(`Could not fetch data for ${symbol}`);
  const mainMetrics = calcMetrics(closesMap[symbol]);
  const mainGrade   = gradeStock(mainMetrics, mainMetrics); // baseline grade
  const mainValue   = +(capital * (1 + mainMetrics.totalReturn / 100)).toFixed(0);
  const mainGain    = mainValue - capital;

  // ── Peer analysis ──────────────────────────────────────────────────────
  const peerResults = peers.map(peer => {
    if (!closesMap[peer]) return null;
    const m = calcMetrics(closesMap[peer]);
    if (!m) return null;
    const grade   = gradeStock(m, mainMetrics);
    const value   = +(capital * (1 + m.totalReturn / 100)).toFixed(0);
    const gain    = value - capital;
    const alpha   = +(m.totalReturn - mainMetrics.totalReturn).toFixed(2);
    const shortP  = peer.replace('.NS','').replace('.BO','');

    return {
      symbol: peer,
      short:  shortP,
      ...m,
      grade,
      portfolioValue: value,
      gain,
      gainVsMain: gain - mainGain,
      alpha,
      betterThan: alpha > 0,
    };
  }).filter(Boolean).sort((a, b) => b.totalReturn - a.totalReturn);

  // ── Benchmark analysis ─────────────────────────────────────────────────
  const benchmarkLabels = { '^NSEI': 'Nifty 50', '^BSESN': 'Sensex', 'GLD': 'Gold (GLD)' };
  const benchmarkResults = BENCHMARKS.map(bm => {
    if (!closesMap[bm]) return null;
    const m     = calcMetrics(closesMap[bm]);
    if (!m) return null;
    const value = +(capital * (1 + m.totalReturn / 100)).toFixed(0);
    const alpha = +(mainMetrics.totalReturn - m.totalReturn).toFixed(2);
    return {
      symbol:         bm,
      label:          benchmarkLabels[bm],
      ...m,
      portfolioValue: value,
      gain:           value - capital,
      alpha,
      stockBeats:     alpha > 0,
    };
  }).filter(Boolean);

  // ── Best alternative overall ───────────────────────────────────────────
  const allAlts  = [...peerResults, ...benchmarkResults];
  const bestAlt  = allAlts.reduce((b, a) => (!b || a.totalReturn > b.totalReturn) ? a : b, null);
  const worstAlt = allAlts.reduce((w, a) => (!w || a.totalReturn < w.totalReturn) ? a : w, null);

  // ── Opportunity cost summary ───────────────────────────────────────────
  const betterPeers = peerResults.filter(p => p.alpha > 0);
  const oppCostSummary = buildOppCostSummary(mainMetrics, peerResults, benchmarkResults, capital, shortSym);

  // Overall grade for main stock
  const overallGrade = gradeStockVsPeers(mainMetrics, peerResults);

  return {
    meta:    { symbol, short: shortSym, sector, range, capital },
    main:    { symbol, short: shortSym, ...mainMetrics, grade: overallGrade, portfolioValue: mainValue, gain: mainGain },
    peers:   peerResults,
    benchmarks: benchmarkResults,
    best:    bestAlt,
    worst:   worstAlt,
    betterPeerCount: betterPeers.length,
    totalPeerCount:  peerResults.length,
    summary: oppCostSummary,
  };
}

function gradeStockVsPeers(main, peers) {
  if (!peers.length) return { grade: 'C', color: 'blue', score: 50, label: 'No peers to compare' };

  const betterCount = peers.filter(p => p.totalReturn > main.totalReturn).length;
  const pct = betterCount / peers.length;

  if (pct <= 0.1) return { grade: 'A', color: 'emerald', score: 90, label: 'Top performer in peer group' };
  if (pct <= 0.25) return { grade: 'B', color: 'green',   score: 75, label: 'Above average vs peers' };
  if (pct <= 0.5)  return { grade: 'C', color: 'blue',    score: 55, label: 'Average — sector median' };
  if (pct <= 0.75) return { grade: 'D', color: 'yellow',  score: 35, label: 'Below average — better peers exist' };
  if (pct <= 0.9)  return { grade: 'E', color: 'orange',  score: 20, label: 'Near bottom of peer group' };
  return                   { grade: 'F', color: 'red',    score: 8,  label: 'Worst performer in peer group' };
}

function buildOppCostSummary(main, peers, benchmarks, capital, shortSym) {
  const bestPeer   = peers[0];
  const nifty      = benchmarks.find(b => b.symbol === '^NSEI');
  const lines      = [];

  if (bestPeer && bestPeer.alpha > 5) {
    const extraGain = +(capital * bestPeer.alpha / 100).toFixed(0);
    lines.push(`💡 If you had bought ${bestPeer.short} instead of ${shortSym}, you'd have earned ₹${extraGain.toLocaleString('en-IN')} more over this period.`);
  } else if (bestPeer && bestPeer.alpha > 0) {
    lines.push(`📊 ${bestPeer.short} slightly outperformed ${shortSym}, but the difference was minimal.`);
  } else {
    lines.push(`✅ ${shortSym} outperformed all tested peers in this period.`);
  }

  if (nifty) {
    if (main.totalReturn > nifty.totalReturn) {
      lines.push(`📈 ${shortSym} beat Nifty 50 by ${(main.totalReturn - nifty.totalReturn).toFixed(1)}% — genuine alpha generated.`);
    } else {
      const missed = +(capital * (nifty.totalReturn - main.totalReturn) / 100).toFixed(0);
      lines.push(`📉 A simple Nifty 50 index fund would have returned ₹${missed.toLocaleString('en-IN')} more — stock-picking cost you alpha.`);
    }
  }

  lines.push(`🔍 ${peers.filter(p => p.alpha > 0).length} out of ${peers.length} sector peers outperformed ${shortSym} in this window.`);

  return lines;
}

module.exports = { runCorrelationKiller, runOpportunityCost };
