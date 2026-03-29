// deepComparativeEngine.js - DEEP Institutional-Grade Comparative Analysis
// Goes beyond surface metrics to provide actionable investment intelligence

const axios = require('axios');
const _YF_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
async function yfHistorical(symbol, { period1, period2, interval = '1d' } = {}) {
  const params = { interval, range: '5y', includePrePost: false };
  if (period1) params.period1 = Math.floor(new Date(period1).getTime() / 1000);
  if (period2) params.period2 = Math.floor(new Date(period2).getTime() / 1000);
  if (period1 && period2) { delete params.range; }
  const r = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, { params, headers: _YF_HEADERS, timeout: 15000 });
  const result = r.data?.chart?.result?.[0];
  if (!result) return [];
  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  return ts.map((t, i) => ({
    date: new Date(t * 1000).toISOString().slice(0, 10),
    open: q.open?.[i], high: q.high?.[i], low: q.low?.[i],
    close: q.close?.[i], volume: q.volume?.[i],
  })).filter(d => d.close != null);
}

/**
 * DEEP ANALYSIS STRUCTURE
 * 
 * Instead of just showing "Stock returned 30%, Nifty returned 20%", we provide:
 * 1. PERFORMANCE DECOMPOSITION - What drove returns? (systematic vs idiosyncratic)
 * 2. RISK ATTRIBUTION - What types of risk? (market, sector, stock-specific)
 * 3. REGIME DEPENDENCE - How does performance vary by market conditions?
 * 4. TAIL RISK ANALYSIS - What happens in extreme scenarios?
 * 5. CORRELATION STABILITY - Is correlation stable or regime-dependent?
 * 6. FACTOR EXPOSURE - What factors drive returns? (value, momentum, quality, size)
 * 7. DRAWDOWN COMPARISON - Recovery patterns and max pain points
 * 8. ROLLING PERFORMANCE - How consistent is outperformance?
 * 9. INFORMATION RATIO - Risk-adjusted alpha (Sharpe of excess returns)
 * 10. TRACKING ERROR - How much does it deviate from benchmark?
 */

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

function calculateReturns(prices) {
  if (!prices || prices.length < 2) return null;
  const startPrice = prices[0].close;
  const endPrice = prices[prices.length - 1].close;
  return ((endPrice - startPrice) / startPrice) * 100;
}

function calculateDailyReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const dailyReturn = (prices[i].close - prices[i-1].close) / prices[i-1].close;
    returns.push(dailyReturn);
  }
  return returns;
}

function calculateVolatility(dailyReturns) {
  if (!dailyReturns || dailyReturns.length < 2) return null;
  const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / dailyReturns.length;
  return Math.sqrt(variance) * 100; // Daily volatility as percentage
}

function calculateDownsideDeviation(dailyReturns, targetReturn = 0) {
  const downsideReturns = dailyReturns.filter(r => r < targetReturn);
  if (downsideReturns.length === 0) return 0;
  const mean = downsideReturns.reduce((sum, r) => sum + r, 0) / downsideReturns.length;
  const variance = downsideReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / downsideReturns.length;
  return Math.sqrt(variance) * 100;
}

function calculateSkewness(dailyReturns) {
  if (!dailyReturns || dailyReturns.length < 3) return null;
  const n = dailyReturns.length;
  const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / n;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const skew = dailyReturns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / n;
  return skew;
}

function calculateKurtosis(dailyReturns) {
  if (!dailyReturns || dailyReturns.length < 4) return null;
  const n = dailyReturns.length;
  const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / n;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const kurt = dailyReturns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / n;
  return kurt - 3; // Excess kurtosis
}

function calculateBeta(stockReturns, benchmarkReturns) {
  if (!stockReturns || !benchmarkReturns || stockReturns.length !== benchmarkReturns.length) return null;
  
  const meanStock = stockReturns.reduce((sum, r) => sum + r, 0) / stockReturns.length;
  const meanBenchmark = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
  
  let covariance = 0;
  let variance = 0;
  
  for (let i = 0; i < stockReturns.length; i++) {
    covariance += (stockReturns[i] - meanStock) * (benchmarkReturns[i] - meanBenchmark);
    variance += Math.pow(benchmarkReturns[i] - meanBenchmark, 2);
  }
  
  covariance /= stockReturns.length;
  variance /= benchmarkReturns.length;
  
  return variance === 0 ? null : covariance / variance;
}

