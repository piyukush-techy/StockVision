// executionRealityEngine.js - Month 12: Complete Execution Reality & Tax Engine

/**
 * MONTH 12 FEATURES:
 * 1. Tax Impact Calculator (STCG/LTCG India)
 * 2. After-Tax Returns
 * 3. Dividend Tax Calculation
 * 4. Portfolio Turnover Costs
 * 5. Compounding Reality Check
 * 6. Real vs Paper Returns
 */

// ============================================================================
// 1. TAX IMPACT CALCULATOR (STCG/LTCG INDIA)
// ============================================================================

/**
 * Calculate capital gains tax as per Indian tax laws (FY 2025-26)
 * 
 * EQUITY:
 * - STCG (<12 months): 15% (listed), 20% (unlisted)
 * - LTCG (>12 months): 12.5% on gains above ₹1.25L (listed), 10% without indexation (unlisted)
 * 
 * DEBT:
 * - STCG (<36 months): As per slab
 * - LTCG (>36 months): 20% with indexation
 */

function calculateCapitalGainsTax(params) {
  const {
    buyPrice,
    sellPrice,
    quantity,
    buyDate,
    sellDate,
    assetType = 'equity', // equity, debt
    listed = true,
    taxSlab = 30 // User's income tax slab (0, 5, 20, 30)
  } = params;
  
  const totalBuyValue = buyPrice * quantity;
  const totalSellValue = sellPrice * quantity;
  const capitalGain = totalSellValue - totalBuyValue;
  
  // Calculate holding period in months
  const holdingPeriodDays = Math.floor((new Date(sellDate) - new Date(buyDate)) / (1000 * 60 * 60 * 24));
  const holdingPeriodMonths = Math.floor(holdingPeriodDays / 30);
  
  let taxRate = 0;
  let taxAmount = 0;
  let gainType = '';
  let exemptionAmount = 0;
  let taxableGain = capitalGain;
  
  if (assetType === 'equity') {
    if (listed) {
      // Listed Equity
      if (holdingPeriodMonths >= 12) {
        // LTCG
        gainType = 'LTCG';
        exemptionAmount = 125000; // ₹1.25L exemption per year
        taxableGain = Math.max(0, capitalGain - exemptionAmount);
        taxRate = 12.5; // 12.5% on gains above ₹1.25L
        taxAmount = (taxableGain * taxRate) / 100;
      } else {
        // STCG
        gainType = 'STCG';
        taxRate = 15; // 15% flat on all STCG
        taxAmount = (capitalGain * taxRate) / 100;
        taxableGain = capitalGain;
      }
    } else {
      // Unlisted Equity
      if (holdingPeriodMonths >= 24) {
        // LTCG
        gainType = 'LTCG';
        taxRate = 10; // 10% without indexation
        taxAmount = (capitalGain * taxRate) / 100;
        taxableGain = capitalGain;
      } else {
        // STCG
        gainType = 'STCG';
        taxRate = 20; // 20% for unlisted
        taxAmount = (capitalGain * taxRate) / 100;
        taxableGain = capitalGain;
      }
    }
  } else if (assetType === 'debt') {
    // Debt instruments (post-April 2023 changes)
    if (holdingPeriodMonths >= 36) {
      // LTCG - taxed at slab rates (no indexation benefit post-2023)
      gainType = 'LTCG';
      taxRate = taxSlab;
      taxAmount = (capitalGain * taxRate) / 100;
      taxableGain = capitalGain;
    } else {
      // STCG - taxed at slab rates
      gainType = 'STCG';
      taxRate = taxSlab;
      taxAmount = (capitalGain * taxRate) / 100;
      taxableGain = capitalGain;
    }
  }
  
  // Add 4% cess on tax
  const cess = taxAmount * 0.04;
  const totalTax = taxAmount + cess;
  
  // Calculate after-tax gain
  const afterTaxGain = capitalGain - totalTax;
  const afterTaxReturn = (afterTaxGain / totalBuyValue) * 100;
  const preTaxReturn = (capitalGain / totalBuyValue) * 100;
  
  return {
    investment: {
      buyPrice,
      sellPrice,
      quantity,
      totalInvested: totalBuyValue,
      totalProceeds: totalSellValue,
      holdingPeriodDays,
      holdingPeriodMonths,
      holdingPeriodYears: (holdingPeriodMonths / 12).toFixed(2)
    },
    capitalGains: {
      totalGain: capitalGain,
      gainType,
      exemptionUsed: exemptionAmount,
      taxableGain,
      taxRate: taxRate + '%',
      effectiveTaxRate: capitalGain > 0 ? ((totalTax / capitalGain) * 100).toFixed(2) + '%' : '0%'
    },
    tax: {
      baseTax: taxAmount,
      cess: cess,
      totalTax,
      breakdown: {
        capitalGainsTax: taxAmount,
        educationCess: cess
      }
    },
    returns: {
      preTaxGain: capitalGain,
      preTaxReturn: preTaxReturn.toFixed(2) + '%',
      afterTaxGain,
      afterTaxReturn: afterTaxReturn.toFixed(2) + '%',
      taxImpact: (preTaxReturn - afterTaxReturn).toFixed(2) + '%',
      netProceeds: totalSellValue - totalTax
    }
  };
}

