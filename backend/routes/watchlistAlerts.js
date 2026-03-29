const express = require('express');
const router = express.Router();
const Watchlist = require('../models/Watchlist');
const Alert = require('../models/Alert');
const Stock = require('../models/Stock');

// ─────────────────────────────────────────
// WATCHLIST ROUTES
// ─────────────────────────────────────────

/**
 * GET /api/watchlists/:sessionId
 * Get all watchlists for a session
 */
router.get('/watchlists/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const watchlists = await Watchlist.find({ sessionId }).sort({ createdAt: 1 });

    // Enrich with live prices
    const enriched = await Promise.all(
      watchlists.map(async (wl) => {
        const enrichedStocks = await Promise.all(
          wl.stocks.map(async (s) => {
            const stock = await Stock.findOne({ symbol: s.symbol })
              .select('liveData fiftyTwoWeek marketCap')
              .lean();
            return {
              symbol: s.symbol,
              name: s.name,
              addedAt: s.addedAt,
              liveData: stock?.liveData || {},
              fiftyTwoWeek: stock?.fiftyTwoWeek || {}
            };
          })
        );
        return {
          _id: wl._id,
          name: wl.name,
          stocks: enrichedStocks,
          createdAt: wl.createdAt
        };
      })
    );

    res.json({ watchlists: enriched });
  } catch (err) {
    console.error('Get watchlists error:', err);
    res.status(500).json({ error: 'Failed to fetch watchlists' });
  }
});

/**
 * POST /api/watchlists
 * Create a new watchlist
 */
router.post('/watchlists', async (req, res) => {
  try {
    const { sessionId, name } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const watchlist = new Watchlist({
      sessionId,
      name: name || 'My Watchlist',
      stocks: []
    });
    await watchlist.save();

    res.json({ watchlist });
  } catch (err) {
    console.error('Create watchlist error:', err);
    res.status(500).json({ error: 'Failed to create watchlist' });
  }
});

/**
 * POST /api/watchlists/:watchlistId/stocks
 * Add stock to watchlist
 */
router.post('/watchlists/:watchlistId/stocks', async (req, res) => {
  try {
    const { watchlistId } = req.params;
    const { symbol, name } = req.body;

    if (!symbol || !name) return res.status(400).json({ error: 'symbol and name required' });

    const watchlist = await Watchlist.findById(watchlistId);
    if (!watchlist) return res.status(404).json({ error: 'Watchlist not found' });

    // Check if already added
    const alreadyExists = watchlist.stocks.find(s => s.symbol === symbol.toUpperCase());
    if (alreadyExists) return res.status(400).json({ error: 'Stock already in watchlist' });

    watchlist.stocks.push({ symbol: symbol.toUpperCase(), name });
    await watchlist.save();

    res.json({ success: true, watchlist });
  } catch (err) {
    console.error('Add stock error:', err);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

/**
 * DELETE /api/watchlists/:watchlistId/stocks/:symbol
 * Remove stock from watchlist
 */
router.delete('/watchlists/:watchlistId/stocks/:symbol', async (req, res) => {
  try {
    const { watchlistId, symbol } = req.params;

    const watchlist = await Watchlist.findById(watchlistId);
    if (!watchlist) return res.status(404).json({ error: 'Watchlist not found' });

    watchlist.stocks = watchlist.stocks.filter(s => s.symbol !== symbol.toUpperCase());
    await watchlist.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Remove stock error:', err);
    res.status(500).json({ error: 'Failed to remove stock' });
  }
});

/**
 * DELETE /api/watchlists/:watchlistId
 * Delete entire watchlist
 */
router.delete('/watchlists/:watchlistId', async (req, res) => {
  try {
    const { watchlistId } = req.params;
    await Watchlist.findByIdAndDelete(watchlistId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete watchlist error:', err);
    res.status(500).json({ error: 'Failed to delete watchlist' });
  }
});

// ─────────────────────────────────────────
// ALERT ROUTES
// ─────────────────────────────────────────

/**
 * GET /api/alerts/:sessionId
 * Get all alerts for a session
 */
router.get('/alerts/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const alerts = await Alert.find({ sessionId }).sort({ createdAt: -1 });
    res.json({ alerts });
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * POST /api/alerts
 * Create a new price alert
 */
router.post('/alerts', async (req, res) => {
  try {
    const { sessionId, symbol, stockName, condition, targetPrice, currentPrice } = req.body;

    if (!sessionId || !symbol || !condition || !targetPrice) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const alert = new Alert({
      sessionId,
      symbol: symbol.toUpperCase(),
      stockName,
      condition,
      targetPrice: parseFloat(targetPrice),
      currentPriceWhenSet: parseFloat(currentPrice || 0),
      isActive: true,
      triggered: false
    });

    await alert.save();
    res.json({ alert });
  } catch (err) {
    console.error('Create alert error:', err);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

/**
 * DELETE /api/alerts/:alertId
 * Delete an alert
 */
router.delete('/alerts/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    await Alert.findByIdAndDelete(alertId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete alert error:', err);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

/**
 * GET /api/alerts/:sessionId/check
 * Check triggered alerts for a session
 */
router.get('/alerts/:sessionId/check', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const triggered = await Alert.find({
      sessionId,
      triggered: true,
      isActive: false
    }).sort({ triggeredAt: -1 }).limit(10);

    res.json({ triggered });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check alerts' });
  }
});

module.exports = router;
