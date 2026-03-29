// deepComparative.js - Deep Institutional-Grade Comparative Analysis Routes

const express = require('express');
const router = express.Router();
const checkAccess = require('../middleware/checkAccess');
const { deepCompareVsBenchmark } = require('../utils/deepComparativeEngine');

/**
 * GET /api/deep-comparative/vs-nifty/:symbol
 * 
 * Deep institutional-grade comparison vs Nifty50
 * 
 * Returns 9 analysis dimensions:
 * 1. Performance metrics (returns, Sharpe, Sortino)
 * 2. Risk metrics (Beta, tracking error, capture ratios)
 * 3. Return attribution (systematic vs idiosyncratic)
 * 4. Drawdown analysis (max pain, recovery patterns)
 * 5. Tail risk (VaR, CVaR, extreme events)
 * 6. Distribution characteristics (skewness, kurtosis)
 * 7. Regime dependence (bull/bear performance)
 * 8. Consistency metrics (outperformance stability)
 * 9. Rolling metrics (performance evolution)
 */
router.get('/vs-nifty/:symbol', checkAccess('deep_comparative', 5), async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1y' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    console.log(`\n🔬 Deep analysis request: ${symbol} vs Nifty50 (${period})`);
    
    const analysis = await deepCompareVsBenchmark(symbol, '^NSEI', period);
    
    if (analysis.error) {
      return res.status(500).json(analysis);
    }
    
    res.json({
      success: true,
      data: analysis,
      metadata: {
        symbol,
        benchmark: 'Nifty50 (^NSEI)',
        period,
        analysisType: 'Deep Institutional-Grade',
        dimensions: 9,
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in deep vs-nifty:', error);
    res.status(500).json({ 
      error: 'Failed to generate deep comparative analysis',
      details: error.message 
    });
  }
});

/**
 * GET /api/deep-comparative/vs-sector/:symbol
 * 
 * Deep comparison vs sector benchmark
 */
router.get('/vs-sector/:symbol', checkAccess('deep_comparative', 5), async (req, res) => {
  try {
    const { symbol } = req.params;
    const { sector, period = '1y' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    if (!sector) {
      return res.status(400).json({ error: 'Sector is required' });
    }
    
    // Map sector to benchmark
    const sectorMap = {
      'Technology': '^CNXIT',
      'Banking': '^NSEBANK',
      'Financial Services': '^NSEBANK',
      'Automobile': '^CNXAUTO',
      'Pharmaceutical': '^CNXPHARMA',
      'FMCG': '^CNXFMCG',
      'Energy': '^CNXENERGY',
      'Metals': '^CNXMETAL',
      'Media': '^CNXMEDIA',
      'Realty': '^CNXREALTY',
      'Infrastructure': '^CNXINFRA'
    };
    
    const benchmarkSymbol = sectorMap[sector] || '^NSEI';
    
    console.log(`\n🔬 Deep sector analysis: ${symbol} vs ${sector} (${benchmarkSymbol})`);
    
    const analysis = await deepCompareVsBenchmark(symbol, benchmarkSymbol, period);
    
    if (analysis.error) {
      return res.status(500).json(analysis);
    }
    
    res.json({
      success: true,
      data: analysis,
      metadata: {
        symbol,
        sector,
        benchmark: `${sector} Index (${benchmarkSymbol})`,
        period,
        analysisType: 'Deep Sector Comparison',
        dimensions: 9,
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in deep vs-sector:', error);
    res.status(500).json({ 
      error: 'Failed to generate deep sector comparison',
      details: error.message 
    });
  }
});

/**
 * POST /api/deep-comparative/multi-benchmark
 * 
 * Compare stock against multiple benchmarks simultaneously
 * 
 * Body: {
 *   symbol: "TCS.NS",
 *   benchmarks: ["^NSEI", "^CNXIT"],
 *   period: "1y"
 * }
 */
router.post('/multi-benchmark', checkAccess('deep_comparative', 3), async (req, res) => {
  try {
    const { symbol, benchmarks, period = '1y' } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    if (!benchmarks || !Array.isArray(benchmarks) || benchmarks.length === 0) {
      return res.status(400).json({ error: 'At least one benchmark required' });
    }
    
    if (benchmarks.length > 3) {
      return res.status(400).json({ error: 'Maximum 3 benchmarks allowed' });
    }
    
    console.log(`\n🔬 Multi-benchmark analysis: ${symbol} vs ${benchmarks.join(', ')}`);
    
    // Run analyses in parallel
    const analyses = await Promise.all(
      benchmarks.map(benchmark => deepCompareVsBenchmark(symbol, benchmark, period))
    );
    
    // Check for errors
    const errors = analyses.filter(a => a.error);
    if (errors.length > 0) {
      return res.status(500).json({ 
        error: 'Some analyses failed',
        details: errors 
      });
    }
    
    res.json({
      success: true,
      data: analyses,
      metadata: {
        symbol,
        benchmarks,
        period,
        analysisType: 'Multi-Benchmark Deep Comparison',
        count: benchmarks.length,
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in multi-benchmark:', error);
    res.status(500).json({ 
      error: 'Failed to generate multi-benchmark analysis',
      details: error.message 
    });
  }
});

/**
 * GET /api/deep-comparative/summary/:symbol
 * 
 * Executive summary with key insights
 */
router.get('/summary/:symbol', checkAccess('deep_comparative', 5), async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1y' } = req.query;
    
    const analysis = await deepCompareVsBenchmark(symbol, '^NSEI', period);
    
    if (analysis.error) {
      return res.status(500).json(analysis);
    }
    
    // Extract key insights
    const summary = {
      verdict: {
        overall: parseFloat(analysis.attribution.alpha) > 3 ? 'Strong Alpha Generator' :
                 parseFloat(analysis.attribution.alpha) > 0 ? 'Positive Alpha' :
                 parseFloat(analysis.attribution.alpha) > -3 ? 'Weak Alpha' :
                 'Negative Alpha',
        risk: parseFloat(analysis.risk.beta) > 1.3 ? 'High Risk' :
              parseFloat(analysis.risk.beta) > 0.7 ? 'Moderate Risk' :
              'Low Risk',
        consistency: parseFloat(analysis.consistency.outperformanceRate) > 65 ? 'Highly Consistent' :
                    parseFloat(analysis.consistency.outperformanceRate) > 50 ? 'Moderately Consistent' :
                    'Inconsistent'
      },
      keyMetrics: {
        alpha: analysis.attribution.alpha,
        beta: analysis.risk.beta,
        informationRatio: analysis.risk.informationRatio,
        maxDrawdown: analysis.drawdowns.stock.maxDrawdown,
        outperformanceRate: analysis.consistency.outperformanceRate
      },
      strengths: [],
      weaknesses: [],
      insights: []
    };
    
    // Identify strengths
    if (parseFloat(analysis.attribution.alpha) > 3) {
      summary.strengths.push('Strong alpha generation - beats market by skill');
    }
    if (parseFloat(analysis.risk.informationRatio) > 0.5) {
      summary.strengths.push('Efficient use of tracking error - good risk-adjusted alpha');
    }
    if (parseFloat(analysis.regimes.asymmetry.captureRatio) > 1.2) {
      summary.strengths.push('Captures more upside than downside - asymmetric returns');
    }
    if (parseFloat(analysis.consistency.outperformanceRate) > 65) {
      summary.strengths.push('Consistent outperformer - reliable excess returns');
    }
    
    // Identify weaknesses
    if (parseFloat(analysis.drawdowns.stock.maxDrawdown) > parseFloat(analysis.drawdowns.benchmark.maxDrawdown) + 10) {
      summary.weaknesses.push('Higher drawdown risk than benchmark - painful corrections');
    }
    if (parseFloat(analysis.tailRisk.stock.extremeFrequency) > parseFloat(analysis.tailRisk.benchmark.extremeFrequency) * 1.5) {
      summary.weaknesses.push('More extreme price moves - higher tail risk');
    }
    if (parseFloat(analysis.risk.downCapture) > 100) {
      summary.weaknesses.push('Captures more downside than benchmark - poor defensive qualities');
    }
    if (parseFloat(analysis.attribution.alpha) < 0) {
      summary.weaknesses.push('Negative alpha - underperforms after accounting for risk');
    }
    
    // Generate insights
    const betaValue = parseFloat(analysis.risk.beta);
    const alphaValue = parseFloat(analysis.attribution.alpha);
    
    if (betaValue > 1.2 && alphaValue > 3) {
      summary.insights.push('High-beta, high-alpha stock - aggressive growth with skill');
    } else if (betaValue < 0.8 && alphaValue > 0) {
      summary.insights.push('Low-beta, positive-alpha stock - defensive quality play');
    } else if (betaValue > 1.2 && alphaValue < 0) {
      summary.insights.push('High-beta, negative-alpha - taking risk without reward');
    }
    
    if (parseFloat(analysis.distribution.stock.kurtosis) > 1) {
      summary.insights.push('Fat-tailed distribution - expect more extreme moves than normal');
    }
    
    if (parseFloat(analysis.distribution.stock.skewness) > 0.5) {
      summary.insights.push('Positive skew - occasional large gains, frequent small losses');
    } else if (parseFloat(analysis.distribution.stock.skewness) < -0.5) {
      summary.insights.push('Negative skew - occasional large losses, frequent small gains');
    }
    
    res.json({
      success: true,
      data: {
        summary,
        fullAnalysis: analysis
      },
      metadata: {
        symbol,
        period,
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in summary:', error);
    res.status(500).json({ 
      error: 'Failed to generate executive summary',
      details: error.message 
    });
  }
});

module.exports = router;
