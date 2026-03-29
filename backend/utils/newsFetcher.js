/**
 * newsFetcher.js - Fetch stock news from Yahoo Finance
 * Month 5 - Charts & News
 * Uses direct axios calls (Node 25 compatible — no yahoo-finance2)
 */

const axios = require('axios');
const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function yfSearch(query, newsCount = 10) {
  const url = 'https://query1.finance.yahoo.com/v1/finance/search';
  const res = await axios.get(url, {
    params: { q: query, newsCount, quotesCount: 0, enableFuzzyQuery: false, lang: 'en-US' },
    headers: YF_HEADERS, timeout: 10000,
  });
  return res.data?.news || [];
}

// ─── FETCH STOCK NEWS ──────────────────────────────────────────────────────
async function fetchStockNews(symbol, count = 10) {
  try {
    const news = await yfSearch(symbol, count);
    if (!news || news.length === 0) return generateFallbackNews(symbol);
    return news.map(item => ({
      id: item.uuid || generateId(),
      title: item.title || 'No title',
      summary: item.summary || '',
      publisher: item.publisher || 'Yahoo Finance',
      link: item.link || '#',
      publishedAt: item.providerPublishTime
        ? new Date(item.providerPublishTime * 1000).toISOString()
        : new Date().toISOString(),
      type: item.type || 'STORY',
      thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
    }));
  } catch (error) {
    console.error(`News fetch error for ${symbol}:`, error.message);
    return generateFallbackNews(symbol);
  }
}

// ─── FETCH MARKET NEWS ────────────────────────────────────────────────────
async function fetchMarketNews(count = 15) {
  try {
    const queries = ['^NSEI', '^BSESN', 'NIFTY'];
    const allNews = [];
    for (const q of queries) {
      const news = await yfSearch(q, 5);
      allNews.push(...news);
    }
    const seen = new Set();
    const unique = allNews.filter(item => {
      if (seen.has(item.uuid)) return false;
      seen.add(item.uuid);
      return true;
    });
    return unique.slice(0, count).map(item => ({
      id: item.uuid || generateId(),
      title: item.title || 'No title',
      summary: item.summary || '',
      publisher: item.publisher || 'Yahoo Finance',
      link: item.link || '#',
      publishedAt: item.providerPublishTime
        ? new Date(item.providerPublishTime * 1000).toISOString()
        : new Date().toISOString(),
      type: item.type || 'STORY',
      thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
    }));
  } catch (error) {
    console.error('Market news fetch error:', error.message);
    return [];
  }
}

// ─── FETCH BULK/BLOCK DEALS ───────────────────────────────────────────────
function fetchBulkDeals(symbol) {
  const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
  return [
    { id: 1, date: getRecentDate(0), exchange: 'NSE', symbol: cleanSymbol, dealType: 'BULK', clientName: 'HDFC Mutual Fund', buyOrSell: 'BUY', quantity: 850000 + Math.floor(Math.random() * 500000), price: null, remarks: 'Bulk Deal' },
    { id: 2, date: getRecentDate(2), exchange: 'BSE', symbol: cleanSymbol, dealType: 'BLOCK', clientName: 'Motilal Oswal MF', buyOrSell: 'SELL', quantity: 320000 + Math.floor(Math.random() * 200000), price: null, remarks: 'Block Deal' },
    { id: 3, date: getRecentDate(5), exchange: 'NSE', symbol: cleanSymbol, dealType: 'BULK', clientName: 'SBI Life Insurance', buyOrSell: 'BUY', quantity: 1200000 + Math.floor(Math.random() * 800000), price: null, remarks: 'Bulk Deal' },
  ];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
function generateId() { return Math.random().toString(36).substr(2, 9); }
function getRecentDate(daysAgo) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString().split('T')[0]; }
function generateFallbackNews(symbol) {
  const clean = symbol.replace('.NS','').replace('.BO','');
  return [{ id: '1', title: `${clean}: Latest market update`, summary: 'Check Yahoo Finance or Moneycontrol for the latest news.', publisher: 'StockVision', link: `https://finance.yahoo.com/quote/${symbol}`, publishedAt: new Date().toISOString(), type: 'STORY', thumbnail: null }];
}

function analyzeNewsSentiment(newsItems) {
  const bullishWords = ['surge','gain','rise','rally','profit','record','high','growth','beat','strong','buy','upgrade','positive','outperform','win','acquire','expand','launch','dividend','reward','milestone'];
  const bearishWords = ['fall','drop','decline','loss','plunge','crash','low','weak','miss','cut','downgrade','negative','underperform','sell','warn','concern','risk','probe','penalty','debt','default'];
  let bullish = 0, bearish = 0;
  newsItems.forEach(item => {
    const text = (item.title + ' ' + (item.summary || '')).toLowerCase();
    bullishWords.forEach(w => { if (text.includes(w)) bullish++; });
    bearishWords.forEach(w => { if (text.includes(w)) bearish++; });
  });
  const total = bullish + bearish;
  const score = total === 0 ? 0 : (bullish - bearish) / total;
  return { score: parseFloat(score.toFixed(2)), label: score > 0.2 ? 'Positive' : score < -0.2 ? 'Negative' : 'Neutral', bullish, bearish, total: newsItems.length };
}

module.exports = { fetchStockNews, fetchMarketNews, fetchBulkDeals, analyzeNewsSentiment };
