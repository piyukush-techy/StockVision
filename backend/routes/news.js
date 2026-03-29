/**
 * news.js - News & Bulk Deals API Routes
 * Month 5 - Charts & News
 */

const express = require('express');
const router = express.Router();
const { fetchStockNews, fetchMarketNews, fetchBulkDeals, analyzeNewsSentiment } = require('../utils/newsFetcher');

// Simple in-memory cache (news changes often, 15 min TTL)
const newsCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCached(key) {
  const entry = newsCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    newsCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  newsCache.set(key, { data, timestamp: Date.now() });
}

/**
 * GET /api/news/:symbol
 * Get news for a specific stock
 */
router.get('/news/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const symbolUpper = symbol.toUpperCase();
    const count = parseInt(req.query.count) || 10;

    const cacheKey = `news_${symbolUpper}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: 'cache' });
    }

    const news = await fetchStockNews(symbolUpper, count);
    const sentiment = analyzeNewsSentiment(news);

    const responseData = {
      symbol: symbolUpper,
      news,
      sentiment,
      fetchedAt: new Date().toISOString(),
      source: 'live',
    };

    setCache(cacheKey, responseData);
    res.json(responseData);

  } catch (error) {
    console.error('News route error:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

/**
 * GET /api/news/market/india
 * Get general Indian market news
 */
router.get('/news/market/india', async (req, res) => {
  try {
    const cacheKey = 'market_news_india';
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: 'cache' });
    }

    const news = await fetchMarketNews(15);

    const responseData = {
      market: 'India (NSE/BSE)',
      news,
      fetchedAt: new Date().toISOString(),
      source: 'live',
    };

    setCache(cacheKey, responseData);
    res.json(responseData);

  } catch (error) {
    console.error('Market news route error:', error);
    res.status(500).json({ error: 'Failed to fetch market news' });
  }
});

/**
 * GET /api/news/:symbol/bulk-deals
 * Get bulk/block deals for a stock
 */
router.get('/news/:symbol/bulk-deals', async (req, res) => {
  try {
    const { symbol } = req.params;
    const symbolUpper = symbol.toUpperCase();

    // Bulk deals are day-stale, cache 1 hour
    const cacheKey = `bulk_${symbolUpper}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: 'cache' });
    }

    const deals = fetchBulkDeals(symbolUpper);

    const responseData = {
      symbol: symbolUpper,
      deals,
      totalDeals: deals.length,
      fetchedAt: new Date().toISOString(),
      note: 'Simulated data - Production: NSE official bulk deals API',
      source: 'live',
    };

    setCache(cacheKey, responseData);
    res.json(responseData);

  } catch (error) {
    console.error('Bulk deals route error:', error);
    res.status(500).json({ error: 'Failed to fetch bulk deals' });
  }
});

/**
 * DELETE /api/news/:symbol/cache
 * Force refresh news cache for a stock
 */
router.delete('/news/:symbol/cache', (req, res) => {
  const { symbol } = req.params;
  const symbolUpper = symbol.toUpperCase();
  newsCache.delete(`news_${symbolUpper}`);
  newsCache.delete(`bulk_${symbolUpper}`);
  res.json({ message: `News cache cleared for ${symbolUpper}` });
});

module.exports = router;
