const axios = require('axios');

/**
 * Financials Fetcher - Month 3
 * Fetches P&L, Balance Sheet, Cash Flow, Ratios from Yahoo Finance
 */

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

/**
 * Fetch key statistics and ratios
 */
async function fetchKeyStats(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`;
    const modules = [
      'defaultKeyStatistics',
      'financialData',
      'summaryDetail'
    ].join(',');

    const res = await axios.get(url, {
      params: { modules },
      headers: HEADERS
    });

    const result = res.data?.quoteSummary?.result?.[0];
    if (!result) throw new Error('No data');

    const ks = result.defaultKeyStatistics || {};
    const fd = result.financialData || {};
    const sd = result.summaryDetail || {};

    return {
      // Valuation
      peRatio: sd.trailingPE?.raw || ks.trailingPE?.raw || null,
      forwardPE: sd.forwardPE?.raw || ks.forwardPE?.raw || null,
      pbRatio: ks.priceToBook?.raw || null,
      psRatio: ks.priceToSalesTrailing12Months?.raw || null,
      evToEbitda: ks.enterpriseToEbitda?.raw || null,

      // Profitability
      roe: fd.returnOnEquity?.raw ? fd.returnOnEquity.raw * 100 : null,
      roa: fd.returnOnAssets?.raw ? fd.returnOnAssets.raw * 100 : null,
      profitMargin: fd.profitMargins?.raw ? fd.profitMargins.raw * 100 : null,
      operatingMargin: fd.operatingMargins?.raw ? fd.operatingMargins.raw * 100 : null,
      grossMargin: fd.grossMargins?.raw ? fd.grossMargins.raw * 100 : null,

      // Growth
      revenueGrowth: fd.revenueGrowth?.raw ? fd.revenueGrowth.raw * 100 : null,
      earningsGrowth: fd.earningsGrowth?.raw ? fd.earningsGrowth.raw * 100 : null,

      // Per Share
      eps: ks.trailingEps?.raw || null,
      forwardEps: ks.forwardEps?.raw || null,
      bookValue: ks.bookValue?.raw || null,

      // Dividends
      dividendYield: sd.dividendYield?.raw ? sd.dividendYield.raw * 100 : null,
      dividendRate: sd.dividendRate?.raw || null,
      payoutRatio: sd.payoutRatio?.raw ? sd.payoutRatio.raw * 100 : null,

      // Debt
      debtToEquity: fd.debtToEquity?.raw || null,
      currentRatio: fd.currentRatio?.raw || null,
      quickRatio: fd.quickRatio?.raw || null,

      // Cash
      totalCash: fd.totalCash?.raw || null,
      totalDebt: fd.totalDebt?.raw || null,
      freeCashflow: fd.freeCashflow?.raw || null,

      // Market
      beta: ks.beta?.raw || null,
      sharesOutstanding: ks.sharesOutstanding?.raw || null,
      floatShares: ks.floatShares?.raw || null,
      shortRatio: ks.shortRatio?.raw || null
    };

  } catch (err) {
    console.error(`fetchKeyStats error for ${symbol}:`, err.message);
    return null;
  }
}

/**
 * Fetch Income Statement (P&L)
 */
async function fetchIncomeStatement(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`;
    const res = await axios.get(url, {
      params: { modules: 'incomeStatementHistory,incomeStatementHistoryQuarterly' },
      headers: HEADERS
    });

    const result = res.data?.quoteSummary?.result?.[0];
    if (!result) throw new Error('No data');

    const parseStatements = (statements) =>
      (statements || []).map(s => ({
        date: new Date(s.endDate?.raw * 1000).toISOString().split('T')[0],
        totalRevenue: s.totalRevenue?.raw || 0,
        grossProfit: s.grossProfit?.raw || 0,
        operatingIncome: s.operatingIncome?.raw || 0,
        ebit: s.ebit?.raw || 0,
        netIncome: s.netIncome?.raw || 0,
        eps: s.dilutedEPS?.raw || 0,
        totalExpenses: s.totalOperatingExpenses?.raw || 0,
        interestExpense: s.interestExpense?.raw || 0,
        taxProvision: s.incomeTaxExpense?.raw || 0
      }));

    return {
      annual: parseStatements(result.incomeStatementHistory?.incomeStatementHistory),
      quarterly: parseStatements(result.incomeStatementHistoryQuarterly?.incomeStatementHistory)
    };

  } catch (err) {
    console.error(`fetchIncomeStatement error for ${symbol}:`, err.message);
    return { annual: [], quarterly: [] };
  }
}

