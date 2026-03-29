// dataQualityEngine.js - Month 11: Complete Data Quality & Risk Metrics Engine

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
 * MONTH 11 FEATURES:
 * 1. Data Completeness Score
 * 2. Historical Data Gaps Detection
 * 3. Corporate Action Adjustments
 * 4. Price Anomaly Detection
 * 5. Volume Spike Flagging
 * 6. Missing Data Warnings
 */

// ============================================================================
// 1. DATA COMPLETENESS SCORE
// ============================================================================

function calculateDataCompletenessScore(stockData, priceHistory, financials) {
  const scores = {};
  let totalWeight = 0;
  let totalScore = 0;
  
  // Price data completeness (weight: 25%)
  const priceMetrics = {
    current: stockData.liveData?.price ? 100 : 0,
    open: stockData.liveData?.open ? 100 : 0,
    high: stockData.liveData?.high ? 100 : 0,
    low: stockData.liveData?.low ? 100 : 0,
    previousClose: stockData.liveData?.previousClose ? 100 : 0,
    volume: stockData.liveData?.volume ? 100 : 0,
    marketCap: stockData.marketCap ? 100 : 0
  };
  scores.price = Object.values(priceMetrics).reduce((sum, val) => sum + val, 0) / Object.keys(priceMetrics).length;
  totalScore += scores.price * 0.25;
  totalWeight += 0.25;
  
  // Historical data completeness (weight: 20%)
  if (priceHistory && priceHistory.length > 0) {
    const expectedDays = 252; // 1 year trading days
    const actualDays = priceHistory.length;
    const gaps = detectHistoricalGaps(priceHistory);
    const gapPenalty = Math.min(gaps.totalGaps * 2, 30); // Max 30% penalty
    scores.historical = Math.max(0, (actualDays / expectedDays) * 100 - gapPenalty);
  } else {
    scores.historical = 0;
  }
  totalScore += scores.historical * 0.20;
  totalWeight += 0.20;
  
  // Financial data completeness (weight: 20%)
  if (financials) {
    const financialMetrics = {
      revenue: financials.revenue ? 100 : 0,
      netIncome: financials.netIncome ? 100 : 0,
      eps: financials.eps ? 100 : 0,
      totalAssets: financials.totalAssets ? 100 : 0,
      totalLiabilities: financials.totalLiabilities ? 100 : 0,
      cashFlow: financials.operatingCashFlow ? 100 : 0,
      pe: financials.pe ? 100 : 0,
      pb: financials.pb ? 100 : 0
    };
    scores.financials = Object.values(financialMetrics).reduce((sum, val) => sum + val, 0) / Object.keys(financialMetrics).length;
  } else {
    scores.financials = 0;
  }
  totalScore += scores.financials * 0.20;
  totalWeight += 0.20;
  
  // Ownership data completeness (weight: 15%)
  const ownershipMetrics = {
    promoterHolding: stockData.promoterHolding !== undefined ? 100 : 0,
    fiiHolding: stockData.fiiHolding !== undefined ? 100 : 0,
    diiHolding: stockData.diiHolding !== undefined ? 100 : 0,
    retailHolding: stockData.retailHolding !== undefined ? 100 : 0,
    pledgedShares: stockData.pledgedPercentage !== undefined ? 100 : 0
  };
  scores.ownership = Object.values(ownershipMetrics).reduce((sum, val) => sum + val, 0) / Object.keys(ownershipMetrics).length;
  totalScore += scores.ownership * 0.15;
  totalWeight += 0.15;
  
  // Metadata completeness (weight: 10%)
  const metadataMetrics = {
    name: stockData.name ? 100 : 0,
    sector: stockData.sector ? 100 : 0,
    industry: stockData.industry ? 100 : 0,
    exchange: stockData.exchange ? 100 : 0,
    isin: stockData.isin ? 100 : 0,
    website: stockData.website ? 100 : 0
  };
  scores.metadata = Object.values(metadataMetrics).reduce((sum, val) => sum + val, 0) / Object.keys(metadataMetrics).length;
  totalScore += scores.metadata * 0.10;
  totalWeight += 0.10;
  
  // Technical indicators completeness (weight: 10%)
  const technicalMetrics = {
    fiftyTwoWeekHigh: stockData.fiftyTwoWeek?.high ? 100 : 0,
    fiftyTwoWeekLow: stockData.fiftyTwoWeek?.low ? 100 : 0,
    beta: stockData.beta ? 100 : 0,
    avgVolume: stockData.avgVolume ? 100 : 0
  };
  scores.technical = Object.values(technicalMetrics).reduce((sum, val) => sum + val, 0) / Object.keys(technicalMetrics).length;
  totalScore += scores.technical * 0.10;
  totalWeight += 0.10;
  
  const overall = totalWeight > 0 ? totalScore / totalWeight : 0;
  
  return {
    overall: Math.round(overall),
    breakdown: {
      price: Math.round(scores.price),
      historical: Math.round(scores.historical),
      financials: Math.round(scores.financials),
      ownership: Math.round(scores.ownership),
      metadata: Math.round(scores.metadata),
      technical: Math.round(scores.technical)
    },
    grade: getCompletenessGrade(overall),
    missingFields: identifyMissingFields(stockData, financials)
  };
}

