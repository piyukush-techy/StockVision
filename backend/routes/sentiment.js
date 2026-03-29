// routes/sentiment.js - Market Sentiment & Indicators API
const express = require('express');
const router = express.Router();
const { calculateMarketSentiment, getPutCallRatioData } = require('../utils/sentimentCalculator');
const { getFIIDIIFlow, getAdvanceDeclineRatio } = require('../utils/eventsFetcher');

// In-memory cache
let cache = {
  sentiment: { data: null, timestamp: null },
  putCall: { data: null, timestamp: null },
  fiiDii: { data: null, timestamp: null },
  advanceDecline: { data: null, timestamp: null }
};

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Helper: Check if cache is valid
function isCacheValid(cacheItem) {
  if (!cacheItem.data || !cacheItem.timestamp) return false;
  return (Date.now() - cacheItem.timestamp) < CACHE_DURATION;
}

// GET /api/sentiment/fear-greed - Fear & Greed Index
router.get('/fear-greed', async (req, res) => {
  try {
    // Return cached data if valid
    if (isCacheValid(cache.sentiment)) {
      return res.json({
        ...cache.sentiment.data,
        cached: true,
        cacheAge: Math.round((Date.now() - cache.sentiment.timestamp) / 1000)
      });
    }

    // Calculate fresh sentiment
    const sentiment = await calculateMarketSentiment();
    
    // Cache the result
    cache.sentiment = {
      data: sentiment,
      timestamp: Date.now()
    };

    res.json({
      ...sentiment,
      cached: false
    });

  } catch (error) {
    console.error('❌ Fear/Greed error:', error);
    res.status(500).json({ 
      error: 'Failed to calculate sentiment',
      score: 50,
      sentiment: 'Neutral'
    });
  }
});

// GET /api/sentiment/put-call-ratio - Put/Call Ratio
router.get('/put-call-ratio', async (req, res) => {
  try {
    // Return cached data if valid
    if (isCacheValid(cache.putCall)) {
      return res.json({
        ...cache.putCall.data,
        cached: true
      });
    }

    // Calculate fresh put/call ratio
    const putCallData = await getPutCallRatioData();
    
    // Cache the result
    cache.putCall = {
      data: putCallData,
      timestamp: Date.now()
    };

    res.json({
      ...putCallData,
      cached: false
    });

  } catch (error) {
    console.error('❌ Put/Call error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch put/call ratio',
      ratio: '1.00',
      signal: 'Neutral'
    });
  }
});

// GET /api/sentiment/fii-dii - FII/DII Flow
router.get('/fii-dii', async (req, res) => {
  try {
    // Return cached data if valid
    if (isCacheValid(cache.fiiDii)) {
      return res.json({
        ...cache.fiiDii.data,
        cached: true
      });
    }

    // Fetch fresh FII/DII data
    const flowData = await getFIIDIIFlow();
    
    // Cache the result
    cache.fiiDii = {
      data: flowData,
      timestamp: Date.now()
    };

    res.json({
      ...flowData,
      cached: false
    });

  } catch (error) {
    console.error('❌ FII/DII error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch FII/DII flow',
      today: { fii: {}, dii: {}, retail: {} }
    });
  }
});

// GET /api/sentiment/advance-decline - Advance/Decline Ratio
router.get('/advance-decline', async (req, res) => {
  try {
    // Return cached data if valid
    if (isCacheValid(cache.advanceDecline)) {
      return res.json({
        ...cache.advanceDecline.data,
        cached: true
      });
    }

    // Fetch fresh A/D ratio
    const adData = await getAdvanceDeclineRatio();
    
    // Cache the result
    cache.advanceDecline = {
      data: adData,
      timestamp: Date.now()
    };

    res.json({
      ...adData,
      cached: false
    });

  } catch (error) {
    console.error('❌ A/D Ratio error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch advance/decline ratio',
      ratio: '1.00',
      signal: 'Neutral'
    });
  }
});

// DELETE /api/sentiment/cache - Clear all sentiment caches
router.delete('/cache', (req, res) => {
  cache = {
    sentiment: { data: null, timestamp: null },
    putCall: { data: null, timestamp: null },
    fiiDii: { data: null, timestamp: null },
    advanceDecline: { data: null, timestamp: null }
  };

  res.json({ 
    success: true, 
    message: 'All sentiment caches cleared' 
  });
});

module.exports = router;
