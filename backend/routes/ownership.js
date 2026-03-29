const express = require('express');
const router  = express.Router();
const Ownership = require('../models/Ownership');
const Stock     = require('../models/Stock');
const { fetchOwnershipData } = require('../utils/ownershipFetcher');

// GET /api/ownership/:symbol
router.get('/ownership/:symbol', async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();

    // Try cache first
    let ownership = await Ownership.findOne({ symbol: sym });
    if (ownership) {
      console.log(`✅ Ownership HIT: ${sym}`);
      return res.json({ ownership });
    }

    // Cache miss — fetch fresh
    console.log(`🔄 Ownership MISS: ${sym} — fetching...`);
    const data = await fetchOwnershipData(sym);

    // Upsert so duplicate-key errors can't happen
    ownership = await Ownership.findOneAndUpdate(
      { symbol: sym },
      { $set: data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ ownership });

  } catch (err) {
    console.error('Ownership error:', err.message);
    res.status(500).json({ error: 'Failed to fetch ownership data', message: err.message });
  }
});

// GET /api/ownership/:symbol/peers
router.get('/ownership/:symbol/peers', async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();

    let ownership = await Ownership.findOne({ symbol: sym });
    if (!ownership) {
      const data = await fetchOwnershipData(sym);
      ownership = await Ownership.findOneAndUpdate(
        { symbol: sym },
        { $set: data },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    if (!ownership.peers || ownership.peers.length === 0) {
      return res.json({ peers: [], sector: ownership.companyInfo?.sector });
    }

    const peerStocks = await Stock.find({
      symbol: { $in: ownership.peers }
    }).select('symbol name currentPrice dayChange dayChangePercent marketCap pe');

    const currentStock = await Stock.findOne({ symbol: sym })
      .select('symbol name currentPrice dayChange dayChangePercent marketCap pe');

    const allStocks = currentStock ? [currentStock, ...peerStocks] : peerStocks;

    res.json({ peers: allStocks, sector: ownership.companyInfo?.sector });

  } catch (err) {
    console.error('Peers error:', err.message);
    res.status(500).json({ error: 'Failed to fetch peer data', message: err.message });
  }
});

// DELETE /api/ownership/:symbol/cache
router.delete('/ownership/:symbol/cache', async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    await Ownership.deleteOne({ symbol: sym });
    res.json({ message: `Cache cleared for ${sym}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

module.exports = router;