// ============================================================================
// 2. AFTER-TAX RETURNS CALCULATOR
// ============================================================================

function calculateAfterTaxReturns(trades) {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      summary: null
    };
  }
  
  const results = trades.map(trade => calculateCapitalGainsTax(trade));
  
  const summary = {
    totalTrades: trades.length,
    totalInvested: results.reduce((sum, r) => sum + r.investment.totalInvested, 0),
    totalProceeds: results.reduce((sum, r) => sum + r.investment.totalProceeds, 0),
    totalGains: results.reduce((sum, r) => sum + r.capitalGains.totalGain, 0),
    totalTax: results.reduce((sum, r) => sum + r.tax.totalTax, 0),
    netGains: results.reduce((sum, r) => sum + r.returns.afterTaxGain, 0),
    avgPreTaxReturn: 0,
    avgAfterTaxReturn: 0,
    stcgCount: results.filter(r => r.capitalGains.gainType === 'STCG').length,
    ltcgCount: results.filter(r => r.capitalGains.gainType === 'LTCG').length
  };
  
  summary.avgPreTaxReturn = ((summary.totalGains / summary.totalInvested) * 100).toFixed(2) + '%';
  summary.avgAfterTaxReturn = ((summary.netGains / summary.totalInvested) * 100).toFixed(2) + '%';
  summary.effectiveTaxRate = ((summary.totalTax / summary.totalGains) * 100).toFixed(2) + '%';
  summary.taxDrag = (parseFloat(summary.avgPreTaxReturn) - parseFloat(summary.avgAfterTaxReturn)).toFixed(2) + '%';
  
  return {
    totalTrades: trades.length,
    tradeResults: results,
    summary
  };
}

// ============================================================================
// 3. DIVIDEND TAX CALCULATION
// ============================================================================

function calculateDividendTax(params) {
  const {
    dividendAmount,
    quantity,
    taxSlab = 30, // User's income tax slab
    tdsDeducted = 0 // TDS already deducted (10% usually)
  } = params;
  
  const totalDividend = dividendAmount * quantity;
  
  // Post-2020, dividends are taxable at slab rates
  // TDS: 10% if dividend > ₹5,000 (for residents)
  
  const taxableIncome = totalDividend;
  const taxAtSlabRate = (taxableIncome * taxSlab) / 100;
  
  // Add 4% cess
  const cess = taxAtSlabRate * 0.04;
  const totalTax = taxAtSlabRate + cess;
  
  // Net dividend after tax
  const afterTaxDividend = totalDividend - totalTax;
  
  // If TDS already deducted, calculate remaining tax liability
  const remainingTaxLiability = Math.max(0, totalTax - tdsDeducted);
  const refundDue = tdsDeducted > totalTax ? tdsDeducted - totalTax : 0;
  
  return {
    dividend: {
      grossDividend: totalDividend,
      perShare: dividendAmount,
      quantity
    },
    tax: {
      taxSlab: taxSlab + '%',
      taxableIncome: taxableIncome,
      taxAtSlabRate,
      cess,
      totalTax,
      tdsDeducted,
      remainingLiability: remainingTaxLiability,
      refundDue
    },
    netIncome: {
      afterTaxDividend,
      effectiveTaxRate: ((totalTax / totalDividend) * 100).toFixed(2) + '%',
      taxImpact: totalTax
    }
  };
}