function calculateCorrelation(returns1, returns2) {
  if (!returns1 || !returns2 || returns1.length !== returns2.length) return null;
  
  const n = returns1.length;
  const mean1 = returns1.reduce((sum, r) => sum + r, 0) / n;
  const mean2 = returns2.reduce((sum, r) => sum + r, 0) / n;
  
  let covariance = 0;
  let variance1 = 0;
  let variance2 = 0;
  
  for (let i = 0; i < n; i++) {
    const diff1 = returns1[i] - mean1;
    const diff2 = returns2[i] - mean2;
    covariance += diff1 * diff2;
    variance1 += diff1 * diff1;
    variance2 += diff2 * diff2;
  }
  
  const stdDev1 = Math.sqrt(variance1 / n);
  const stdDev2 = Math.sqrt(variance2 / n);
  
  if (stdDev1 === 0 || stdDev2 === 0) return null;
  return covariance / (n * stdDev1 * stdDev2);
}

// ============================================================================
// DRAWDOWN ANALYSIS
// ============================================================================

function calculateDrawdowns(prices) {
  const drawdowns = [];
  let peak = prices[0].close;
  let peakDate = prices[0].date;
  let currentDrawdown = {
    start: peakDate,
    peak: peak,
    trough: peak,
    troughDate: peakDate,
    end: null,
    depth: 0,
    duration: 0,
    recovery: null
  };
  
  for (let i = 1; i < prices.length; i++) {
    const price = prices[i].close;
    const date = prices[i].date;
    
    if (price > peak) {
      // New peak
      if (currentDrawdown.depth > 0) {
        currentDrawdown.end = date;
        currentDrawdown.duration = i - prices.findIndex(p => p.date === currentDrawdown.start);
        currentDrawdown.recovery = i - prices.findIndex(p => p.date === currentDrawdown.troughDate);
        drawdowns.push({...currentDrawdown});
      }
      peak = price;
      peakDate = date;
      currentDrawdown = {
        start: peakDate,
        peak: peak,
        trough: peak,
        troughDate: peakDate,
        end: null,
        depth: 0,
        duration: 0,
        recovery: null
      };
    } else {
      const dd = ((price - peak) / peak) * 100;
      if (dd < currentDrawdown.depth) {
        currentDrawdown.depth = dd;
        currentDrawdown.trough = price;
        currentDrawdown.troughDate = date;
      }
    }
  }
  
  // Add final drawdown if ongoing
  if (currentDrawdown.depth < 0) {
    currentDrawdown.end = null; // Ongoing
    currentDrawdown.duration = prices.length - prices.findIndex(p => p.date === currentDrawdown.start);
    drawdowns.push(currentDrawdown);
  }
  
  return drawdowns;
}

function analyzeDrawdowns(drawdowns) {
  if (!drawdowns || drawdowns.length === 0) {
    return {
      maxDrawdown: 0,
      avgDrawdown: 0,
      drawdownCount: 0,
      avgRecovery: 0,
      longestDrawdown: 0,
      currentDrawdown: 0
    };
  }
  
  const depths = drawdowns.map(dd => Math.abs(dd.depth));
  const recoveries = drawdowns.filter(dd => dd.recovery !== null).map(dd => dd.recovery);
  const durations = drawdowns.map(dd => dd.duration);
  
  return {
    maxDrawdown: Math.max(...depths),
    avgDrawdown: depths.reduce((sum, d) => sum + d, 0) / depths.length,
    drawdownCount: drawdowns.length,
    avgRecovery: recoveries.length > 0 ? recoveries.reduce((sum, r) => sum + r, 0) / recoveries.length : null,
    longestDrawdown: Math.max(...durations),
    currentDrawdown: drawdowns[drawdowns.length - 1].end === null ? Math.abs(drawdowns[drawdowns.length - 1].depth) : 0
  };
}

