const axios = require('axios');

/**
 * Sentiment Calculator — using axios (same as scanner.js, proven to work)
 * No yahoo-finance2 dependency.
 */

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// ─── Fetch a single quote via Yahoo v8 ───────────────────────────────────────
async function fetchQuote(symbol) {
  try {
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      { params: { interval: '1d', range: '1d' }, headers: HEADERS, timeout: 8000 }
    );
    const meta = res.data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      price:         meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose || meta.regularMarketPrice,
      changePercent: meta.regularMarketPrice && meta.chartPreviousClose
        ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
        : 0
    };
  } catch {
    return null;
  }
}

// ─── Fetch historical closes via Yahoo v8 ────────────────────────────────────
async function fetchHistorical(symbol, range = '1mo') {
  try {
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      { params: { interval: '1d', range }, headers: HEADERS, timeout: 10000 }
    );
    const result = res.data?.chart?.result?.[0];
    if (!result) return [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const timestamps = result.timestamp || [];
    return timestamps.map((ts, i) => ({ date: new Date(ts * 1000), close: closes[i] }))
      .filter(d => d.close != null);
  } catch {
    return [];
  }
}

// ─── Momentum score (0-100) ───────────────────────────────────────────────────
function calcMomentum(candles) {
  if (candles.length < 10) return 50;
  const latest   = candles[candles.length - 1].close;
  const weekAgo  = candles[Math.max(0, candles.length - 7)].close;
  const monthAgo = candles[0].close;
  const weekChg  = ((latest - weekAgo) / weekAgo) * 100;
  const mthChg   = ((latest - monthAgo) / monthAgo) * 100;
  const weekScore = Math.min(100, Math.max(0, 50 + weekChg * 10));
  const mthScore  = Math.min(100, Math.max(0, 50 + mthChg  *  5));
  return Math.round(weekScore * 0.6 + mthScore * 0.4);
}

// ─── Volatility score (0-100, low VIX = greed) ───────────────────────────────
function calcVolatility(vix) {
  if (vix < 12) return 85;
  if (vix < 15) return 70;
  if (vix < 18) return 55;
  if (vix < 22) return 45;
  if (vix < 28) return 30;
  return 15;
}

// ─── Breadth score from 10 Nifty stocks (0-100) ──────────────────────────────
async function calcBreadth() {
  const SYMBOLS = [
    'RELIANCE.NS','TCS.NS','HDFCBANK.NS','INFY.NS','ICICIBANK.NS',
    'HINDUNILVR.NS','ITC.NS','SBIN.NS','BHARTIARTL.NS','KOTAKBANK.NS'
  ];
  const quotes = await Promise.all(SYMBOLS.map(s => fetchQuote(s)));
  let adv = 0, dec = 0;
  quotes.forEach(q => {
    if (!q) return;
    if (q.changePercent > 0) adv++;
    else if (q.changePercent < 0) dec++;
  });
  const total = adv + dec;
  return total === 0 ? 50 : Math.round((adv / total) * 100);
}

// ─── Put/Call ratio score from VIX (0-100) ───────────────────────────────────
function calcPutCall(vix) {
  if (vix < 12) return 80;
  if (vix < 15) return 65;
  if (vix < 18) return 50;
  if (vix < 25) return 35;
  return 20;
}

// ─── Main: Fear & Greed Index ─────────────────────────────────────────────────
async function calculateMarketSentiment() {
  try {
    const [nifty, vixData, niftyHistory, breadth] = await Promise.all([
      fetchQuote('^NSEI'),
      fetchQuote('^INDIAVIX'),
      fetchHistorical('^NSEI', '1mo'),
      calcBreadth()
    ]);

    const vix       = vixData?.price || 15;
    const momentum  = calcMomentum(niftyHistory);
    const volatility = calcVolatility(vix);
    const putCall   = calcPutCall(vix);

    const score = Math.round(
      momentum  * 0.30 +
      volatility * 0.25 +
      breadth   * 0.25 +
      putCall   * 0.20
    );

    let sentiment, color, signal;
    if      (score >= 75) { sentiment = 'Extreme Greed'; color = '#dc2626'; signal = 'Overbought — consider taking profits'; }
    else if (score >= 55) { sentiment = 'Greed';         color = '#f59e0b'; signal = 'Bullish but stay cautious'; }
    else if (score >= 45) { sentiment = 'Neutral';       color = '#6b7280'; signal = 'Wait and watch'; }
    else if (score >= 25) { sentiment = 'Fear';          color = '#3b82f6'; signal = 'Bearish — opportunity emerging'; }
    else                  { sentiment = 'Extreme Fear';  color = '#22c55e'; signal = 'Oversold — good buying opportunity'; }

    return {
      score, sentiment, color, signal,
      components: {
        momentum:   { value: momentum,   weight: '30%' },
        volatility: { value: volatility, weight: '25%' },
        breadth:    { value: breadth,    weight: '25%' },
        putCall:    { value: putCall,    weight: '20%' }
      },
      marketData: {
        nifty:       nifty?.price?.toFixed(2) || 'N/A',
        niftyChange: nifty?.changePercent?.toFixed(2) || '0',
        vix:         vix.toFixed(2)
      },
      timestamp: new Date()
    };

  } catch (error) {
    console.error('Sentiment error:', error.message);
    return {
      score: 50, sentiment: 'Neutral', color: '#6b7280',
      signal: 'Data unavailable', components: null, marketData: null,
      timestamp: new Date()
    };
  }
}

// ─── Put/Call ratio data (for PutCallRatio component) ────────────────────────
async function getPutCallRatioData() {
  try {
    const vixData = await fetchQuote('^INDIAVIX');
    const vix = vixData?.price || 15;

    let ratio;
    if      (vix < 12) ratio = 0.65;
    else if (vix < 15) ratio = 0.85;
    else if (vix < 18) ratio = 1.05;
    else if (vix < 25) ratio = 1.35;
    else               ratio = 1.65;

    let signal, color;
    if      (ratio < 0.7)  { signal = 'Extreme Bullish'; color = '#22c55e'; }
    else if (ratio < 1.0)  { signal = 'Bullish';         color = '#3b82f6'; }
    else if (ratio < 1.2)  { signal = 'Neutral';         color = '#6b7280'; }
    else if (ratio < 1.5)  { signal = 'Bearish';         color = '#f59e0b'; }
    else                   { signal = 'Extreme Bearish'; color = '#dc2626'; }

    const explanation =
      ratio < 0.7  ? 'Very low put/call ratio — excessive optimism, market may be overbought.' :
      ratio < 1.0  ? 'Bullish sentiment dominates. More calls being bought than puts.' :
      ratio < 1.2  ? 'Balanced sentiment. Equal interest in calls and puts.' :
      ratio < 1.5  ? 'Bearish sentiment increasing. More puts bought for protection.' :
                     'Very high put/call ratio indicates fear — potential buying opportunity.';

    return { ratio: ratio.toFixed(2), signal, color, explanation, timestamp: new Date() };

  } catch (error) {
    console.error('PutCall error:', error.message);
    return { ratio: '1.00', signal: 'Neutral', color: '#6b7280', explanation: 'Data unavailable', timestamp: new Date() };
  }
}

module.exports = { calculateMarketSentiment, getPutCallRatioData };
