const axios = require('axios');

/**
 * Market Regime Classifier — Phase 2 Month 8
 * Classifies stocks into BULL / BEAR / SIDEWAYS regimes
 */

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// ─── Fetch historical data using axios (same as scanner.js) ──────────────────
async function getHistoricalData(symbol, days = 252) {
  try {
    // Convert days to years for Yahoo API
    const years = Math.ceil(days / 252);
    const range = `${years}y`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

    console.log(`[Regime] Fetching ${symbol} data for ${days} days...`);

    const res = await axios.get(url, {
      params: { interval: '1d', range },
      headers: HEADERS,
      timeout: 10000
    });

    const result = res.data?.chart?.result?.[0];
    if (!result) throw new Error('No data from Yahoo');

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const volumes = quotes.volume || [];

    const candles = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000),
      open: opens[i],
      high: highs[i],
      low: lows[i],
      close: closes[i],
      volume: volumes[i]
    })).filter(c => c.close != null);

    if (candles.length < 50) {
      throw new Error(`Insufficient data: only ${candles.length} candles`);
    }

    console.log(`[Regime] ✅ Fetched ${candles.length} candles for ${symbol}`);
    return candles;

  } catch (error) {
    console.error(`[Regime] ❌ Failed to fetch ${symbol}:`, error.message);
    return null;
  }
}

// ─── Calculate moving average ─────────────────────────────────────────────────
function calculateMA(data, period) {
  const ma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ma.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((s, d) => s + d.close, 0);
      ma.push(sum / period);
    }
  }
  return ma;
}

// ─── Calculate volatility (annualized %) ──────────────────────────────────────
function calculateVolatility(data, period = 20) {
  const vols = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      vols.push(null);
      continue;
    }
    const returns = [];
    for (let j = i - period + 1; j <= i; j++) {
      const r = (data[j].close - data[j - 1].close) / data[j - 1].close;
      returns.push(r);
    }
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const annualizedVol = stdDev * Math.sqrt(252) * 100;
    vols.push(annualizedVol);
  }
  return vols;
}

// ─── Classify current regime ──────────────────────────────────────────────────
async function classifyCurrentRegime(symbol) {
  try {
    const data = await getHistoricalData(symbol, 252);
    if (!data) return getDefaultRegime();

    const ma50 = calculateMA(data, 50);
    const ma200 = calculateMA(data, 200);
    const volatility = calculateVolatility(data, 20);

    const idx = data.length - 1;
    const price = data[idx].close;
    const m50 = ma50[idx];
    const m200 = ma200[idx];
    const vol = volatility[idx];

    if (!m50 || !m200 || !vol) return getDefaultRegime();

    const priceVsMA50 = ((price - m50) / m50) * 100;
    const priceVsMA200 = ((price - m200) / m200) * 100;
    const ma50VsMA200 = ((m50 - m200) / m200) * 100;

    // Count trend duration
    let trendDays = 0;
    const trendDir = price > m50 ? 'up' : 'down';
    for (let i = idx; i >= Math.max(0, idx - 90); i--) {
      if (trendDir === 'up' && data[i].close > ma50[i]) trendDays++;
      else if (trendDir === 'down' && data[i].close < ma50[i]) trendDays++;
      else break;
    }

    let regime = 'SIDEWAYS';
    let confidence = 0;
    let description = '';
    let color = '#6b7280';

    const highVol = vol > 25;

    // Strong bull
    if (priceVsMA50 > 3 && priceVsMA200 > 5 && ma50VsMA200 > 2) {
      regime = highVol ? 'VOLATILE_BULL' : 'BULL';
      confidence = Math.min(95, 60 + priceVsMA200 * 2 + trendDays / 2);
      description = 'Strong uptrend. Price above both 50-day and 200-day moving averages.';
      color = highVol ? '#f59e0b' : '#22c55e';
    }
    // Strong bear
    else if (priceVsMA50 < -3 && priceVsMA200 < -5 && ma50VsMA200 < -2) {
      regime = highVol ? 'VOLATILE_BEAR' : 'BEAR';
      confidence = Math.min(95, 60 + Math.abs(priceVsMA200) * 2 + trendDays / 2);
      description = 'Strong downtrend. Price below both 50-day and 200-day moving averages.';
      color = highVol ? '#f59e0b' : '#dc2626';
    }
    // Sideways
    else if (Math.abs(priceVsMA50) < 2 && Math.abs(ma50VsMA200) < 1) {
      regime = 'SIDEWAYS';
      confidence = Math.min(90, 50 + (10 - Math.abs(priceVsMA50)) * 3);
      description = 'Rangebound market. No clear directional trend.';
      color = '#6b7280';
    }
    // Weak bull
    else if (priceVsMA50 > 0 && priceVsMA200 > 0) {
      regime = 'BULL';
      confidence = Math.min(85, 40 + priceVsMA200 * 3);
      description = 'Uptrend, but less established. Price above key moving averages.';
      color = '#3b82f6';
    }
    // Weak bear
    else if (priceVsMA50 < 0 && priceVsMA200 < 0) {
      regime = 'BEAR';
      confidence = Math.min(85, 40 + Math.abs(priceVsMA200) * 3);
      description = 'Downtrend, but less established. Price below key moving averages.';
      color = '#ef4444';
    }

    return {
      regime,
      confidence: Math.round(confidence),
      color,
      description,
      metrics: {
        priceVsMA50: priceVsMA50.toFixed(2),
        priceVsMA200: priceVsMA200.toFixed(2),
        ma50VsMA200: ma50VsMA200.toFixed(2),
        volatility: vol.toFixed(2),
        trendDays
      },
      prices: { current: price, ma50: m50, ma200: m200 },
      timestamp: new Date()
    };

  } catch (error) {
    console.error('[Regime] Classification error:', error.message);
    return getDefaultRegime();
  }
}

