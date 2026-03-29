// utils/dataQuality.js - Data Quality Scoring & Validation
const Stock = require('../models/Stock');

/**
 * Calculate data freshness score (0-100)
 */
function calculateFreshnessScore(timestamp, category = 'price') {
  if (!timestamp) return 0;
  
  const now = Date.now();
  const ageMs = now - new Date(timestamp).getTime();
  const ageMinutes = ageMs / (1000 * 60);
  const ageHours = ageMinutes / 60;
  const ageDays = ageHours / 24;

  const thresholds = {
    price: { excellent: 5, good: 60, fair: 1440 },
    financials: { excellent: 90, good: 120, fair: 180 },
    news: { excellent: 60, good: 1440, fair: 10080 },
    ownership: { excellent: 30, good: 60, fair: 90 },
    technical: { excellent: 5, good: 60, fair: 1440 }
  };

  const threshold = thresholds[category] || thresholds.price;
  
  if (category === 'financials' || category === 'ownership') {
    if (ageDays <= threshold.excellent) return 100;
    if (ageDays <= threshold.good) return 80;
    if (ageDays <= threshold.fair) return 60;
    return Math.max(0, 60 - (ageDays - threshold.fair));
  } else {
    if (ageMinutes <= threshold.excellent) return 100;
    if (ageMinutes <= threshold.good) return 80;
    if (ageMinutes <= threshold.fair) return 60;
    return Math.max(0, 60 - ((ageMinutes - threshold.fair) / 60));
  }
}

/**
 * Get freshness status
 */
function getFreshnessStatus(score) {
  if (score >= 90) return { status: 'live', color: 'green', label: 'Live' };
  if (score >= 75) return { status: 'fresh', color: 'green', label: 'Fresh' };
  if (score >= 50) return { status: 'recent', color: 'yellow', label: 'Recent' };
  if (score >= 25) return { status: 'aging', color: 'orange', label: 'Aging' };
  return { status: 'stale', color: 'red', label: 'Stale' };
}

/**
 * Calculate completeness score
 */
function calculateCompletenessScore(stock) {
  const checks = {
    hasPrice: stock.liveData?.price ? 20 : 0,
    hasVolume: stock.liveData?.volume ? 20 : 0,
    hasMarketCap: stock.marketCap ? 20 : 0,
    hasFinancials: (stock.pe && stock.pb) ? 10 : 0,
    hasProfitability: (stock.roe || stock.roce) ? 10 : 0,
    hasOwnership: stock.promoterHolding ? 5 : 0,
    hasDebt: stock.debtToEquity !== undefined ? 5 : 0,
    has52Week: (stock.fiftyTwoWeek?.high && stock.fiftyTwoWeek?.low) ? 5 : 0,
    hasSector: stock.sector ? 5 : 0
  };
  return Object.values(checks).reduce((sum, val) => sum + val, 0);
}

/**
 * Get completeness rating
 */
function getCompletenessRating(score) {
  if (score >= 90) return { rating: 'excellent', color: 'green', label: 'Excellent' };
  if (score >= 75) return { rating: 'good', color: 'green', label: 'Good' };
  if (score >= 50) return { rating: 'fair', color: 'yellow', label: 'Fair' };
  return { rating: 'poor', color: 'red', label: 'Poor' };
}

/**
 * Calculate confidence score
 */
function calculateConfidenceScore(stock, freshnessScores) {
  const completeness = calculateCompletenessScore(stock);
  const avgFreshness = freshnessScores 
    ? Object.values(freshnessScores).reduce((sum, val) => sum + val, 0) / Object.values(freshnessScores).length
    : 50;

  const volume = stock.liveData?.volume || 0;
  let liquidityScore = 50;
  if (volume > 1000000) liquidityScore = 100;
  else if (volume > 100000) liquidityScore = 80;
  else if (volume > 10000) liquidityScore = 60;
  else if (volume > 1000) liquidityScore = 40;
  else liquidityScore = 20;

  const sourceReliability = 90;
  const confidence = (
    avgFreshness * 0.40 +
    completeness * 0.25 +
    liquidityScore * 0.20 +
    sourceReliability * 0.15
  );
  return Math.round(confidence);
}

/**
 * Get confidence level
 */
