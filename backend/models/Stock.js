const mongoose = require('mongoose');

/**
 * Stock Model - Phase 1
 * Stores basic stock information and live price data
 */
const stockSchema = new mongoose.Schema({
  // Basic Information
  symbol: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  
  name: {
    type: String,
    required: true
  },
  
  exchange: {
    type: String,
    default: 'NSE'
  },
  
  sector: {
    type: String,
    default: 'Unknown'
  },
  
  industry: {
    type: String,
    default: 'Unknown'
  },
  
  isin: {
    type: String,
    default: null
  },
  
  // Live Price Data (Updated Every 5 seconds)
  liveData: {
    price: {
      type: Number,
      default: 0
    },
    previousClose: {
      type: Number,
      default: 0
    },
    change: {
      type: Number,
      default: 0
    },
    changePercent: {
      type: Number,
      default: 0
    },
    open: {
      type: Number,
      default: 0
    },
    dayHigh: {
      type: Number,
      default: 0
    },
    dayLow: {
      type: Number,
      default: 0
    },
    volume: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // 52-Week Range
  fiftyTwoWeek: {
    high: {
      type: Number,
      default: 0
    },
    low: {
      type: Number,
      default: 0
    },
    highDate: Date,
    lowDate: Date
  },
  
  // Market Cap
  marketCap: {
    type: Number,
    default: 0
  },
  
  // Key Ratios (Added Month 3/4)
  pe: {
    type: Number,
    default: null
  },
  
  beta: {
    type: Number,
    default: null
  },
  
  // Trending & Search
  searchCount: {
    type: Number,
    default: 0
  },
  
  isTrending: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  lastPriceUpdate: {
    type: Date,
    default: Date.now
  }
  
}, {
  timestamps: true
});

// Index for search
stockSchema.index({ name: 'text', symbol: 'text' });

// Method to update live price
stockSchema.methods.updateLivePrice = function(priceData) {
  this.liveData = {
    price: priceData.price || priceData.regularMarketPrice,
    previousClose: priceData.previousClose || priceData.regularMarketPreviousClose,
    change: priceData.change || (priceData.price - priceData.previousClose),
    changePercent: priceData.changePercent || ((priceData.price - priceData.previousClose) / priceData.previousClose * 100),
    open: priceData.open || priceData.regularMarketOpen,
    dayHigh: priceData.dayHigh || priceData.regularMarketDayHigh,
    dayLow: priceData.dayLow || priceData.regularMarketDayLow,
    volume: priceData.volume || priceData.regularMarketVolume,
    lastUpdated: new Date()
  };
  
  this.lastPriceUpdate = new Date();
  return this.save();
};

// Method to increment search count
stockSchema.methods.incrementSearch = function() {
  this.searchCount += 1;
  return this.save();
};

const Stock = mongoose.model('Stock', stockSchema);

module.exports = Stock;