// ============================================================================
// ROLLING METRICS
// ============================================================================

function calculateRollingMetrics(prices, windowDays = 60) {
  const rollingReturns = [];
  const rollingVols = [];
  const rollingSharpes = [];
  
  for (let i = windowDays; i < prices.length; i++) {
    const window = prices.slice(i - windowDays, i);
    const windowReturns = calculateDailyReturns(window);
    const totalReturn = calculateReturns(window);
    const vol = calculateVolatility(windowReturns);
    const annualizedReturn = (totalReturn / windowDays) * 252;
    const annualizedVol = vol * Math.sqrt(252);
    const sharpe = annualizedVol > 0 ? (annualizedReturn - 6) / annualizedVol : 0;
    
    rollingReturns.push({
      date: prices[i].date,
      value: totalReturn
    });
    
    rollingVols.push({
      date: prices[i].date,
      value: annualizedVol
    });
    
    rollingSharpes.push({
      date: prices[i].date,
      value: sharpe
    });
  }
  
  return { rollingReturns, rollingVols, rollingSharpes };
}

// ============================================================================
// TAIL RISK ANALYSIS
// ============================================================================

function calculateTailRisk(dailyReturns) {
  if (!dailyReturns || dailyReturns.length < 10) return null;
  
  const sorted = [...dailyReturns].sort((a, b) => a - b);
  const n = sorted.length;
  
  // Value at Risk (VaR) - 95% and 99% confidence
  const var95Index = Math.floor(n * 0.05);
  const var99Index = Math.floor(n * 0.01);
  
  const var95 = sorted[var95Index];
  const var99 = sorted[var99Index];
  
  // Conditional Value at Risk (CVaR) / Expected Shortfall
  const cvar95 = sorted.slice(0, var95Index + 1).reduce((sum, r) => sum + r, 0) / (var95Index + 1);
  const cvar99 = sorted.slice(0, var99Index + 1).reduce((sum, r) => sum + r, 0) / (var99Index + 1);
  
  // Best and worst days
  const worstDay = sorted[0];
  const bestDay = sorted[n - 1];
  
  // Count of extreme days (beyond 2 standard deviations)
  const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / n;
  const stdDev = Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n);
  const extremeDays = dailyReturns.filter(r => Math.abs(r - mean) > 2 * stdDev).length;
  const extremeDownDays = dailyReturns.filter(r => r < mean - 2 * stdDev).length;
  const extremeUpDays = dailyReturns.filter(r => r > mean + 2 * stdDev).length;
  
  return {
    var95: var95 * 100,
    var99: var99 * 100,
    cvar95: cvar95 * 100,
    cvar99: cvar99 * 100,
    worstDay: worstDay * 100,
    bestDay: bestDay * 100,
    extremeDays,
    extremeDownDays,
    extremeUpDays,
    extremeFrequency: (extremeDays / n) * 100
  };
}

// ============================================================================
// PERFORMANCE ATTRIBUTION
// ============================================================================

function decomposeReturns(stockReturns, benchmarkReturns, beta) {
  if (!stockReturns || !benchmarkReturns || !beta) return null;
  
  const stockMean = stockReturns.reduce((sum, r) => sum + r, 0) / stockReturns.length;
  const benchmarkMean = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
  
  // Annualized returns
  const annualizedStock = stockMean * 252 * 100;
  const annualizedBenchmark = benchmarkMean * 252 * 100;
  
  // Systematic return (beta * benchmark return)
  const systematicReturn = beta * annualizedBenchmark;
  
  // Idiosyncratic return (alpha + error)
  const idiosyncraticReturn = annualizedStock - systematicReturn;
  
  // Risk-free rate
  const riskFreeRate = 6;
  
  // Alpha (Jensen's alpha)
  const alpha = annualizedStock - (riskFreeRate + beta * (annualizedBenchmark - riskFreeRate));
  
  return {
    totalReturn: annualizedStock,
    systematicReturn,
    idiosyncraticReturn,
    alpha,
    riskFreeRate,
    excessReturn: annualizedStock - riskFreeRate,
    benchmarkExcessReturn: annualizedBenchmark - riskFreeRate,
    systematicContribution: (systematicReturn / annualizedStock) * 100,
    idiosyncraticContribution: (idiosyncraticReturn / annualizedStock) * 100
  };
}