// ============================================================================
// 4. PORTFOLIO TURNOVER COSTS
// ============================================================================

function calculateTurnoverCosts(params) {
  const {
    portfolioValue,
    annualTurnover = 1.0, // 1.0 = 100% turnover (full portfolio traded once)
    brokerageRate = 0.03, // 0.03% per trade (discount broker)
    sttRate = 0.025, // 0.025% on sell side (equity delivery)
    exchangeFees = 0.00345, // ~0.00345% (NSE)
    sebiTurnoverFee = 0.0001, // 0.0001%
    stampDuty = 0.015, // 0.015% on buy side
    gstRate = 18, // 18% GST on brokerage + fees
    avgHoldingPeriod = 12 // months
  } = params;
  
  const tradedValue = portfolioValue * annualTurnover;
  const buyValue = tradedValue / 2; // Half buying, half selling
  const sellValue = tradedValue / 2;
  
  // Calculate costs
  const costs = {
    // Brokerage (both sides)
    brokerage: {
      buy: (buyValue * brokerageRate) / 100,
      sell: (sellValue * brokerageRate) / 100,
      total: 0
    },
    // STT (only on sell for delivery)
    stt: (sellValue * sttRate) / 100,
    
    // Exchange fees (both sides)
    exchangeFees: {
      buy: (buyValue * exchangeFees) / 100,
      sell: (sellValue * exchangeFees) / 100,
      total: 0
    },
    
    // SEBI turnover fee (both sides)
    sebiCharges: {
      buy: (buyValue * sebiTurnoverFee) / 100,
      sell: (sellValue * sebiTurnoverFee) / 100,
      total: 0
    },
    
    // Stamp duty (buy side only)
    stampDuty: (buyValue * stampDuty) / 100,
    
    // GST calculation
    gst: 0
  };
  
  costs.brokerage.total = costs.brokerage.buy + costs.brokerage.sell;
  costs.exchangeFees.total = costs.exchangeFees.buy + costs.exchangeFees.sell;
  costs.sebiCharges.total = costs.sebiCharges.buy + costs.sebiCharges.sell;
  
  // GST on (brokerage + exchange fees + SEBI charges)
  const gstableAmount = costs.brokerage.total + costs.exchangeFees.total + costs.sebiCharges.total;
  costs.gst = (gstableAmount * gstRate) / 100;
  
  // Total transaction costs
  const totalCosts = costs.brokerage.total + costs.stt + costs.exchangeFees.total +
                     costs.sebiCharges.total + costs.stampDuty + costs.gst;
  
  // Calculate tax on gains (assume some gain)
  const estimatedGains = tradedValue * 0.10; // Assume 10% gain
  const capitalGainsTax = avgHoldingPeriod >= 12 ? 
    Math.max(0, (estimatedGains - 125000)) * 0.125 : // LTCG
    estimatedGains * 0.15; // STCG
  
  const totalFriction = totalCosts + capitalGainsTax;
  
  return {
    portfolio: {
      value: portfolioValue,
      annualTurnover: (annualTurnover * 100).toFixed(0) + '%',
      tradedValue,
      avgHoldingPeriod: avgHoldingPeriod + ' months'
    },
    costs: {
      breakdown: {
        brokerage: costs.brokerage.total,
        stt: costs.stt,
        exchangeFees: costs.exchangeFees.total,
        sebiCharges: costs.sebiCharges.total,
        stampDuty: costs.stampDuty,
        gst: costs.gst
      },
      totalTransactionCosts: totalCosts,
      estimatedCapitalGainsTax: capitalGainsTax,
      totalFriction
    },
    impact: {
      costAsPercentOfPortfolio: ((totalCosts / portfolioValue) * 100).toFixed(3) + '%',
      frictionAsPercentOfPortfolio: ((totalFriction / portfolioValue) * 100).toFixed(3) + '%',
      annualDrag: ((totalFriction / portfolioValue) * 100).toFixed(2) + '%',
      breakeven: ((totalFriction / portfolioValue) * 100).toFixed(2) + '%',
      interpretation: totalFriction / portfolioValue > 0.02 ? 
        'High turnover significantly reducing returns' :
        totalFriction / portfolioValue > 0.01 ?
        'Moderate friction - Reduce turnover if possible' :
        'Low friction - Acceptable turnover level'
    }
  };
}

