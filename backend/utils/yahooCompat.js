/**
 * yahooCompat.js — Drop-in replacement for Yahoo Finance v8 chart API
 * Uses Stooq.com for historical OHLCV — free, no key, no rate limit
 *
 * Usage: const { fetchYahooChart } = require('./yahooCompat');
 *   replaces: axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {params:{range}})
 */

const { fetchHistoricalData, fetchStockPrice } = require('./priceFetcher');

// Maps Yahoo range strings to approximate days
const RANGE_TO_DAYS = {
  '1d': 2, '5d': 7, '1mo': 35, '3mo': 100, '6mo': 200,
  '1y': 370, '2y': 740, '5y': 1850, '10y': 3700, 'max': 7300,
};

/**
 * Fetches OHLCV history in the same shape that the old Yahoo v8 code expected.
 * Returns { candles: [{date, open, high, low, close, volume}], meta: {...} }
 */
async function fetchYahooChart(symbol, range = '1y', interval = '1d') {
  const days = RANGE_TO_DAYS[range] || 370;
  const stooqInterval = interval === '1wk' ? 'w' : interval === '1mo' ? 'm' : 'd';

  const [history, quote] = await Promise.all([
    fetchHistoricalData(symbol, stooqInterval, days),
    fetchStockPrice(symbol).catch(() => null),
  ]);

  const candles = history.map(h => ({
    date:   h.date,
    open:   h.open,
    high:   h.high,
    low:    h.low,
    close:  h.close,
    volume: h.volume,
  }));

  const meta = {
    symbol:              symbol,
    regularMarketPrice:  quote?.price             || (candles[candles.length-1]?.close ?? 0),
    previousClose:       quote?.previousClose      || 0,
    regularMarketOpen:   quote?.open               || 0,
    regularMarketDayHigh:quote?.dayHigh            || 0,
    regularMarketDayLow: quote?.dayLow             || 0,
    regularMarketVolume: quote?.volume             || 0,
    fiftyTwoWeekHigh:    quote?.fiftyTwoWeekHigh   || 0,
    fiftyTwoWeekLow:     quote?.fiftyTwoWeekLow    || 0,
    marketCap:           quote?.marketCap          || 0,
    currency:            'INR',
    exchangeName:        'NSE',
  };

  return { candles, meta, timestamps: candles.map(c => new Date(c.date).getTime() / 1000) };
}

module.exports = { fetchYahooChart, RANGE_TO_DAYS };