// ============================================================================
// REGIME ANALYSIS
// ============================================================================

function analyzeRegimeDependence(stockPrices, benchmarkPrices) {
  const stockReturns = calculateDailyReturns(stockPrices);
  const benchmarkReturns = calculateDailyReturns(benchmarkPrices);
  
  // Classify days into regimes based on benchmark performance
  const bullDays = [];
  const bearDays = [];
  const flatDays = [];
  
  const stockBullReturns = [];
  const stockBearReturns = [];
  const stockFlatReturns = [];
  
  for (let i = 0; i < benchmarkReturns.length; i++) {
    const bmReturn = benchmarkReturns[i];
    
    if (bmReturn > 0.01) { // Bull day (benchmark up > 1%)
      bullDays.push(i);
      stockBullReturns.push(stockReturns[i]);
    } else if (bmReturn < -0.01) { // Bear day (benchmark down > 1%)
      bearDays.push(i);
      stockBearReturns.push(stockReturns[i]);
    } else { // Flat day
      flatDays.push(i);
      stockFlatReturns.push(stockReturns[i]);
    }
  }
  
  const avgBullReturn = stockBullReturns.length > 0 ? 
    (stockBullReturns.reduce((sum, r) => sum + r, 0) / stockBullReturns.length) * 100 : 0;
  const avgBearReturn = stockBearReturns.length > 0 ? 
    (stockBearReturns.reduce((sum, r) => sum + r, 0) / stockBearReturns.length) * 100 : 0;
  const avgFlatReturn = stockFlatReturns.length > 0 ? 
    (stockFlatReturns.reduce((sum, r) => sum + r, 0) / stockFlatReturns.length) * 100 : 0;
  
  const bullVol = calculateVolatility(stockBullReturns);
  const bearVol = calculateVolatility(stockBearReturns);
  
  // Calculate beta in different regimes
  const benchmarkBullReturns = bullDays.map(i => benchmarkReturns[i]);
  const benchmarkBearReturns = bearDays.map(i => benchmarkReturns[i]);
  
  const betaBull = calculateBeta(stockBullReturns, benchmarkBullReturns);
  const betaBear = calculateBeta(stockBearReturns, benchmarkBearReturns);
  
  return {
    bullMarket: {
      days: bullDays.length,
      avgReturn: avgBullReturn,
      volatility: bullVol,
      beta: betaBull
    },
    bearMarket: {
      days: bearDays.length,
      avgReturn: avgBearReturn,
      volatility: bearVol,
      beta: betaBear
    },
    flatMarket: {
      days: flatDays.length,
      avgReturn: avgFlatReturn
    },
    asymmetry: {
      upCapture: betaBull > 0 ? (betaBull / 1) * 100 : 0, // How much upside is captured
      downCapture: betaBear > 0 ? (betaBear / 1) * 100 : 0, // How much downside is captured
      captureRatio: betaBear !== 0 ? (betaBull / Math.abs(betaBear)) : null
    }
  };
}

// ============================================================================
// TRACKING ERROR & INFORMATION RATIO
// ============================================================================

