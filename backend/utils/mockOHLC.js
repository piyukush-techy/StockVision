// mockOHLC.js — Realistic NSE OHLCV generator for offline/blocked environments
// Used as fallback when Stooq/Yahoo is unreachable (ISP blocking)
// Generates statistically realistic Indian stock price history
// JAI SHREE GANESH 🙏

// Seed prices for all tracked NSE stocks
const BASE_PRICES = {
  'RELIANCE':   1285, 'TCS':        3890, 'HDFCBANK':   1620, 'INFY':       1820,
  'ICICIBANK':  1245, 'HINDUNILVR': 2340, 'ITC':         465, 'SBIN':        825,
  'BHARTIARTL': 1620, 'KOTAKBANK':  1890, 'LT':         3580, 'AXISBANK':   1125,
  'BAJFINANCE': 6840, 'MARUTI':    12450, 'WIPRO':       580, 'HCLTECH':    1680,
  'ASIANPAINT': 2280, 'NESTLEIND':  2240, 'TITAN':      3450, 'SUNPHARMA':  1820,
  'POWERGRID':   320, 'NTPC':        365, 'ONGC':        265, 'TATAMOTORS':  780,
  'TATASTEEL':   145, 'ADANIPORTS': 1285, 'ULTRACEMCO':11250, 'TECHM':      1580,
  'INDUSINDBK':  960, 'BAJAJFINSV':1680,  'DRREDDY':    6240, 'DIVISLAB':   5280,
  'CIPLA':      1580, 'APOLLOHOSP': 6840, 'JSWSTEEL':    980, 'HINDALCO':    680,
  'COALINDIA':   450, 'BPCL':        320, 'EICHERMOT':  4850, 'HEROMOTOCO': 4650,
  'TATACONSUM':  890, 'GRASIM':     2680, 'BRITANNIA':  5240, 'SHREECEM':  27500,
  'NIFTY50':   22400, 'BANKNIFTY': 48500, 'FINNIFTY':  21800,
};

// Deterministic seeded random (so same symbol always gives same base pattern)
function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Generate realistic NSE OHLCV candles for a symbol over N days
 * Uses geometric Brownian motion with drift + volatility clustering
 */
function generateMockOHLC(symbol, days = 60) {
  const clean  = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
  const base   = BASE_PRICES[clean] || 1000;
  const rng    = seededRand(hashStr(clean));

  // Stock-specific params
  const dailyVol  = 0.012 + rng() * 0.010; // 1.2% - 2.2% daily volatility (realistic NSE)
  const drift     = 0.0003 + rng() * 0.0004; // slight upward drift
  const avgVol    = (5_000_000 + rng() * 20_000_000) * (base < 500 ? 5 : 1); // share volume

  const candles  = [];
  const today    = new Date();
  let   price    = base;

  // Walk backwards from today to generate historical prices
  const dates = [];
  let d = new Date(today);
  while (dates.length < days) {
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) { // skip weekends
      dates.unshift(d.toISOString().substring(0, 10));
    }
  }

  // Generate prices forward using GBM
  let p = base * (0.85 + rng() * 0.3); // start 85-115% of current price
  let volCluster = 1.0;

  for (let i = 0; i < dates.length; i++) {
    // Volatility clustering (GARCH-like): high vol begets high vol
    volCluster = 0.85 * volCluster + 0.15 * (0.5 + rng());

    const dayVol    = dailyVol * volCluster;
    const dailyRet  = drift + dayVol * (rng() * 2 - 1) * 1.41; // normal approx
    const closeRaw  = p * (1 + dailyRet);

    // Realistic OHLC construction
    const intraVol  = dayVol * 0.7;
    const open      = p * (1 + (rng() - 0.5) * intraVol);
    const close     = closeRaw;
    const direction = close >= open ? 1 : -1;
    const high      = Math.max(open, close) * (1 + rng() * intraVol * 0.8);
    const low       = Math.min(open, close) * (1 - rng() * intraVol * 0.8);

    // Volume: higher on big moves
    const absRet   = Math.abs(dailyRet);
    const volMult  = 0.5 + absRet / dayVol;
    const volume   = Math.round(avgVol * volMult * (0.7 + rng() * 0.6));

    candles.push({
      date:   dates[i],
      open:   +open.toFixed(2),
      high:   +high.toFixed(2),
      low:    +low.toFixed(2),
      close:  +close.toFixed(2),
      volume: volume,
    });

    p = closeRaw;
  }

  return candles;
}

module.exports = { generateMockOHLC };