// ============================================================================
// 5. COMPOUNDING REALITY CHECK
// ============================================================================

function calculateCompoundingReality(params) {
  const {
    initialInvestment,
    years,
    annualReturnPreTax, // in percentage
    withdrawalRate = 0, // Annual withdrawal as % of portfolio
    taxScenario = 'ltcg', // 'ltcg', 'stcg', 'mixed'
    reinvestDividends = true,
    inflationRate = 6 // India inflation ~6%
  } = params;
  
  // Tax rates
  const taxRates = {
    ltcg: 12.5 / 100, // 12.5% on gains above ₹1.25L
    stcg: 15 / 100, // 15% flat
    mixed: 13.5 / 100 // Average
  };
  
  const taxRate = taxRates[taxScenario] || taxRates.mixed;
  
  // Year-by-year projection
  const yearlyData = [];
  let portfolioValue = initialInvestment;
  let totalTaxPaid = 0;
  let totalWithdrawn = 0;
  
  for (let year = 1; year <= years; year++) {
    // Calculate pre-tax gain
    const preTaxGain = portfolioValue * (annualReturnPreTax / 100);
    const portfolioAfterGain = portfolioValue + preTaxGain;
    
    // Calculate tax on gain
    let taxOnGain = 0;
    if (taxScenario === 'ltcg') {
      // LTCG: 12.5% on gains above ₹1.25L
      const exemptionUsed = Math.min(preTaxGain, 125000);
      const taxableGain = Math.max(0, preTaxGain - exemptionUsed);
      taxOnGain = taxableGain * taxRate;
    } else {
      // STCG or Mixed: Tax on full gain
      taxOnGain = preTaxGain * taxRate;
    }
    
    totalTaxPaid += taxOnGain;
    
    // After-tax value
    const portfolioAfterTax = portfolioAfterGain - taxOnGain;
    
    // Calculate withdrawal
    const withdrawal = portfolioAfterTax * (withdrawalRate / 100);
    totalWithdrawn += withdrawal;
    
    // Final portfolio value
    const endValue = portfolioAfterTax - withdrawal;
    
    // Calculate inflation-adjusted value (purchasing power)
    const inflationAdjustmentFactor = Math.pow(1 + inflationRate / 100, year);
    const realValue = endValue / inflationAdjustmentFactor;
    
    yearlyData.push({
      year,
      startValue: portfolioValue,
      preTaxGain,
      taxPaid: taxOnGain,
      afterTaxValue: portfolioAfterTax,
      withdrawal,
      endValue,
      realValue,
      cumulativeTax: totalTaxPaid,
      cumulativeWithdrawn: totalWithdrawn
    });
    
    portfolioValue = endValue;
  }
  
  // Calculate simple vs compound (no tax) comparison
  const simpleInterest = initialInvestment + (initialInvestment * (annualReturnPreTax / 100) * years);
  const compoundNoTax = initialInvestment * Math.pow(1 + annualReturnPreTax / 100, years);
  const actualFinalValue = portfolioValue;
  
  // Effective returns
  const effectiveCAGR = Math.pow(actualFinalValue / initialInvestment, 1 / years) - 1;
  const preTaxCAGR = annualReturnPreTax / 100;
  const taxDrag = preTaxCAGR - effectiveCAGR;
  
  return {
    input: {
      initialInvestment,
      years,
      annualReturnPreTax: annualReturnPreTax + '%',
      withdrawalRate: withdrawalRate + '%',
      taxScenario,
      inflationRate: inflationRate + '%'
    },
    results: {
      finalValue: actualFinalValue,
      totalGains: actualFinalValue - initialInvestment + totalWithdrawn,
      totalTaxPaid,
      totalWithdrawn,
      netGains: actualFinalValue - initialInvestment
    },
    comparison: {
      withoutTax: compoundNoTax,
      withTax: actualFinalValue,
      taxImpact: compoundNoTax - actualFinalValue,
      taxImpactPercent: ((compoundNoTax - actualFinalValue) / compoundNoTax * 100).toFixed(2) + '%'
    },
    returns: {
      preTaxCAGR: (preTaxCAGR * 100).toFixed(2) + '%',
      afterTaxCAGR: (effectiveCAGR * 100).toFixed(2) + '%',
      taxDrag: (taxDrag * 100).toFixed(2) + '%',
      realCAGR: ((effectiveCAGR - inflationRate / 100) * 100).toFixed(2) + '%'
    },
    yearlyBreakdown: yearlyData,
    insights: {
      compoundingPower: ((compoundNoTax / simpleInterest - 1) * 100).toFixed(2) + '%',
      taxEfficiency: taxScenario === 'ltcg' ? 'High' : taxScenario === 'mixed' ? 'Medium' : 'Low',
      inflationErosion: ((actualFinalValue - yearlyData[years - 1].realValue) / actualFinalValue * 100).toFixed(2) + '%'
    }
  };
}

