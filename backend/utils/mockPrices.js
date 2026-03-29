// mockPrices.js — Live-ish price fallback when ALL APIs fail
// Used when NSE Bhavcopy + NSE Index API + Stooq are all unreachable
// Returns mock prices that LOOK live: seed price ± small random daily move
// Refreshed every 2 minutes to simulate market movement
// JAI SHREE GANESH 🙏

const SEED_PRICES = {
  'RELIANCE.NS':   1285, 'TCS.NS':        3890, 'HDFCBANK.NS':   1620, 'INFY.NS':        1820,
  'ICICIBANK.NS':  1245, 'HINDUNILVR.NS': 2340, 'ITC.NS':         465, 'SBIN.NS':         825,
  'BHARTIARTL.NS': 1620, 'KOTAKBANK.NS':  1890, 'LT.NS':         3580, 'AXISBANK.NS':    1125,
  'BAJFINANCE.NS': 6840, 'MARUTI.NS':    12450, 'WIPRO.NS':       580, 'HCLTECH.NS':     1680,
  'ASIANPAINT.NS': 2280, 'NESTLEIND.NS':  2240, 'TITAN.NS':      3450, 'SUNPHARMA.NS':   1820,
  'POWERGRID.NS':   320, 'NTPC.NS':        365, 'ONGC.NS':        265, 'TATAMOTORS.NS':   780,
  'TATASTEEL.NS':   145, 'ADANIPORTS.NS': 1285, 'ULTRACEMCO.NS':11250, 'TECHM.NS':       1580,
  'INDUSINDBK.NS':  960, 'BAJAJFINSV.NS': 1680, 'DRREDDY.NS':    6240, 'DIVISLAB.NS':    5280,
  'CIPLA.NS':      1580, 'APOLLOHOSP.NS': 6840, 'JSWSTEEL.NS':    980, 'HINDALCO.NS':     680,
  'COALINDIA.NS':   450, 'BPCL.NS':        320, 'EICHERMOT.NS':  4850, 'HEROMOTOCO.NS':  4650,
  'TATACONSUM.NS':  890, 'GRASIM.NS':     2680, 'BRITANNIA.NS':  5240, 'SHREECEM.NS':   27500,
  'PIDILITIND.NS': 2840, 'HAVELLS.NS':    1680, 'VOLTAS.NS':     1380, 'DABUR.NS':        580,
  'MARICO.NS':      645, 'COLPAL.NS':     2850, 'MUTHOOTFIN.NS': 1980, 'CHOLAFIN.NS':    1285,
  'BALKRISIND.NS': 2680, 'PERSISTENT.NS': 5480, 'COFORGE.NS':    7240, 'LTTS.NS':        5480,
  'MPHASIS.NS':    2980, 'INDHOTEL.NS':    680, 'LALPATHLAB.NS': 2380, 'METROPOLIS.NS':  1980,
  'DEEPAKNTR.NS':  2240, 'FINEORG.NS':    5240, 'BIKAJI.NS':      780,
  // Also handle without .NS suffix
  'RELIANCE':   1285, 'TCS':        3890, 'HDFCBANK':   1620, 'INFY':        1820,
  'ICICIBANK':  1245, 'HINDUNILVR': 2340, 'ITC':         465, 'SBIN':         825,
  'BHARTIARTL': 1620, 'KOTAKBANK':  1890, 'LT':         3580, 'AXISBANK':    1125,
  'BAJFINANCE': 6840, 'MARUTI':    12450, 'WIPRO':       580, 'HCLTECH':     1680,
  'ONGC':        265, 'NTPC':        365, 'POWERGRID':   320, 'COALINDIA':    450,
  // Indices
  '^NSEI':   22400, '^BSESN': 73800, '^NSEBANK': 48500, 'GC=F': 6200,
};

// Cache mock prices with tiny random drift — refreshed every 2 min
let mockCache = null;
let mockCacheTime = 0;
const MOCK_TTL = 2 * 60 * 1000; // 2 minutes

function getDailyDrift(symbol) {
  // Deterministic per-symbol daily drift so it's consistent per day
  const day  = new Date().toISOString().substring(0, 10);
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + parseInt(day.replace(/-/g,''));
  const x    = Math.sin(seed) * 10000;
  return (x - Math.floor(x) - 0.5) * 0.04; // -2% to +2% drift per day
}

function buildMockPrices() {
  const result = {};
  for (const [sym, base] of Object.entries(SEED_PRICES)) {
    const drift     = getDailyDrift(sym);
    const price     = +(base * (1 + drift)).toFixed(2);
    const prevClose = base;
    const change    = +(price - prevClose).toFixed(2);
    const changePct = +((change / prevClose) * 100).toFixed(2);

    result[sym] = {
      symbol:           sym,
      name:             sym.replace('.NS',''),
      price,
      previousClose:    prevClose,
      change,
      changePercent:    changePct,
      open:             +(price * (1 - Math.abs(drift) * 0.3)).toFixed(2),
      dayHigh:          +(price * 1.008).toFixed(2),
      dayLow:           +(price * 0.992).toFixed(2),
      volume:           Math.floor(1_000_000 + Math.random() * 5_000_000),
      fiftyTwoWeekHigh: +(base * 1.35).toFixed(2),
      fiftyTwoWeekLow:  +(base * 0.72).toFixed(2),
      marketCap:        0,
      beta:             null,
      source:           'mock',
    };
  }
  return result;
}

function getMockPrices() {
  if (!mockCache || Date.now() - mockCacheTime > MOCK_TTL) {
    mockCache     = buildMockPrices();
    mockCacheTime = Date.now();
  }
  return mockCache;
}

function getMockPrice(symbol) {
  const prices = getMockPrices();
  return prices[symbol] || prices[symbol.replace('.NS','')] || null;
}

module.exports = { getMockPrices, getMockPrice, SEED_PRICES };