function getCompletenessGrade(score) {
  if (score >= 95) return { grade: 'A+', color: 'green', description: 'Excellent - Complete data' };
  if (score >= 90) return { grade: 'A', color: 'green', description: 'Very Good - Minor gaps' };
  if (score >= 85) return { grade: 'A-', color: 'green', description: 'Good - Some missing data' };
  if (score >= 80) return { grade: 'B+', color: 'yellow', description: 'Above Average - Notable gaps' };
  if (score >= 75) return { grade: 'B', color: 'yellow', description: 'Average - Multiple gaps' };
  if (score >= 70) return { grade: 'B-', color: 'yellow', description: 'Below Average - Significant gaps' };
  if (score >= 60) return { grade: 'C', color: 'orange', description: 'Fair - Major data missing' };
  if (score >= 50) return { grade: 'D', color: 'red', description: 'Poor - Critical gaps' };
  return { grade: 'F', color: 'red', description: 'Fail - Insufficient data' };
}

function identifyMissingFields(stockData, financials) {
  const missing = [];
  
  // Critical price data
  if (!stockData.liveData?.price) missing.push({ field: 'Current Price', severity: 'critical', category: 'price' });
  if (!stockData.liveData?.volume) missing.push({ field: 'Volume', severity: 'critical', category: 'price' });
  if (!stockData.marketCap) missing.push({ field: 'Market Cap', severity: 'high', category: 'price' });
  
  // Financial data
  if (!financials?.revenue) missing.push({ field: 'Revenue', severity: 'high', category: 'financials' });
  if (!financials?.netIncome) missing.push({ field: 'Net Income', severity: 'high', category: 'financials' });
  if (!financials?.eps) missing.push({ field: 'EPS', severity: 'medium', category: 'financials' });
  if (!financials?.pe) missing.push({ field: 'P/E Ratio', severity: 'medium', category: 'financials' });
  
  // Ownership
  if (stockData.promoterHolding === undefined) missing.push({ field: 'Promoter Holding', severity: 'medium', category: 'ownership' });
  
  // Metadata
  if (!stockData.sector) missing.push({ field: 'Sector', severity: 'low', category: 'metadata' });
  if (!stockData.industry) missing.push({ field: 'Industry', severity: 'low', category: 'metadata' });
  
  return missing;
}

// ============================================================================
// 2. HISTORICAL DATA GAPS DETECTION
// ============================================================================

