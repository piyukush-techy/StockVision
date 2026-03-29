const express = require('express');
const router  = express.Router();
const axios   = require('axios');

/**
 * comparative.js  — Deep Stock Comparison Backend
 *
 * All data fetched live from Yahoo Finance v8 (same proven pattern as scanner.js).
 * No MongoDB dependency for compare data — every field is fetched fresh.
 *
 * Endpoints
 *   POST /api/comparative/multi-compare   { symbols: ['RELIANCE.NS', ...] }
 *   GET  /api/comparative/peers/:symbol
 *   GET  /api/comparative/vs-nifty/:symbol
 */

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// ─── In-memory cache (15 min TTL) ────────────────────────────────────────────
const _cache = new Map();
function getCached(key) {
  const e = _cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > 15 * 60 * 1000) { _cache.delete(key); return null; }
  return e.data;
}
function setCached(key, data) { _cache.set(key, { data, ts: Date.now() }); }

// ─── Fetch quote + fundamentals for one symbol ────────────────────────────────
async function fetchFundamentals(symbol) {
  const cached = getCached(`fund_${symbol}`);
  if (cached) return cached;

  try {
    // v8/chart gives us price + meta (52w, volume, marketCap)
    const chartRes = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      { params: { interval: '1d', range: '1d' }, headers: HEADERS, timeout: 10000 }
    );
    const meta = chartRes.data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('No meta data');

    // v10/quoteSummary gives us PE, PB, ROE, ROCE, D/E, sector etc.
    let summaryData = {};
    try {
      const summRes = await axios.get(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`,
        {
          params: {
            modules: 'defaultKeyStatistics,financialData,summaryProfile,summaryDetail,price'
          },
          headers: HEADERS,
          timeout: 10000
        }
      );
      const result = summRes.data?.quoteSummary?.result?.[0] ?? {};
      const ks  = result.defaultKeyStatistics ?? {};
      const fd  = result.financialData        ?? {};
      const sp  = result.summaryProfile       ?? {};
      const sd  = result.summaryDetail        ?? {};
      const pr  = result.price                ?? {};

      summaryData = {
        name:         pr.longName || pr.shortName || meta.symbol,
        sector:       sp.sector   || 'Unknown',
        industry:     sp.industry || 'Unknown',
        marketCap:    pr.marketCap?.raw            || meta.marketCap || 0,
        pe:           sd.trailingPE?.raw           || ks.trailingPE?.raw            || 0,
        forwardPE:    sd.forwardPE?.raw            || ks.forwardPE?.raw             || 0,
        pb:           ks.priceToBook?.raw          || 0,
        ps:           ks.priceToSalesTrailing12Months?.raw || 0,
        roe:          fd.returnOnEquity?.raw != null ? fd.returnOnEquity.raw * 100   : 0,
        roce:         fd.returnOnAssets?.raw  != null ? fd.returnOnAssets.raw  * 100 : 0,
        debtToEquity: fd.debtToEquity?.raw         || 0,
        currentRatio: fd.currentRatio?.raw         || 0,
        grossMargin:  fd.grossMargins?.raw   != null ? fd.grossMargins.raw   * 100   : 0,
        profitMargin: fd.profitMargins?.raw  != null ? fd.profitMargins.raw  * 100   : 0,
        revenueGrowth: fd.revenueGrowth?.raw != null ? fd.revenueGrowth.raw * 100   : 0,
        earningsGrowth: fd.earningsGrowth?.raw != null ? fd.earningsGrowth.raw * 100 : 0,
        dividendYield: sd.dividendYield?.raw != null ? sd.dividendYield.raw * 100   : 0,
        bookValue:    ks.bookValue?.raw            || 0,
        eps:          ks.trailingEps?.raw          || 0,
        beta:         ks.beta?.raw                 || 0,
      };
    } catch (summErr) {
      console.warn(`[Compare] quoteSummary failed for ${symbol}: ${summErr.message}`);
    }

    const prev  = meta.chartPreviousClose || meta.regularMarketPrice;
    const price = meta.regularMarketPrice;

    const data = {
      symbol,
      name:         summaryData.name     || meta.symbol,
      sector:       summaryData.sector   || 'Unknown',
      industry:     summaryData.industry || 'Unknown',
      price,
      prev,
      change1D:    prev ? ((price - prev) / prev) * 100 : 0,
      marketCap:   summaryData.marketCap || meta.marketCap || 0,
      pe:          summaryData.pe            || 0,
      forwardPE:   summaryData.forwardPE     || 0,
      pb:          summaryData.pb            || 0,
      ps:          summaryData.ps            || 0,
      roe:         summaryData.roe           || 0,
      roce:        summaryData.roce          || 0,
      debtToEquity: summaryData.debtToEquity || 0,
      currentRatio: summaryData.currentRatio || 0,
      grossMargin:  summaryData.grossMargin  || 0,
      profitMargin: summaryData.profitMargin || 0,
      revenueGrowth: summaryData.revenueGrowth   || 0,
      earningsGrowth: summaryData.earningsGrowth || 0,
      dividendYield: summaryData.dividendYield   || 0,
      bookValue:   summaryData.bookValue || 0,
      eps:         summaryData.eps       || 0,
      beta:        summaryData.beta      || 0,
      week52High:  meta.fiftyTwoWeekHigh || 0,
      week52Low:   meta.fiftyTwoWeekLow  || 0,
      avgVolume:   meta.averageDailyVolume3Month || meta.regularMarketVolume || 0,
      volume:      meta.regularMarketVolume || 0,
    };

    setCached(`fund_${symbol}`, data);
    return data;
  } catch (err) {
    console.error(`[Compare] fetchFundamentals failed for ${symbol}:`, err.message);
    return null;
  }
}

// ─── Fetch 3 months of closing prices for correlation ─────────────────────────
async function fetchCloses(symbol) {
  const cached = getCached(`closes_${symbol}`);
  if (cached) return cached;

  try {
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      { params: { interval: '1d', range: '3mo' }, headers: HEADERS, timeout: 12000 }
    );
    const result = res.data?.chart?.result?.[0];
    if (!result) return [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const data = closes.filter(c => c != null);
    setCached(`closes_${symbol}`, data);
    return data;
  } catch {
    return [];
  }
}

// ─── Pearson correlation between two equal-length arrays ─────────────────────
function pearsonCorr(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 5) return null;
  const ax = a.slice(-n), bx = b.slice(-n);
  const ma = ax.reduce((s, v) => s + v, 0) / n;
  const mb = bx.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const ai = ax[i] - ma, bi = bx[i] - mb;
    num += ai * bi; da += ai * ai; db += bi * bi;
  }
  if (da === 0 || db === 0) return null;
  return parseFloat((num / Math.sqrt(da * db)).toFixed(3));
}

// ─── Compute real correlation matrix ─────────────────────────────────────────
async function buildCorrelationMatrix(symbols) {
  const closesMap = {};
  await Promise.all(symbols.map(async s => {
    closesMap[s] = await fetchCloses(s);
  }));

  const matrix = {};
  for (const s1 of symbols) {
    matrix[s1] = {};
    for (const s2 of symbols) {
      if (s1 === s2) {
        matrix[s1][s2] = 1.0;
      } else {
        const corr = pearsonCorr(closesMap[s1], closesMap[s2]);
        matrix[s1][s2] = corr !== null ? corr : 0.5; // fallback if not enough data
      }
    }
  }
  return matrix;
}

// ─── Normalise symbol (add .NS if bare NSE symbol) ───────────────────────────
function normSymbol(s) {
  const u = s.trim().toUpperCase();
  if (u.startsWith('^') || u.includes('.')) return u;
  return u + '.NS';
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comparative/multi-compare
// Body: { symbols: ['RELIANCE.NS', 'TCS.NS', ...] }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/multi-compare', async (req, res) => {
  try {
    const raw = req.body.symbols;
    if (!raw || !Array.isArray(raw) || raw.length < 2) {
      return res.status(400).json({ error: 'Provide at least 2 symbols' });
    }
    if (raw.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 stocks allowed' });
    }

    const symbols = raw.map(normSymbol);
    console.log(`[Compare] multi-compare: ${symbols.join(', ')}`);

    // Fetch fundamentals in parallel (stagger slightly to avoid rate limits)
    const results = await Promise.all(
      symbols.map((s, i) =>
        new Promise(res => setTimeout(res, i * 150))
          .then(() => fetchFundamentals(s))
      )
    );

    const stocks = results.filter(Boolean);
    if (stocks.length === 0) {
      return res.status(404).json({ error: 'No valid stock data found. Check the symbols.' });
    }

    // Compute real correlation matrix only for found symbols
    const foundSymbols = stocks.map(s => s.symbol);
    const correlationMatrix = await buildCorrelationMatrix(foundSymbols);

    // Summary stats
    const withPE  = stocks.filter(s => s.pe   > 0);
    const withROE = stocks.filter(s => s.roe  > 0);
    const withDE  = stocks.filter(s => s.debtToEquity > 0);

    const avgPE  = withPE.length  ? withPE.reduce((a, s)  => a + s.pe,  0) / withPE.length  : 0;
    const avgROE = withROE.length ? withROE.reduce((a, s) => a + s.roe, 0) / withROE.length : 0;
    const avgDE  = withDE.length  ? withDE.reduce((a, s)  => a + s.debtToEquity, 0) / withDE.length : 0;

    res.json({
      stocks,
      correlationMatrix,
      count:    stocks.length,
      missing:  symbols.filter(s => !foundSymbols.includes(s)),
      averages: { pe: +avgPE.toFixed(2), roe: +avgROE.toFixed(2), debtToEquity: +avgDE.toFixed(2) },
      fetchedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('[Compare] multi-compare error:', err.message);
    res.status(500).json({ error: 'Comparison failed. Try again in a moment.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/comparative/peers/:symbol
// Returns sector peers sorted by market cap
// ─────────────────────────────────────────────────────────────────────────────
router.get('/peers/:symbol', async (req, res) => {
  try {
    const symbol = normSymbol(req.params.symbol);
    const data = await fetchFundamentals(symbol);
    if (!data) return res.status(404).json({ error: 'Symbol not found' });

    // Sector peer map (hardcoded for reliability — Yahoo doesn't expose sector search)
    const SECTOR_PEERS = {
      'Technology':     ['TCS.NS','INFY.NS','WIPRO.NS','HCLTECH.NS','TECHM.NS','LTIM.NS','PERSISTENT.NS','MPHASIS.NS','COFORGE.NS'],
      'Financial Services': ['HDFCBANK.NS','ICICIBANK.NS','SBIN.NS','AXISBANK.NS','KOTAKBANK.NS','BAJFINANCE.NS','BAJAJFINSV.NS','INDUSINDBK.NS'],
      'Energy':         ['RELIANCE.NS','ONGC.NS','BPCL.NS','IOC.NS','HINDPETRO.NS','POWERGRID.NS','NTPC.NS','TATAPOWER.NS'],
      'Consumer Defensive': ['HINDUNILVR.NS','ITC.NS','NESTLEIND.NS','BRITANNIA.NS','DABUR.NS','MARICO.NS','GODREJCP.NS'],
      'Consumer Cyclical': ['MARUTI.NS','TATAMOTORS.NS','M&M.NS','BAJAJ-AUTO.NS','HEROMOTOCO.NS','TITAN.NS','TRENT.NS'],
      'Healthcare':     ['SUNPHARMA.NS','DRREDDY.NS','CIPLA.NS','DIVISLAB.NS','BIOCON.NS','AUROPHARMA.NS','TORNTPHARM.NS'],
      'Industrials':    ['LT.NS','SIEMENS.NS','ABB.NS','BHEL.NS','CUMMINSIND.NS','HAVELLS.NS','POLYCAB.NS'],
      'Basic Materials':['TATASTEEL.NS','HINDALCO.NS','JSWSTEEL.NS','COALINDIA.NS','VEDL.NS','GRASIM.NS','ULTRACEMCO.NS'],
      'Communication Services': ['BHARTIARTL.NS','IDEA.NS'],
    };

    const sector = data.sector || 'Technology';
    const peers = (SECTOR_PEERS[sector] || SECTOR_PEERS['Technology'])
      .filter(s => s !== symbol)
      .slice(0, 8);

    const peerData = await Promise.all(
      peers.map((s, i) =>
        new Promise(r => setTimeout(r, i * 120)).then(() => fetchFundamentals(s))
      )
    );

    res.json({
      stock: { symbol: data.symbol, name: data.name, sector: data.sector },
      peers: peerData.filter(Boolean)
    });

  } catch (err) {
    console.error('[Compare] peers error:', err.message);
    res.status(500).json({ error: 'Failed to fetch peers' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/comparative/vs-nifty/:symbol
// Compare stock 1-day return vs Nifty 50
// ─────────────────────────────────────────────────────────────────────────────
router.get('/vs-nifty/:symbol', async (req, res) => {
  try {
    const symbol = normSymbol(req.params.symbol);
    const [stock, nifty] = await Promise.all([
      fetchFundamentals(symbol),
      fetchFundamentals('^NSEI')
    ]);

    if (!stock) return res.status(404).json({ error: 'Symbol not found' });

    const stockRet  = stock.change1D  || 0;
    const niftyRet  = nifty?.change1D || 0;
    const alpha     = stockRet - niftyRet;

    res.json({
      symbol:       stock.symbol,
      name:         stock.name,
      stockReturn:  +stockRet.toFixed(3),
      niftyReturn:  +niftyRet.toFixed(3),
      alpha:        +alpha.toFixed(3),
      interpretation: alpha > 1 ? 'Strongly outperforming Nifty' :
                      alpha > 0 ? 'Outperforming Nifty' :
                      alpha > -1 ? 'Slightly underperforming Nifty' :
                                   'Underperforming Nifty'
    });

  } catch (err) {
    console.error('[Compare] vs-nifty error:', err.message);
    res.status(500).json({ error: 'Failed to compare with Nifty' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/comparative/percentiles/:symbol
// Price position within 52-week range
// ─────────────────────────────────────────────────────────────────────────────
router.get('/percentiles/:symbol', async (req, res) => {
  try {
    const symbol = normSymbol(req.params.symbol);
    const data = await fetchFundamentals(symbol);
    if (!data) return res.status(404).json({ error: 'Symbol not found' });

    const { price, week52Low: low, week52High: high, pe, volume, avgVolume } = data;
    const priceRange    = high - low;
    const pricePct      = priceRange > 0 ? Math.round(((price - low) / priceRange) * 100) : 50;
    const volPct        = avgVolume > 0 ? Math.min(Math.round((volume / avgVolume) * 50), 99) : 50;
    const pePct         = pe > 0 ? Math.min(Math.round((pe / 40) * 100), 99) : 50;

    const interp = p =>
      p >= 80 ? 'Very high' : p >= 60 ? 'Above average' :
      p >= 40 ? 'Average'   : p >= 20 ? 'Below average' : 'Very low';

    res.json({
      symbol: data.symbol,
      name:   data.name,
      percentiles: {
        price:     { current: price,  percentile: pricePct, interpretation: interp(pricePct), range: { low, high } },
        pe:        { current: pe,     percentile: pePct,    interpretation: interp(pePct) },
        volume:    { current: volume, percentile: volPct,   interpretation: interp(volPct) },
      }
    });

  } catch (err) {
    console.error('[Compare] percentiles error:', err.message);
    res.status(500).json({ error: 'Failed to calculate percentiles' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/comparative/cache — clear compare cache
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/cache', (req, res) => {
  _cache.clear();
  res.json({ success: true, message: 'Compare cache cleared' });
});

// ═════════════════════════════════════════════════════════════════════════════
// MONTH 10 — COMPARATIVE INTELLIGENCE
// 4 features: vs Nifty, vs Sector, Peer Strength, Risk-Adjusted
// ═════════════════════════════════════════════════════════════════════════════

// ─── Sector → representative proxy symbol ────────────────────────────────────
const SECTOR_PROXY = {
  'Technology':             '^NSEI',    // use Nifty as fallback (Nifty IT not on Yahoo free)
  'Financial Services':     'NIFTYBANK.NS',
  'Energy':                 'RELIANCE.NS',
  'Healthcare':             'SUNPHARMA.NS',
  'Consumer Cyclical':      'MARUTI.NS',
  'Consumer Defensive':     'HINDUNILVR.NS',
  'Basic Materials':        'TATASTEEL.NS',
  'Industrials':            'LT.NS',
  'Communication Services': 'BHARTIARTL.NS',
  'Unknown':                '^NSEI',
};

const SECTOR_PEER_LIST = {
  'Technology':           ['TCS.NS','INFY.NS','WIPRO.NS','HCLTECH.NS','TECHM.NS','LTIM.NS','PERSISTENT.NS','MPHASIS.NS'],
  'Financial Services':   ['HDFCBANK.NS','ICICIBANK.NS','SBIN.NS','AXISBANK.NS','KOTAKBANK.NS','BAJFINANCE.NS','INDUSINDBK.NS'],
  'Energy':               ['RELIANCE.NS','ONGC.NS','BPCL.NS','IOC.NS','NTPC.NS','TATAPOWER.NS','POWERGRID.NS'],
  'Healthcare':           ['SUNPHARMA.NS','DRREDDY.NS','CIPLA.NS','DIVISLAB.NS','AUROPHARMA.NS','TORNTPHARM.NS'],
  'Consumer Cyclical':    ['MARUTI.NS','TATAMOTORS.NS','M&M.NS','BAJAJ-AUTO.NS','TITAN.NS','TRENT.NS','HEROMOTOCO.NS'],
  'Consumer Defensive':   ['HINDUNILVR.NS','ITC.NS','NESTLEIND.NS','BRITANNIA.NS','DABUR.NS','MARICO.NS'],
  'Basic Materials':      ['TATASTEEL.NS','HINDALCO.NS','JSWSTEEL.NS','COALINDIA.NS','VEDL.NS','GRASIM.NS','ULTRACEMCO.NS'],
  'Industrials':          ['LT.NS','SIEMENS.NS','ABB.NS','BHEL.NS','HAVELLS.NS','POLYCAB.NS','CUMMINSIND.NS'],
  'Communication Services': ['BHARTIARTL.NS','IDEA.NS'],
};

// ─── Core: fetch 1-year daily closes + compute returns + risk metrics ─────────
async function fetchReturnsAndRisk(symbol) {
  const cKey = `rar_${symbol}`;
  const hit  = getCached(cKey);
  if (hit) return hit;

  try {
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      { params: { interval: '1d', range: '1y' }, headers: HEADERS, timeout: 12000 }
    );
    const result = res.data?.chart?.result?.[0];
    if (!result) return null;

    const closes = (result.indicators?.quote?.[0]?.close ?? []).filter(c => c != null);
    if (closes.length < 20) return null;

    const n   = closes.length - 1;
    const ret = (i) => i >= 0 && closes[i] > 0 ? +((closes[n] - closes[i]) / closes[i] * 100).toFixed(2) : null;

    const r1D = n >= 1   ? ret(n - 1)   : null;
    const r1W = n >= 5   ? ret(n - 5)   : null;
    const r1M = n >= 21  ? ret(n - 21)  : null;
    const r3M = n >= 63  ? ret(n - 63)  : null;
    const r6M = n >= 126 ? ret(n - 126) : null;
    const r1Y = closes.length >= 250 ? ret(0) : null;

    // Annualised volatility from daily log-returns
    const window   = closes.slice(-Math.min(252, closes.length));
    const dRets    = window.slice(1).map((c, i) => Math.log(c / window[i]));
    const mean     = dRets.reduce((s, v) => s + v, 0) / dRets.length;
    const variance = dRets.reduce((s, v) => s + (v - mean) ** 2, 0) / dRets.length;
    const vol      = +(Math.sqrt(variance * 252) * 100).toFixed(2);

    // Max drawdown (1Y)
    let peak = -Infinity, maxDD = 0;
    for (const c of window) {
      if (c > peak) peak = c;
      const dd = (c - peak) / peak;
      if (dd < maxDD) maxDD = dd;
    }
    const drawdown = +(maxDD * 100).toFixed(2);

    // Sharpe (risk-free = 6.5% Indian repo ÷ 252)
    const rfDay   = 0.065 / 252;
    const excess  = dRets.map(r => r - rfDay);
    const exMean  = excess.reduce((s, v) => s + v, 0) / excess.length;
    const exStd   = Math.sqrt(excess.reduce((s, v) => s + (v - exMean) ** 2, 0) / excess.length);
    const sharpe  = exStd > 0 ? +(exMean / exStd * Math.sqrt(252)).toFixed(2) : null;

    // Sortino (downside deviation only)
    const downRets  = dRets.filter(r => r < rfDay);
    const downStd   = downRets.length > 2
      ? Math.sqrt(downRets.reduce((s, v) => s + (v - rfDay) ** 2, 0) / downRets.length)
      : null;
    const sortino   = downStd && downStd > 0
      ? +(exMean * 252 / (downStd * Math.sqrt(252))).toFixed(2) : null;

    // Calmar = annualised return / |max drawdown|
    const annRet  = r1Y !== null ? r1Y : (r6M !== null ? r6M * 2 : null);
    const calmar  = annRet !== null && drawdown < 0
      ? +(annRet / Math.abs(drawdown)).toFixed(2) : null;

    const out = { symbol, r1D, r1W, r1M, r3M, r6M, r1Y, vol, drawdown, sharpe, sortino, calmar, price: closes[n] };
    setCached(cKey, out);
    return out;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// M10 #1 — GET /api/comparative/vs-nifty-full/:symbol
// Multi-period return comparison + risk side-by-side vs Nifty 50
// ─────────────────────────────────────────────────────────────────────────────
router.get('/vs-nifty-full/:symbol', async (req, res) => {
  try {
    const symbol = normSymbol(req.params.symbol);
    const [stock, nifty] = await Promise.all([
      fetchReturnsAndRisk(symbol),
      fetchReturnsAndRisk('^NSEI'),
    ]);
    if (!stock) return res.status(404).json({ error: 'Symbol not found or insufficient history (need 20+ days)' });

    const PERIODS = [
      { key: 'r1D', label: '1 Day' },
      { key: 'r1W', label: '1 Week' },
      { key: 'r1M', label: '1 Month' },
      { key: 'r3M', label: '3 Months' },
      { key: 'r6M', label: '6 Months' },
      { key: 'r1Y', label: '1 Year' },
    ];

    const periods = PERIODS.map(({ key, label }) => {
      const sRet = stock[key];
      const nRet = nifty?.[key] ?? null;
      const alpha = sRet != null && nRet != null ? +(sRet - nRet).toFixed(2) : null;
      return { key, label, stockRet: sRet, niftyRet: nRet, alpha, outperforms: alpha !== null ? alpha > 0 : null };
    });

    const scored    = periods.filter(p => p.alpha !== null);
    const outCount  = scored.filter(p => p.outperforms).length;
    const verdict   =
      outCount >= 5 ? 'Strong Outperformer'        :
      outCount >= 4 ? 'Outperformer'                :
      outCount >= 3 ? 'Mixed / Market Tracker'      :
      outCount >= 2 ? 'Underperformer'              :
                      'Consistent Underperformer';

    // Get name
    const fund = await fetchFundamentals(symbol);

    res.json({
      symbol,
      name: fund?.name || symbol,
      periods,
      verdict,
      outperformCount: outCount,
      totalPeriods:    scored.length,
      riskComparison: {
        stock: { sharpe: stock.sharpe, sortino: stock.sortino, calmar: stock.calmar, vol: stock.vol, drawdown: stock.drawdown },
        nifty: { sharpe: nifty?.sharpe??null, sortino: nifty?.sortino??null, calmar: nifty?.calmar??null, vol: nifty?.vol??null, drawdown: nifty?.drawdown??null },
      },
    });
  } catch (e) {
    console.error('[M10 vs-nifty-full]', e.message);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// M10 #2 — GET /api/comparative/vs-sector/:symbol
// Stock returns vs sector benchmark proxy across all time periods
// ─────────────────────────────────────────────────────────────────────────────
router.get('/vs-sector/:symbol', async (req, res) => {
  try {
    const symbol = normSymbol(req.params.symbol);
    const fund   = await fetchFundamentals(symbol);
    if (!fund) return res.status(404).json({ error: 'Symbol not found' });

    const sector    = fund.sector || 'Unknown';
    const sectorSym = SECTOR_PROXY[sector] || '^NSEI';

    const [stock, benchmark, nifty] = await Promise.all([
      fetchReturnsAndRisk(symbol),
      fetchReturnsAndRisk(sectorSym),
      fetchReturnsAndRisk('^NSEI'),
    ]);
    if (!stock) return res.status(404).json({ error: 'Insufficient historical data for ' + symbol });

    const PERIODS = ['r1D','r1W','r1M','r3M','r6M','r1Y'];
    const LABELS  = { r1D:'1 Day', r1W:'1 Week', r1M:'1 Month', r3M:'3 Months', r6M:'6 Months', r1Y:'1 Year' };

    const rows = PERIODS.map(key => ({
      label:         LABELS[key],
      stockRet:      stock[key],
      sectorRet:     benchmark?.[key]  ?? null,
      niftyRet:      nifty?.[key]      ?? null,
      alphaVsSector: stock[key] != null && benchmark?.[key] != null ? +(stock[key] - benchmark[key]).toFixed(2) : null,
      alphaVsNifty:  stock[key] != null && nifty?.[key]    != null ? +(stock[key] - nifty[key]).toFixed(2)    : null,
    }));

    const sectorAlphas = rows.map(r => r.alphaVsSector).filter(v => v !== null);
    const outCount     = sectorAlphas.filter(a => a > 0).length;

    res.json({
      symbol,
      name:        fund.name,
      sector,
      sectorProxy: sectorSym,
      rows,
      summary: {
        outperformCount:  outCount,
        totalPeriods:     sectorAlphas.length,
        verdict:          outCount >= 4 ? 'Sector Leader' : outCount >= 2 ? 'In Line with Sector' : 'Sector Laggard',
        stockVol:         stock.vol,
        sectorVol:        benchmark?.vol      ?? null,
        stockDrawdown:    stock.drawdown,
        sectorDrawdown:   benchmark?.drawdown ?? null,
        stockSharpe:      stock.sharpe,
        sectorSharpe:     benchmark?.sharpe   ?? null,
      },
    });
  } catch (e) {
    console.error('[M10 vs-sector]', e.message);
    res.status(500).json({ error: 'Sector analysis failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// M10 #3 — GET /api/comparative/peer-strength/:symbol
// Rank stock vs all sector peers; compute composite relative-strength score
// ─────────────────────────────────────────────────────────────────────────────
router.get('/peer-strength/:symbol', async (req, res) => {
  try {
    const symbol = normSymbol(req.params.symbol);
    const fund   = await fetchFundamentals(symbol);
    if (!fund) return res.status(404).json({ error: 'Symbol not found' });

    const sector   = fund.sector || 'Technology';
    const peerList = SECTOR_PEER_LIST[sector] || SECTOR_PEER_LIST['Technology'];
    const allSyms  = [...new Set([symbol, ...peerList.slice(0, 7)])];

    // Staggered parallel fetch — 120 ms apart to avoid rate-limits
    const rets = await Promise.all(
      allSyms.map((s, i) => new Promise(ok => setTimeout(ok, i * 120)).then(() => fetchReturnsAndRisk(s)))
    );

    const peers = rets
      .map((r, i) => r ? { ...r, symbol: allSyms[i], isTarget: allSyms[i] === symbol } : null)
      .filter(Boolean);

    if (!peers.length) return res.status(404).json({ error: 'No peer data available' });

    // Build per-period rankings
    const RANK_PERIODS = ['r1M','r3M','r6M','r1Y'];
    const rankings     = {};
    for (const p of RANK_PERIODS) {
      const valid      = peers.filter(x => x[p] != null).sort((a, b) => b[p] - a[p]);
      rankings[p]      = valid.map((x, i) => ({ symbol: x.symbol, ret: x[p], rank: i + 1, total: valid.length, isTarget: x.isTarget }));
    }

    // Composite RS score = average percentile across periods
    const pctScores = RANK_PERIODS.map(p => {
      const row = rankings[p].find(r => r.isTarget);
      return row ? Math.round((1 - (row.rank - 1) / row.total) * 100) : null;
    }).filter(v => v !== null);

    const rsScore = pctScores.length
      ? Math.round(pctScores.reduce((s, v) => s + v, 0) / pctScores.length) : 50;

    const rsLabel =
      rsScore >= 80 ? 'Top Performer 🏆'   :
      rsScore >= 60 ? 'Above Average 📈'   :
      rsScore >= 40 ? 'Average ↔️'         :
      rsScore >= 20 ? 'Below Average 📉'   : 'Laggard ⚠️';

    res.json({
      symbol,
      name:    fund.name,
      sector,
      rsScore,
      rsLabel,
      peers: peers.map(p => ({
        symbol:   p.symbol,
        r1M:      p.r1M,
        r3M:      p.r3M,
        r6M:      p.r6M,
        r1Y:      p.r1Y,
        vol:      p.vol,
        sharpe:   p.sharpe,
        drawdown: p.drawdown,
        isTarget: p.isTarget,
      })),
      rankings,
    });
  } catch (e) {
    console.error('[M10 peer-strength]', e.message);
    res.status(500).json({ error: 'Peer analysis failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// M10 #4 — GET /api/comparative/risk-adjusted/:symbol
// Sharpe / Sortino / Calmar / Information Ratio vs Nifty benchmark
// ─────────────────────────────────────────────────────────────────────────────
router.get('/risk-adjusted/:symbol', async (req, res) => {
  try {
    const symbol = normSymbol(req.params.symbol);
    const [data, nifty, fund] = await Promise.all([
      fetchReturnsAndRisk(symbol),
      fetchReturnsAndRisk('^NSEI'),
      fetchFundamentals(symbol),
    ]);
    if (!data) return res.status(404).json({ error: 'Symbol not found or insufficient history' });

    // Information ratio = 1Y alpha / tracking-error proxy
    const alpha1Y      = data.r1Y != null && nifty?.r1Y != null ? +(data.r1Y - nifty.r1Y).toFixed(2) : null;
    const trackingErr  = data.vol  != null && nifty?.vol  != null ? +Math.abs(data.vol - nifty.vol).toFixed(2) : null;
    const infoRatio    = alpha1Y != null && trackingErr != null && trackingErr > 0
      ? +(alpha1Y / trackingErr).toFixed(2) : null;

    // Composite risk-adjusted score 0–100
    let score = 50;
    if (data.sharpe   != null) score += Math.min(25, Math.max(-25, data.sharpe  * 12));
    if (infoRatio     != null) score += Math.min(15, Math.max(-15, infoRatio    *  8));
    if (data.calmar   != null) score += Math.min(10, Math.max(-10, data.calmar  *  3));
    score = Math.max(0, Math.min(100, Math.round(score)));

    const scoreLabel =
      score >= 80 ? 'Exceptional'  :
      score >= 65 ? 'Good'         :
      score >= 50 ? 'Average'      :
      score >= 35 ? 'Poor'         : 'Very Poor';

    const scoreBg =
      score >= 65 ? 'green' : score >= 45 ? 'yellow' : 'red';

    res.json({
      symbol,
      name:   fund?.name   || symbol,
      sector: fund?.sector || 'Unknown',
      score,
      scoreLabel,
      scoreBg,
      metrics: {
        sharpe:      data.sharpe,
        sortino:     data.sortino,
        calmar:      data.calmar,
        infoRatio,
        alpha1Y,
        trackingErr,
        vol:         data.vol,
        drawdown:    data.drawdown,
        ret1Y:       data.r1Y,
      },
      nifty: {
        sharpe:   nifty?.sharpe   ?? null,
        sortino:  nifty?.sortino  ?? null,
        calmar:   nifty?.calmar   ?? null,
        vol:      nifty?.vol      ?? null,
        drawdown: nifty?.drawdown ?? null,
        ret1Y:    nifty?.r1Y      ?? null,
      },
      interpret: {
        sharpe:
          data.sharpe == null ? 'N/A — insufficient data' :
          data.sharpe >= 2 ? 'Excellent — strong return per unit of risk (>2)' :
          data.sharpe >= 1 ? 'Good — solid risk-adjusted performance (1–2)' :
          data.sharpe >= 0 ? 'Acceptable — positive but modest (0–1)' :
                             'Poor — returns do not justify risk taken (<0)',
        drawdown:
          data.drawdown == null ? 'N/A' :
          data.drawdown >= -10 ? 'Low drawdown — historically stable price' :
          data.drawdown >= -25 ? 'Moderate drawdown — normal for equities' :
          data.drawdown >= -40 ? 'High drawdown — significant peak-to-trough loss' :
                                 'Very high drawdown — extreme loss from peak',
        alpha:
          alpha1Y == null ? 'N/A — insufficient data' :
          alpha1Y >= 10   ? `Strong outperformance: +${alpha1Y}% above Nifty` :
          alpha1Y >= 0    ? `Mild outperformance: +${alpha1Y}% above Nifty` :
          alpha1Y >= -5   ? `Slight underperformance: ${alpha1Y}% vs Nifty` :
                            `Significant underperformance: ${alpha1Y}% vs Nifty`,
      },
    });
  } catch (e) {
    console.error('[M10 risk-adjusted]', e.message);
    res.status(500).json({ error: 'Risk analysis failed' });
  }
});

module.exports = router;