// ─── Analyze regime history (last 12 months) ─────────────────────────────────
async function analyzeRegimeHistory(symbol) {
  try {
    const data = await getHistoricalData(symbol, 365);
    if (!data) return null;

    const ma50 = calculateMA(data, 50);
    const ma200 = calculateMA(data, 200);

    const regimes = [];
    let currentRegime = null;
    let regimeStart = 0;

    for (let i = 50; i < data.length; i++) {
      const price = data[i].close;
      const m50 = ma50[i];
      const m200 = ma200[i];

      if (!m50 || !m200) continue;

      const pctVsMA50 = ((price - m50) / m50) * 100;
      const pctVsMA200 = ((price - m200) / m200) * 100;
      const maVsMA = ((m50 - m200) / m200) * 100;

      let regime = 'SIDEWAYS';
      if (pctVsMA50 > 3 && pctVsMA200 > 5 && maVsMA > 2) regime = 'BULL';
      else if (pctVsMA50 < -3 && pctVsMA200 < -5 && maVsMA < -2) regime = 'BEAR';
      else if (Math.abs(pctVsMA50) < 2 && Math.abs(maVsMA) < 1) regime = 'SIDEWAYS';
      else if (pctVsMA50 > 0 && pctVsMA200 > 0) regime = 'BULL';
      else if (pctVsMA50 < 0 && pctVsMA200 < 0) regime = 'BEAR';

      if (currentRegime !== regime) {
        if (currentRegime) {
          const startPrice = data[regimeStart].close;
          const endPrice = data[i - 1].close;
          const returnPct = ((endPrice - startPrice) / startPrice) * 100;
          const duration = i - regimeStart;
          regimes.push({
            regime: currentRegime,
            startDate: data[regimeStart].date,
            endDate: data[i - 1].date,
            duration,
            returnPct: parseFloat(returnPct.toFixed(2))
          });
        }
        currentRegime = regime;
        regimeStart = i;
      }
    }

    // Close last regime
    if (currentRegime) {
      const startPrice = data[regimeStart].close;
      const endPrice = data[data.length - 1].close;
      const returnPct = ((endPrice - startPrice) / startPrice) * 100;
      const duration = data.length - regimeStart;
      regimes.push({
        regime: currentRegime,
        startDate: data[regimeStart].date,
        endDate: data[data.length - 1].date,
        duration,
        returnPct: parseFloat(returnPct.toFixed(2))
      });
    }

    // Stats
    const totalDays = data.length - 50;
    const bullDays = regimes.filter(r => r.regime === 'BULL').reduce((s, r) => s + r.duration, 0);
    const bearDays = regimes.filter(r => r.regime === 'BEAR').reduce((s, r) => s + r.duration, 0);
    const sideDays = regimes.filter(r => r.regime === 'SIDEWAYS').reduce((s, r) => s + r.duration, 0);

    return {
      regimes: regimes.slice(-12),
      stats: {
        pctInBull: parseFloat(((bullDays / totalDays) * 100).toFixed(1)),
        pctInBear: parseFloat(((bearDays / totalDays) * 100).toFixed(1)),
        pctInSidways: parseFloat(((sideDays / totalDays) * 100).toFixed(1)),
        avgRegimeDuration: Math.round(totalDays / regimes.length)
      },
      timestamp: new Date()
    };

  } catch (error) {
    console.error('[Regime] History error:', error.message);
    return null;
  }
}

// ─── Sector regime mapping ───────────────────────────────────────────────────
const SECTOR_INDICES = {
  'Technology': '^CNXIT',
  'Financials': '^NSEBANK',
  'Energy': '^CNXENERGY',
  'Pharma': '^CNXPHARMA',
  'Auto': '^CNXAUTO',
  'Metals': '^CNXMETAL',
  'FMCG': '^CNXFMCG',
  'Real Estate': '^CNXREALTY',
  'Infrastructure': '^CNXINFRA',
  'Consumer Goods': '^CNXFMCG'
};

async function getSectorRegime(sector) {
  const indexSymbol = SECTOR_INDICES[sector];
  if (!indexSymbol) {
    return { regime: 'UNKNOWN', confidence: 0, description: 'Sector index not found' };
  }
  return await classifyCurrentRegime(indexSymbol);
}

// ─── Fallback ─────────────────────────────────────────────────────────────────
function getDefaultRegime() {
  return {
    regime: 'UNKNOWN',
    confidence: 0,
    color: '#6b7280',
    description: 'Unable to determine market regime. Insufficient data or transitional period between regimes.',
    metrics: null,
    prices: null,
    timestamp: new Date()
  };
}

module.exports = {
  classifyCurrentRegime,
  analyzeRegimeHistory,
  getSectorRegime,
  getHistoricalData
};