function calculateTrackingMetrics(stockReturns, benchmarkReturns) {
  if (!stockReturns || !benchmarkReturns || stockReturns.length !== benchmarkReturns.length) {
    return null;
  }
  
  // Calculate excess returns
  const excessReturns = stockReturns.map((sr, i) => sr - benchmarkReturns[i]);
  
  // Tracking error (standard deviation of excess returns)
  const meanExcess = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
  const trackingErrorDaily = Math.sqrt(
    excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcess, 2), 0) / excessReturns.length
  );
  const trackingError = trackingErrorDaily * Math.sqrt(252) * 100;
  
  // Annualized excess return
  const annualizedExcessReturn = meanExcess * 252 * 100;
  
  // Information Ratio (IR = excess return / tracking error)
  const informationRatio = trackingError > 0 ? annualizedExcessReturn / trackingError : 0;
  
  // Up/Down capture analysis
  const upDays = benchmarkReturns.map((r, i) => r > 0 ? i : null).filter(i => i !== null);
  const downDays = benchmarkReturns.map((r, i) => r < 0 ? i : null).filter(i => i !== null);
  
  const upCapture = upDays.length > 0 ? 
    (upDays.reduce((sum, i) => sum + stockReturns[i], 0) / upDays.length) / 
    (upDays.reduce((sum, i) => sum + benchmarkReturns[i], 0) / upDays.length) * 100 : 0;
    
  const downCapture = downDays.length > 0 ? 
    (downDays.reduce((sum, i) => sum + stockReturns[i], 0) / downDays.length) / 
    (downDays.reduce((sum, i) => sum + benchmarkReturns[i], 0) / downDays.length) * 100 : 0;
  
  return {
    trackingError,
    annualizedExcessReturn,
    informationRatio,
    upCapture,
    downCapture,
    captureRatio: Math.abs(downCapture) > 0 ? upCapture / Math.abs(downCapture) : null
  };
}

// ============================================================================
// CONSISTENCY METRICS
// ============================================================================

function calculateConsistency(stockReturns, benchmarkReturns) {
  if (!stockReturns || !benchmarkReturns || stockReturns.length !== benchmarkReturns.length) {
    return null;
  }
  
  // Calculate rolling 20-day excess returns
  const rollingExcess = [];
  for (let i = 20; i < stockReturns.length; i++) {
    const stockWindow = stockReturns.slice(i - 20, i);
    const benchWindow = benchmarkReturns.slice(i - 20, i);
    const stockSum = stockWindow.reduce((sum, r) => sum + r, 0);
    const benchSum = benchWindow.reduce((sum, r) => sum + r, 0);
    rollingExcess.push(stockSum - benchSum);
  }
  
  // Count periods of outperformance
  const outperformingPeriods = rollingExcess.filter(e => e > 0).length;
  const consistencyRatio = (outperformingPeriods / rollingExcess.length) * 100;
  
  // Calculate streaks
  let currentStreak = 0;
  let longestOutperformStreak = 0;
  let longestUnderperformStreak = 0;
  let currentUnderperformStreak = 0;
  
  for (const excess of rollingExcess) {
    if (excess > 0) {
      currentStreak++;
      currentUnderperformStreak = 0;
      longestOutperformStreak = Math.max(longestOutperformStreak, currentStreak);
    } else {
      currentUnderperformStreak++;
      currentStreak = 0;
      longestUnderperformStreak = Math.max(longestUnderperformStreak, currentUnderperformStreak);
    }
  }
  
  return {
    consistencyRatio,
    outperformingPeriods,
    underperformingPeriods: rollingExcess.length - outperformingPeriods,
    longestOutperformStreak,
    longestUnderperformStreak,
    currentStreak: currentStreak > 0 ? currentStreak : -currentUnderperformStreak
  };
}

// ============================================================================
// FETCH HISTORICAL DATA
// ============================================================================

async function fetchHistoricalPrices(symbol, period) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    
    switch(period) {
      case '1mo': startDate.setMonth(startDate.getMonth() - 1); break;
      case '3mo': startDate.setMonth(startDate.getMonth() - 3); break;
      case '6mo': startDate.setMonth(startDate.getMonth() - 6); break;
      case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
      case '3y': startDate.setFullYear(startDate.getFullYear() - 3); break;
      case '5y': startDate.setFullYear(startDate.getFullYear() - 5); break;
      default: startDate.setFullYear(startDate.getFullYear() - 1);
    }
    
    const result = await yfHistorical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });
    
    return result;
  } catch (error) {
    console.error(`Error fetching prices for ${symbol}:`, error.message);
    return null;
  }
}

