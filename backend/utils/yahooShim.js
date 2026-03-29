// yahooShim.js — Makes fetchHistoricalData/Stooq data look like Yahoo Finance v8 format
// Drops in as axios interceptor so all routes using old Yahoo format work unchanged
// JAI SHREE GANESH 🙏

const { fetchHistoricalData, fetchStockPrice } = require('./priceFetcher');
const { fetchKeyStats } = require('./financialsFetcher');

// ─── Intercept axios calls to fake URLs ───────────────────────────────────────
// Wraps axios so calls to 'STOOQ_COMPAT/SYMBOL' and 'NSE_COMPAT/SYMBOL'
// return real data in the format the calling code expects

const _axios = require('axios');

// Store original axios.get
const _originalGet = _axios.get.bind(_axios);

// Override axios.get
_axios.get = async function shimmedGet(url, config = {}) {

  // ── STOOQ_COMPAT: historical OHLCV in Yahoo v8 chart format ────────────────
  if (typeof url === 'string' && url.startsWith('https://stooq.com/q/d/l/?s=')) {
    const rawSym = url.replace('https://stooq.com/q/d/l/?s=', '').split('&')[0].split('?')[0];
    const symbol = rawSym.includes('.') ? rawSym : rawSym + '.NS';

    const rangeParam = config?.params?.range || '6mo';
    const daysMap = { '1d': 2, '5d': 7, '1mo': 35, '3mo': 100, '6mo': 200, '1y': 370, '2y': 740 };
    const days = daysMap[rangeParam] || 200;

    try {
      // fetchHistoricalData uses Stooq → mockOHLC fallback, always returns data
      const candles = await fetchHistoricalData(symbol, '1d', days);
      const price   = await fetchStockPrice(symbol).catch(() => null);

      // Convert candles to Yahoo v8 chart format
      const timestamps = candles.map(c => Math.floor(new Date(c.date).getTime() / 1000));
      const quote = {
        open:   candles.map(c => c.open),
        high:   candles.map(c => c.high),
        low:    candles.map(c => c.low),
        close:  candles.map(c => c.close),
        volume: candles.map(c => c.volume),
      };

      const lastCandle = candles[candles.length - 1] || {};
      const prevCandle = candles[candles.length - 2] || {};

      return {
        data: {
          chart: {
            result: [{
              meta: {
                symbol:                symbol,
                regularMarketPrice:    price?.price        || lastCandle.close || 0,
                chartPreviousClose:    price?.previousClose || prevCandle.close || 0,
                regularMarketVolume:   price?.volume        || lastCandle.volume || 0,
                fiftyTwoWeekHigh:      price?.fiftyTwoWeekHigh || Math.max(...candles.map(c => c.high)),
                fiftyTwoWeekLow:       price?.fiftyTwoWeekLow  || Math.min(...candles.map(c => c.low)),
                marketCap:             price?.marketCap || 0,
                currency:              'INR',
                exchangeName:          'NSE',
              },
              timestamp: timestamps,
              indicators: { quote: [quote] },
            }],
            error: null,
          }
        }
      };
    } catch (err) {
      console.error(`yahooShim STOOQ_COMPAT failed for ${rawSym}:`, err.message);
      return { data: { chart: { result: null, error: err.message } } };
    }
  }

  // ── NSE_COMPAT: quoteSummary in Yahoo v10 format ────────────────────────────
  if (typeof url === 'string' && url.startsWith('NSE_COMPAT/')) {
    const rawSym = url.replace('NSE_COMPAT/', '');
    const symbol = rawSym.includes('.') ? rawSym : rawSym + '.NS';

    try {
      const stats = await fetchKeyStats(symbol).catch(() => ({}));

      const toRaw = (v) => v != null ? { raw: v, fmt: String(v) } : { raw: 0, fmt: '0' };

      return {
        data: {
          quoteSummary: {
            result: [{
              defaultKeyStatistics: {
                trailingPE:   toRaw(stats.peRatio),
                forwardPE:    toRaw(stats.forwardPE),
                priceToBook:  toRaw(stats.pbRatio),
                trailingEps:  toRaw(stats.eps),
                beta:         toRaw(stats.beta),
                bookValue:    toRaw(null),
                priceToSalesTrailing12Months: toRaw(null),
              },
              financialData: {
                returnOnEquity: toRaw(stats.roe   != null ? stats.roe   / 100 : null),
                returnOnAssets: toRaw(stats.roa   != null ? stats.roa   / 100 : null),
                debtToEquity:   toRaw(stats.debtToEquity),
                currentRatio:   toRaw(stats.currentRatio),
                grossMargins:   toRaw(stats.grossMargin    != null ? stats.grossMargin    / 100 : null),
                profitMargins:  toRaw(stats.profitMargin   != null ? stats.profitMargin   / 100 : null),
                revenueGrowth:  toRaw(stats.revenueGrowth  != null ? stats.revenueGrowth  / 100 : null),
                earningsGrowth: toRaw(stats.earningsGrowth != null ? stats.earningsGrowth / 100 : null),
              },
              summaryProfile: {
                sector:   stats.sector   || 'Unknown',
                industry: stats.industry || 'Unknown',
              },
              summaryDetail: {
                trailingPE:    toRaw(stats.peRatio),
                forwardPE:     toRaw(stats.forwardPE),
                dividendYield: toRaw(stats.dividendYield != null ? stats.dividendYield / 100 : null),
              },
              price: {
                longName:  symbol.replace('.NS', ''),
                shortName: symbol.replace('.NS', ''),
                marketCap: toRaw(0),
              },
            }],
            error: null,
          }
        }
      };
    } catch (err) {
      return { data: { quoteSummary: { result: null, error: err.message } } };
    }
  }

  // All other requests pass through normally
  return _originalGet(url, config);
};

// Also shim STOOQ_COMPAT for pre-URL-replaced calls (where URL is still STOOQ_COMPAT/xxx)
const _postReplace = _axios.get;
_axios.get = async function(url, config = {}) {
  if (typeof url === 'string' && url.startsWith('STOOQ_COMPAT/')) {
    const sym = url.replace('STOOQ_COMPAT/', '');
    return _postReplace(`https://stooq.com/q/d/l/?s=${sym}`, config);
  }
  if (typeof url === 'string' && url.startsWith('NSE_COMPAT/')) {
    return _postReplace(url, config);
  }
  return _postReplace(url, config);
};

module.exports = {}; // just require this file to activate the shim