function detectHistoricalGaps(priceHistory, expectedTradingDays = 252) {
  if (!priceHistory || priceHistory.length < 2) {
    return {
      totalGaps: 0,
      gaps: [],
      dataQuality: 'Insufficient',
      coverage: 0
    };
  }
  
  const gaps = [];
  let totalMissingDays = 0;
  
  // Sort by date
  const sorted = [...priceHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date);
    const currDate = new Date(sorted[i].date);
    
    // Calculate business days between dates
    const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
    
    // Expected max gap is 3 days (for long weekend)
    if (daysDiff > 3) {
      const estimatedMissingDays = Math.floor(daysDiff * 0.7); // ~70% are trading days
      totalMissingDays += estimatedMissingDays;
      
      gaps.push({
        startDate: prevDate.toISOString().split('T')[0],
        endDate: currDate.toISOString().split('T')[0],
        daysMissing: estimatedMissingDays,
        severity: estimatedMissingDays > 10 ? 'high' : estimatedMissingDays > 5 ? 'medium' : 'low'
      });
    }
  }
  
  const coverage = ((sorted.length / expectedTradingDays) * 100).toFixed(1);
  const dataQuality = coverage >= 95 ? 'Excellent' : 
                      coverage >= 90 ? 'Good' :
                      coverage >= 80 ? 'Fair' :
                      coverage >= 70 ? 'Poor' : 'Very Poor';
  
  return {
    totalGaps: gaps.length,
    totalMissingDays,
    gaps: gaps.slice(0, 10), // Return top 10 largest gaps
    dataQuality,
    coverage: parseFloat(coverage),
    actualDays: sorted.length,
    expectedDays: expectedTradingDays
  };
}

// ============================================================================
// 3. CORPORATE ACTION ADJUSTMENTS
// ============================================================================

function detectCorporateActions(priceHistory) {
  if (!priceHistory || priceHistory.length < 2) {
    return {
      splits: [],
      dividends: [],
      bonuses: [],
      adjustmentWarnings: []
    };
  }
  
  const sorted = [...priceHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const splits = [];
  const dividends = [];
  const bonuses = [];
  const warnings = [];
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    
    // Calculate price change
    const priceChange = ((curr.close - prev.close) / prev.close) * 100;
    const volumeChange = curr.volume / (prev.volume || 1);
    
    // Detect stock split (price drops >40% with volume spike)
    if (priceChange < -40 && volumeChange > 2) {
      const splitRatio = Math.round(prev.close / curr.close);
      splits.push({
        date: curr.date,
        type: 'split',
        ratio: `1:${splitRatio}`,
        priceImpact: priceChange.toFixed(2),
        detected: true,
        confidence: 'High'
      });
    }
    
    // Detect ex-dividend (price drops 1-5% on normal volume)
    if (priceChange < -1 && priceChange > -5 && volumeChange < 1.5) {
      const estimatedDividend = ((prev.close - curr.close) / prev.close) * 100;
      dividends.push({
        date: curr.date,
        type: 'dividend',
        estimatedYield: estimatedDividend.toFixed(2),
        priceImpact: priceChange.toFixed(2),
        detected: true,
        confidence: 'Medium'
      });
    }
    
    // Detect bonus issue (price drops with volume spike)
    if (priceChange < -20 && priceChange > -45 && volumeChange > 1.5) {
      const bonusRatio = Math.round((prev.close / curr.close) - 1);
      if (bonusRatio > 0) {
        bonuses.push({
          date: curr.date,
          type: 'bonus',
          ratio: `${bonusRatio}:1`,
          priceImpact: priceChange.toFixed(2),
          detected: true,
          confidence: 'Medium'
        });
      }
    }
    
    // Detect unadjusted data (suspicious price changes)
    if (Math.abs(priceChange) > 50 && volumeChange < 1.2) {
      warnings.push({
        date: curr.date,
        warning: 'Possible unadjusted corporate action',
        priceChange: priceChange.toFixed(2),
        recommendation: 'Verify data adjustment'
      });
    }
  }
  
  return {
    splits,
    dividends,
    bonuses,
    totalActions: splits.length + dividends.length + bonuses.length,
    adjustmentWarnings: warnings,
    adjustmentQuality: warnings.length === 0 ? 'Clean' : warnings.length < 3 ? 'Minor Issues' : 'Needs Review'
  };
}

// ============================================================================
// 4. PRICE ANOMALY DETECTION
// ============================================================================