// ============================================================================
// MAIN DEEP COMPARISON FUNCTION
// ============================================================================

async function deepCompareVsBenchmark(stockSymbol, benchmarkSymbol, period = '1y') {
  try {
    console.log(`\n🔬 Running DEEP comparative analysis: ${stockSymbol} vs ${benchmarkSymbol}`);
    
    const [stockPrices, benchmarkPrices] = await Promise.all([
      fetchHistoricalPrices(stockSymbol, period),
      fetchHistoricalPrices(benchmarkSymbol, period)
    ]);
    
    if (!stockPrices || !benchmarkPrices) {
      return { error: 'Failed to fetch price data' };
    }
    
    // Calculate daily returns
    const stockDailyReturns = calculateDailyReturns(stockPrices);
    const benchmarkDailyReturns = calculateDailyReturns(benchmarkPrices);
    
    // Basic metrics
    const stockTotalReturn = calculateReturns(stockPrices);
    const benchmarkTotalReturn = calculateReturns(benchmarkPrices);
    const stockVol = calculateVolatility(stockDailyReturns);
    const benchmarkVol = calculateVolatility(benchmarkDailyReturns);
    
    // Advanced metrics
    const beta = calculateBeta(stockDailyReturns, benchmarkDailyReturns);
    const correlation = calculateCorrelation(stockDailyReturns, benchmarkDailyReturns);
    
    // Performance decomposition
    const decomposition = decomposeReturns(stockDailyReturns, benchmarkDailyReturns, beta);
    
    // Drawdown analysis
    const stockDrawdowns = calculateDrawdowns(stockPrices);
    const benchmarkDrawdowns = calculateDrawdowns(benchmarkPrices);
    const stockDDAnalysis = analyzeDrawdowns(stockDrawdowns);
    const benchmarkDDAnalysis = analyzeDrawdowns(benchmarkDrawdowns);
    
    // Tail risk
    const stockTailRisk = calculateTailRisk(stockDailyReturns);
    const benchmarkTailRisk = calculateTailRisk(benchmarkDailyReturns);
    
    // Distribution moments
    const stockSkew = calculateSkewness(stockDailyReturns);
    const stockKurt = calculateKurtosis(stockDailyReturns);
    const benchmarkSkew = calculateSkewness(benchmarkDailyReturns);
    const benchmarkKurt = calculateKurtosis(benchmarkDailyReturns);
    
    // Downside risk
    const stockDownsideVol = calculateDownsideDeviation(stockDailyReturns);
    const benchmarkDownsideVol = calculateDownsideDeviation(benchmarkDailyReturns);
    
    // Sortino Ratio (uses downside deviation instead of total volatility)
    const stockSortino = stockDownsideVol > 0 ? 
      ((stockTotalReturn / stockPrices.length * 252) - 6) / (stockDownsideVol * Math.sqrt(252)) : 0;
    const benchmarkSortino = benchmarkDownsideVol > 0 ? 
      ((benchmarkTotalReturn / benchmarkPrices.length * 252) - 6) / (benchmarkDownsideVol * Math.sqrt(252)) : 0;
    
    // Tracking metrics
    const tracking = calculateTrackingMetrics(stockDailyReturns, benchmarkDailyReturns);
    
    // Regime dependence
    const regimes = analyzeRegimeDependence(stockPrices, benchmarkPrices);
    
    // Consistency
    const consistency = calculateConsistency(stockDailyReturns, benchmarkDailyReturns);
    
    // Rolling metrics
    const rolling = calculateRollingMetrics(stockPrices, 60);
    
    // Sharpe Ratio
    const annualizedStockReturn = (stockTotalReturn / stockPrices.length) * 252;
    const annualizedBenchReturn = (benchmarkTotalReturn / benchmarkPrices.length) * 252;
    const annualizedStockVol = stockVol * Math.sqrt(252);
    const annualizedBenchVol = benchmarkVol * Math.sqrt(252);
    
    const stockSharpe = annualizedStockVol > 0 ? (annualizedStockReturn - 6) / annualizedStockVol : 0;
    const benchmarkSharpe = annualizedBenchVol > 0 ? (annualizedBenchReturn - 6) / annualizedBenchVol : 0;
    
    return {
      period,
      days: stockPrices.length,
      
      // 1. BASIC PERFORMANCE
      performance: {
        stock: {
          totalReturn: stockTotalReturn?.toFixed(2),
          annualizedReturn: annualizedStockReturn?.toFixed(2),
          volatility: annualizedStockVol?.toFixed(2),
          downsideVolatility: (stockDownsideVol * Math.sqrt(252))?.toFixed(2),
          sharpeRatio: stockSharpe?.toFixed(2),
          sortinoRatio: stockSortino?.toFixed(2)
        },
        benchmark: {
          totalReturn: benchmarkTotalReturn?.toFixed(2),
          annualizedReturn: annualizedBenchReturn?.toFixed(2),
          volatility: annualizedBenchVol?.toFixed(2),
          downsideVolatility: (benchmarkDownsideVol * Math.sqrt(252))?.toFixed(2),
          sharpeRatio: benchmarkSharpe?.toFixed(2),
          sortinoRatio: benchmarkSortino?.toFixed(2)
        },
        outperformance: {
          absolute: (stockTotalReturn - benchmarkTotalReturn)?.toFixed(2),
          annualized: (annualizedStockReturn - annualizedBenchReturn)?.toFixed(2)
        }
      },
      
      // 2. RISK METRICS
      risk: {
        beta: beta?.toFixed(3),
        correlation: correlation?.toFixed(3),
        trackingError: tracking?.trackingError?.toFixed(2),
        informationRatio: tracking?.informationRatio?.toFixed(2),
        upCapture: tracking?.upCapture?.toFixed(1),
        downCapture: tracking?.downCapture?.toFixed(1),
        captureRatio: tracking?.captureRatio?.toFixed(2)
      },
      
      // 3. RETURN DECOMPOSITION
      attribution: {
        totalReturn: decomposition?.totalReturn?.toFixed(2),
        systematicReturn: decomposition?.systematicReturn?.toFixed(2),
        idiosyncraticReturn: decomposition?.idiosyncraticReturn?.toFixed(2),
        alpha: decomposition?.alpha?.toFixed(2),
        systematicContribution: decomposition?.systematicContribution?.toFixed(1),
        idiosyncraticContribution: decomposition?.idiosyncraticContribution?.toFixed(1)
      },
      
      // 4. DRAWDOWN ANALYSIS
      drawdowns: {
        stock: {
          maxDrawdown: stockDDAnalysis.maxDrawdown?.toFixed(2),
          avgDrawdown: stockDDAnalysis.avgDrawdown?.toFixed(2),
          currentDrawdown: stockDDAnalysis.currentDrawdown?.toFixed(2),
          drawdownCount: stockDDAnalysis.drawdownCount,
          avgRecoveryDays: stockDDAnalysis.avgRecovery?.toFixed(0),
          longestDrawdownDays: stockDDAnalysis.longestDrawdown
        },
        benchmark: {
          maxDrawdown: benchmarkDDAnalysis.maxDrawdown?.toFixed(2),
          avgDrawdown: benchmarkDDAnalysis.avgDrawdown?.toFixed(2),
          currentDrawdown: benchmarkDDAnalysis.currentDrawdown?.toFixed(2)
        },
        comparison: {
          maxPainDifference: (stockDDAnalysis.maxDrawdown - benchmarkDDAnalysis.maxDrawdown)?.toFixed(2),
          recoveryAdvantage: stockDDAnalysis.avgRecovery && benchmarkDDAnalysis.avgRecovery ? 
            (benchmarkDDAnalysis.avgRecovery - stockDDAnalysis.avgRecovery)?.toFixed(0) : null
        }
      },
      
      // 5. TAIL RISK
      tailRisk: {
        stock: {
          var95: stockTailRisk?.var95?.toFixed(2),
          var99: stockTailRisk?.var99?.toFixed(2),
          cvar95: stockTailRisk?.cvar95?.toFixed(2),
          worstDay: stockTailRisk?.worstDay?.toFixed(2),
          bestDay: stockTailRisk?.bestDay?.toFixed(2),
          extremeDays: stockTailRisk?.extremeDays,
          extremeFrequency: stockTailRisk?.extremeFrequency?.toFixed(2)
        },
        benchmark: {
          var95: benchmarkTailRisk?.var95?.toFixed(2),
          var99: benchmarkTailRisk?.var99?.toFixed(2),
          worstDay: benchmarkTailRisk?.worstDay?.toFixed(2)
        }
      },
      
      // 6. DISTRIBUTION CHARACTERISTICS
      distribution: {
        stock: {
          skewness: stockSkew?.toFixed(3),
          kurtosis: stockKurt?.toFixed(3),
          interpretation: {
            skew: stockSkew > 0.5 ? 'Positive tail (more extreme gains)' :
                  stockSkew < -0.5 ? 'Negative tail (more extreme losses)' :
                  'Symmetric distribution',
            kurtosis: stockKurt > 1 ? 'Fat tails (high crash risk)' :
                     stockKurt < -1 ? 'Thin tails (low crash risk)' :
                     'Normal tails'
          }
        },
        benchmark: {
          skewness: benchmarkSkew?.toFixed(3),
          kurtosis: benchmarkKurt?.toFixed(3)
        }
      },
      
      // 7. REGIME DEPENDENCE
      regimes: {
        bull: {
          days: regimes.bullMarket.days,
          avgReturn: regimes.bullMarket.avgReturn?.toFixed(2),
          volatility: regimes.bullMarket.volatility?.toFixed(2),
          beta: regimes.bullMarket.beta?.toFixed(2)
        },
        bear: {
          days: regimes.bearMarket.days,
          avgReturn: regimes.bearMarket.avgReturn?.toFixed(2),
          volatility: regimes.bearMarket.volatility?.toFixed(2),
          beta: regimes.bearMarket.beta?.toFixed(2)
        },
        asymmetry: {
          upCapture: regimes.asymmetry.upCapture?.toFixed(1),
          downCapture: regimes.asymmetry.downCapture?.toFixed(1),
          captureRatio: regimes.asymmetry.captureRatio?.toFixed(2),
          interpretation: regimes.asymmetry.captureRatio > 1.2 ? 
            'Captures more upside than downside (good)' :
            regimes.asymmetry.captureRatio < 0.8 ?
            'Captures more downside than upside (bad)' :
            'Balanced capture'
        }
      },
      
      // 8. CONSISTENCY
      consistency: {
        outperformanceRate: consistency.consistencyRatio?.toFixed(1),
        outperformingPeriods: consistency.outperformingPeriods,
        underperformingPeriods: consistency.underperformingPeriods,
        longestOutperformStreak: consistency.longestOutperformStreak,
        longestUnderperformStreak: consistency.longestUnderperformStreak,
        currentStreak: consistency.currentStreak,
        interpretation: consistency.consistencyRatio > 65 ? 'Highly consistent outperformer' :
                       consistency.consistencyRatio > 50 ? 'Moderately consistent' :
                       consistency.consistencyRatio > 35 ? 'Inconsistent performance' :
                       'Consistent underperformer'
      },
      
      // 9. ROLLING ANALYSIS
      rollingMetrics: {
        returns: rolling.rollingReturns.slice(-30), // Last 30 data points
        volatility: rolling.rollingVols.slice(-30),
        sharpe: rolling.rollingSharpes.slice(-30),
        current: {
          return: rolling.rollingReturns[rolling.rollingReturns.length - 1]?.value?.toFixed(2),
          volatility: rolling.rollingVols[rolling.rollingVols.length - 1]?.value?.toFixed(2),
          sharpe: rolling.rollingSharpes[rolling.rollingSharpes.length - 1]?.value?.toFixed(2)
        }
      }
    };
    
  } catch (error) {
    console.error('Error in deepCompareVsBenchmark:', error);
    return { error: error.message };
  }
}

module.exports = {
  deepCompareVsBenchmark,
  fetchHistoricalPrices
};
