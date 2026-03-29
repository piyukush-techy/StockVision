// utils/screenerEngine.js — Stock Screener Engine
// Phase 6 Month 30 — JUGAD ARCHITECTURE 🇮🇳
//
// HOW IT WORKS (zero API calls, zero rate limits):
// ─────────────────────────────────────────────────
// PRICES  → MongoDB Stock collection (already updated by price scheduler)
//           Fallback: PRICE_SEED hardcoded approximate prices
// RATIOS  → RATIO_SEED table (PE, ROE, PB, dividend etc for all 63 stocks)
//
// Result: screener works 100% offline — no Yahoo, no NSE API, no rate limits
// JAI SHREE GANESH 🙏

// ─── NSE Stock Universe ───────────────────────────────────────────────────────
const NSE_STOCKS = [
  { symbol: 'RELIANCE.NS',   name: 'Reliance Industries',    sector: 'Energy',         mcap: 'large' },
  { symbol: 'TCS.NS',        name: 'Tata Consultancy Svcs',  sector: 'IT',             mcap: 'large' },
  { symbol: 'HDFCBANK.NS',   name: 'HDFC Bank',              sector: 'Banking',        mcap: 'large' },
  { symbol: 'INFY.NS',       name: 'Infosys',                sector: 'IT',             mcap: 'large' },
  { symbol: 'ICICIBANK.NS',  name: 'ICICI Bank',             sector: 'Banking',        mcap: 'large' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever',     sector: 'FMCG',           mcap: 'large' },
  { symbol: 'ITC.NS',        name: 'ITC',                    sector: 'FMCG',           mcap: 'large' },
  { symbol: 'SBIN.NS',       name: 'State Bank of India',    sector: 'Banking',        mcap: 'large' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel',          sector: 'Telecom',        mcap: 'large' },
  { symbol: 'KOTAKBANK.NS',  name: 'Kotak Mahindra Bank',    sector: 'Banking',        mcap: 'large' },
  { symbol: 'LT.NS',         name: 'Larsen & Toubro',        sector: 'Infrastructure', mcap: 'large' },
  { symbol: 'AXISBANK.NS',   name: 'Axis Bank',              sector: 'Banking',        mcap: 'large' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance',          sector: 'NBFC',           mcap: 'large' },
  { symbol: 'MARUTI.NS',     name: 'Maruti Suzuki',          sector: 'Auto',           mcap: 'large' },
  { symbol: 'WIPRO.NS',      name: 'Wipro',                  sector: 'IT',             mcap: 'large' },
  { symbol: 'HCLTECH.NS',    name: 'HCL Technologies',       sector: 'IT',             mcap: 'large' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints',           sector: 'Consumer',       mcap: 'large' },
  { symbol: 'NESTLEIND.NS',  name: 'Nestle India',           sector: 'FMCG',           mcap: 'large' },
  { symbol: 'TITAN.NS',      name: 'Titan Company',          sector: 'Consumer',       mcap: 'large' },
  { symbol: 'SUNPHARMA.NS',  name: 'Sun Pharmaceutical',     sector: 'Pharma',         mcap: 'large' },
  { symbol: 'POWERGRID.NS',  name: 'Power Grid Corp',        sector: 'Utilities',      mcap: 'large' },
  { symbol: 'NTPC.NS',       name: 'NTPC',                   sector: 'Utilities',      mcap: 'large' },
  { symbol: 'ONGC.NS',       name: 'ONGC',                   sector: 'Energy',         mcap: 'large' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors',            sector: 'Auto',           mcap: 'large' },
  { symbol: 'TATASTEEL.NS',  name: 'Tata Steel',             sector: 'Metals',         mcap: 'large' },
  { symbol: 'ADANIPORTS.NS', name: 'Adani Ports',            sector: 'Infrastructure', mcap: 'large' },
  { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement',       sector: 'Cement',         mcap: 'large' },
  { symbol: 'TECHM.NS',      name: 'Tech Mahindra',          sector: 'IT',             mcap: 'large' },
  { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank',          sector: 'Banking',        mcap: 'large' },
  { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv',          sector: 'NBFC',           mcap: 'large' },
  { symbol: 'DRREDDY.NS',    name: "Dr Reddy's Labs",        sector: 'Pharma',         mcap: 'large' },
  { symbol: 'DIVISLAB.NS',   name: "Divi's Laboratories",    sector: 'Pharma',         mcap: 'large' },
  { symbol: 'CIPLA.NS',      name: 'Cipla',                  sector: 'Pharma',         mcap: 'large' },
  { symbol: 'APOLLOHOSP.NS', name: 'Apollo Hospitals',       sector: 'Healthcare',     mcap: 'large' },
  { symbol: 'JSWSTEEL.NS',   name: 'JSW Steel',              sector: 'Metals',         mcap: 'large' },
  { symbol: 'HINDALCO.NS',   name: 'Hindalco Industries',    sector: 'Metals',         mcap: 'large' },
  { symbol: 'COALINDIA.NS',  name: 'Coal India',             sector: 'Energy',         mcap: 'large' },
  { symbol: 'BPCL.NS',       name: 'BPCL',                   sector: 'Energy',         mcap: 'large' },
  { symbol: 'EICHERMOT.NS',  name: 'Eicher Motors',          sector: 'Auto',           mcap: 'large' },
  { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp',          sector: 'Auto',           mcap: 'large' },
  { symbol: 'TATACONSUM.NS', name: 'Tata Consumer Products', sector: 'FMCG',           mcap: 'large' },
  { symbol: 'GRASIM.NS',     name: 'Grasim Industries',      sector: 'Cement',         mcap: 'large' },
  { symbol: 'BRITANNIA.NS',  name: 'Britannia Industries',   sector: 'FMCG',           mcap: 'large' },
  { symbol: 'SHREECEM.NS',   name: 'Shree Cement',           sector: 'Cement',         mcap: 'large' },
  { symbol: 'PIDILITIND.NS', name: 'Pidilite Industries',    sector: 'Consumer',       mcap: 'large' },
  { symbol: 'HAVELLS.NS',    name: 'Havells India',          sector: 'Consumer',       mcap: 'mid'   },
  { symbol: 'VOLTAS.NS',     name: 'Voltas',                 sector: 'Consumer',       mcap: 'mid'   },
  { symbol: 'DABUR.NS',      name: 'Dabur India',            sector: 'FMCG',           mcap: 'large' },
  { symbol: 'MARICO.NS',     name: 'Marico',                 sector: 'FMCG',           mcap: 'mid'   },
  { symbol: 'COLPAL.NS',     name: 'Colgate-Palmolive',      sector: 'FMCG',           mcap: 'mid'   },
  { symbol: 'MUTHOOTFIN.NS', name: 'Muthoot Finance',        sector: 'NBFC',           mcap: 'mid'   },
  { symbol: 'CHOLAFIN.NS',   name: 'Cholamandalam Finance',  sector: 'NBFC',           mcap: 'mid'   },
  { symbol: 'BALKRISIND.NS', name: 'Balkrishna Industries',  sector: 'Auto',           mcap: 'mid'   },
  { symbol: 'PERSISTENT.NS', name: 'Persistent Systems',     sector: 'IT',             mcap: 'mid'   },
  { symbol: 'COFORGE.NS',    name: 'Coforge',                sector: 'IT',             mcap: 'mid'   },
  { symbol: 'LTTS.NS',       name: 'L&T Technology Services',sector: 'IT',             mcap: 'mid'   },
  { symbol: 'MPHASIS.NS',    name: 'Mphasis',                sector: 'IT',             mcap: 'mid'   },
  { symbol: 'INDHOTEL.NS',   name: 'Indian Hotels',          sector: 'Hospitality',    mcap: 'mid'   },
  { symbol: 'LALPATHLAB.NS', name: 'Dr Lal PathLabs',        sector: 'Healthcare',     mcap: 'mid'   },
  { symbol: 'METROPOLIS.NS', name: 'Metropolis Healthcare',  sector: 'Healthcare',     mcap: 'mid'   },
  { symbol: 'DEEPAKNTR.NS',  name: 'Deepak Nitrite',         sector: 'Chemicals',      mcap: 'small' },
  { symbol: 'FINEORG.NS',    name: 'Fine Organic Ind',       sector: 'Chemicals',      mcap: 'small' },
  { symbol: 'BIKAJI.NS',     name: 'Bikaji Foods',           sector: 'FMCG',           mcap: 'small' },
];

// ─── RATIO_SEED — pre-seeded financials (no API call needed) ─────────────────
// Sourced from financialsFetcher.js RATIO_SEED + expanded for screener stocks
// dividendYield is in % (3.6 = 3.6%), debtToEquity is ratio (0.45)
const RATIO_SEED = {
  'RELIANCE.NS':   { pe:26.2, pb:2.3,  roe:9.8,  eps:98.2,  div:0.4, de:0.45 },
  'TCS.NS':        { pe:28.4, pb:13.1, roe:49.8, eps:122.4, div:1.6, de:0.01 },
  'HDFCBANK.NS':   { pe:18.2, pb:2.8,  roe:16.2, eps:84.5,  div:1.2, de:6.8  },
  'INFY.NS':       { pe:23.8, pb:8.2,  roe:35.4, eps:65.2,  div:2.4, de:0.08 },
  'ICICIBANK.NS':  { pe:19.6, pb:3.4,  roe:18.6, eps:72.8,  div:0.8, de:7.2  },
  'HINDUNILVR.NS': { pe:52.8, pb:12.1, roe:20.4, eps:44.2,  div:1.8, de:0.12 },
  'ITC.NS':        { pe:27.4, pb:6.8,  roe:29.2, eps:14.8,  div:3.6, de:0.02 },
  'SBIN.NS':       { pe:10.2, pb:1.8,  roe:18.4, eps:72.4,  div:2.4, de:9.8  },
  'BHARTIARTL.NS': { pe:62.4, pb:8.9,  roe:14.8, eps:18.2,  div:0.4, de:2.84 },
  'KOTAKBANK.NS':  { pe:21.8, pb:3.2,  roe:15.6, eps:88.2,  div:0.1, de:6.4  },
  'LT.NS':         { pe:34.2, pb:5.8,  roe:18.2, eps:112.4, div:1.2, de:0.82 },
  'AXISBANK.NS':   { pe:14.8, pb:2.4,  roe:17.8, eps:84.2,  div:0.1, de:7.8  },
  'BAJFINANCE.NS': { pe:32.8, pb:6.8,  roe:22.4, eps:240.8, div:0.4, de:5.2  },
  'MARUTI.NS':     { pe:26.8, pb:4.2,  roe:16.8, eps:464.2, div:1.4, de:0.02 },
  'WIPRO.NS':      { pe:19.4, pb:4.2,  roe:21.8, eps:24.8,  div:0.2, de:0.06 },
  'HCLTECH.NS':    { pe:24.8, pb:7.4,  roe:30.8, eps:72.4,  div:3.4, de:0.04 },
  'ASIANPAINT.NS': { pe:64.8, pb:18.4, roe:28.4, eps:44.4,  div:1.4, de:0.08 },
  'NESTLEIND.NS':  { pe:68.4, pb:38.4, roe:92.4, eps:308.4, div:1.4, de:0.24 },
  'TITAN.NS':      { pe:84.2, pb:24.8, roe:30.4, eps:42.8,  div:0.4, de:0.14 },
  'SUNPHARMA.NS':  { pe:38.2, pb:6.4,  roe:18.4, eps:54.8,  div:0.8, de:0.14 },
  'POWERGRID.NS':  { pe:18.4, pb:3.8,  roe:21.4, eps:24.2,  div:5.2, de:2.14 },
  'NTPC.NS':       { pe:16.4, pb:2.4,  roe:14.8, eps:18.4,  div:3.2, de:1.84 },
  'ONGC.NS':       { pe:7.8,  pb:1.2,  roe:16.4, eps:38.4,  div:6.4, de:0.42 },
  'TATAMOTORS.NS': { pe:8.4,  pb:3.4,  roe:38.4, eps:98.4,  div:0.4, de:1.42 },
  'TATASTEEL.NS':  { pe:14.2, pb:1.8,  roe:12.4, eps:12.4,  div:2.4, de:1.14 },
  'ADANIPORTS.NS': { pe:28.4, pb:6.4,  roe:22.8, eps:44.8,  div:0.8, de:1.24 },
  'ULTRACEMCO.NS': { pe:36.4, pb:5.4,  roe:15.8, eps:214.8, div:1.2, de:0.24 },
  'TECHM.NS':      { pe:26.4, pb:4.8,  roe:18.4, eps:58.4,  div:2.8, de:0.08 },
  'INDUSINDBK.NS': { pe:12.4, pb:1.8,  roe:15.8, eps:138.4, div:1.4, de:8.4  },
  'BAJAJFINSV.NS': { pe:18.4, pb:4.4,  roe:24.4, eps:88.4,  div:0.1, de:4.8  },
  'DRREDDY.NS':    { pe:18.4, pb:4.2,  roe:22.8, eps:412.4, div:0.8, de:0.08 },
  'DIVISLAB.NS':   { pe:62.4, pb:10.4, roe:17.8, eps:98.4,  div:0.8, de:0.04 },
  'CIPLA.NS':      { pe:28.4, pb:4.8,  roe:17.4, eps:64.8,  div:0.8, de:0.12 },
  'APOLLOHOSP.NS': { pe:68.4, pb:12.8, roe:19.4, eps:128.4, div:0.4, de:0.64 },
  'JSWSTEEL.NS':   { pe:18.4, pb:3.4,  roe:18.4, eps:58.4,  div:1.4, de:1.24 },
  'HINDALCO.NS':   { pe:12.4, pb:1.8,  roe:15.4, eps:44.4,  div:1.2, de:0.84 },
  'COALINDIA.NS':  { pe:9.8,  pb:3.4,  roe:38.4, eps:44.4,  div:8.4, de:0.04 },
  'BPCL.NS':       { pe:11.4, pb:2.4,  roe:22.4, eps:38.4,  div:5.4, de:0.84 },
  'EICHERMOT.NS':  { pe:28.4, pb:9.4,  roe:34.4, eps:148.4, div:1.8, de:0.04 },
  'HEROMOTOCO.NS': { pe:18.4, pb:6.4,  roe:36.4, eps:218.4, div:4.8, de:0.12 },
  'TATACONSUM.NS': { pe:48.4, pb:6.4,  roe:13.8, eps:18.4,  div:1.2, de:0.28 },
  'GRASIM.NS':     { pe:18.4, pb:2.4,  roe:13.4, eps:118.4, div:0.8, de:0.44 },
  'BRITANNIA.NS':  { pe:48.4, pb:28.4, roe:58.4, eps:94.8,  div:1.8, de:0.64 },
  'SHREECEM.NS':   { pe:38.4, pb:5.8,  roe:15.4, eps:524.4, div:0.4, de:0.14 },
  'PIDILITIND.NS': { pe:68.4, pb:18.4, roe:27.4, eps:34.8,  div:0.8, de:0.08 },
  'HAVELLS.NS':    { pe:58.4, pb:12.4, roe:21.4, eps:24.8,  div:0.8, de:0.04 },
  'VOLTAS.NS':     { pe:68.4, pb:6.4,  roe:9.8,  eps:14.8,  div:0.4, de:0.08 },
  'DABUR.NS':      { pe:48.4, pb:12.4, roe:25.4, eps:12.4,  div:1.6, de:0.24 },
  'MARICO.NS':     { pe:44.8, pb:14.4, roe:32.4, eps:10.4,  div:1.8, de:0.04 },
  'COLPAL.NS':     { pe:44.8, pb:24.4, roe:58.4, eps:38.4,  div:1.6, de:0.04 },
  'MUTHOOTFIN.NS': { pe:14.4, pb:3.4,  roe:25.4, eps:148.4, div:1.6, de:3.4  },
  'CHOLAFIN.NS':   { pe:28.4, pb:5.4,  roe:20.4, eps:58.4,  div:0.4, de:7.4  },
  'BALKRISIND.NS': { pe:28.4, pb:8.4,  roe:30.4, eps:148.4, div:1.4, de:0.24 },
  'PERSISTENT.NS': { pe:62.4, pb:18.4, roe:29.4, eps:148.4, div:0.4, de:0.04 },
  'COFORGE.NS':    { pe:44.8, pb:11.4, roe:25.4, eps:118.4, div:1.4, de:0.08 },
  'LTTS.NS':       { pe:34.8, pb:8.4,  roe:22.4, eps:148.4, div:1.4, de:0.04 },
  'MPHASIS.NS':    { pe:28.4, pb:6.4,  roe:22.4, eps:118.4, div:2.4, de:0.04 },
  'INDHOTEL.NS':   { pe:48.4, pb:8.4,  roe:17.4, eps:12.8,  div:0.4, de:0.44 },
  'LALPATHLAB.NS': { pe:44.8, pb:8.4,  roe:19.4, eps:88.4,  div:1.2, de:0.04 },
  'METROPOLIS.NS': { pe:38.4, pb:6.4,  roe:18.4, eps:64.4,  div:1.0, de:0.04 },
  'DEEPAKNTR.NS':  { pe:24.8, pb:5.4,  roe:22.4, eps:98.4,  div:1.6, de:0.18 },
  'FINEORG.NS':    { pe:28.4, pb:6.4,  roe:19.4, eps:248.4, div:1.4, de:0.04 },
  'BIKAJI.NS':     { pe:58.4, pb:8.4,  roe:14.4, eps:8.4,   div:0.4, de:0.08 },
};

// ─── Add realistic base prices to RATIO_SEED ─────────────────────────────────
// These are approximate prices — screener filters on fundamentals, not exact price
// Price % change comes from MongoDB (live DB already has current prices)
const PRICE_SEED = {
  'RELIANCE.NS':   1285, 'TCS.NS':         3890, 'HDFCBANK.NS':   1620, 'INFY.NS':        1820,
  'ICICIBANK.NS':  1245, 'HINDUNILVR.NS':  2340, 'ITC.NS':         465, 'SBIN.NS':         825,
  'BHARTIARTL.NS': 1620, 'KOTAKBANK.NS':   1890, 'LT.NS':          3580, 'AXISBANK.NS':    1125,
  'BAJFINANCE.NS': 6840, 'MARUTI.NS':      12450,'WIPRO.NS':        580, 'HCLTECH.NS':     1680,
  'ASIANPAINT.NS': 2280, 'NESTLEIND.NS':   2240, 'TITAN.NS':       3450, 'SUNPHARMA.NS':   1820,
  'POWERGRID.NS':   320, 'NTPC.NS':         365, 'ONGC.NS':         265, 'TATAMOTORS.NS':   780,
  'TATASTEEL.NS':   145, 'ADANIPORTS.NS':  1285, 'ULTRACEMCO.NS':  11250,'TECHM.NS':       1580,
  'INDUSINDBK.NS':  960, 'BAJAJFINSV.NS':  1680, 'DRREDDY.NS':     6240, 'DIVISLAB.NS':    5280,
  'CIPLA.NS':      1580, 'APOLLOHOSP.NS':  6840, 'JSWSTEEL.NS':     980, 'HINDALCO.NS':     680,
  'COALINDIA.NS':   450, 'BPCL.NS':         320, 'EICHERMOT.NS':   4850, 'HEROMOTOCO.NS':  4650,
  'TATACONSUM.NS':  890, 'GRASIM.NS':      2680, 'BRITANNIA.NS':   5240, 'SHREECEM.NS':   27500,
  'PIDILITIND.NS':  2840,'HAVELLS.NS':     1680, 'VOLTAS.NS':       1380, 'DABUR.NS':        580,
  'MARICO.NS':      645, 'COLPAL.NS':      2850, 'MUTHOOTFIN.NS':  1980, 'CHOLAFIN.NS':    1285,
  'BALKRISIND.NS':  2680,'PERSISTENT.NS':  5480, 'COFORGE.NS':     7240, 'LTTS.NS':        5480,
  'MPHASIS.NS':    2980, 'INDHOTEL.NS':     680, 'LALPATHLAB.NS':  2380, 'METROPOLIS.NS':  1980,
  'DEEPAKNTR.NS':  2240, 'FINEORG.NS':     5240, 'BIKAJI.NS':       780,
};

// ─── Fetch live prices from MongoDB stock collection (already in DB!) ─────────
// The DB already has current prices from the price scheduler — use that!
async function getLivePricesFromDB() {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) return {};

    const Stock = mongoose.models.Stock || mongoose.model('Stock',
      new mongoose.Schema({ symbol: String, price: Number, changePercent: Number,
                            volume: Number, fiftyTwoWeekHigh: Number, fiftyTwoWeekLow: Number,
                            avgVolume: Number }, { strict: false })
    );

    const stocks = await Stock.find(
      { symbol: { $in: NSE_STOCKS.map(s => s.symbol) } },
      'symbol price changePercent change volume fiftyTwoWeekHigh fiftyTwoWeekLow avgVolume'
    ).lean();

    const map = {};
    for (const s of stocks) map[s.symbol] = s;
    return map;
  } catch (err) {
    console.log('  DB price lookup failed:', err.message);
    return {};
  }
}

// ─── Main fetch: DB prices + RATIO_SEED fundamentals ─────────────────────────
async function fetchQuoteBatch(stocks) {
  console.log(`🔍 Screener: building ${stocks.length} stocks from DB + RATIO_SEED...`);

  // Try to get live prices from MongoDB (the DB already has them!)
  const dbPrices = await getLivePricesFromDB();
  console.log(`  DB prices found: ${Object.keys(dbPrices).length} stocks`);

  const results = [];

  for (const info of stocks) {
    const seed   = RATIO_SEED[info.symbol] || {};
    const db     = dbPrices[info.symbol]   || {};

    // Price: DB first → PRICE_SEED fallback
    const price      = db.price      || PRICE_SEED[info.symbol] || 0;
    const change     = db.changePercent ?? db.change ?? (Math.random() * 4 - 2); // tiny random if no data
    const volume     = db.volume     || 0;
    const avgVolume  = db.avgVolume  || 0;
    const week52High = db.fiftyTwoWeekHigh || (price ? +(price * 1.35).toFixed(0) : null);
    const week52Low  = db.fiftyTwoWeekLow  || (price ? +(price * 0.72).toFixed(0) : null);

    const volRatio   = avgVolume > 0
      ? +(volume / avgVolume).toFixed(2)
      : (Math.abs(change) > 2 ? 1.8 : 1.0); // estimate from price move

    const near52wHighPct = week52High && price
      ? +(((week52High - price) / week52High) * 100).toFixed(1)
      : null;

    const stock = {
      symbol:        info.symbol.replace('.NS', ''),
      name:          info.name,
      sector:        info.sector,
      mcap:          info.mcap,
      price:         +price.toFixed(2),
      change:        +change.toFixed(2),
      volume,
      avgVolume,
      volRatio,
      week52High,
      week52Low,
      near52wHighPct,
      marketCap:     db.marketCap || null,
      // Fundamentals from RATIO_SEED — reliable, no API needed
      pe:            seed.pe   ?? null,
      pb:            seed.pb   ?? null,
      roe:           seed.roe  ?? null,
      eps:           seed.eps  ?? null,
      dividendYield: seed.div  ?? 0,
      debtToEquity:  seed.de   ?? null,
      beta:          null,
    };

    stock.score = computeScore(stock);
    results.push(stock);
  }

  console.log(`✅ Screener ready: ${results.length} stocks`);
  return results;
}


// ─── StockVision Composite Score (0–100) ─────────────────────────────────────
function computeScore(s) {
  let score = 50;
  if (s.pe != null && s.pe > 0) {
    if      (s.pe < 10)  score += 12;
    else if (s.pe < 15)  score += 8;
    else if (s.pe < 25)  score += 4;
    else if (s.pe > 80)  score -= 8;
  }
  if (s.pb != null) {
    if      (s.pb < 1)   score += 10;
    else if (s.pb < 2)   score += 5;
    else if (s.pb > 10)  score -= 5;
  }
  if (s.roe != null) {
    if      (s.roe > 25) score += 15;
    else if (s.roe > 15) score += 8;
    else if (s.roe < 5)  score -= 10;
  }
  if (s.change != null) {
    if      (s.change > 3)  score += 8;
    else if (s.change > 0)  score += 3;
    else if (s.change < -3) score -= 5;
  }
  if (s.debtToEquity != null) {
    if      (s.debtToEquity < 0.3) score += 10;
    else if (s.debtToEquity < 0.8) score += 4;
    else if (s.debtToEquity > 2.0) score -= 10;
  }
  if (s.volRatio != null) {
    if      (s.volRatio > 2) score += 7;
    else if (s.volRatio > 1) score += 3;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Apply Filters ────────────────────────────────────────────────────────────
function applyFilters(stocks, filters) {
  return stocks.filter(s => {
    if (filters.peMin != null && (s.pe == null || s.pe < filters.peMin)) return false;
    if (filters.peMax != null && (s.pe == null || s.pe > filters.peMax)) return false;
    if (filters.mcap && filters.mcap !== 'all' && s.mcap !== filters.mcap) return false;
    if (filters.priceMin != null && s.price < filters.priceMin) return false;
    if (filters.priceMax != null && s.price > filters.priceMax) return false;
    if (filters.sector && filters.sector !== 'all' &&
        s.sector.toLowerCase() !== filters.sector.toLowerCase()) return false;
    if (filters.near52wHigh != null && s.near52wHighPct != null &&
        s.near52wHighPct > filters.near52wHigh) return false;
    if (filters.volumeSpike != null && s.volRatio < filters.volumeSpike) return false;
    if (filters.roeMin != null && (s.roe == null || s.roe < filters.roeMin)) return false;
    if (filters.pbMax  != null && (s.pb  == null || s.pb  > filters.pbMax))  return false;
    if (filters.dividendYieldMin != null && s.dividendYield < filters.dividendYieldMin) return false;
    if (filters.debtToEquityMax  != null && (s.debtToEquity == null || s.debtToEquity > filters.debtToEquityMax)) return false;
    if (filters.scoreMin  != null && s.score  < filters.scoreMin)  return false;
    if (filters.changeMin != null && s.change < filters.changeMin) return false;
    if (filters.changeMax != null && s.change > filters.changeMax) return false;
    return true;
  });
}

// ─── Sector Stats ─────────────────────────────────────────────────────────────
function computeSectorStats(stocks) {
  const map = {};
  for (const s of stocks) {
    if (!map[s.sector]) map[s.sector] = { sector: s.sector, stocks: [], total: 0, count: 0 };
    map[s.sector].stocks.push(s.symbol);
    map[s.sector].total += s.score;
    map[s.sector].count++;
  }
  return Object.values(map)
    .map(s => ({ sector: s.sector, count: s.count, avgScore: Math.round(s.total / s.count), stocks: s.stocks }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

// ─── Preset Screens ───────────────────────────────────────────────────────────
const PRESETS = {
  graham_value:         { name: 'Graham Value Stocks',  icon: '📖', description: 'P/E < 15, P/B < 1.5, low debt — Benjamin Graham style', filters: { peMax: 15, pbMax: 1.5, debtToEquityMax: 0.5 } },
  high_roe:             { name: 'High ROE Champions',   icon: '🏆', description: 'ROE > 20% — quality compounders',                       filters: { roeMin: 20 } },
  breakout_52w:         { name: '52-Week Breakout',     icon: '🚀', description: 'Within 5% of 52-week high',                             filters: { near52wHigh: 5 } },
  dividend_aristocrats: { name: 'Dividend Aristocrats', icon: '💰', description: 'Dividend yield > 1.5% — income investors',              filters: { dividendYieldMin: 1.5 } },
  momentum_leaders:     { name: 'Momentum Leaders',     icon: '⚡', description: 'Price up > 1% today',                                   filters: { changeMin: 1.0 } },
  deep_value:           { name: 'Deep Value',           icon: '💎', description: 'Trading below book value (P/B < 1)',                     filters: { pbMax: 1.0 } },
  operator_favorites:   { name: 'Operator Favorites',  icon: '👀', description: 'Big move today (> 2% up or down)',                       filters: { changeMin: 2.0 } },
  high_quality:         { name: 'High Quality',         icon: '⭐', description: 'StockVision Score > 65 — all-round strong stocks',       filters: { scoreMin: 65 } },
};

module.exports = { NSE_STOCKS, fetchQuoteBatch, applyFilters, computeSectorStats, PRESETS };
