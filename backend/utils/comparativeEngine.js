// comparativeEngine.js - Month 10: Comparative Intelligence
// Features: Stock vs Nifty50, Stock vs Sector, Peer Relative Strength, Risk-Adjusted Outperformance

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
 * Calculate returns over a period
 */
function calculateReturns(prices) {
  if (!prices || prices.length < 2) return null;
  
  const startPrice = prices[0].close;
  const endPrice = prices[prices.length - 1].close;
  
  return ((endPrice - startPrice) / startPrice) * 100;
}

/**
 * Calculate volatility (standard deviation of returns)
 */
function calculateVolatility(prices) {
  if (!prices || prices.length < 2) return null;
  
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const dailyReturn = ((prices[i].close - prices[i-1].close) / prices[i-1].close) * 100;
    returns.push(dailyReturn);
  }
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate Sharpe Ratio (risk-adjusted returns)
 * Assumes risk-free rate of 6% annually (Indian govt bonds)
 */
function calculateSharpeRatio(returns, volatility, days) {
  if (!returns || !volatility || volatility === 0) return null;
  
  const riskFreeRate = 6; // 6% annual risk-free rate
  const annualizedReturn = (returns / days) * 252; // 252 trading days
  const annualizedVolatility = volatility * Math.sqrt(252);
  
  return (annualizedReturn - riskFreeRate) / annualizedVolatility;
}

/**
 * Calculate Beta (correlation with benchmark)
 */