function detectPriceAnomalies(priceHistory, stockData) {
  if (!priceHistory || priceHistory.length < 30) {
    return {
      anomalies: [],
      anomalyScore: 0,
      overallHealth: 'Insufficient Data'
    };
  }
  
  const sorted = [...priceHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, 60); // Last 60 days
  
  const anomalies = [];
  
  // Calculate daily returns and statistics
  const returns = [];
  for (let i = 1; i < recent.length; i++) {
    const dailyReturn = ((recent[i - 1].close - recent[i].close) / recent[i].close) * 100;
    returns.push(dailyReturn);
  }
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  // 1. Extreme price movements (beyond 3 sigma)
  for (let i = 0; i < Math.min(30, returns.length); i++) {
    const zScore = Math.abs((returns[i] - mean) / stdDev);
    if (zScore > 3) {
      anomalies.push({
        date: recent[i].date,
        type: 'Extreme Movement',
        severity: zScore > 4 ? 'critical' : 'high',
        value: returns[i].toFixed(2) + '%',
        zScore: zScore.toFixed(2),
        description: `${Math.abs(returns[i]).toFixed(1)}% move (${zScore.toFixed(1)} sigma event)`
      });
    }
  }
  
  // 2. Price-Volume discrepancy
  for (let i = 0; i < Math.min(30, recent.length - 1); i++) {
    const priceChange = Math.abs(returns[i]);
    const volumeRatio = recent[i].volume / (stockData.avgVolume || recent[i].volume);
    
    // Large price move on low volume (manipulation red flag)
    if (priceChange > 5 && volumeRatio < 0.5) {
      anomalies.push({
        date: recent[i].date,
        type: 'Low Volume Spike',
        severity: 'medium',
        priceChange: returns[i].toFixed(2) + '%',
        volumeRatio: (volumeRatio * 100).toFixed(0) + '%',
        description: `${priceChange.toFixed(1)}% move on ${(volumeRatio * 100).toFixed(0)}% of avg volume`
      });
    }
    
    // Small price move on huge volume (accumulation/distribution)
    if (priceChange < 2 && volumeRatio > 3) {
      anomalies.push({
        date: recent[i].date,
        type: 'Volume Anomaly',
        severity: 'low',
        priceChange: returns[i].toFixed(2) + '%',
        volumeRatio: (volumeRatio * 100).toFixed(0) + '%',
        description: `${(volumeRatio).toFixed(1)}x volume spike with minimal price move`
      });
    }
  }
  
  // 3. Circuit filters / Frozen prices
  for (let i = 0; i < Math.min(30, recent.length - 1); i++) {
    if (recent[i].high === recent[i].low && recent[i].volume > 0) {
      anomalies.push({
        date: recent[i].date,
        type: 'Frozen Price',
        severity: 'high',
        description: 'No intraday price movement - possible circuit limit or data error'
      });
    }
  }
  
  // 4. Missing OHLC data integrity
  for (let i = 0; i < Math.min(30, recent.length); i++) {
    const day = recent[i];
    if (day.close > day.high || day.close < day.low || day.open > day.high || day.open < day.low) {
      anomalies.push({
        date: day.date,
        type: 'Data Integrity Issue',
        severity: 'critical',
        description: 'Close/Open price outside High-Low range - corrupt data'
      });
    }
  }
  
  // Calculate anomaly score (0-100, lower is better)
  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const highCount = anomalies.filter(a => a.severity === 'high').length;
  const mediumCount = anomalies.filter(a => a.severity === 'medium').length;
  
  const anomalyScore = Math.min(100, criticalCount * 30 + highCount * 15 + mediumCount * 5);
  
  const overallHealth = anomalyScore === 0 ? 'Excellent' :
                        anomalyScore < 20 ? 'Good' :
                        anomalyScore < 50 ? 'Fair' :
                        anomalyScore < 80 ? 'Poor' : 'Critical';
  
  return {
    anomalies: anomalies.slice(0, 20), // Top 20 most recent
    totalAnomalies: anomalies.length,
    breakdown: {
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: anomalies.filter(a => a.severity === 'low').length
    },
    anomalyScore,
    overallHealth,
    recommendation: anomalyScore > 50 ? 'Caution - Verify data before analysis' :
                     anomalyScore > 20 ? 'Review flagged dates' :
                     'Data quality acceptable'
  };
}

// ============================================================================
// 5. VOLUME SPIKE FLAGGING
// ============================================================================

