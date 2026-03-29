const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const SearchHistory = require('../models/SearchHistory');
const { fetchStockPrice, fetchStockMetadata, fetchIndexData, fetchStockBeta } = require('../utils/priceFetcher');

/**
 * GET /api/search
 * Search for stocks by symbol or name
 * Query params: q (search query)
 */
// Full NSE stock list for static fallback search (when DB is empty / stock not seeded yet)
const NSE_STATIC_LIST = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'INFY.NS', name: 'Infosys' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever' },
  { symbol: 'ITC.NS', name: 'ITC' },
  { symbol: 'SBIN.NS', name: 'State Bank of India' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints' },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical' },
  { symbol: 'TITAN.NS', name: 'Titan Company' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance' },
  { symbol: 'WIPRO.NS', name: 'Wipro' },
  { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement' },
  { symbol: 'NESTLEIND.NS', name: 'Nestle India' },
  { symbol: 'HCLTECH.NS', name: 'HCL Technologies' },
  { symbol: 'TECHM.NS', name: 'Tech Mahindra' },
  { symbol: 'ONGC.NS', name: 'Oil & Natural Gas Corporation' },
  { symbol: 'NTPC.NS', name: 'NTPC' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid Corporation' },
  { symbol: 'M&M.NS', name: 'Mahindra & Mahindra' },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel' },
  { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv' },
  { symbol: 'DIVISLAB.NS', name: 'Divi\'s Laboratories' },
  { symbol: 'ADANIPORTS.NS', name: 'Adani Ports & SEZ' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
  { symbol: 'COALINDIA.NS', name: 'Coal India' },
  { symbol: 'JSWSTEEL.NS', name: 'JSW Steel' },
  { symbol: 'DRREDDY.NS', name: 'Dr. Reddy\'s Laboratories' },
  { symbol: 'GRASIM.NS', name: 'Grasim Industries' },
  { symbol: 'BRITANNIA.NS', name: 'Britannia Industries' },
  { symbol: 'CIPLA.NS', name: 'Cipla' },
  { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp' },
  { symbol: 'EICHERMOT.NS', name: 'Eicher Motors' },
  { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank' },
  { symbol: 'SHREECEM.NS', name: 'Shree Cement' },
  { symbol: 'HINDALCO.NS', name: 'Hindalco Industries' },
  { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto' },
  { symbol: 'BPCL.NS', name: 'Bharat Petroleum' },
  { symbol: 'SBILIFE.NS', name: 'SBI Life Insurance' },
  { symbol: 'APOLLOHOSP.NS', name: 'Apollo Hospitals' },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises' },
  { symbol: 'TATACONSUM.NS', name: 'Tata Consumer Products' },
  { symbol: 'HDFCLIFE.NS', name: 'HDFC Life Insurance' },
  { symbol: 'VEDL.NS', name: 'Vedanta' },
  { symbol: 'BANDHANBNK.NS', name: 'Bandhan Bank' },
  { symbol: 'GODREJCP.NS', name: 'Godrej Consumer Products' },
  { symbol: 'MOTHERSON.NS', name: 'Motherson Sumi Systems' },
  { symbol: 'HAVELLS.NS', name: 'Havells India' },
  { symbol: 'COLPAL.NS', name: 'Colgate-Palmolive India' },
  { symbol: 'DABUR.NS', name: 'Dabur India' },
  { symbol: 'LUPIN.NS', name: 'Lupin' },
  { symbol: 'SIEMENS.NS', name: 'Siemens India' },
  { symbol: 'PIDILITIND.NS', name: 'Pidilite Industries' },
  { symbol: 'DLF.NS', name: 'DLF' },
  { symbol: 'BERGEPAINT.NS', name: 'Berger Paints' },
  { symbol: 'GAIL.NS', name: 'GAIL India' },
  { symbol: 'AMBUJACEM.NS', name: 'Ambuja Cements' },
  { symbol: 'MARICO.NS', name: 'Marico' },
  { symbol: 'ICICIPRULI.NS', name: 'ICICI Prudential Life' },
  { symbol: 'ADANIGREEN.NS', name: 'Adani Green Energy' },
  { symbol: 'BANKBARODA.NS', name: 'Bank of Baroda' },
  { symbol: 'PNB.NS', name: 'Punjab National Bank' },
  { symbol: 'INDIGO.NS', name: 'IndiGo Airlines' },
  { symbol: 'ZOMATO.NS', name: 'Zomato' },
  { symbol: 'PAYTM.NS', name: 'Paytm (One97 Communications)' },
  { symbol: 'NYKAA.NS', name: 'Nykaa (FSN E-Commerce)' },
  { symbol: 'DMART.NS', name: 'Avenue Supermarts (D-Mart)' },
  { symbol: 'IRCTC.NS', name: 'Indian Railway Catering (IRCTC)' },
  { symbol: 'TATAPOWER.NS', name: 'Tata Power' },
  { symbol: 'IOC.NS', name: 'Indian Oil Corporation' },
  { symbol: 'SAIL.NS', name: 'Steel Authority of India' },
  { symbol: 'NMDC.NS', name: 'NMDC' },
  { symbol: 'RECLTD.NS', name: 'REC Limited' },
  { symbol: 'MPHASIS.NS', name: 'Mphasis' },
  { symbol: 'SBICARD.NS', name: 'SBI Cards & Payment Services' },
  { symbol: 'PERSISTENT.NS', name: 'Persistent Systems' },
  { symbol: 'COFORGE.NS', name: 'Coforge' },
  { symbol: 'LALPATHLAB.NS', name: 'Dr. Lal PathLabs' },
  { symbol: 'BIOCON.NS', name: 'Biocon' },
  { symbol: 'AUROPHARMA.NS', name: 'Aurobindo Pharma' },
  { symbol: 'TORNTPHARM.NS', name: 'Torrent Pharmaceuticals' },
  { symbol: 'ALKEM.NS', name: 'Alkem Laboratories' },
  { symbol: 'GODREJPROP.NS', name: 'Godrej Properties' },
  { symbol: 'OBEROIRLTY.NS', name: 'Oberoi Realty' },
  { symbol: 'PRESTIGE.NS', name: 'Prestige Estates' },
  { symbol: 'UPL.NS', name: 'UPL' },
  { symbol: 'OFSS.NS', name: 'Oracle Financial Services' },
  { symbol: 'BOSCHLTD.NS', name: 'Bosch India' },
  { symbol: 'POLICYBZR.NS', name: 'PB Fintech (Policybazaar)' },
  { symbol: 'TATACOMM.NS', name: 'Tata Communications' },
  { symbol: 'ATGL.NS', name: 'Adani Total Gas' },
  { symbol: 'NAUKRI.NS', name: 'Info Edge (Naukri)' },
  { symbol: 'MUTHOOTFIN.NS', name: 'Muthoot Finance' },
  { symbol: 'CHOLAFIN.NS', name: 'Cholamandalam Investment' },
  { symbol: 'MAXHEALTH.NS', name: 'Max Healthcare' },
  { symbol: 'MANKIND.NS', name: 'Mankind Pharma' },
  { symbol: 'TATACHEM.NS', name: 'Tata Chemicals' },
  { symbol: 'FEDERALBNK.NS', name: 'Federal Bank' },
  { symbol: 'IDFCFIRSTB.NS', name: 'IDFC First Bank' },
  { symbol: 'VOLTAS.NS', name: 'Voltas' },
  { symbol: 'GUJGASLTD.NS', name: 'Gujarat Gas' },
  { symbol: 'LINDEINDIA.NS', name: 'Linde India' }
];

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 1) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const query = q.trim();
    
    // Search DB first (returns stocks with live prices)
    const dbStocks = await Stock.find({
      $or: [
        { symbol: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    })
    .select('symbol name exchange sector liveData marketCap')
    .limit(50)
    .lean();

    // If DB has enough results, return them
    if (dbStocks.length >= 5) {
      return res.json({ results: dbStocks });
    }

    // Supplement with static list for stocks not yet seeded
    const qLower = query.toLowerCase();
    const staticMatches = NSE_STATIC_LIST.filter(s =>
      s.symbol.toLowerCase().includes(qLower) ||
      s.name.toLowerCase().includes(qLower)
    ).slice(0, 50 - dbStocks.length);

    // Merge: DB stocks first, then static-only ones not already in DB results
    const dbSymbols = new Set(dbStocks.map(s => s.symbol));
    const extra = staticMatches
      .filter(s => !dbSymbols.has(s.symbol))
      .map(s => ({ symbol: s.symbol, name: s.name, exchange: 'NSE', liveData: null }));

    res.json({ results: [...dbStocks, ...extra] });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /api/stocks/:symbol
 * Get complete stock data
 */
router.get('/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const symbolUpper = symbol.toUpperCase();
    
    let stock = await Stock.findOne({ symbol: symbolUpper });
    
    // If stock not in DB, fetch and create
    if (!stock) {
      console.log(`Stock ${symbolUpper} not found, fetching...`);
      
      const [priceData, metadata, beta] = await Promise.all([
        fetchStockPrice(symbolUpper),
        fetchStockMetadata(symbolUpper),
        fetchStockBeta(symbolUpper)
      ]);
      
      if (!priceData) {
        return res.status(404).json({ error: 'Stock not found' });
      }
      
      stock = new Stock({
        symbol: symbolUpper,
        name: metadata.name,
        exchange: metadata.exchange || 'NSE',
        liveData: {
          price: priceData.price,
          previousClose: priceData.previousClose,
          change: priceData.change,
          changePercent: priceData.changePercent,
          open: priceData.open,
          dayHigh: priceData.dayHigh,
          dayLow: priceData.dayLow,
          volume: priceData.volume,
          lastUpdated: new Date()
        },
        fiftyTwoWeek: {
          high: priceData.fiftyTwoWeekHigh,
          low: priceData.fiftyTwoWeekLow
        },
        marketCap: priceData.marketCap,
        beta: beta
      });
      
      await stock.save();
    } else if (!stock.beta) {
      // If stock exists but doesn't have beta, fetch it
      const beta = await fetchStockBeta(symbolUpper);
      stock.beta = beta;
      await stock.save();
    }
    
    // Increment search count
    await stock.incrementSearch();
    
    res.json({ stock });
    
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

/**
 * POST /api/search/history
 * Save search to history
 * Body: { sessionId, symbol, stockName }
 */
router.post('/search/history', async (req, res) => {
  try {
    const { sessionId, symbol, stockName } = req.body;
    
    if (!sessionId || !symbol || !stockName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const search = new SearchHistory({
      sessionId,
      symbol: symbol.toUpperCase(),
      stockName
    });
    
    await search.save();
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Save search history error:', error);
    res.status(500).json({ error: 'Failed to save search' });
  }
});

/**
 * GET /api/search/history/:sessionId
 * Get recent searches for a session
 */
router.get('/search/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const searches = await SearchHistory.find({ sessionId })
      .sort({ searchedAt: -1 })
      .limit(10)
      .lean();
    
    // Remove duplicates (keep most recent)
    const uniqueSearches = [];
    const seen = new Set();
    
    for (const search of searches) {
      if (!seen.has(search.symbol)) {
        uniqueSearches.push(search);
        seen.add(search.symbol);
      }
    }
    
    res.json({ searches: uniqueSearches });
    
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ error: 'Failed to fetch search history' });
  }
});

/**
 * GET /api/trending
 * Get trending stocks (most searched in last 24 hours)
 */
router.get('/trending', async (req, res) => {
  try {
    // Return ALL stocks sorted by market cap (largest first)
    // Falls back to searchCount if marketCap not available
    const trending = await Stock.find()
      .sort({ marketCap: -1, searchCount: -1 })
      .select('symbol name liveData marketCap searchCount')
      .lean();
    
    res.json({ trending });
    
  } catch (error) {
    console.error('Get trending error:', error);
    res.status(500).json({ error: 'Failed to fetch trending stocks' });
  }
});

/**
 * GET /api/indices
 * Get major market indices (Nifty, Sensex, etc.)
 */
router.get('/indices', async (req, res) => {
  try {
    const indices = [
      { symbol: '^NSEI', name: 'Nifty 50' },
      { symbol: '^BSESN', name: 'Sensex' },
      { symbol: '^NSEBANK', name: 'Bank Nifty' },
      { symbol: 'GC=F', name: 'Gold' }
    ];
    
    const indicesData = await Promise.all(
      indices.map(async (index) => {
        const data = await fetchIndexData(index.symbol);
        return {
          name: index.name,
          symbol: index.symbol,
          price: data?.price || 0,
          change: data?.change || 0,
          changePercent: data?.changePercent || 0
        };
      })
    );
    
    res.json({ indices: indicesData });
    
  } catch (error) {
    console.error('Get indices error:', error);
    res.status(500).json({ error: 'Failed to fetch indices' });
  }
});

/**
 * POST /api/admin/seed
 * Seed database with initial stocks
 */
router.post('/admin/seed', async (req, res) => {
  try {
    const symbols = (process.env.NSE_STOCKS || '').split(',').filter(s => s.trim());
    
    if (symbols.length === 0) {
      return res.status(400).json({ error: 'No stocks configured' });
    }
    
    console.log(`Seeding ${symbols.length} stocks...`);
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const symbol of symbols) { // Load ALL stocks from .env
      try {
        const symbolTrimmed = symbol.trim().toUpperCase();
        
        // Check if exists
        const existing = await Stock.findOne({ symbol: symbolTrimmed });
        if (existing) {
          console.log(`${symbolTrimmed} already exists`);
          continue;
        }
        
        console.log(`Fetching ${symbolTrimmed}...`);
        
        const [priceData, metadata] = await Promise.all([
          fetchStockPrice(symbolTrimmed),
          fetchStockMetadata(symbolTrimmed)
        ]);
        
        if (!priceData) {
          results.failed.push({ symbol: symbolTrimmed, error: 'No price data' });
          continue;
        }
        
        const stock = new Stock({
          symbol: symbolTrimmed,
          name: metadata.name,
          exchange: metadata.exchange || 'NSE',
          liveData: {
            price: priceData.price,
            previousClose: priceData.previousClose,
            change: priceData.change,
            changePercent: priceData.changePercent,
            open: priceData.open,
            dayHigh: priceData.dayHigh,
            dayLow: priceData.dayLow,
            volume: priceData.volume
          },
          fiftyTwoWeek: {
            high: priceData.fiftyTwoWeekHigh,
            low: priceData.fiftyTwoWeekLow
          },
          marketCap: priceData.marketCap
        });
        
        await stock.save();
        results.success.push(symbolTrimmed);
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Failed to seed ${symbol}:`, error.message);
        results.failed.push({ symbol, error: error.message });
      }
    }
    
    res.json({
      message: 'Seeding complete',
      results
    });
    
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Seeding failed' });
  }
});

/**
 * GET /api/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});

module.exports = router;
