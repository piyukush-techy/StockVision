// portfolioOptimizer.js — Phase 3 Month 13: Portfolio Optimizer Foundation
// Multi-stock combinatorial analysis + optimized allocation engine

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

// ─── Fetch historical closes ───────────────────────────────────────────────
async function fetchCloses(symbol, range = '3y') {
  const key = `port_${symbol}_${range}`;
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
  const closes = result.indicators?.quote?.[0]?.close || [];

  const data = timestamps.map((ts, i) => ({
    date:  new Date(ts * 1000).toISOString().substring(0, 10),
    close: closes[i] || null
  })).filter(d => d.close && d.close > 0);

  if (data.length < 60) throw new Error(`Insufficient data for ${symbol}`);
  setCached(key, data);
  return data;
}

// ─── Align multiple series to common dates ────────────────────────────────
function alignSeries(seriesMap) {
  // Find dates common to ALL symbols
  const dateSets = Object.values(seriesMap).map(s => new Set(s.map(d => d.date)));
  const commonDates = [...dateSets[0]].filter(d => dateSets.every(ds => ds.has(d))).sort();

  const aligned = {};
  for (const [sym, series] of Object.entries(seriesMap)) {
    const byDate = {};
    series.forEach(d => { byDate[d.date] = d.close; });
    aligned[sym] = commonDates.map(d => ({ date: d, close: byDate[d] }));
  }
  return { aligned, dates: commonDates };
}

// ─── Daily returns ────────────────────────────────────────────────────────
function dailyReturns(closes) {
  const r = [];
  for (let i = 1; i < closes.length; i++) {
    r.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return r;
}

// ─── Stats helpers ────────────────────────────────────────────────────────
function mean(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }
function std(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length);
}
function covariance(a, b) {
  const ma = mean(a), mb = mean(b);
  return a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0) / a.length;
}
function correlation(a, b) {
  const cov = covariance(a, b);
  const sa = std(a), sb = std(b);
  return sa && sb ? cov / (sa * sb) : 0;
}

// ─── Portfolio metrics for a given weight vector ──────────────────────────
function portfolioMetrics(returnsMatrix, weights, tradingDays = 252) {
  const n = weights.length;
  // Portfolio daily return series
  const portReturns = returnsMatrix[0].map((_, day) =>
    weights.reduce((s, w, i) => s + w * returnsMatrix[i][day], 0)
  );

  const annReturn = mean(portReturns) * tradingDays;
  const annVol    = std(portReturns)  * Math.sqrt(tradingDays);
  const sharpe    = annVol > 0 ? (annReturn - 0.065) / annVol : 0; // 6.5% risk-free (India)

  // Max drawdown
  let peak = 1, maxDD = 0, val = 1;
  for (const r of portReturns) {
    val *= (1 + r);
    if (val > peak) peak = val;
    const dd = (peak - val) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  // CAGR from cumulative return
  const totalReturn = portReturns.reduce((v, r) => v * (1 + r), 1) - 1;
  const years = portReturns.length / tradingDays;
  const cagr  = Math.pow(1 + totalReturn, 1 / years) - 1;

  return { annReturn, annVol, sharpe, maxDD, cagr, totalReturn };
}

// ─── Build correlation matrix ─────────────────────────────────────────────
function buildCorrelationMatrix(returnsMatrix, symbols) {
  const n = symbols.length;
  const matrix = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      row.push(parseFloat(correlation(returnsMatrix[i], returnsMatrix[j]).toFixed(3)));
    }
    matrix.push(row);
  }
  return matrix;
}

// ─── Equal weight baseline ────────────────────────────────────────────────
function equalWeights(n) { return Array(n).fill(1 / n); }

// ─── Simple optimizations ────────────────────────────────────────────────
// Max Sharpe: grid search over weight combinations (efficient for ≤10 stocks)
function optimizeMaxSharpe(returnsMatrix, n) {
  if (n === 1) return { weights: [1], name: 'Single Stock' };
  if (n === 2) {
    let best = { sharpe: -Infinity, weights: [0.5, 0.5] };
    for (let w = 0; w <= 100; w += 5) {
      const wts = [w / 100, 1 - w / 100];
      const m = portfolioMetrics(returnsMatrix, wts);
      if (m.sharpe > best.sharpe) best = { sharpe: m.sharpe, weights: wts };
    }
    return { weights: best.weights, name: 'Max Sharpe' };
  }
  // For 3+ stocks: use simplified risk-parity (inverse volatility weighting)
  const vols = returnsMatrix.map(r => std(r));
  const invVols = vols.map(v => v > 0 ? 1 / v : 0);
  const totalInv = invVols.reduce((s, v) => s + v, 0);
  const weights = invVols.map(v => v / totalInv);
  return { weights, name: 'Risk-Parity (Inverse Vol)' };
}

