// backend/utils/agentTools.js — Phase 6 Month 27 (Gemini Fixed)
// Tool schemas in Gemini format (UPPERCASE types, parameters not input_schema)

const { fetchStockPrice, fetchStockMetadata } = require('./priceFetcher');
const { fetchStockNews }    = require('./newsFetcher');
const { runFullScan }       = require('./scanner');
const { classifyCurrentRegime } = require('./regimeClassifier');
const Watchlist = require('../models/Watchlist');
const Stock     = require('../models/Stock');
const Alert     = require('../models/Alert');

// ─── Tool Schemas (Gemini functionDeclarations format) ────────────────────────
const TOOL_SCHEMAS = [
  {
    name: 'get_portfolio_watchlist',
    description: "Get all of the user's watchlists and their stocks with current live prices. Use this to answer questions about the user's holdings or which stocks they are tracking.",
    parameters: {
      type: 'OBJECT',
      properties: {
        sessionId: { type: 'STRING', description: 'The user session ID' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'get_stock_price',
    description: "Get the current live price, OHLC, volume, day change %, and 52-week range for a stock.",
    parameters: {
      type: 'OBJECT',
      properties: {
        symbol: { type: 'STRING', description: 'NSE stock symbol with .NS suffix, e.g. RELIANCE.NS' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_stock_financials',
    description: 'Get key financial ratios: PE ratio, ROE, ROA, profit margins, debt/equity, EPS, dividend yield, market cap, beta. Use for fundamental analysis.',
    parameters: {
      type: 'OBJECT',
      properties: {
        symbol: { type: 'STRING', description: 'NSE stock symbol with .NS suffix' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'run_historical_scanner',
    description: 'Run the historical sliding-window scanner: what % of the time did this stock achieve Y% gain within Z days? Returns success rate, label, avg time to target, avg max drawdown.',
    parameters: {
      type: 'OBJECT',
      properties: {
        symbol:     { type: 'STRING',  description: 'NSE stock symbol with .NS suffix' },
        targetPct:  { type: 'NUMBER',  description: 'Target gain percentage, e.g. 15 for 15%' },
        windowDays: { type: 'INTEGER', description: 'Maximum holding period in calendar days, e.g. 90' },
      },
      required: ['symbol', 'targetPct', 'windowDays'],
    },
  },
  {
    name: 'get_market_regime',
    description: 'Get the current market regime: Bull, Bear, or Sideways, with confidence score. Pass NIFTY for overall market.',
    parameters: {
      type: 'OBJECT',
      properties: {
        symbol: { type: 'STRING', description: 'NSE stock symbol with .NS suffix, or NIFTY for overall market' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_stock_news',
    description: 'Get the latest news headlines and sentiment (Positive/Negative/Neutral) for a stock.',
    parameters: {
      type: 'OBJECT',
      properties: {
        symbol: { type: 'STRING', description: 'NSE stock symbol with .NS suffix' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'search_stocks',
    description: 'Search for stocks by company name or partial symbol. Use when the user says a company name instead of a symbol.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Company name or partial symbol to search for' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_trending_stocks',
    description: 'Get the most-watched and highest-volume stocks on StockVision right now with live prices.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_user_alerts',
    description: "Get all the price alerts the user has set — which stocks, price targets, and whether they've been triggered.",
    parameters: {
      type: 'OBJECT',
      properties: {
        sessionId: { type: 'STRING', description: 'The user session ID' },
      },
      required: ['sessionId'],
    },
  },
];

// ─── Executors ────────────────────────────────────────────────────────────────

async function execute_get_portfolio_watchlist({ sessionId }) {
  try {
    const watchlists = await Watchlist.find({ sessionId }).lean();
    if (!watchlists.length) return { found: false, message: 'No watchlists found. The user has not added any stocks yet.' };

    const allSymbols = [...new Set(watchlists.flatMap(w => w.stocks.map(s => s.symbol)))];
    const priceMap   = {};
    await Promise.allSettled(allSymbols.map(async sym => {
      try { priceMap[sym] = await fetchStockPrice(sym); } catch { priceMap[sym] = null; }
    }));

    return {
      found: true,
      watchlistCount: watchlists.length,
      watchlists: watchlists.map(wl => ({
        name: wl.name,
        stockCount: wl.stocks.length,
        stocks: wl.stocks.map(s => {
          const live = priceMap[s.symbol];
          return {
            symbol:       s.symbol,
            name:         s.name,
            currentPrice: live?.price ? `₹${live.price.toLocaleString('en-IN')}` : 'N/A',
            dayChange:    live?.changePercent ? `${live.changePercent > 0 ? '+' : ''}${live.changePercent.toFixed(2)}%` : 'N/A',
          };
        }),
      })),
    };
  } catch (err) { return { error: err.message }; }
}

async function execute_get_stock_price({ symbol }) {
  try {
    const sym  = symbol.toUpperCase().endsWith('.NS') ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;
    const data = await fetchStockPrice(sym);
    if (!data) return { error: `Could not fetch price for ${sym}` };
    return {
      symbol,
      price:        `₹${(data.price || 0).toLocaleString('en-IN')}`,
      open:         `₹${(data.open  || 0).toLocaleString('en-IN')}`,
      high:         `₹${(data.high  || 0).toLocaleString('en-IN')}`,
      low:          `₹${(data.low   || 0).toLocaleString('en-IN')}`,
      previousClose:`₹${(data.previousClose || 0).toLocaleString('en-IN')}`,
      dayChange:    `₹${(data.change || 0).toFixed(2)}`,
      dayChangePct: `${(data.changePercent || 0).toFixed(2)}%`,
      volume:        (data.volume || 0).toLocaleString('en-IN'),
      weekHigh52:   data.weekHigh52 ? `₹${data.weekHigh52.toLocaleString('en-IN')}` : 'N/A',
      weekLow52:    data.weekLow52  ? `₹${data.weekLow52.toLocaleString('en-IN')}`  : 'N/A',
      marketStatus: data.marketState || 'CLOSED',
    };
  } catch (err) { return { error: err.message }; }
}

async function execute_get_stock_financials({ symbol }) {
  try {
    const sym     = symbol.toUpperCase().endsWith('.NS') ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;
    const dbStock = await Stock.findOne({ symbol: sym }).lean();
    let   meta    = {};
    try { meta = await fetchStockMetadata(sym); } catch {}

    const ratios   = dbStock?.ratios   || {};
    const liveData = dbStock?.liveData || {};

    return {
      symbol, name: dbStock?.name || sym, sector: dbStock?.sector || 'N/A',
      marketCap:       liveData.marketCap ? `₹${(liveData.marketCap/1e7).toFixed(0)} Cr` : 'N/A',
      peRatio:         ratios.pe          || meta.trailingPE  || 'N/A',
      pbRatio:         ratios.pb          || meta.priceToBook || 'N/A',
      roe:             ratios.roe         ? `${ratios.roe.toFixed(1)}%`                           : 'N/A',
      profitMargin:    ratios.profitMargin? `${(ratios.profitMargin*100).toFixed(1)}%`            : 'N/A',
      operatingMargin: ratios.operatingMargin ? `${(ratios.operatingMargin*100).toFixed(1)}%`    : 'N/A',
      debtToEquity:    ratios.debtToEquity || 'N/A',
      eps:             ratios.eps         ? `₹${ratios.eps.toFixed(2)}`                          : 'N/A',
      dividendYield:   ratios.dividendYield ? `${(ratios.dividendYield*100).toFixed(2)}%`        : 'N/A',
      beta:            ratios.beta        ? ratios.beta.toFixed(2)                               : 'N/A',
    };
  } catch (err) { return { error: err.message }; }
}

async function execute_run_historical_scanner({ symbol, targetPct, windowDays }) {
  try {
    const sym    = symbol.toUpperCase().endsWith('.NS') ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;
    const result = await runFullScan(sym, targetPct, windowDays);
    if (!result || result.error) return { error: result?.error || 'No results' };
    return {
      symbol: sym, targetPct: `${targetPct}%`, holdingPeriod: `${windowDays} days`,
      successRate:      `${(result.successRate  || 0).toFixed(1)}%`,
      successLabel:      result.successLabel    || 'Unknown',
      totalCases:        result.totalCases      || 0,
      successfulCases:   result.successfulCases || 0,
      avgDaysToTarget:   result.avgDaysToTarget ? `${result.avgDaysToTarget.toFixed(0)} days` : 'N/A',
      avgMaxDrawdown:    result.avgMaxDrawdown  ? `${result.avgMaxDrawdown.toFixed(1)}%`      : 'N/A',
      interpretation:   `${sym} achieved ${targetPct}% in ${windowDays} days in ${(result.successRate||0).toFixed(1)}% of ${result.totalCases||0} historical cases. Rating: "${result.successLabel}".`,
    };
  } catch (err) { return { error: err.message }; }
}

async function execute_get_market_regime({ symbol }) {
  try {
    const sym    = symbol === 'NIFTY' ? '^NSEI' : (symbol.toUpperCase().endsWith('.NS') ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`);
    const result = await classifyCurrentRegime(sym);
    if (!result) return { error: 'Could not determine regime' };
    return {
      symbol: sym, regime: result.regime || 'Unknown',
      confidence:    result.confidence    ? `${(result.confidence*100).toFixed(0)}%` : 'N/A',
      trend:         result.trend         || 'N/A',
      priceVs50DMA:  result.priceVs50DMA  ? `${result.priceVs50DMA > 0 ? '+' : ''}${result.priceVs50DMA.toFixed(1)}%`   : 'N/A',
      priceVs200DMA: result.priceVs200DMA ? `${result.priceVs200DMA > 0 ? '+' : ''}${result.priceVs200DMA.toFixed(1)}%` : 'N/A',
      interpretation: `Currently in a ${result.regime || 'Unknown'} regime with ${result.confidence ? (result.confidence*100).toFixed(0) : '?'}% confidence.`,
    };
  } catch (err) { return { error: err.message }; }
}

async function execute_get_stock_news({ symbol }) {
  try {
    const sym  = symbol.toUpperCase().endsWith('.NS') ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;
    const news = await fetchStockNews(sym, 8);
    if (!news?.length) return { found: false, message: `No recent news for ${sym}` };
    return {
      symbol: sym, articleCount: news.length,
      articles: news.slice(0, 8).map(n => ({
        title: n.title, source: n.source || 'Unknown',
        publishedAt: n.publishedAt ? new Date(n.publishedAt).toLocaleDateString('en-IN') : 'N/A',
        sentiment: n.sentiment || 'Neutral',
      })),
    };
  } catch (err) { return { error: err.message }; }
}

async function execute_search_stocks({ query }) {
  try {
    const stocks = await Stock.find({ $or: [{ symbol: { $regex: query, $options: 'i' } }, { name: { $regex: query, $options: 'i' } }] }).limit(8).lean();
    if (!stocks.length) return { found: false, message: `No stocks found matching "${query}"` };
    return {
      found: true, query,
      results: stocks.map(s => ({
        symbol: s.symbol, name: s.name, sector: s.sector || 'N/A',
        currentPrice: s.liveData?.price ? `₹${s.liveData.price.toLocaleString('en-IN')}` : 'N/A',
        dayChange:    s.liveData?.changePercent ? `${s.liveData.changePercent > 0 ? '+' : ''}${s.liveData.changePercent.toFixed(2)}%` : 'N/A',
      })),
    };
  } catch (err) { return { error: err.message }; }
}

async function execute_get_trending_stocks() {
  try {
    const stocks = await Stock.find({}).sort({ 'liveData.volume': -1 }).limit(12).lean();
    if (!stocks.length) return { found: false, message: 'No stocks in database yet.' };
    return {
      found: true, count: stocks.length,
      stocks: stocks.map(s => ({
        symbol: s.symbol, name: s.name, sector: s.sector || 'N/A',
        price:     s.liveData?.price ? `₹${s.liveData.price.toLocaleString('en-IN')}` : 'N/A',
        dayChange: s.liveData?.changePercent ? `${s.liveData.changePercent > 0 ? '+' : ''}${s.liveData.changePercent.toFixed(2)}%` : 'N/A',
      })),
    };
  } catch (err) { return { error: err.message }; }
}

async function execute_get_user_alerts({ sessionId }) {
  try {
    const alerts = await Alert.find({ sessionId }).sort({ createdAt: -1 }).limit(20).lean();
    if (!alerts.length) return { found: false, message: 'No alerts set up.' };
    return {
      found: true, count: alerts.length,
      alerts: alerts.map(a => ({
        symbol: a.symbol, stockName: a.stockName || a.symbol, type: a.type,
        targetPrice: `₹${(a.targetPrice || 0).toLocaleString('en-IN')}`,
        triggered:   a.triggered ? 'Yes — triggered!' : 'No — still watching',
        createdAt:   a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : 'N/A',
      })),
    };
  } catch (err) { return { error: err.message }; }
}

async function executeTool(toolName, toolInput) {
  switch (toolName) {
    case 'get_portfolio_watchlist': return execute_get_portfolio_watchlist(toolInput);
    case 'get_stock_price':         return execute_get_stock_price(toolInput);
    case 'get_stock_financials':    return execute_get_stock_financials(toolInput);
    case 'run_historical_scanner':  return execute_run_historical_scanner(toolInput);
    case 'get_market_regime':       return execute_get_market_regime(toolInput);
    case 'get_stock_news':          return execute_get_stock_news(toolInput);
    case 'search_stocks':           return execute_search_stocks(toolInput);
    case 'get_trending_stocks':     return execute_get_trending_stocks();
    case 'get_user_alerts':         return execute_get_user_alerts(toolInput);
    default:                        return { error: `Unknown tool: ${toolName}` };
  }
}

module.exports = { TOOL_SCHEMAS, executeTool };
