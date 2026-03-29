// routes/events.js - Corporate Events & Calendar API
const express = require('express');
const router = express.Router();
const { getCorporateEvents, getMarketEventsCalendar } = require('../utils/eventsFetcher');

// In-memory cache
let cache = {
  stockEvents: new Map(), // symbol -> { data, timestamp }
  marketEvents: { data: null, timestamp: null }
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour (events don't change frequently)

// Helper: Check if cache is valid
function isCacheValid(timestamp) {
  if (!timestamp) return false;
  return (Date.now() - timestamp) < CACHE_DURATION;
}

// GET /api/events/:symbol - Get corporate events for a stock
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const upperSymbol = symbol.toUpperCase();

    // Check cache
    const cached = cache.stockEvents.get(upperSymbol);
    if (cached && isCacheValid(cached.timestamp)) {
      return res.json({
        ...cached.data,
        cached: true,
        cacheAge: Math.round((Date.now() - cached.timestamp) / 1000)
      });
    }

    // Fetch fresh events
    const events = await getCorporateEvents(upperSymbol);
    
    // Cache the result
    cache.stockEvents.set(upperSymbol, {
      data: events,
      timestamp: Date.now()
    });

    res.json({
      ...events,
      cached: false
    });

  } catch (error) {
    console.error('❌ Stock events error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch corporate events',
      events: [],
      count: 0
    });
  }
});

// GET /api/events/market/calendar - Get market-wide events calendar
router.get('/market/calendar', async (req, res) => {
  try {
    // Check cache
    if (cache.marketEvents.data && isCacheValid(cache.marketEvents.timestamp)) {
      return res.json({
        ...cache.marketEvents.data,
        cached: true
      });
    }

    // Fetch fresh market events
    const events = await getMarketEventsCalendar();
    
    // Cache the result
    cache.marketEvents = {
      data: events,
      timestamp: Date.now()
    };

    res.json({
      ...events,
      cached: false
    });

  } catch (error) {
    console.error('❌ Market events error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch market events',
      events: [],
      count: 0
    });
  }
});

// DELETE /api/events/:symbol/cache - Clear cache for a specific stock
router.delete('/:symbol/cache', (req, res) => {
  const { symbol } = req.params;
  const upperSymbol = symbol.toUpperCase();
  
  cache.stockEvents.delete(upperSymbol);
  
  res.json({ 
    success: true, 
    message: `Cache cleared for ${upperSymbol}` 
  });
});

// DELETE /api/events/cache/all - Clear all events caches
router.delete('/cache/all', (req, res) => {
  cache.stockEvents.clear();
  cache.marketEvents = { data: null, timestamp: null };
  
  res.json({ 
    success: true, 
    message: 'All events caches cleared' 
  });
});

module.exports = router;