function detectVolumeSpikes(priceHistory, stockData) {
  if (!priceHistory || priceHistory.length < 30) {
    return {
      spikes: [],
      avgVolume: 0,
      volatilityScore: 0
    };
  }
  
  const sorted = [...priceHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, 90); // Last 90 days
  
  // Calculate average volume
  const avgVolume = recent.reduce((sum, day) => sum + (day.volume || 0), 0) / recent.length;
  const volumes = recent.map(day => day.volume || 0);
  const stdDev = Math.sqrt(volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length);
  
  const spikes = [];
  
  for (let i = 0; i < Math.min(30, recent.length); i++) {
    const day = recent[i];
    const volumeRatio = day.volume / avgVolume;
    const zScore = (day.volume - avgVolume) / stdDev;
    
    // Significant volume spike (>2x average or >3 sigma)
    if (volumeRatio > 2 || zScore > 3) {
      const priceChange = i < recent.length - 1 ?
        ((day.close - recent[i + 1].close) / recent[i + 1].close) * 100 : 0;
      
      spikes.push({
        date: day.date,
        volume: day.volume,
        avgVolume: Math.round(avgVolume),
        volumeRatio: volumeRatio.toFixed(2),
        timesAverage: volumeRatio.toFixed(1) + 'x',
        zScore: zScore.toFixed(2),
        priceChange: priceChange.toFixed(2) + '%',
        severity: volumeRatio > 5 ? 'extreme' :
                  volumeRatio > 3 ? 'high' :
                  volumeRatio > 2 ? 'medium' : 'low',
        interpretation: interpretVolumeSpike(volumeRatio, priceChange)
      });
    }
  }
  
  // Calculate volume volatility score
  const volatilityScore = Math.round((stdDev / avgVolume) * 100);
  
  return {
    spikes: spikes.slice(0, 15), // Top 15 most recent spikes
    totalSpikes: spikes.length,
    avgVolume: Math.round(avgVolume),
    stdDeviation: Math.round(stdDev),
    volatilityScore,
    volatilityLevel: volatilityScore > 150 ? 'Very High' :
                     volatilityScore > 100 ? 'High' :
                     volatilityScore > 50 ? 'Moderate' : 'Low',
    tradingPattern: spikes.length > 10 ? 'Highly Active' :
                    spikes.length > 5 ? 'Active' :
                    spikes.length > 2 ? 'Moderate' : 'Stable'
  };
}

function interpretVolumeSpike(volumeRatio, priceChange) {
  const absChange = Math.abs(priceChange);
  
  if (absChange > 10 && volumeRatio > 3) {
    return 'Major news/event - High conviction move';
  } else if (absChange > 5 && volumeRatio > 3) {
    return 'Significant interest - Possible breakout/breakdown';
  } else if (absChange < 2 && volumeRatio > 3) {
    return 'Accumulation/Distribution - Institutional activity';
  } else if (absChange > 8 && volumeRatio > 2) {
    return 'Strong momentum - Trend acceleration';
  } else {
    return 'Increased activity - Monitor for continuation';
  }
}

// ============================================================================
// 6. MISSING DATA WARNINGS
// ============================================================================