// Min Volatility
function optimizeMinVol(returnsMatrix, n) {
  if (n === 1) return { weights: [1], name: 'Single Stock' };
  if (n === 2) {
    let best = { vol: Infinity, weights: [0.5, 0.5] };
    for (let w = 0; w <= 100; w += 5) {
      const wts = [w / 100, 1 - w / 100];
      const m = portfolioMetrics(returnsMatrix, wts);
      if (m.annVol < best.vol) best = { vol: m.annVol, weights: wts };
    }
    return { weights: best.weights, name: 'Min Volatility' };
  }
  // Minimum variance: weight more to lowest vol stocks
  const vols = returnsMatrix.map(r => std(r));
  const invVolSq = vols.map(v => v > 0 ? 1 / (v * v) : 0);
  const total = invVolSq.reduce((s, v) => s + v, 0);
  const weights = invVolSq.map(v => v / total);
  return { weights, name: 'Min Volatility' };
}

// ─── Individual stock stats ───────────────────────────────────────────────
function stockStats(returns, symbol, currentPrice, tradingDays = 252) {
  const ann = mean(returns) * tradingDays;
  const vol = std(returns) * Math.sqrt(tradingDays);
  const sharpe = vol > 0 ? (ann - 0.065) / vol : 0;
  let peak = 1, maxDD = 0, val = 1;
  for (const r of returns) {
    val *= (1 + r);
    if (val > peak) peak = val;
    const dd = (peak - val) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  const total = returns.reduce((v, r) => v * (1 + r), 1) - 1;
  const years = returns.length / tradingDays;
  const cagr  = Math.pow(1 + total, 1 / years) - 1;
  return {
    symbol,
    currentPrice,
    annualReturn:   parseFloat((ann  * 100).toFixed(2)),
    annualVol:      parseFloat((vol  * 100).toFixed(2)),
    sharpeRatio:    parseFloat(sharpe.toFixed(3)),
    maxDrawdown:    parseFloat((maxDD * 100).toFixed(2)),
    cagr:           parseFloat((cagr  * 100).toFixed(2)),
    totalReturn:    parseFloat((total * 100).toFixed(2)),
    dataPoints:     returns.length
  };
}

// ─── Allocation amounts ───────────────────────────────────────────────────
function calcAllocations(weights, symbols, currentPrices, totalCapital) {
  return symbols.map((sym, i) => {
    const allotedAmount = weights[i] * totalCapital;
    const price = currentPrices[sym] || 100;
    const shares = Math.floor(allotedAmount / price);
    const actualAmount = shares * price;
    return {
      symbol:      sym,
      weight:      parseFloat((weights[i] * 100).toFixed(2)),
      targetAmount: parseFloat(allotedAmount.toFixed(0)),
      shares,
      actualAmount: parseFloat(actualAmount.toFixed(0)),
      pricePerShare: parseFloat(price.toFixed(2))
    };
  });
}

// ─── Growth pattern classification ───────────────────────────────────────
function classifyGrowthPattern(cagr, maxDD, sharpe) {
  if (cagr > 20 && maxDD < 25 && sharpe > 1.2) return { label: 'Exceptional', color: 'emerald', emoji: '🚀' };
  if (cagr > 15 && maxDD < 35 && sharpe > 0.8) return { label: 'Strong',      color: 'green',   emoji: '📈' };
  if (cagr > 10 && sharpe > 0.5)                return { label: 'Regular',     color: 'blue',    emoji: '✅' };
  if (cagr >  5)                                 return { label: 'Moderate',    color: 'yellow',  emoji: '⚠️' };
  if (maxDD > 50)                                return { label: 'Volatile',    color: 'orange',  emoji: '🎢' };
  return { label: 'Weak', color: 'red', emoji: '📉' };
}

// ─── Main entry point ─────────────────────────────────────────────────────
async function analyzePortfolio({ symbols, totalCapital = 100000, range = '3y' }) {
  if (!symbols || symbols.length < 1) throw new Error('At least 1 symbol required');
  if (symbols.length > 10)            throw new Error('Maximum 10 stocks supported');

  // 1. Fetch all data in parallel
  const seriesMap = {};
  const currentPrices = {};
  await Promise.all(symbols.map(async sym => {
    const data = await fetchCloses(sym, range);
    seriesMap[sym] = data;
    currentPrices[sym] = data[data.length - 1].close;
  }));

  // 2. Align to common dates
  const { aligned, dates } = alignSeries(seriesMap);
  const n = symbols.length;

  // 3. Compute returns for each stock
  const returnsMatrix = symbols.map(sym =>
    dailyReturns(aligned[sym].map(d => d.close))
  );

  // 4. Individual stock stats
  const stockAnalysis = symbols.map((sym, i) =>
    stockStats(returnsMatrix[i], sym, currentPrices[sym])
  );

  // 5. Correlation matrix
  const correlationMatrix = buildCorrelationMatrix(returnsMatrix, symbols);

  // 6. Three portfolio strategies
  const eqWeights   = equalWeights(n);
  const msWeights   = optimizeMaxSharpe(returnsMatrix, n).weights;
  const mvWeights   = optimizeMinVol(returnsMatrix, n).weights;

  const eqMetrics   = portfolioMetrics(returnsMatrix, eqWeights);
  const msMetrics   = portfolioMetrics(returnsMatrix, msWeights);
  const mvMetrics   = portfolioMetrics(returnsMatrix, mvWeights);

  // 7. Pick best strategy by Sharpe
  const strategies = [
    { name: 'Equal Weight',    weights: eqWeights, ...eqMetrics },
    { name: 'Risk-Parity',     weights: msWeights, ...msMetrics },
    { name: 'Min Volatility',  weights: mvWeights, ...mvMetrics },
  ];
  const best = strategies.reduce((b, s) => s.sharpe > b.sharpe ? s : b, strategies[0]);

  // 8. Allocations for all three strategies
  const allocations = {
    equalWeight:   calcAllocations(eqWeights, symbols, currentPrices, totalCapital),
    riskParity:    calcAllocations(msWeights, symbols, currentPrices, totalCapital),
    minVolatility: calcAllocations(mvWeights, symbols, currentPrices, totalCapital),
  };

  // 9. Portfolio growth pattern
  const pattern = classifyGrowthPattern(
    best.cagr * 100, best.maxDD * 100, best.sharpe
  );

  // 10. Diversification score (avg pairwise correlation)
  let pairCount = 0, corrSum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      corrSum += Math.abs(correlationMatrix[i][j]);
      pairCount++;
    }
  }
  const avgCorrelation = pairCount > 0 ? corrSum / pairCount : 0;
  const diversificationScore = Math.round((1 - avgCorrelation) * 100);
  const effectiveStocks = parseFloat((n / (1 + avgCorrelation * (n - 1))).toFixed(2));

  // 11. Historical portfolio test (equal weight, year by year)
  const yearlyPerf = [];
  const years = [...new Set(dates.map(d => d.slice(0, 4)))].sort();
  for (const yr of years) {
    const yDates = dates.filter(d => d.startsWith(yr));
    if (yDates.length < 20) continue;
    const yReturns = symbols.map(sym => {
      const yData = aligned[sym].filter(d => d.date.startsWith(yr)).map(d => d.close);
      if (yData.length < 2) return 0;
      return (yData[yData.length - 1] - yData[0]) / yData[0];
    });
    const portReturn = eqWeights.reduce((s, w, i) => s + w * yReturns[i], 0);
    yearlyPerf.push({ year: yr, return: parseFloat((portReturn * 100).toFixed(2)) });
  }

  return {
    meta: {
      symbols,
      totalCapital,
      range,
      dataPoints: dates.length,
      analyzedAt: new Date().toISOString()
    },
    stockAnalysis,
    correlationMatrix,
    strategies: strategies.map(s => ({
      name:         s.name,
      weights:      symbols.map((sym, i) => ({ symbol: sym, weight: parseFloat((s.weights[i] * 100).toFixed(2)) })),
      metrics: {
        cagr:         parseFloat((s.cagr       * 100).toFixed(2)),
        annualReturn: parseFloat((s.annReturn  * 100).toFixed(2)),
        annualVol:    parseFloat((s.annVol     * 100).toFixed(2)),
        sharpe:       parseFloat(s.sharpe.toFixed(3)),
        maxDrawdown:  parseFloat((s.maxDD      * 100).toFixed(2)),
        totalReturn:  parseFloat((s.totalReturn* 100).toFixed(2)),
      }
    })),
    bestStrategy: {
      name: best.name,
      reason: `Highest Sharpe Ratio (${best.sharpe.toFixed(2)}) — best risk-adjusted returns`
    },
    allocations,
    diversification: {
      score: diversificationScore,
      avgCorrelation: parseFloat((avgCorrelation * 100).toFixed(1)),
      effectiveStocks,
      label: diversificationScore > 70 ? 'Well Diversified' :
             diversificationScore > 50 ? 'Moderately Diversified' :
             diversificationScore > 30 ? 'Low Diversification' : 'Highly Concentrated',
      warning: effectiveStocks < n * 0.6
        ? `${n} stocks behave like only ${effectiveStocks} — high correlation`
        : null
    },
    growthPattern: pattern,
    yearlyPerformance: yearlyPerf,
    currentPrices
  };
}

module.exports = { analyzePortfolio };