/**
 * Fetch Balance Sheet
 */
async function fetchBalanceSheet(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`;
    const res = await axios.get(url, {
      params: { modules: 'balanceSheetHistory,balanceSheetHistoryQuarterly' },
      headers: HEADERS
    });

    const result = res.data?.quoteSummary?.result?.[0];
    if (!result) throw new Error('No data');

    const parseSheets = (sheets) =>
      (sheets || []).map(s => ({
        date: new Date(s.endDate?.raw * 1000).toISOString().split('T')[0],
        totalAssets: s.totalAssets?.raw || 0,
        totalLiabilities: s.totalLiab?.raw || 0,
        totalEquity: s.totalStockholderEquity?.raw || 0,
        currentAssets: s.totalCurrentAssets?.raw || 0,
        currentLiabilities: s.totalCurrentLiabilities?.raw || 0,
        cash: s.cash?.raw || 0,
        shortTermInvestments: s.shortTermInvestments?.raw || 0,
        netReceivables: s.netReceivables?.raw || 0,
        inventory: s.inventory?.raw || 0,
        longTermDebt: s.longTermDebt?.raw || 0,
        shortLongTermDebt: s.shortLongTermDebt?.raw || 0,
        retainedEarnings: s.retainedEarnings?.raw || 0
      }));

    return {
      annual: parseSheets(result.balanceSheetHistory?.balanceSheetStatements),
      quarterly: parseSheets(result.balanceSheetHistoryQuarterly?.balanceSheetStatements)
    };

  } catch (err) {
    console.error(`fetchBalanceSheet error for ${symbol}:`, err.message);
    return { annual: [], quarterly: [] };
  }
}

/**
 * Fetch Cash Flow Statement
 */
async function fetchCashFlow(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`;
    const res = await axios.get(url, {
      params: { modules: 'cashflowStatementHistory,cashflowStatementHistoryQuarterly' },
      headers: HEADERS
    });

    const result = res.data?.quoteSummary?.result?.[0];
    if (!result) throw new Error('No data');

    const parseCF = (statements) =>
      (statements || []).map(s => ({
        date: new Date(s.endDate?.raw * 1000).toISOString().split('T')[0],
        operatingCashflow: s.totalCashFromOperatingActivities?.raw || 0,
        investingCashflow: s.totalCashflowsFromInvestingActivities?.raw || 0,
        financingCashflow: s.totalCashFromFinancingActivities?.raw || 0,
        freeCashflow: s.freeCashFlow?.raw || 0,
        capex: s.capitalExpenditures?.raw || 0,
        netIncome: s.netIncome?.raw || 0,
        depreciation: s.depreciation?.raw || 0,
        changeInCash: s.changeInCash?.raw || 0
      }));

    return {
      annual: parseCF(result.cashflowStatementHistory?.cashflowStatements),
      quarterly: parseCF(result.cashflowStatementHistoryQuarterly?.cashflowStatements)
    };

  } catch (err) {
    console.error(`fetchCashFlow error for ${symbol}:`, err.message);
    return { annual: [], quarterly: [] };
  }
}

/**
 * Fetch ALL financials in one call
 */
async function fetchAllFinancials(symbol) {
  const [keyStats, income, balanceSheet, cashFlow] = await Promise.all([
    fetchKeyStats(symbol),
    fetchIncomeStatement(symbol),
    fetchBalanceSheet(symbol),
    fetchCashFlow(symbol)
  ]);

  return { keyStats, income, balanceSheet, cashFlow };
}

module.exports = {
  fetchKeyStats,
  fetchIncomeStatement,
  fetchBalanceSheet,
  fetchCashFlow,
  fetchAllFinancials
};