// ============================================================================
// 6. REAL VS PAPER RETURNS
// ============================================================================

function calculateRealVsPaperReturns(params) {
  const {
    paperReturn, // Theoretical return from backtest/analysis
    investmentAmount,
    holdingPeriod, // in months
    assetType = 'equity',
    turnoverRate = 1.0, // How many times portfolio turned over
    marketImpact = 0.1, // 0.1% slippage from large orders
    brokerageRate = 0.03,
    taxSlab = 30
  } = params;
  
  // 1. Calculate transaction costs
  const tradedValue = investmentAmount * turnoverRate;
  const buyValue = tradedValue / 2;
  const sellValue = tradedValue / 2;
  
  // Brokerage (both sides)
  const brokerage = (tradedValue * brokerageRate) / 100;
  
  // STT (sell side only, 0.025% for equity delivery)
  const stt = (sellValue * 0.025) / 100;
  
  // Other charges (~0.01% of traded value)
  const otherCharges = (tradedValue * 0.01) / 100;
  
  // GST on brokerage and charges
  const gst = (brokerage + otherCharges) * 0.18;
  
  // Market impact / slippage
  const slippage = (tradedValue * marketImpact) / 100;
  
  const totalTransactionCosts = brokerage + stt + otherCharges + gst + slippage;
  
  // 2. Calculate tax on gains
  const paperGain = (investmentAmount * paperReturn) / 100;
  const gainAfterCosts = paperGain - totalTransactionCosts;
  
  let capitalGainsTax = 0;
  if (assetType === 'equity') {
    if (holdingPeriod >= 12) {
      // LTCG
      const taxableGain = Math.max(0, gainAfterCosts - 125000);
      capitalGainsTax = taxableGain * 0.125;
    } else {
      // STCG
      capitalGainsTax = gainAfterCosts * 0.15;
    }
  }
  
  // 3. Calculate real returns
  const realGain = gainAfterCosts - capitalGainsTax;
  const realReturn = (realGain / investmentAmount) * 100;
  
  // 4. Calculate various metrics
  const costsAsPercentOfReturn = (totalTransactionCosts / paperGain) * 100;
  const taxAsPercentOfReturn = (capitalGainsTax / paperGain) * 100;
  const totalFriction = totalTransactionCosts + capitalGainsTax;
  const frictionAsPercentOfReturn = (totalFriction / paperGain) * 100;
  
  return {
    paper: {
      return: paperReturn.toFixed(2) + '%',
      gain: paperGain,
      finalValue: investmentAmount + paperGain
    },
    costs: {
      transactionCosts: {
        brokerage,
        stt,
        otherCharges,
        gst,
        slippage,
        total: totalTransactionCosts
      },
      tax: {
        capitalGainsTax,
        gainType: holdingPeriod >= 12 ? 'LTCG' : 'STCG'
      },
      totalFriction,
      breakdown: {
        transactionCosts: ((totalTransactionCosts / investmentAmount) * 100).toFixed(3) + '%',
        taxes: ((capitalGainsTax / investmentAmount) * 100).toFixed(3) + '%',
        totalFriction: ((totalFriction / investmentAmount) * 100).toFixed(3) + '%'
      }
    },
    real: {
      return: realReturn.toFixed(2) + '%',
      gain: realGain,
      finalValue: investmentAmount + realGain
    },
    gap: {
      returnGap: (paperReturn - realReturn).toFixed(2) + '%',
      gainGap: paperGain - realGain,
      percentageOfPaperReturn: ((paperGain - realGain) / paperGain * 100).toFixed(2) + '%'
    },
    analysis: {
      costsAsPercentOfReturn: costsAsPercentOfReturn.toFixed(2) + '%',
      taxAsPercentOfReturn: taxAsPercentOfReturn.toFixed(2) + '%',
      frictionAsPercentOfReturn: frictionAsPercentOfReturn.toFixed(2) + '%',
      efficiency: frictionAsPercentOfReturn < 10 ? 'High' :
                  frictionAsPercentOfReturn < 25 ? 'Moderate' :
                  frictionAsPercentOfReturn < 40 ? 'Low' : 'Very Low'
    },
    recommendation: realReturn > 0 ? 
      `Real return ${realReturn.toFixed(1)}% after ${((paperReturn - realReturn) / paperReturn * 100).toFixed(0)}% friction` :
      'Friction eliminates all gains - Strategy not viable'
  };
}