function generateMissingDataWarnings(stockData, priceHistory, financials, completenessScore) {
  const warnings = [];
  const criticalWarnings = [];
  const recommendations = [];
  
  // 1. Price data warnings
  if (!stockData.liveData?.price) {
    criticalWarnings.push({
      category: 'Price Data',
      severity: 'critical',
      issue: 'No current price available',
      impact: 'Cannot perform any price-based analysis',
      action: 'Refresh data or verify stock symbol'
    });
  }
  
  if (!stockData.liveData?.volume || stockData.liveData.volume === 0) {
    warnings.push({
      category: 'Volume Data',
      severity: 'high',
      issue: 'Missing or zero volume',
      impact: 'Liquidity analysis not possible',
      action: 'Check if stock is actively traded'
    });
  }
  
  // 2. Historical data warnings
  if (!priceHistory || priceHistory.length < 30) {
    criticalWarnings.push({
      category: 'Historical Data',
      severity: 'critical',
      issue: `Only ${priceHistory?.length || 0} days of history`,
      impact: 'Cannot calculate volatility, trends, or backtests',
      action: 'Wait for more data accumulation or use different symbol'
    });
  } else if (priceHistory.length < 252) {
    warnings.push({
      category: 'Historical Data',
      severity: 'medium',
      issue: `Limited history (${priceHistory.length} days)`,
      impact: 'Annual metrics may be unreliable',
      action: 'Use shorter timeframes for analysis'
    });
  }
  
  // 3. Financial data warnings
  if (!financials || !financials.revenue) {
    warnings.push({
      category: 'Financial Data',
      severity: 'high',
      issue: 'No financial statements available',
      impact: 'Cannot calculate financial ratios or valuations',
      action: 'Stock may be too new or delisted'
    });
  }
  
  if (financials && !financials.pe) {
    warnings.push({
      category: 'Valuation',
      severity: 'medium',
      issue: 'P/E ratio not available',
      impact: 'Valuation comparison difficult',
      action: 'Company may be loss-making or data missing'
    });
  }
  
  // 4. Ownership warnings
  if (stockData.promoterHolding === undefined) {
    warnings.push({
      category: 'Ownership Data',
      severity: 'medium',
      issue: 'Promoter holding unknown',
      impact: 'Cannot assess management stake',
      action: 'Check NSE/BSE filings manually'
    });
  }
  
  if (stockData.pledgedPercentage > 50) {
    warnings.push({
      category: 'Pledging Risk',
      severity: 'high',
      issue: `${stockData.pledgedPercentage}% promoter shares pledged`,
      impact: 'High financial stress risk',
      action: 'Investigate company financials closely'
    });
  }
  
  // 5. Metadata warnings
  if (!stockData.sector || !stockData.industry) {
    warnings.push({
      category: 'Classification',
      severity: 'low',
      issue: 'Sector/industry classification missing',
      impact: 'Peer comparison not possible',
      action: 'Manual classification needed'
    });
  }
  
  // 6. Overall data quality warning
  if (completenessScore.overall < 70) {
    criticalWarnings.push({
      category: 'Data Quality',
      severity: 'critical',
      issue: `Low completeness score (${completenessScore.overall}%)`,
      impact: 'Analysis reliability severely compromised',
      action: 'Consider using alternative data sources or stock'
    });
  } else if (completenessScore.overall < 85) {
    warnings.push({
      category: 'Data Quality',
      severity: 'medium',
      issue: `Moderate completeness score (${completenessScore.overall}%)`,
      impact: 'Some analysis features may be limited',
      action: 'Review missing fields and adjust expectations'
    });
  }
  
  // Generate recommendations
  if (criticalWarnings.length > 0) {
    recommendations.push('⚠️ Critical data issues detected - Reliability compromised');
    recommendations.push('Consider using this stock only for basic viewing, not analysis');
  }
  
  if (warnings.filter(w => w.severity === 'high').length > 2) {
    recommendations.push('⚠️ Multiple high-severity issues - Use caution in analysis');
  }
  
  if (priceHistory && priceHistory.length < 90) {
    recommendations.push('📊 Use shorter timeframes (1-3 months) for reliable analysis');
  }
  
  if (completenessScore.overall >= 90) {
    recommendations.push('✅ Data quality excellent - All analysis features reliable');
  } else if (completenessScore.overall >= 75) {
    recommendations.push('✅ Data quality good - Most analysis features available');
  }
  
  return {
    totalWarnings: criticalWarnings.length + warnings.length,
    criticalWarnings,
    warnings,
    recommendations,
    overallRisk: criticalWarnings.length > 0 ? 'High' :
                 warnings.filter(w => w.severity === 'high').length > 1 ? 'Medium' :
                 warnings.length > 3 ? 'Low' : 'Minimal',
    usabilityScore: Math.max(0, 100 - (criticalWarnings.length * 25) - (warnings.filter(w => w.severity === 'high').length * 10) - (warnings.length * 2))
  };
}

// ============================================================================
// MAIN COMPREHENSIVE ANALYSIS
// ============================================================================

