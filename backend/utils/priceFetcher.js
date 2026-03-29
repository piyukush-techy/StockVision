const axios = require('axios');

/**
 * Price Fetcher Utility
 * Fetches live stock prices from Yahoo Finance
 */

/**
 * Fetch current price for a single stock
 * @param {string} symbol - Stock symbol (e.g., 'RELIANCE.NS')
 * @returns {Promise<object>} - Price data
 */
async function fetchStockPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    
    const params = {
      interval: '1d',
      range: '1d'
    };
    
    const response = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const data = response.data;
    
    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      throw new Error(`No data found for ${symbol}`);
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    
    return {
      symbol: meta.symbol,
      price: meta.regularMarketPrice,
      previousClose: meta.previousClose || meta.chartPreviousClose,
      change: meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose),
      changePercent: ((meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose)) / (meta.previousClose || meta.chartPreviousClose)) * 100,
      open: meta.regularMarketOpen || 0,
      dayHigh: meta.regularMarketDayHigh || 0,
      dayLow: meta.regularMarketDayLow || 0,
      volume: meta.regularMarketVolume || 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
      marketCap: meta.marketCap || 0,
      beta: null // Beta requires quoteSummary endpoint - set in api route
    };
    
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch prices for multiple stocks
 * @param {Array<string>} symbols - Array of stock symbols
 * @returns {Promise<Array>} - Array of price data
 */
async function fetchMultipleStockPrices(symbols) {
  const promises = symbols.map(symbol => fetchStockPrice(symbol));
  const results = await Promise.allSettled(promises);
  
  return results
    .filter(result => result.status === 'fulfilled' && result.value !== null)
    .map(result => result.value);
}

/**
 * Fetch stock metadata (name, sector, etc.)
 * @param {string} symbol - Stock symbol
 * @returns {Promise<object>} - Stock metadata
 */
async function fetchStockMetadata(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    
    const response = await axios.get(url, {
      params: { interval: '1d' },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const data = response.data;
    const meta = data.chart.result[0].meta;
    
    return {
      symbol: meta.symbol,
      name: meta.longName || meta.shortName || symbol,
      currency: meta.currency,
      exchange: meta.exchangeName || 'NSE',
      timezone: meta.timezone
    };
    
  } catch (error) {
    console.error(`Error fetching metadata for ${symbol}:`, error.message);
    return {
      symbol,
      name: symbol.replace('.NS', '').replace('.BO', ''),
      exchange: symbol.includes('.NS') ? 'NSE' : 'BSE'
    };
  }
}

/**
 * Fetch index data (Nifty, Sensex, etc.)
 * @param {string} indexSymbol - Index symbol (e.g., '^NSEI' for Nifty)
 * @returns {Promise<object>} - Index data
 */
async function fetchIndexData(indexSymbol) {
  try {
    const priceData = await fetchStockPrice(indexSymbol);
    return priceData;
  } catch (error) {
    console.error(`Error fetching index ${indexSymbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch stock beta (volatility vs market)
 * @param {string} symbol - Stock symbol
 * @returns {Promise<number>} - Beta value
 */
async function fetchStockBeta(symbol) {
  try {
    // Fetch beta via Yahoo Finance v11 API (no yahoo-finance2 needed)
    const axios = require('axios');
    const res = await axios.get(`https://query1.finance.yahoo.com/v11/finance/quoteSummary/${symbol}`, {
      params: { modules: 'summaryDetail,defaultKeyStatistics' },
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000,
    });
    const sd  = res.data?.quoteSummary?.result?.[0]?.summaryDetail || {};
    const dks = res.data?.quoteSummary?.result?.[0]?.defaultKeyStatistics || {};
    const beta = sd.beta?.raw ?? dks.beta?.raw ?? null;
    return beta;
  } catch (error) {
    console.error(`Error fetching beta for ${symbol}:`, error.message);
    // Return simulated beta based on sector patterns
    return generateSimulatedBeta(symbol);
  }
}

/**
 * Generate simulated beta for testing
 * In production, this should be replaced with real API calls
 */
function generateSimulatedBeta(symbol) {
  const betaPatterns = {
    'RELIANCE.NS': 0.95,
    'TCS.NS': 0.75,
    'HDFCBANK.NS': 1.05,
    'INFY.NS': 0.82,
    'ICICIBANK.NS': 1.12,
    'HINDUNILVR.NS': 0.65,
    'ITC.NS': 0.70,
    'SBIN.NS': 1.25,
    'BHARTIARTL.NS': 0.88,
    'KOTAKBANK.NS': 1.08,
  };
  
  return betaPatterns[symbol] || (0.7 + Math.random() * 0.6); // Random between 0.7-1.3
}

module.exports = {
  fetchStockPrice,
  fetchMultipleStockPrices,
  fetchStockMetadata,
  fetchIndexData,
  fetchStockBeta
};
