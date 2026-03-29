// optionsFetcher.js — Options Chain data for NSE stocks
// Phase 6 Month 29: Options Chain Analyser
// Uses NSE India's public API (no key needed)

const axios = require('axios');

const NSE_BASE = 'https://www.nseindia.com';
const NSE_OPTIONS_URL = 'https://www.nseindia.com/api/option-chain-equities';
const NSE_INDEX_OPTIONS_URL = 'https://www.nseindia.com/api/option-chain-indices';

// NSE requires these headers to mimic a browser request
const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.nseindia.com/option-chain',
  'X-Requested-With': 'XMLHttpRequest',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

// Cookie session — NSE requires a valid session cookie
let nseSessionCookie = '';
let lastCookieTime = 0;
const COOKIE_REFRESH_MS = 5 * 60 * 1000; // refresh every 5 min

async function getNSECookie() {
  const now = Date.now();
  if (nseSessionCookie && (now - lastCookieTime) < COOKIE_REFRESH_MS) {
    return nseSessionCookie;
  }
  try {
    const resp = await axios.get(NSE_BASE, {
      headers: {
        'User-Agent': NSE_HEADERS['User-Agent'],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000,
    });
    const cookies = resp.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      nseSessionCookie = cookies.map(c => c.split(';')[0]).join('; ');
      lastCookieTime = now;
    }
  } catch (err) {
    console.warn('NSE cookie fetch failed:', err.message);
  }
  return nseSessionCookie;
}

// Fetch option chain from NSE
// symbol: RELIANCE (no .NS), or NIFTY / BANKNIFTY for indices
async function fetchOptionChain(symbol) {
  const isIndex = ['NIFTY', 'BANKNIFTY', 'NIFTYIT', 'MIDCPNIFTY', 'FINNIFTY'].includes(symbol.toUpperCase());
  const url = isIndex ? NSE_INDEX_OPTIONS_URL : NSE_OPTIONS_URL;

  try {
    const cookie = await getNSECookie();
    const resp = await axios.get(url, {
      params: { symbol: symbol.toUpperCase() },
      headers: { ...NSE_HEADERS, Cookie: cookie },
      timeout: 15000,
    });

    const data = resp.data;
    if (!data || !data.records || !data.records.data) {
      throw new Error('Invalid options data from NSE');
    }

    return processOptionChain(data, symbol);
  } catch (err) {
    console.error(`Options fetch failed for ${symbol}:`, err.message);
    // Return mock data so frontend doesn't break
    return generateMockOptionChain(symbol);
  }
}

// Process raw NSE data into clean structure
function processOptionChain(raw, symbol) {
  const records = raw.records;
  const filtered = raw.filtered;

  const underlyingValue = records.underlyingValue || filtered.underlyingValue || 0;
  const expiryDates = records.expiryDates || [];

  // Group by strike price
  const chainMap = {};
  for (const item of records.data) {
    const strike = item.strikePrice;
    if (!chainMap[strike]) chainMap[strike] = { strikePrice: strike, CE: null, PE: null };
    if (item.CE) chainMap[strike].CE = cleanOptionData(item.CE);
    if (item.PE) chainMap[strike].PE = cleanOptionData(item.PE);
  }

  const chain = Object.values(chainMap).sort((a, b) => a.strikePrice - b.strikePrice);

  // Calculate max pain
  const maxPain = calculateMaxPain(chain);

  // Calculate PCR
  const totalPEOI = chain.reduce((s, r) => s + (r.PE?.openInterest || 0), 0);
  const totalCEOI = chain.reduce((s, r) => s + (r.CE?.openInterest || 0), 0);
  const pcr = totalCEOI > 0 ? +(totalPEOI / totalCEOI).toFixed(3) : 0;

  // IV skew — difference between ATM put and call IV
  const atmStrike = findATMStrike(chain, underlyingValue);
  const atmRow = chain.find(r => r.strikePrice === atmStrike);
  const ivSkew = atmRow
    ? +((atmRow.PE?.impliedVolatility || 0) - (atmRow.CE?.impliedVolatility || 0)).toFixed(2)
    : 0;

  // Support & resistance from max OI
  const maxCEOIRow = [...chain].sort((a, b) => (b.CE?.openInterest || 0) - (a.CE?.openInterest || 0))[0];
  const maxPEOIRow = [...chain].sort((a, b) => (b.PE?.openInterest || 0) - (a.PE?.openInterest || 0))[0];

  return {
    symbol: symbol.toUpperCase(),
    underlyingValue,
    expiryDates,
    chain,
    maxPain,
    pcr,
    ivSkew,
    totalCEOI,
    totalPEOI,
    resistanceLevel: maxCEOIRow?.strikePrice || 0,   // Highest CE OI = resistance
    supportLevel:    maxPEOIRow?.strikePrice || 0,    // Highest PE OI = support
    atmStrike,
    sentiment: pcr > 1.2 ? 'Bullish' : pcr < 0.8 ? 'Bearish' : 'Neutral',
    timestamp: new Date().toISOString(),
  };
}

function cleanOptionData(opt) {
  return {
    openInterest:      opt.openInterest      || 0,
    changeinOpenInterest: opt.changeinOpenInterest || 0,
    totalTradedVolume: opt.totalTradedVolume  || 0,
    impliedVolatility: opt.impliedVolatility  || 0,
    lastPrice:         opt.lastPrice          || 0,
    change:            opt.change             || 0,
    pChange:           opt.pChange            || 0,
    bidQty:            opt.bidQty             || 0,
    bidprice:          opt.bidprice           || 0,
    askQty:            opt.askQty             || 0,
    askPrice:          opt.askPrice           || 0,
    underlyingValue:   opt.underlyingValue    || 0,
    expiryDate:        opt.expiryDate         || '',
  };
}