async function performComprehensiveDataQuality(symbol, priceHistory, stockData, financials) {
  try {
    // 1. Data Completeness Score
    const completeness = calculateDataCompletenessScore(stockData, priceHistory, financials);
    
    // 2. Historical Gaps Detection
    const gaps = detectHistoricalGaps(priceHistory);
    
    // 3. Corporate Actions
    const corporateActions = detectCorporateActions(priceHistory);
    
    // 4. Price Anomalies
    const anomalies = detectPriceAnomalies(priceHistory, stockData);
    
    // 5. Volume Spikes
    const volumeSpikes = detectVolumeSpikes(priceHistory, stockData);
    
    // 6. Missing Data Warnings
    const warnings = generateMissingDataWarnings(stockData, priceHistory, financials, completeness);
    
    // Calculate overall data quality score
    const overallScore = Math.round(
      completeness.overall * 0.30 +
      (100 - gaps.totalMissingDays) * 0.20 +
      (100 - anomalies.anomalyScore) * 0.25 +
      warnings.usabilityScore * 0.25
    );
    
    return {
      symbol,
      overall: {
        score: overallScore,
        grade: getOverallGrade(overallScore),
        reliability: overallScore >= 85 ? 'High' : overallScore >= 70 ? 'Medium' : 'Low',
        timestamp: new Date().toISOString()
      },
      completeness,
      gaps,
      corporateActions,
      anomalies,
      volumeSpikes,
      warnings,
      summary: {
        strengths: identifyStrengths(completeness, gaps, anomalies, warnings),
        weaknesses: identifyWeaknesses(completeness, gaps, anomalies, warnings),
        recommendation: getOverallRecommendation(overallScore, warnings)
      }
    };
  } catch (error) {
    console.error('Error in comprehensive data quality analysis:', error);
    throw error;
  }
}

function getOverallGrade(score) {
  if (score >= 95) return { grade: 'A+', color: 'green', label: 'Excellent' };
  if (score >= 90) return { grade: 'A', color: 'green', label: 'Very Good' };
  if (score >= 85) return { grade: 'A-', color: 'green', label: 'Good' };
  if (score >= 80) return { grade: 'B+', color: 'yellow', label: 'Above Average' };
  if (score >= 75) return { grade: 'B', color: 'yellow', label: 'Average' };
  if (score >= 70) return { grade: 'B-', color: 'yellow', label: 'Below Average' };
  if (score >= 60) return { grade: 'C', color: 'orange', label: 'Fair' };
  if (score >= 50) return { grade: 'D', color: 'red', label: 'Poor' };
  return { grade: 'F', color: 'red', label: 'Fail' };
}

function identifyStrengths(completeness, gaps, anomalies, warnings) {
  const strengths = [];
  
  if (completeness.overall >= 90) strengths.push('Comprehensive data coverage');
  if (completeness.breakdown.price >= 95) strengths.push('Complete price data');
  if (completeness.breakdown.financials >= 85) strengths.push('Strong financial data');
  if (gaps.dataQuality === 'Excellent') strengths.push('Complete historical coverage');
  if (gaps.totalGaps === 0) strengths.push('No data gaps detected');
  if (anomalies.overallHealth === 'Excellent') strengths.push('Clean price data');
  if (warnings.criticalWarnings.length === 0) strengths.push('No critical issues');
  
  return strengths;
}

function identifyWeaknesses(completeness, gaps, anomalies, warnings) {
  const weaknesses = [];
  
  if (completeness.overall < 70) weaknesses.push('Low data completeness');
  if (completeness.breakdown.financials < 60) weaknesses.push('Incomplete financials');
  if (gaps.totalGaps > 5) weaknesses.push('Multiple historical gaps');
  if (gaps.coverage < 80) weaknesses.push('Insufficient historical coverage');
  if (anomalies.totalAnomalies > 10) weaknesses.push('Frequent price anomalies');
  if (anomalies.breakdown.critical > 0) weaknesses.push('Critical data integrity issues');
  if (warnings.criticalWarnings.length > 0) weaknesses.push('Critical data warnings');
  
  return weaknesses;
}

function getOverallRecommendation(score, warnings) {
  if (score >= 90 && warnings.criticalWarnings.length === 0) {
    return 'Excellent data quality - All analysis features fully reliable';
  } else if (score >= 80 && warnings.criticalWarnings.length === 0) {
    return 'Good data quality - Most analysis features reliable';
  } else if (score >= 70) {
    return 'Adequate data quality - Use with awareness of limitations';
  } else if (score >= 60) {
    return 'Fair data quality - Verify key metrics before decisions';
  } else {
    return 'Poor data quality - Use only for basic reference';
  }
}

module.exports = {
  performComprehensiveDataQuality,
  calculateDataCompletenessScore,
  detectHistoricalGaps,
  detectCorporateActions,
  detectPriceAnomalies,
  detectVolumeSpikes,
  generateMissingDataWarnings
};
