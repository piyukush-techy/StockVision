// executionReality.js - Month 12: Execution Reality & Tax API Routes

const express = require('express');
const router = express.Router();
const checkAccess = require('../middleware/checkAccess');
const {
  calculateCapitalGainsTax,
  calculateAfterTaxReturns,
  calculateDividendTax,
  calculateTurnoverCosts,
  calculateCompoundingReality,
  calculateRealVsPaperReturns,
  performComprehensiveExecutionAnalysis
} = require('../utils/executionRealityEngine');

/**
 * POST /api/execution-reality/capital-gains-tax
 * Calculate capital gains tax for a single trade
 */
router.post('/capital-gains-tax', checkAccess('execution_reality', 20), async (req, res) => {
  try {
    const { buyPrice, sellPrice, quantity, buyDate, sellDate, assetType, listed, taxSlab } = req.body;
    
    if (!buyPrice || !sellPrice || !quantity || !buyDate || !sellDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: buyPrice, sellPrice, quantity, buyDate, sellDate' 
      });
    }
    
    const result = calculateCapitalGainsTax({
      buyPrice,
      sellPrice,
      quantity,
      buyDate,
      sellDate,
      assetType: assetType || 'equity',
      listed: listed !== false,
      taxSlab: taxSlab || 30
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error calculating capital gains tax:', error);
    res.status(500).json({ error: 'Failed to calculate capital gains tax' });
  }
});

/**
 * POST /api/execution-reality/after-tax-returns
 * Calculate after-tax returns for multiple trades
 */
router.post('/after-tax-returns', checkAccess('execution_reality', 10), async (req, res) => {
  try {
    const { trades } = req.body;
    
    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      return res.status(400).json({ error: 'Trades array is required' });
    }
    
    const result = calculateAfterTaxReturns(trades);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error calculating after-tax returns:', error);
    res.status(500).json({ error: 'Failed to calculate after-tax returns' });
  }
});

/**
 * POST /api/execution-reality/dividend-tax
 * Calculate dividend tax
 */
router.post('/dividend-tax', checkAccess('execution_reality', 20), async (req, res) => {
  try {
    const { dividendAmount, quantity, taxSlab, tdsDeducted } = req.body;
    
    if (!dividendAmount || !quantity) {
      return res.status(400).json({ error: 'dividendAmount and quantity are required' });
    }
    
    const result = calculateDividendTax({
      dividendAmount,
      quantity,
      taxSlab: taxSlab || 30,
      tdsDeducted: tdsDeducted || 0
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error calculating dividend tax:', error);
    res.status(500).json({ error: 'Failed to calculate dividend tax' });
  }
});

/**
 * POST /api/execution-reality/turnover-costs
 * Calculate portfolio turnover costs
 */
router.post('/turnover-costs', checkAccess('execution_reality', 10), async (req, res) => {
  try {
    const { 
      portfolioValue, 
      annualTurnover, 
      brokerageRate, 
      avgHoldingPeriod 
    } = req.body;
    
    if (!portfolioValue) {
      return res.status(400).json({ error: 'portfolioValue is required' });
    }
    
    const result = calculateTurnoverCosts({
      portfolioValue,
      annualTurnover: annualTurnover || 1.0,
      brokerageRate,
      avgHoldingPeriod
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error calculating turnover costs:', error);
    res.status(500).json({ error: 'Failed to calculate turnover costs' });
  }
});

/**
 * POST /api/execution-reality/compounding-reality
 * Calculate compounding reality with taxes
 */
router.post('/compounding-reality', checkAccess('execution_reality', 10), async (req, res) => {
  try {
    const {
      initialInvestment,
      years,
      annualReturnPreTax,
      withdrawalRate,
      taxScenario,
      reinvestDividends,
      inflationRate
    } = req.body;
    
    if (!initialInvestment || !years || !annualReturnPreTax) {
      return res.status(400).json({ 
        error: 'initialInvestment, years, and annualReturnPreTax are required' 
      });
    }
    
    const result = calculateCompoundingReality({
      initialInvestment,
      years,
      annualReturnPreTax,
      withdrawalRate: withdrawalRate || 0,
      taxScenario: taxScenario || 'ltcg',
      reinvestDividends: reinvestDividends !== false,
      inflationRate: inflationRate || 6
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error calculating compounding reality:', error);
    res.status(500).json({ error: 'Failed to calculate compounding reality' });
  }
});

/**
 * POST /api/execution-reality/real-vs-paper
 * Calculate real vs paper returns
 */
router.post('/real-vs-paper', checkAccess('execution_reality', 10), async (req, res) => {
  try {
    const {
      paperReturn,
      investmentAmount,
      holdingPeriod,
      assetType,
      turnoverRate,
      marketImpact,
      brokerageRate,
      taxSlab
    } = req.body;
    
    if (!paperReturn || !investmentAmount || !holdingPeriod) {
      return res.status(400).json({ 
        error: 'paperReturn, investmentAmount, and holdingPeriod are required' 
      });
    }
    
    const result = calculateRealVsPaperReturns({
      paperReturn,
      investmentAmount,
      holdingPeriod,
      assetType,
      turnoverRate,
      marketImpact,
      brokerageRate,
      taxSlab
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error calculating real vs paper:', error);
    res.status(500).json({ error: 'Failed to calculate real vs paper returns' });
  }
});

/**
 * POST /api/execution-reality/comprehensive
 * Comprehensive execution analysis (all features combined)
 */
router.post('/comprehensive', checkAccess('execution_reality', 5), async (req, res) => {
  try {
    const {
      trades,
      portfolioValue,
      annualTurnover,
      yearsToProject,
      taxSlab
    } = req.body;
    
    if (!portfolioValue) {
      return res.status(400).json({ error: 'portfolioValue is required' });
    }
    
    const result = performComprehensiveExecutionAnalysis({
      trades,
      portfolioValue,
      annualTurnover: annualTurnover || 1.0,
      yearsToProject: yearsToProject || 5,
      taxSlab: taxSlab || 30
    });
    
    res.json({
      success: true,
      data: result,
      metadata: {
        analyzedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in comprehensive execution analysis:', error);
    res.status(500).json({ error: 'Failed to perform comprehensive analysis' });
  }
});

module.exports = router;
