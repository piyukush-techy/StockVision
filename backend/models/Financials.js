const mongoose = require('mongoose');

/**
 * Financials Model - Month 3
 * Caches financial data to avoid repeated API calls
 * Cache TTL: 24 hours (financial data doesn't change that often)
 */
const financialsSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },

  // Key Ratios
  keyStats: {
    // Valuation
    peRatio: Number,
    forwardPE: Number,
    pbRatio: Number,
    psRatio: Number,
    evToEbitda: Number,
    // Profitability
    roe: Number,
    roa: Number,
    profitMargin: Number,
    operatingMargin: Number,
    grossMargin: Number,
    // Growth
    revenueGrowth: Number,
    earningsGrowth: Number,
    // Per Share
    eps: Number,
    forwardEps: Number,
    bookValue: Number,
    // Dividends
    dividendYield: Number,
    dividendRate: Number,
    payoutRatio: Number,
    // Debt
    debtToEquity: Number,
    currentRatio: Number,
    quickRatio: Number,
    // Cash
    totalCash: Number,
    totalDebt: Number,
    freeCashflow: Number,
    // Market
    beta: Number,
    sharesOutstanding: Number
  },

  // Income Statement
  income: {
    annual: [{
      date: String,
      totalRevenue: Number,
      grossProfit: Number,
      operatingIncome: Number,
      ebit: Number,
      netIncome: Number,
      eps: Number,
      totalExpenses: Number,
      interestExpense: Number,
      taxProvision: Number
    }],
    quarterly: [{
      date: String,
      totalRevenue: Number,
      grossProfit: Number,
      operatingIncome: Number,
      ebit: Number,
      netIncome: Number,
      eps: Number,
      totalExpenses: Number,
      interestExpense: Number,
      taxProvision: Number
    }]
  },

  // Balance Sheet
  balanceSheet: {
    annual: [{
      date: String,
      totalAssets: Number,
      totalLiabilities: Number,
      totalEquity: Number,
      currentAssets: Number,
      currentLiabilities: Number,
      cash: Number,
      shortTermInvestments: Number,
      netReceivables: Number,
      inventory: Number,
      longTermDebt: Number,
      retainedEarnings: Number
    }],
    quarterly: [{
      date: String,
      totalAssets: Number,
      totalLiabilities: Number,
      totalEquity: Number,
      currentAssets: Number,
      currentLiabilities: Number,
      cash: Number,
      longTermDebt: Number,
      retainedEarnings: Number
    }]
  },

  // Cash Flow
  cashFlow: {
    annual: [{
      date: String,
      operatingCashflow: Number,
      investingCashflow: Number,
      financingCashflow: Number,
      freeCashflow: Number,
      capex: Number,
      netIncome: Number,
      depreciation: Number,
      changeInCash: Number
    }],
    quarterly: [{
      date: String,
      operatingCashflow: Number,
      investingCashflow: Number,
      financingCashflow: Number,
      freeCashflow: Number,
      capex: Number,
      netIncome: Number,
      changeInCash: Number
    }]
  },

  // Cache control
  lastFetched: {
    type: Date,
    default: Date.now
  },

  // Auto-expire after 24 hours
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expireAfterSeconds: 0 }
  }

}, { timestamps: true });

const Financials = mongoose.model('Financials', financialsSchema);
module.exports = Financials;