function getConfidenceLevel(score) {
  if (score >= 90) return { level: 'very_high', color: 'green', label: 'Very High', icon: '🟢' };
  if (score >= 75) return { level: 'high', color: 'green', label: 'High', icon: '🟢' };
  if (score >= 60) return { level: 'medium', color: 'yellow', label: 'Medium', icon: '🟡' };
  if (score >= 40) return { level: 'low', color: 'orange', label: 'Low', icon: '🟠' };
  return { level: 'very_low', color: 'red', label: 'Very Low', icon: '🔴' };
}

/**
 * Get data age
 */
function getDataAge(timestamp) {
  if (!timestamp) return 'Unknown';
  const now = Date.now();
  const ageMs = now - new Date(timestamp).getTime();
  const ageSeconds = Math.floor(ageMs / 1000);
  const ageMinutes = Math.floor(ageSeconds / 60);
  const ageHours = Math.floor(ageMinutes / 60);
  const ageDays = Math.floor(ageHours / 24);
  if (ageSeconds < 60) return `${ageSeconds} sec ago`;
  if (ageMinutes < 60) return `${ageMinutes} min ago`;
  if (ageHours < 24) return `${ageHours} hr ago`;
  return `${ageDays} day${ageDays > 1 ? 's' : ''} ago`;
}

/**
 * Calculate stock data quality
 */
async function calculateDataQuality(symbol) {
  const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
  if (!stock) return null;

  const freshnessScores = {
    price: calculateFreshnessScore(stock.liveData?.lastUpdated, 'price'),
    financials: calculateFreshnessScore(stock.lastFinancialUpdate, 'financials'),
    technical: calculateFreshnessScore(stock.liveData?.lastUpdated, 'technical')
  };

  const completeness = calculateCompletenessScore(stock);
  const confidence = calculateConfidenceScore(stock, freshnessScores);
  const overall = Math.round((Object.values(freshnessScores).reduce((s, v) => s + v, 0) / 3 + completeness + confidence) / 3);

  return {
    symbol: stock.symbol,
    name: stock.name,
    overall: { score: overall, grade: getQualityGrade(overall) },
    freshness: {
      scores: freshnessScores,
      overall: Math.round(Object.values(freshnessScores).reduce((s, v) => s + v, 0) / 3),
      status: getFreshnessStatus(Math.round(Object.values(freshnessScores).reduce((s, v) => s + v, 0) / 3))
    },
    completeness: { score: completeness, ...getCompletenessRating(completeness) },
    confidence: { score: confidence, ...getConfidenceLevel(confidence) },
    dataAge: {
      price: getDataAge(stock.liveData?.lastUpdated),
      financials: getDataAge(stock.lastFinancialUpdate)
    }
  };
}

/**
 * Get quality grade
 */
function getQualityGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'C-';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Calculate platform quality
 */
async function calculatePlatformQuality() {
  const stocks = await Stock.find().limit(520);
  let totalFreshness = 0, totalCompleteness = 0, totalConfidence = 0, stocksWithIssues = 0;

  for (const stock of stocks) {
    const freshnessScores = {
      price: calculateFreshnessScore(stock.liveData?.lastUpdated, 'price'),
      financials: calculateFreshnessScore(stock.lastFinancialUpdate, 'financials'),
      technical: calculateFreshnessScore(stock.liveData?.lastUpdated, 'technical')
    };
    const completeness = calculateCompletenessScore(stock);
    const confidence = calculateConfidenceScore(stock, freshnessScores);
    const avgFreshness = Object.values(freshnessScores).reduce((s, v) => s + v, 0) / 3;
    totalFreshness += avgFreshness;
    totalCompleteness += completeness;
    totalConfidence += confidence;
    if (avgFreshness < 50 || completeness < 50 || confidence < 50) stocksWithIssues++;
  }

  const count = stocks.length;
  return {
    overall: Math.round(((totalFreshness + totalCompleteness + totalConfidence) / 3) / count),
    freshness: Math.round(totalFreshness / count),
    completeness: Math.round(totalCompleteness / count),
    confidence: Math.round(totalConfidence / count),
    totalStocks: count,
    stocksWithIssues,
    healthyPercentage: Math.round(((count - stocksWithIssues) / count) * 100),
    lastCalculated: new Date()
  };
}

module.exports = {
  calculateDataQuality,
  calculatePlatformQuality
};
