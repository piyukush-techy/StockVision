/**
 * technicals.js - Technical Indicators API Routes
 * Month 5 - Charts & News
 * Computes RSI, MACD, EMA, SMA, Bollinger Bands from Yahoo Finance historical data
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// In-memory cache for technical data (30 min TTL)
const techCache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

function getCached(key) {
  const entry = techCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { techCache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  techCache.set(key, { data, timestamp: Date.now() });
}

// ─── MATH HELPERS ──────────────────────────────────────────────────────────

function calcSMA(prices, period) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return parseFloat((slice.reduce((a, b) => a + b, 0) / period).toFixed(2));
}

function calcEMA(prices, period) {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return parseFloat(ema.toFixed(2));
}

function calcEMAArray(prices, period) {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const result = new Array(period - 1).fill(null);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(parseFloat(ema.toFixed(2)));
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    result.push(parseFloat(ema.toFixed(2)));
  }
  return result;
}

function calcRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, diff)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -diff)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
}

function calcMACD(prices) {
  if (prices.length < 26) return null;
  const ema12Arr = calcEMAArray(prices, 12);
  const ema26Arr = calcEMAArray(prices, 26);
  const macdLine = ema12Arr.map((v, i) =>
    v !== null && ema26Arr[i] !== null ? parseFloat((v - ema26Arr[i]).toFixed(2)) : null
  ).filter(v => v !== null);
  if (macdLine.length < 9) return null;
  const signal = calcEMA(macdLine, 9);
  const macd = macdLine[macdLine.length - 1];
  return {
    macd: parseFloat(macd.toFixed(2)),
    signal: parseFloat(signal.toFixed(2)),
    histogram: parseFloat((macd - signal).toFixed(2)),
  };
}

function calcBollingerBands(prices, period = 20, multiplier = 2) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: parseFloat((sma + multiplier * stdDev).toFixed(2)),
    middle: parseFloat(sma.toFixed(2)),
    lower: parseFloat((sma - multiplier * stdDev).toFixed(2)),
    bandwidth: parseFloat(((multiplier * 2 * stdDev) / sma * 100).toFixed(2)),
  };
}

function getRSISignal(rsi) {
  if (rsi >= 70) return { label: 'Overbought', color: 'red', action: 'Consider Selling' };
  if (rsi <= 30) return { label: 'Oversold', color: 'green', action: 'Consider Buying' };
  if (rsi >= 60) return { label: 'Bullish', color: 'orange', action: 'Hold / Watch' };
  if (rsi <= 40) return { label: 'Bearish', color: 'yellow', action: 'Caution' };
  return { label: 'Neutral', color: 'gray', action: 'Wait & Watch' };
}

function getMACDSignal(macd) {
  if (!macd) return { label: 'N/A', color: 'gray', action: 'Insufficient Data' };
  if (macd.histogram > 0 && macd.macd > macd.signal)
    return { label: 'Bullish Crossover', color: 'green', action: 'Potential Buy' };
  if (macd.histogram < 0 && macd.macd < macd.signal)
    return { label: 'Bearish Crossover', color: 'red', action: 'Potential Sell' };
  if (macd.histogram > 0)
    return { label: 'Bullish Momentum', color: 'green', action: 'Hold Long' };
  return { label: 'Bearish Momentum', color: 'red', action: 'Caution' };
}

// ─── FETCH HISTORICAL PRICES ──────────────────────────────────────────────

async function getHistoricalPrices(symbol, period = '6mo') {
  const rangeMap = {
    '1mo': '1mo',
    '3mo': '3mo',
    '6mo': '6mo',
    '1y':  '1y',
  };
  const range = rangeMap[period] || '6mo';

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
  const res = await axios.get(url, {
    params: { interval: '1d', range },
    headers: HEADERS,
    timeout: 15000
  });

  const result = res.data?.chart?.result?.[0];
  if (!result) throw new Error('No data from Yahoo Finance');

  const timestamps = result.timestamp || [];
  const quotes    = result.indicators?.quote?.[0] || {};
  const opens     = quotes.open   || [];
  const highs     = quotes.high   || [];
  const lows      = quotes.low    || [];
  const closes    = quotes.close  || [];
  const volumes   = quotes.volume || [];

  return timestamps.map((ts, i) => ({
    date:   new Date(ts * 1000).toISOString().split('T')[0],
    open:   parseFloat((opens[i]  || 0).toFixed(2)),
    high:   parseFloat((highs[i]  || 0).toFixed(2)),
    low:    parseFloat((lows[i]   || 0).toFixed(2)),
    close:  parseFloat((closes[i] || 0).toFixed(2)),
    volume: volumes[i] || 0,
  })).filter(d => d.close > 0);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── ROUTES ──────────────────────────────────────────────────────────────

/**
 * GET /api/technicals/:symbol
 * Returns all technical indicators + historical OHLCV data
 */
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const symbolUpper = symbol.toUpperCase();
    const period = req.query.period || '6mo';

    const cacheKey = `tech_${symbolUpper}_${period}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ ...cached, source: 'cache' });

    const candles = await getHistoricalPrices(symbolUpper, period);

    if (!candles || candles.length < 30) {
      return res.status(404).json({ error: 'Insufficient historical data' });
    }

    const closes = candles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];

    // Calculate all indicators
    const rsi = calcRSI(closes, 14);
    const macd = calcMACD(closes);
    const ema20 = calcEMA(closes, 20);
    const ema50 = calcEMA(closes, 50);
    const ema200 = calcEMA(closes, 200);
    const sma20 = calcSMA(closes, 20);
    const sma50 = calcSMA(closes, 50);
    const sma200 = calcSMA(closes, 200);
    const bollingerBands = calcBollingerBands(closes, 20, 2);

    // Support & Resistance (simple: recent highs/lows)
    const recentCandles = candles.slice(-30);
    const support = parseFloat(Math.min(...recentCandles.map(c => c.low)).toFixed(2));
    const resistance = parseFloat(Math.max(...recentCandles.map(c => c.high)).toFixed(2));

    // Overall signal
    let bullishSignals = 0, bearishSignals = 0;
    if (rsi && rsi < 50) bearishSignals++; else if (rsi) bullishSignals++;
    if (macd?.histogram > 0) bullishSignals++; else if (macd) bearishSignals++;
    if (ema20 && currentPrice > ema20) bullishSignals++; else if (ema20) bearishSignals++;
    if (ema50 && currentPrice > ema50) bullishSignals++; else if (ema50) bearishSignals++;
    const overallSignal = bullishSignals > bearishSignals ? 'Bullish'
      : bearishSignals > bullishSignals ? 'Bearish' : 'Neutral';

    const responseData = {
      symbol: symbolUpper,
      period,
      candles: candles.slice(-180), // max 180 candles for charting
      indicators: {
        rsi: rsi !== null ? { value: rsi, signal: getRSISignal(rsi) } : null,
        macd: macd ? { ...macd, signal: getMACDSignal(macd) } : null,
        ema: { ema20, ema50, ema200 },
        sma: { sma20, sma50, sma200 },
        bollingerBands,
      },
      levels: { support, resistance },
      overallSignal,
      bullishSignals,
      bearishSignals,
      fetchedAt: new Date().toISOString(),
      source: 'live',
    };

    setCache(cacheKey, responseData);
    res.json(responseData);

  } catch (error) {
    console.error('Technicals error:', error.message);
    res.status(500).json({ error: 'Failed to fetch technical data', detail: error.message });
  }
});

/**
 * DELETE /api/technicals/:symbol/cache
 * Clear technical indicator cache
 */
router.delete('/:symbol/cache', (req, res) => {
  const { symbol } = req.params;
  const symbolUpper = symbol.toUpperCase();
  ['1mo', '3mo', '6mo', '1y'].forEach(p => techCache.delete(`tech_${symbolUpper}_${p}`));
  res.json({ message: `Technical cache cleared for ${symbolUpper}` });
});

module.exports = router;
