const cron = require('node-cron');
const Stock = require('../models/Stock');
const { fetchMultipleStockPrices } = require('./priceFetcher');

let priceUpdateInterval = null;

/**
 * Check if NSE market is open
 * Trading hours: 9:15 AM - 3:30 PM IST (Mon-Fri)
 * Uses UTC+5:30 calculation (reliable on all OS including Windows)
 */
function isMarketOpen() {
  // Reliable IST = UTC + 5 hours 30 minutes
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istMs = utcMs + (5.5 * 60 * 60 * 1000);
  const istTime = new Date(istMs);

  const day = istTime.getDay(); // 0=Sun, 6=Sat

  // Weekend
  if (day === 0 || day === 6) return false;

  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  const marketOpen  = 9 * 60 + 15;  // 9:15 AM
  const marketClose = 15 * 60 + 30; // 3:30 PM

  const open = currentMinutes >= marketOpen && currentMinutes <= marketClose;
  console.log(`🕐 IST: ${hours}:${String(minutes).padStart(2,'0')} | Market: ${open ? 'OPEN ✅' : 'CLOSED 🔒'}`);
  return open;
}

/**
 * Update prices for all stocks in DB
 */
async function updateAllStockPrices() {
  try {
    const stocks = await Stock.find({}).select('symbol');
    if (stocks.length === 0) {
      console.log('No stocks in database to update');
      return;
    }

    const symbols = stocks.map(s => s.symbol);
    console.log(`📊 Updating prices for ${symbols.length} stocks...`);

    // Batch of 20 to avoid rate limiting
    const batchSize = 20;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const priceData = await fetchMultipleStockPrices(batch);

      for (const data of priceData) {
        const stock = await Stock.findOne({ symbol: data.symbol });
        if (stock) {
          await stock.updateLivePrice(data);
          if (data.fiftyTwoWeekHigh > 0) stock.fiftyTwoWeek.high = data.fiftyTwoWeekHigh;
          if (data.fiftyTwoWeekLow > 0)  stock.fiftyTwoWeek.low  = data.fiftyTwoWeekLow;
          if (data.marketCap > 0)         stock.marketCap          = data.marketCap;
          await stock.save();
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ Prices updated for ${symbols.length} stocks`);
  } catch (error) {
    console.error('Error updating stock prices:', error);
  }
}

/**
 * Start price update scheduler
 */
function startPriceUpdates() {
  const interval = parseInt(process.env.PRICE_UPDATE_INTERVAL || 5) * 1000;
  console.log(`🔄 Starting price updates (every ${interval / 1000} seconds)`);

  // Run once immediately on start
  updateAllStockPrices();

  // Then run on interval - ALWAYS update (let Yahoo Finance handle market hours)
  priceUpdateInterval = setInterval(() => {
    if (isMarketOpen()) {
      updateAllStockPrices();
    } else {
      // Still log IST time so user knows it's working
      const now = new Date();
      const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istTime = new Date(utcMs + (5.5 * 60 * 60 * 1000));
      console.log(`🔒 Market closed | IST: ${istTime.getHours()}:${String(istTime.getMinutes()).padStart(2,'0')}`);
    }
  }, interval);

  // Final update cron at 3:35 PM IST Mon-Fri
  cron.schedule('35 15 * * 1-5', () => {
    console.log('📊 Market closing - final price update');
    updateAllStockPrices();
  }, { timezone: 'Asia/Kolkata' });
}

function stopPriceUpdates() {
  if (priceUpdateInterval) {
    clearInterval(priceUpdateInterval);
    priceUpdateInterval = null;
    console.log('⏹️ Stopped price updates');
  }
}

module.exports = { startPriceUpdates, stopPriceUpdates, updateAllStockPrices, isMarketOpen };
