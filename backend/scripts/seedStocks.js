// seedStocks.js — seeds MongoDB with all NSE stocks from .env
// Usage: node scripts/seedStocks.js
const mongoose = require('mongoose');
const axios    = require('axios');
const Stock    = require('../models/Stock');
require('dotenv').config();

const HEADERS = { 'User-Agent': 'Mozilla/5.0' };

async function fetchStockData(symbol) {
  try {
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      { params: { interval: '1d', range: '1d' }, headers: HEADERS, timeout: 8000 }
    );
    const result = res.data?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    return {
      price:            meta.regularMarketPrice,
      previousClose:    meta.chartPreviousClose || meta.regularMarketPrice,
      change:           (meta.regularMarketPrice || 0) - (meta.chartPreviousClose || 0),
      changePercent:    meta.regularMarketPrice && meta.chartPreviousClose
        ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100 : 0,
      open:             meta.regularMarketOpen || meta.regularMarketPrice,
      dayHigh:          meta.regularMarketDayHigh || meta.regularMarketPrice,
      dayLow:           meta.regularMarketDayLow  || meta.regularMarketPrice,
      volume:           meta.regularMarketVolume  || 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh     || meta.regularMarketPrice,
      fiftyTwoWeekLow:  meta.fiftyTwoWeekLow      || meta.regularMarketPrice,
      marketCap:        meta.marketCap            || 0,
      name:             meta.longName || meta.shortName || symbol.replace('.NS','')
    };
  } catch (err) {
    console.error(`  ❌ ${symbol}: ${err.message}`);
    return null;
  }
}

async function seedAllStocks() {
  console.log('🙏 JAI SHREE GANESH!');
  console.log('📊 StockVision — Database Seeding\n');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const stockList = (process.env.NSE_STOCKS || '').split(',').map(s => s.trim()).filter(Boolean);
  console.log(`📋 ${stockList.length} stocks to seed\n`);

  await Stock.deleteMany({});
  console.log('🗑️  Cleared existing stocks\n');

  let ok = 0, fail = 0;

  for (let i = 0; i < stockList.length; i++) {
    const sym = stockList[i].toUpperCase();
    process.stdout.write(`[${i+1}/${stockList.length}] ${sym}...`);
    const data = await fetchStockData(sym);
    if (!data) { fail++; process.stdout.write(' SKIP\n'); continue; }
    await Stock.create({
      symbol: sym,
      name: data.name,
      exchange: 'NSE',
      liveData: {
        price: data.price, previousClose: data.previousClose,
        change: data.change, changePercent: data.changePercent,
        open: data.open, dayHigh: data.dayHigh, dayLow: data.dayLow,
        volume: data.volume, lastUpdated: new Date()
      },
      fiftyTwoWeek: { high: data.fiftyTwoWeekHigh, low: data.fiftyTwoWeekLow },
      marketCap: data.marketCap
    });
    ok++;
    process.stdout.write(` ₹${data.price} ✅\n`);
    if (i % 10 === 9) await new Promise(r => setTimeout(r, 1500)); // rate limit pause
  }

  console.log(`\n✅ Done: ${ok} seeded, ${fail} failed`);
  await mongoose.disconnect();
  process.exit(0);
}

seedAllStocks().catch(err => { console.error(err); process.exit(1); });