// Max Pain = strike where total option pain is maximum for writers (minimum for buyers)
function calculateMaxPain(chain) {
  let minPain = Infinity;
  let maxPainStrike = 0;

  for (const row of chain) {
    const strike = row.strikePrice;
    let totalPain = 0;

    for (const r of chain) {
      const ceOI = r.CE?.openInterest || 0;
      const peOI = r.PE?.openInterest || 0;

      if (r.strikePrice < strike) {
        // CE in money: pain = (strike - r.strikePrice) * CE OI
        totalPain += (strike - r.strikePrice) * ceOI;
      } else if (r.strikePrice > strike) {
        // PE in money: pain = (r.strikePrice - strike) * PE OI
        totalPain += (r.strikePrice - strike) * peOI;
      }
    }

    if (totalPain < minPain) {
      minPain = totalPain;
      maxPainStrike = strike;
    }
  }

  return maxPainStrike;
}

function findATMStrike(chain, spotPrice) {
  if (!chain.length || !spotPrice) return 0;
  return chain.reduce((prev, curr) =>
    Math.abs(curr.strikePrice - spotPrice) < Math.abs(prev.strikePrice - spotPrice) ? curr : prev
  ).strikePrice;
}

// Mock data for when NSE is unreachable (common outside market hours)
function generateMockOptionChain(symbol) {
  const basePrice = symbol === 'NIFTY' ? 22500 : symbol === 'BANKNIFTY' ? 47000 : 2500;
  const strikes = [];
  const step = basePrice > 10000 ? 100 : basePrice > 1000 ? 50 : 10;
  const atmStrike = Math.round(basePrice / step) * step;

  for (let i = -10; i <= 10; i++) {
    const strike = atmStrike + (i * step);
    const distFromATM = Math.abs(i);
    const ceOI = Math.round(Math.random() * 500000 * Math.max(0.1, 1 - distFromATM * 0.08));
    const peOI = Math.round(Math.random() * 500000 * Math.max(0.1, 1 - distFromATM * 0.08));

    strikes.push({
      strikePrice: strike,
      CE: {
        openInterest: ceOI,
        changeinOpenInterest: Math.round((Math.random() - 0.5) * ceOI * 0.2),
        totalTradedVolume: Math.round(ceOI * 0.3),
        impliedVolatility: +(15 + distFromATM * 2 + Math.random() * 3).toFixed(2),
        lastPrice: +(Math.max(0.1, (i < 0 ? -i * step * 0.85 : 5) + Math.random() * 10)).toFixed(2),
        change: +(Math.random() * 10 - 5).toFixed(2),
        pChange: +(Math.random() * 5 - 2.5).toFixed(2),
        bidQty: Math.round(Math.random() * 5000),
        bidprice: 0,
        askQty:  Math.round(Math.random() * 5000),
        askPrice: 0,
        underlyingValue: basePrice,
        expiryDate: getNextThursday(),
      },
      PE: {
        openInterest: peOI,
        changeinOpenInterest: Math.round((Math.random() - 0.5) * peOI * 0.2),
        totalTradedVolume: Math.round(peOI * 0.3),
        impliedVolatility: +(15 + distFromATM * 2.2 + Math.random() * 3).toFixed(2),
        lastPrice: +(Math.max(0.1, (i > 0 ? i * step * 0.85 : 5) + Math.random() * 10)).toFixed(2),
        change: +(Math.random() * 10 - 5).toFixed(2),
        pChange: +(Math.random() * 5 - 2.5).toFixed(2),
        bidQty: Math.round(Math.random() * 5000),
        bidprice: 0,
        askQty:  Math.round(Math.random() * 5000),
        askPrice: 0,
        underlyingValue: basePrice,
        expiryDate: getNextThursday(),
      },
    });
  }

  const chain = strikes;
  const maxPain = calculateMaxPain(chain);
  const totalCEOI = chain.reduce((s, r) => s + (r.CE?.openInterest || 0), 0);
  const totalPEOI = chain.reduce((s, r) => s + (r.PE?.openInterest || 0), 0);
  const pcr = totalCEOI > 0 ? +(totalPEOI / totalCEOI).toFixed(3) : 1;

  const maxCEOIRow = [...chain].sort((a, b) => (b.CE?.openInterest || 0) - (a.CE?.openInterest || 0))[0];
  const maxPEOIRow = [...chain].sort((a, b) => (b.PE?.openInterest || 0) - (a.PE?.openInterest || 0))[0];

  return {
    symbol: symbol.toUpperCase(),
    underlyingValue: basePrice,
    expiryDates: [getNextThursday(), getFollowingThursday()],
    chain,
    maxPain,
    pcr,
    ivSkew: +(Math.random() * 4 - 2).toFixed(2),
    totalCEOI,
    totalPEOI,
    resistanceLevel: maxCEOIRow?.strikePrice || atmStrike + step * 3,
    supportLevel:    maxPEOIRow?.strikePrice || atmStrike - step * 3,
    atmStrike,
    sentiment: pcr > 1.2 ? 'Bullish' : pcr < 0.8 ? 'Bearish' : 'Neutral',
    isMockData: true,
    mockReason: 'NSE API unavailable (market closed or connection issue)',
    timestamp: new Date().toISOString(),
  };
}

function getNextThursday() {
  const d = new Date();
  const day = d.getDay();
  const daysUntilThursday = (4 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilThursday);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getFollowingThursday() {
  const d = new Date();
  const day = d.getDay();
  const daysUntilThursday = (4 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilThursday + 7);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

module.exports = { fetchOptionChain };