// ============================================================================
// COMPREHENSIVE EXECUTION REALITY ANALYSIS
// ============================================================================

function performComprehensiveExecutionAnalysis(params) {
  const {
    trades = [],
    portfolioValue,
    annualTurnover = 1.0,
    yearsToProject = 5,
    taxSlab = 30
  } = params;

  try {
    // 1. After-tax returns — use trades if provided, else skip
    const afterTaxAnalysis = (Array.isArray(trades) && trades.length > 0)
      ? calculateAfterTaxReturns(trades)
      : { totalTrades: 0, summary: { avgPreTaxReturn: '12%', avgAfterTaxReturn: '10%', totalTax: 0 } };

    // 2. Portfolio turnover costs
    const turnoverAnalysis = calculateTurnoverCosts({
      portfolioValue,
      annualTurnover,
      avgHoldingPeriod: 12
    });

    // 3. Compounding reality (use trade avg return or assume 12% if no trades)
    const avgReturn = parseFloat(afterTaxAnalysis.summary.avgPreTaxReturn) || 12;
    const compoundingAnalysis = calculateCompoundingReality({
      initialInvestment: portfolioValue,
      years: yearsToProject,
      annualReturnPreTax: avgReturn,
      taxScenario: 'ltcg',
      inflationRate: 6
    });

    // 4. Real vs Paper
    const realVsPaper = calculateRealVsPaperReturns({
      paperReturn: avgReturn,
      investmentAmount: portfolioValue,
      holdingPeriod: 12,
      turnoverRate: annualTurnover
    });

    return {
      summary: {
        totalTrades: afterTaxAnalysis.totalTrades,
        portfolioValue,
        avgPreTaxReturn: afterTaxAnalysis.summary.avgPreTaxReturn,
        avgAfterTaxReturn: afterTaxAnalysis.summary.avgAfterTaxReturn,
        totalTaxPaid: afterTaxAnalysis.summary.totalTax,
        totalFriction: turnoverAnalysis.costs.totalFriction,
        netEfficiency: ((portfolioValue - turnoverAnalysis.costs.totalFriction) / portfolioValue * 100).toFixed(2) + '%'
      },
      afterTaxReturns: afterTaxAnalysis,
      turnoverCosts: turnoverAnalysis,
      compounding: compoundingAnalysis,
      realVsPaper
    };
  } catch (error) {
    console.error('Error in comprehensive execution analysis:', error);
    throw error;
  }
}

module.exports = {
  calculateCapitalGainsTax,
  calculateAfterTaxReturns,
  calculateDividendTax,
  calculateTurnoverCosts,
  calculateCompoundingReality,
  calculateRealVsPaperReturns,
  performComprehensiveExecutionAnalysis
};