function calculateBeta(stockPrices, benchmarkPrices) {
  if (!stockPrices || !benchmarkPrices || stockPrices.length < 2) return null;
  
  const stockReturns = [];
  const benchmarkReturns = [];
  
  const minLength = Math.min(stockPrices.length, benchmarkPrices.length);
  
  for (let i = 1; i < minLength; i++) {
    const stockReturn = ((stockPrices[i].close - stockPrices[i-1].close) / stockPrices[i-1].close);
    const benchmarkReturn = ((benchmarkPrices[i].close - benchmarkPrices[i-1].close) / benchmarkPrices[i-1].close);
    
    stockReturns.push(stockReturn);
    benchmarkReturns.push(benchmarkReturn);
  }
  
  // Calculate covariance and variance
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

/**
 * Calculate Alpha (excess returns over benchmark)
 */
function calculateAlpha(stockReturn, benchmarkReturn, beta, days) {
  if (stockReturn === null || benchmarkReturn === null || beta === null) return null;
  
  const annualizedStockReturn = (stockReturn / days) * 252;
  const annualizedBenchmarkReturn = (benchmarkReturn / days) * 252;
  const riskFreeRate = 6;
  
  // Alpha = Stock Return - [Risk-free rate + Beta × (Benchmark Return - Risk-free rate)]
  return annualizedStockReturn - (riskFreeRate + beta * (annualizedBenchmarkReturn - riskFreeRate));
}

/**
 * Fetch historical prices for a symbol
 */
async function fetchHistoricalPrices(symbol, period) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    
    // Set start date based on period
    switch(period) {
      case '1mo':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3mo':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6mo':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case '3y':
        startDate.setFullYear(startDate.getFullYear() - 3);
        break;
      case '5y':
        startDate.setFullYear(startDate.getFullYear() - 5);
        break;
      default:
        startDate.setFullYear(startDate.getFullYear() - 1);
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

/**
 * Get sector benchmark symbol based on stock's sector
 */
function getSectorBenchmark(sector) {
  const sectorMap = {
    'Technology': '^CNXIT', // Nifty IT
    'Banking': '^NSEBANK', // Bank Nifty
    'Financial Services': '^NSEBANK',
    'Automobile': '^CNXAUTO', // Nifty Auto
    'Pharmaceutical': '^CNXPHARMA', // Nifty Pharma
    'FMCG': '^CNXFMCG', // Nifty FMCG
    'Energy': '^CNXENERGY', // Nifty Energy
    'Metals': '^CNXMETAL', // Nifty Metal
    'Media': '^CNXMEDIA', // Nifty Media
    'Realty': '^CNXREALTY', // Nifty Realty
    'Infrastructure': '^CNXINFRA', // Nifty Infrastructure
  };
  
  return sectorMap[sector] || '^NSEI'; // Default to Nifty50
}

/**
 * Compare stock vs Nifty50
 */
async function compareVsNifty50(symbol, period = '1y') {
  try {
    const [stockPrices, niftyPrices] = await Promise.all([
      fetchHistoricalPrices(symbol, period),
      fetchHistoricalPrices('^NSEI', period)
    ]);
    
    if (!stockPrices || !niftyPrices) {
      return { error: 'Failed to fetch price data' };
    }
    
    const days = stockPrices.length;
    
    // Calculate metrics
    const stockReturns = calculateReturns(stockPrices);
    const niftyReturns = calculateReturns(niftyPrices);
    const stockVolatility = calculateVolatility(stockPrices);
    const niftyVolatility = calculateVolatility(niftyPrices);
    const beta = calculateBeta(stockPrices, niftyPrices);
    const alpha = calculateAlpha(stockReturns, niftyReturns, beta, days);
    const stockSharpe = calculateSharpeRatio(stockReturns, stockVolatility, days);
    const niftySharpe = calculateSharpeRatio(niftyReturns, niftyVolatility, days);
    
    // Calculate outperformance
    const absoluteOutperformance = stockReturns - niftyReturns;
    const relativeOutperformance = ((1 + stockReturns/100) / (1 + niftyReturns/100) - 1) * 100;
    
    // Determine correlation strength
    let correlation = 'Moderate';
    if (beta > 1.2) correlation = 'High';
    else if (beta < 0.8) correlation = 'Low';
    
    // Determine risk level
    let riskLevel = 'Moderate';
    if (stockVolatility > niftyVolatility * 1.5) riskLevel = 'High';
    else if (stockVolatility < niftyVolatility * 0.7) riskLevel = 'Low';
    
    return {
      period,
      days,
      stock: {
        returns: stockReturns?.toFixed(2),
        volatility: stockVolatility?.toFixed(2),
        sharpeRatio: stockSharpe?.toFixed(2),
        beta: beta?.toFixed(2),
        alpha: alpha?.toFixed(2)
      },
      nifty50: {
        returns: niftyReturns?.toFixed(2),
        volatility: niftyVolatility?.toFixed(2),
        sharpeRatio: niftySharpe?.toFixed(2)
      },
      comparison: {
        absoluteOutperformance: absoluteOutperformance?.toFixed(2),
        relativeOutperformance: relativeOutperformance?.toFixed(2),
        correlation,
        riskLevel,
        betterSharpe: stockSharpe > niftySharpe ? 'Stock' : 'Nifty50',
        verdict: absoluteOutperformance > 0 ? 'Outperforming' : 'Underperforming'
      }
    };
  } catch (error) {
    console.error('Error in compareVsNifty50:', error);
    return { error: error.message };
  }
}

/**
 * Compare stock vs sector benchmark
 */
async function compareVsSector(symbol, sector, period = '1y') {
  try {
    const sectorSymbol = getSectorBenchmark(sector);
    
    const [stockPrices, sectorPrices] = await Promise.all([
      fetchHistoricalPrices(symbol, period),
      fetchHistoricalPrices(sectorSymbol, period)
    ]);
    
    if (!stockPrices || !sectorPrices) {
      return { error: 'Failed to fetch price data' };
    }
    
    const days = stockPrices.length;
    
    // Calculate metrics
    const stockReturns = calculateReturns(stockPrices);
    const sectorReturns = calculateReturns(sectorPrices);
    const stockVolatility = calculateVolatility(stockPrices);
    const sectorVolatility = calculateVolatility(sectorPrices);
    const beta = calculateBeta(stockPrices, sectorPrices);
    const alpha = calculateAlpha(stockReturns, sectorReturns, beta, days);
    const stockSharpe = calculateSharpeRatio(stockReturns, stockVolatility, days);
    const sectorSharpe = calculateSharpeRatio(sectorReturns, sectorVolatility, days);
    
    // Calculate outperformance
    const absoluteOutperformance = stockReturns - sectorReturns;
    const relativeOutperformance = ((1 + stockReturns/100) / (1 + sectorReturns/100) - 1) * 100;
    
    // Sector-specific insights
    let sectorContext = '';
    if (absoluteOutperformance > 10) {
      sectorContext = 'Strong sector leader';
    } else if (absoluteOutperformance > 0) {
      sectorContext = 'Modest sector outperformance';
    } else if (absoluteOutperformance > -10) {
      sectorContext = 'Tracking sector closely';
    } else {
      sectorContext = 'Lagging sector peers';
    }
    
    return {
      period,
      days,
      sector,
      sectorBenchmark: sectorSymbol,
      stock: {
        returns: stockReturns?.toFixed(2),
        volatility: stockVolatility?.toFixed(2),
        sharpeRatio: stockSharpe?.toFixed(2),
        beta: beta?.toFixed(2),
        alpha: alpha?.toFixed(2)
      },
      sectorIndex: {
        returns: sectorReturns?.toFixed(2),
        volatility: sectorVolatility?.toFixed(2),
        sharpeRatio: sectorSharpe?.toFixed(2)
      },
      comparison: {
        absoluteOutperformance: absoluteOutperformance?.toFixed(2),
        relativeOutperformance: relativeOutperformance?.toFixed(2),
        sectorContext,
        betterSharpe: stockSharpe > sectorSharpe ? 'Stock' : 'Sector',
        verdict: absoluteOutperformance > 0 ? 'Outperforming Sector' : 'Underperforming Sector'
      }
    };
  } catch (error) {
    console.error('Error in compareVsSector:', error);
    return { error: error.message };
  }
}

/**
 * Calculate relative strength for peers
 */
async function calculatePeerRelativeStrength(symbols, period = '1y') {
  try {
    // Fetch prices for all peers
    const pricePromises = symbols.map(symbol => fetchHistoricalPrices(symbol, period));
    const allPrices = await Promise.all(pricePromises);
    
    const peerData = [];
    
    for (let i = 0; i < symbols.length; i++) {
      if (!allPrices[i]) continue;
      
      const returns = calculateReturns(allPrices[i]);
      const volatility = calculateVolatility(allPrices[i]);
      const sharpe = calculateSharpeRatio(returns, volatility, allPrices[i].length);
      
      // Calculate momentum (last 20 days vs previous 20 days)
      let momentum = 0;
      if (allPrices[i].length >= 40) {
        const recentPrices = allPrices[i].slice(-20);
        const previousPrices = allPrices[i].slice(-40, -20);
        const recentReturn = calculateReturns(recentPrices);
        const previousReturn = calculateReturns(previousPrices);
        momentum = recentReturn - previousReturn;
      }
      
      peerData.push({
        symbol: symbols[i],
        returns: parseFloat(returns?.toFixed(2)) || 0,
        volatility: parseFloat(volatility?.toFixed(2)) || 0,
        sharpeRatio: parseFloat(sharpe?.toFixed(2)) || 0,
        momentum: parseFloat(momentum?.toFixed(2)) || 0,
        riskAdjustedScore: parseFloat((sharpe * 10 || 0).toFixed(2))
      });
    }
    
    // Sort by returns
    peerData.sort((a, b) => b.returns - a.returns);
    
    // Assign ranks
    peerData.forEach((peer, index) => {
      peer.returnRank = index + 1;
    });
    
    // Sort by Sharpe ratio for risk-adjusted rank
    const sharpeRanked = [...peerData].sort((a, b) => b.sharpeRatio - a.sharpeRatio);
    sharpeRanked.forEach((peer, index) => {
      const original = peerData.find(p => p.symbol === peer.symbol);
      if (original) original.riskAdjustedRank = index + 1;
    });
    
    // Sort by momentum
    const momentumRanked = [...peerData].sort((a, b) => b.momentum - a.momentum);
    momentumRanked.forEach((peer, index) => {
      const original = peerData.find(p => p.symbol === peer.symbol);
      if (original) original.momentumRank = index + 1;
    });
    
    // Calculate composite score (lower is better)
    peerData.forEach(peer => {
      peer.compositeRank = (peer.returnRank + peer.riskAdjustedRank + peer.momentumRank) / 3;
      peer.relativeStrength = peer.compositeRank <= 2 ? 'Strong' : 
                              peer.compositeRank <= 4 ? 'Moderate' : 'Weak';
    });
    
    return {
      period,
      totalPeers: peerData.length,
      peers: peerData
    };
  } catch (error) {
    console.error('Error in calculatePeerRelativeStrength:', error);
    return { error: error.message };
  }
}

/**
 * Calculate risk-adjusted outperformance vs multiple benchmarks
 */
async function calculateRiskAdjustedOutperformance(symbol, sector, period = '1y') {
  try {
    const niftyComparison = await compareVsNifty50(symbol, period);
    const sectorComparison = await compareVsSector(symbol, sector, period);
    
    if (niftyComparison.error || sectorComparison.error) {
      return { error: 'Failed to fetch comparison data' };
    }
    
    const stockSharpe = parseFloat(niftyComparison.stock.sharpeRatio);
    const niftySharpe = parseFloat(niftyComparison.nifty50.sharpeRatio);
    const sectorSharpe = parseFloat(sectorComparison.sectorIndex.sharpeRatio);
    
    const stockAlpha = parseFloat(niftyComparison.stock.alpha);
    const stockBeta = parseFloat(niftyComparison.stock.beta);
    
    // Calculate risk-adjusted scores
    const vsNiftyScore = stockSharpe - niftySharpe;
    const vsSectorScore = stockSharpe - sectorSharpe;
    const alphaScore = stockAlpha;
    
    // Composite risk-adjusted score
    const compositeScore = (vsNiftyScore + vsSectorScore + alphaScore) / 3;
    
    // Determine overall grade
    let grade, description;
    if (compositeScore > 1) {
      grade = 'A+';
      description = 'Exceptional risk-adjusted returns';
    } else if (compositeScore > 0.5) {
      grade = 'A';
      description = 'Strong risk-adjusted returns';
    } else if (compositeScore > 0) {
      grade = 'B';
      description = 'Good risk-adjusted returns';
    } else if (compositeScore > -0.5) {
      grade = 'C';
      description = 'Average risk-adjusted returns';
    } else {
      grade = 'D';
      description = 'Poor risk-adjusted returns';
    }
    
    return {
      period,
      riskAdjusted: {
        sharpeRatio: stockSharpe?.toFixed(2),
        alpha: stockAlpha?.toFixed(2),
        beta: stockBeta?.toFixed(2),
        compositeScore: compositeScore?.toFixed(2),
        grade,
        description
      },
      benchmarks: {
        vsNifty50: {
          sharpeOutperformance: vsNiftyScore?.toFixed(2),
          verdict: vsNiftyScore > 0 ? 'Better' : 'Worse'
        },
        vsSector: {
          sharpeOutperformance: vsSectorScore?.toFixed(2),
          verdict: vsSectorScore > 0 ? 'Better' : 'Worse'
        }
      },
      insights: {
        betaInterpretation: stockBeta > 1.2 ? 'High volatility vs market' :
                            stockBeta < 0.8 ? 'Low volatility vs market' :
                            'Moderate volatility vs market',
        alphaInterpretation: stockAlpha > 3 ? 'Strong alpha generation' :
                            stockAlpha > 0 ? 'Positive alpha generation' :
                            stockAlpha > -3 ? 'Slight alpha erosion' :
                            'Significant alpha erosion'
      }
    };
  } catch (error) {
    console.error('Error in calculateRiskAdjustedOutperformance:', error);
    return { error: error.message };
  }
}

module.exports = {
  compareVsNifty50,
  compareVsSector,
  calculatePeerRelativeStrength,
  calculateRiskAdjustedOutperformance,
  getSectorBenchmark
};
