// DeepComparativePage.jsx - Institutional-Grade Deep Comparative Analysis UI

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DeepComparativePage = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('1y');
  const [analysisType, setAnalysisType] = useState('nifty');
  const [sector, setSector] = useState('Technology');
  
  const [deepAnalysis, setDeepAnalysis] = useState(null);
  const [activeDimension, setActiveDimension] = useState('performance');
  
  const sectors = [
    'Technology', 'Banking', 'Financial Services', 'Automobile',
    'Pharmaceutical', 'FMCG', 'Energy', 'Metals', 'Media', 'Realty', 'Infrastructure'
  ];
  
  useEffect(() => {
    if (symbol) {
      fetchDeepAnalysis();
    }
  }, [symbol, period, analysisType, sector]);
  
  const fetchDeepAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url;
      if (analysisType === 'nifty') {
        url = `${API_URL}/api/deep-comparative/vs-nifty/${symbol}?period=${period}`;
      } else {
        url = `${API_URL}/api/deep-comparative/vs-sector/${symbol}?sector=${sector}&period=${period}`;
      }
      
      const response = await axios.get(url);
      setDeepAnalysis(response.data.data);
    } catch (err) {
      console.error('Error fetching deep analysis:', err);
      setError(err.response?.data?.error || 'Failed to fetch deep analysis');
    } finally {
      setLoading(false);
    }
  };
  
  const getValueColor = (value, reverse = false) => {
    const numValue = parseFloat(value);
    if (reverse) {
      return numValue < 0 ? 'text-green-600' : 'text-red-600';
    }
    return numValue > 0 ? 'text-green-600' : 'text-red-600';
  };
  
  const getRiskLevel = (beta) => {
    const b = parseFloat(beta);
    if (b > 1.3) return { label: 'High Risk', color: 'text-red-600 bg-red-100' };
    if (b > 0.7) return { label: 'Moderate Risk', color: 'text-yellow-600 bg-yellow-100' };
    return { label: 'Low Risk', color: 'text-green-600 bg-green-100' };
  };
  
  const getAlphaGrade = (alpha) => {
    const a = parseFloat(alpha);
    if (a > 5) return { grade: 'A+', color: 'text-green-700 bg-green-100' };
    if (a > 3) return { grade: 'A', color: 'text-green-600 bg-green-100' };
    if (a > 0) return { grade: 'B', color: 'text-blue-600 bg-blue-100' };
    if (a > -3) return { grade: 'C', color: 'text-yellow-600 bg-yellow-100' };
    return { grade: 'D', color: 'text-red-600 bg-red-100' };
  };
  
  if (!deepAnalysis && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Deep Comparative Analysis</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Deep Comparative Analysis
              </h1>
              <p className="text-slate-400 text-lg">
                Institutional-grade analysis for {symbol}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400 mb-1">Analysis Dimensions</div>
              <div className="text-3xl font-bold text-blue-400">9</div>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Benchmark Type
              </label>
              <select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="nifty">vs Nifty50</option>
                <option value="sector">vs Sector Index</option>
              </select>
            </div>
            
            {analysisType === 'sector' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sector
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {sectors.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Time Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="3mo">3 Months</option>
                <option value="6mo">6 Months</option>
                <option value="1y">1 Year</option>
                <option value="3y">3 Years</option>
                <option value="5y">5 Years</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={fetchDeepAnalysis}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                {loading ? 'Analyzing...' : '🔬 Run Analysis'}
              </button>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-6 py-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-300 text-lg">Running deep analysis...</p>
            <p className="text-slate-500 text-sm mt-2">Calculating 9 dimensions of comparative metrics</p>
          </div>
        )}
        
        {!loading && deepAnalysis && (
          <>
            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-xl p-4">
                <div className="text-blue-300 text-sm mb-1">Alpha</div>
                <div className={`text-2xl font-bold ${getValueColor(deepAnalysis.attribution.alpha)}`}>
                  {deepAnalysis.attribution.alpha}%
                </div>
                <div className="text-xs text-slate-400 mt-1">Excess returns</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-xl p-4">
                <div className="text-purple-300 text-sm mb-1">Beta</div>
                <div className="text-2xl font-bold text-white">
                  {deepAnalysis.risk.beta}
                </div>
                <div className="text-xs text-slate-400 mt-1">Market correlation</div>
              </div>
              
              <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50 rounded-xl p-4">
                <div className="text-green-300 text-sm mb-1">Info Ratio</div>
                <div className="text-2xl font-bold text-white">
                  {deepAnalysis.risk.informationRatio}
                </div>
                <div className="text-xs text-slate-400 mt-1">Alpha efficiency</div>
              </div>
              
              <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 border border-red-700/50 rounded-xl p-4">
                <div className="text-red-300 text-sm mb-1">Max Drawdown</div>
                <div className="text-2xl font-bold text-red-400">
                  {deepAnalysis.drawdowns.stock.maxDrawdown}%
                </div>
                <div className="text-xs text-slate-400 mt-1">Worst decline</div>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border border-yellow-700/50 rounded-xl p-4">
                <div className="text-yellow-300 text-sm mb-1">Consistency</div>
                <div className="text-2xl font-bold text-white">
                  {deepAnalysis.consistency.outperformanceRate}%
                </div>
                <div className="text-xs text-slate-400 mt-1">Win rate</div>
              </div>
            </div>
            
            {/* Dimension Navigator */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-slate-700">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'performance', label: '📊 Performance', icon: '📊' },
                  { id: 'risk', label: '⚠️ Risk Metrics', icon: '⚠️' },
                  { id: 'attribution', label: '🎯 Attribution', icon: '🎯' },
                  { id: 'drawdowns', label: '📉 Drawdowns', icon: '📉' },
                  { id: 'tail', label: '🔥 Tail Risk', icon: '🔥' },
                  { id: 'distribution', label: '📈 Distribution', icon: '📈' },
                  { id: 'regimes', label: '🌊 Regimes', icon: '🌊' },
                  { id: 'consistency', label: '✅ Consistency', icon: '✅' },
                  { id: 'rolling', label: '🔄 Rolling', icon: '🔄' }
                ].map(dim => (
                  <button
                    key={dim.id}
                    onClick={() => setActiveDimension(dim.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      activeDimension === dim.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {dim.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Analysis Content */}
            <div className="space-y-6">
              
              {/* 1. PERFORMANCE */}
              {activeDimension === 'performance' && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                  <h2 className="text-2xl font-bold text-white mb-6">📊 Performance Analysis</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-4">{symbol}</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-300">Total Return</span>
                          <span className={`font-bold text-lg ${getValueColor(deepAnalysis.performance.stock.totalReturn)}`}>
                            {deepAnalysis.performance.stock.totalReturn}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-300">Annualized Return</span>
                          <span className={`font-bold ${getValueColor(deepAnalysis.performance.stock.annualizedReturn)}`}>
                            {deepAnalysis.performance.stock.annualizedReturn}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-300">Volatility (Ann.)</span>
                          <span className="font-bold text-yellow-400">
                            {deepAnalysis.performance.stock.volatility}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-300">Downside Vol</span>
                          <span className="font-bold text-orange-400">
                            {deepAnalysis.performance.stock.downsideVolatility}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-300">Sharpe Ratio</span>
                          <span className="font-bold text-green-400">
                            {deepAnalysis.performance.stock.sharpeRatio}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-300">Sortino Ratio</span>
                          <span className="font-bold text-green-400">
                            {deepAnalysis.performance.stock.sortinoRatio}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-purple-400 mb-4">
                        Benchmark ({analysisType === 'nifty' ? 'Nifty50' : sector})
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-300">Total Return</span>
                          <span className={`font-bold text-lg ${getValueColor(deepAnalysis.performance.benchmark.totalReturn)}`}>
                            {deepAnalysis.performance.benchmark.totalReturn}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-300">Annualized Return</span>
                          <span className={`font-bold ${getValueColor(deepAnalysis.performance.benchmark.annualizedReturn)}`}>
                            {deepAnalysis.performance.benchmark.annualizedReturn}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-300">Volatility (Ann.)</span>
                          <span className="font-bold text-yellow-400">
                            {deepAnalysis.performance.benchmark.volatility}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-300">Downside Vol</span>
                          <span className="font-bold text-orange-400">
                            {deepAnalysis.performance.benchmark.downsideVolatility}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-300">Sharpe Ratio</span>
                          <span className="font-bold text-green-400">
                            {deepAnalysis.performance.benchmark.sharpeRatio}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-300">Sortino Ratio</span>
                          <span className="font-bold text-green-400">
                            {deepAnalysis.performance.benchmark.sortinoRatio}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 p-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl border border-blue-700/50">
                    <h4 className="text-lg font-semibold text-white mb-4">Outperformance</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-slate-400 mb-1">Absolute</div>
                        <div className={`text-3xl font-bold ${getValueColor(deepAnalysis.performance.outperformance.absolute)}`}>
                          {deepAnalysis.performance.outperformance.absolute > 0 ? '+' : ''}
                          {deepAnalysis.performance.outperformance.absolute}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400 mb-1">Annualized</div>
                        <div className={`text-3xl font-bold ${getValueColor(deepAnalysis.performance.outperformance.annualized)}`}>
                          {deepAnalysis.performance.outperformance.annualized > 0 ? '+' : ''}
                          {deepAnalysis.performance.outperformance.annualized}%
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <div className="text-sm text-slate-400 mb-2">💡 Insight</div>
                    <p className="text-slate-200">
                      <strong>Sortino vs Sharpe:</strong> Sortino ratio only penalizes downside volatility, 
                      making it better for asymmetric returns. Higher Sortino suggests good downside protection.
                    </p>
                  </div>
                </div>
              )}
              
              {/* 2. RISK METRICS */}
              {activeDimension === 'risk' && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                  <h2 className="text-2xl font-bold text-white mb-6">⚠️ Risk Metrics</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-6 bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-xl border border-red-700/50">
                      <div className="text-sm text-red-300 mb-2">Beta</div>
                      <div className="text-4xl font-bold text-white mb-2">{deepAnalysis.risk.beta}</div>
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRiskLevel(deepAnalysis.risk.beta).color}`}>
                        {getRiskLevel(deepAnalysis.risk.beta).label}
                      </div>
                      <p className="text-xs text-slate-400 mt-3">
                        {parseFloat(deepAnalysis.risk.beta) > 1 ? 
                          `${((parseFloat(deepAnalysis.risk.beta) - 1) * 100).toFixed(0)}% more volatile than benchmark` :
                          `${((1 - parseFloat(deepAnalysis.risk.beta)) * 100).toFixed(0)}% less volatile than benchmark`
                        }
                      </p>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-xl border border-blue-700/50">
                      <div className="text-sm text-blue-300 mb-2">Correlation</div>
                      <div className="text-4xl font-bold text-white mb-2">{deepAnalysis.risk.correlation}</div>
                      <div className="text-sm text-slate-300">
                        {parseFloat(deepAnalysis.risk.correlation) > 0.8 ? 'High' :
                         parseFloat(deepAnalysis.risk.correlation) > 0.5 ? 'Moderate' : 'Low'} correlation
                      </div>
                      <p className="text-xs text-slate-400 mt-3">
                        {(parseFloat(deepAnalysis.risk.correlation) * 100).toFixed(0)}% of variance explained by benchmark
                      </p>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-xl border border-purple-700/50">
                      <div className="text-sm text-purple-300 mb-2">Tracking Error</div>
                      <div className="text-4xl font-bold text-white mb-2">{deepAnalysis.risk.trackingError}%</div>
                      <div className="text-sm text-slate-300">
                        {parseFloat(deepAnalysis.risk.trackingError) > 10 ? 'High' :
                         parseFloat(deepAnalysis.risk.trackingError) > 5 ? 'Moderate' : 'Low'} deviation
                      </div>
                      <p className="text-xs text-slate-400 mt-3">
                        Standard deviation of excess returns
                      </p>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-xl border border-green-700/50">
                      <div className="text-sm text-green-300 mb-2">Information Ratio</div>
                      <div className="text-4xl font-bold text-white mb-2">{deepAnalysis.risk.informationRatio}</div>
                      <div className={`text-sm ${parseFloat(deepAnalysis.risk.informationRatio) > 0.5 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {parseFloat(deepAnalysis.risk.informationRatio) > 0.5 ? 'Excellent' :
                         parseFloat(deepAnalysis.risk.informationRatio) > 0 ? 'Good' : 'Poor'} alpha efficiency
                      </div>
                      <p className="text-xs text-slate-400 mt-3">
                        Alpha per unit of tracking error
                      </p>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-xl border border-yellow-700/50">
                      <div className="text-sm text-yellow-300 mb-2">Up Capture</div>
                      <div className="text-4xl font-bold text-white mb-2">{deepAnalysis.risk.upCapture}%</div>
                      <div className="text-sm text-slate-300">
                        {parseFloat(deepAnalysis.risk.upCapture) > 100 ? 'Amplifies' : 'Dampens'} gains
                      </div>
                      <p className="text-xs text-slate-400 mt-3">
                        Participation in benchmark up-moves
                      </p>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-xl border border-orange-700/50">
                      <div className="text-sm text-orange-300 mb-2">Down Capture</div>
                      <div className="text-4xl font-bold text-white mb-2">{deepAnalysis.risk.downCapture}%</div>
                      <div className="text-sm text-slate-300">
                        {parseFloat(deepAnalysis.risk.downCapture) < 100 ? 'Good defense' : 'Poor defense'}
                      </div>
                      <p className="text-xs text-slate-400 mt-3">
                        Participation in benchmark down-moves
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-8 p-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-700/50">
                    <h4 className="text-lg font-semibold text-white mb-4">Capture Ratio Analysis</h4>
                    <div className="text-4xl font-bold text-center text-white mb-2">
                      {deepAnalysis.risk.captureRatio}
                    </div>
                    <p className="text-center text-slate-300">
                      {parseFloat(deepAnalysis.risk.captureRatio) > 1.2 ? 
                        '✅ Excellent - Captures more upside than downside' :
                        parseFloat(deepAnalysis.risk.captureRatio) > 1 ?
                        '✓ Good - Slightly better upside capture' :
                        parseFloat(deepAnalysis.risk.captureRatio) > 0.8 ?
                        '⚠️ Balanced - Equal up/down participation' :
                        '❌ Poor - Captures more downside than upside'
                      }
                    </p>
                  </div>
                  
                  <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <div className="text-sm text-slate-400 mb-2">💡 What This Means</div>
                    <p className="text-slate-200 text-sm leading-relaxed">
                      <strong>Information Ratio</strong> is the Sharpe Ratio of excess returns. Above 0.5 is considered good, 
                      above 1.0 is excellent. <strong>Capture Ratio</strong> above 1.0 means asymmetric returns (good), 
                      below 1.0 means more pain than gain (bad).
                    </p>
                  </div>
                </div>
              )}
              
              {/* 3. ATTRIBUTION */}
              {activeDimension === 'attribution' && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                  <h2 className="text-2xl font-bold text-white mb-6">🎯 Return Attribution</h2>
                  
                  <div className="mb-8 text-center p-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl border border-blue-700/50">
                    <div className="text-sm text-slate-400 mb-2">Jensen's Alpha</div>
                    <div className={`text-6xl font-bold mb-4 ${getValueColor(deepAnalysis.attribution.alpha)}`}>
                      {deepAnalysis.attribution.alpha > 0 ? '+' : ''}{deepAnalysis.attribution.alpha}%
                    </div>
                    <div className={`inline-block px-6 py-2 rounded-full text-lg font-medium ${getAlphaGrade(deepAnalysis.attribution.alpha).color}`}>
                      Grade: {getAlphaGrade(deepAnalysis.attribution.alpha).grade}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="p-6 bg-slate-700/30 rounded-xl">
                      <div className="text-sm text-slate-400 mb-2">Systematic Return</div>
                      <div className="text-3xl font-bold text-blue-400 mb-1">
                        {deepAnalysis.attribution.systematicReturn}%
                      </div>
                      <div className="text-sm text-slate-300">
                        {deepAnalysis.attribution.systematicContribution}% of total
                      </div>
                      <p className="text-xs text-slate-400 mt-3">
                        Returns explained by market exposure (Beta × Market Return)
                      </p>
                    </div>
                    
                    <div className="p-6 bg-slate-700/30 rounded-xl">
                      <div className="text-sm text-slate-400 mb-2">Idiosyncratic Return</div>
                      <div className={`text-3xl font-bold mb-1 ${getValueColor(deepAnalysis.attribution.idiosyncraticReturn)}`}>
                        {deepAnalysis.attribution.idiosyncraticReturn}%
                      </div>
                      <div className="text-sm text-slate-300">
                        {deepAnalysis.attribution.idiosyncraticContribution}% of total
                      </div>
                      <p className="text-xs text-slate-400 mt-3">
                        Returns from stock-specific factors (Alpha + Residual)
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-700/30 rounded-lg">
                      <span className="text-slate-300">Total Return</span>
                      <span className={`font-bold text-lg ${getValueColor(deepAnalysis.attribution.totalReturn)}`}>
                        {deepAnalysis.attribution.totalReturn}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-700/30 rounded-lg">
                      <span className="text-slate-300">Risk-Free Rate</span>
                      <span className="font-bold text-white">
                        {deepAnalysis.attribution.riskFreeRate}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-700/30 rounded-lg">
                      <span className="text-slate-300">Excess Return</span>
                      <span className={`font-bold ${getValueColor(deepAnalysis.attribution.excessReturn)}`}>
                        {deepAnalysis.attribution.excessReturn}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-8 p-6 bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-xl border border-green-700/50">
                    <h4 className="text-lg font-semibold text-white mb-3">Performance Decomposition</h4>
                    <div className="relative h-8 bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full bg-blue-500"
                        style={{ width: `${Math.abs(parseFloat(deepAnalysis.attribution.systematicContribution))}%` }}
                      />
                      <div 
                        className={`absolute h-full ${parseFloat(deepAnalysis.attribution.idiosyncraticContribution) > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ 
                          left: `${Math.abs(parseFloat(deepAnalysis.attribution.systematicContribution))}%`,
                          width: `${Math.abs(parseFloat(deepAnalysis.attribution.idiosyncraticContribution))}%` 
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-3 text-sm">
                      <span className="text-blue-400">■ Systematic ({deepAnalysis.attribution.systematicContribution}%)</span>
                      <span className={parseFloat(deepAnalysis.attribution.idiosyncraticContribution) > 0 ? 'text-green-400' : 'text-red-400'}>
                        ■ Idiosyncratic ({deepAnalysis.attribution.idiosyncraticContribution}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <div className="text-sm text-slate-400 mb-2">💡 Understanding Attribution</div>
                    <p className="text-slate-200 text-sm leading-relaxed">
                      <strong>Systematic</strong> = What you'd earn from market exposure alone. 
                      <strong>Idiosyncratic</strong> = What the stock adds beyond market. 
                      Positive alpha means skill, negative means the stock underperforms its risk level.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Continue with other dimensions... */}
              {/* For brevity, I'll create placeholders for the remaining dimensions */}
              
              {activeDimension === 'drawdowns' && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                  <h2 className="text-2xl font-bold text-white mb-6">📉 Drawdown Analysis</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-red-900/20 border border-red-700/50 rounded-xl">
                      <div className="text-red-300 text-sm mb-2">Max Drawdown (Stock)</div>
                      <div className="text-4xl font-bold text-red-400 mb-2">
                        {deepAnalysis.drawdowns.stock.maxDrawdown}%
                      </div>
                      <div className="text-xs text-slate-400">Worst peak-to-trough decline</div>
                    </div>
                    <div className="p-6 bg-orange-900/20 border border-orange-700/50 rounded-xl">
                      <div className="text-orange-300 text-sm mb-2">Max DD (Benchmark)</div>
                      <div className="text-4xl font-bold text-orange-400 mb-2">
                        {deepAnalysis.drawdowns.benchmark.maxDrawdown}%
                      </div>
                      <div className="text-xs text-slate-400">Benchmark's worst decline</div>
                    </div>
                    <div className="p-6 bg-yellow-900/20 border border-yellow-700/50 rounded-xl">
                      <div className="text-yellow-300 text-sm mb-2">Extra Pain</div>
                      <div className={`text-4xl font-bold mb-2 ${getValueColor(deepAnalysis.drawdowns.comparison.maxPainDifference, true)}`}>
                        {deepAnalysis.drawdowns.comparison.maxPainDifference}%
                      </div>
                      <div className="text-xs text-slate-400">Additional drawdown vs benchmark</div>
                    </div>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">Avg Drawdown</div>
                      <div className="text-xl font-bold text-white">{deepAnalysis.drawdowns.stock.avgDrawdown}%</div>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">DD Count</div>
                      <div className="text-xl font-bold text-white">{deepAnalysis.drawdowns.stock.drawdownCount}</div>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">Avg Recovery</div>
                      <div className="text-xl font-bold text-white">{deepAnalysis.drawdowns.stock.avgRecoveryDays} days</div>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">Current DD</div>
                      <div className="text-xl font-bold text-red-400">{deepAnalysis.drawdowns.stock.currentDrawdown}%</div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeDimension === 'tail' && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                  <h2 className="text-2xl font-bold text-white mb-6">🔥 Tail Risk Analysis</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-4">Value at Risk (VaR)</h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-700/30 rounded-lg">
                          <div className="text-sm text-slate-400 mb-1">95% VaR (1 in 20 days)</div>
                          <div className="text-2xl font-bold text-red-400">{deepAnalysis.tailRisk.stock.var95}%</div>
                        </div>
                        <div className="p-4 bg-slate-700/30 rounded-lg">
                          <div className="text-sm text-slate-400 mb-1">99% VaR (1 in 100 days)</div>
                          <div className="text-2xl font-bold text-red-500">{deepAnalysis.tailRisk.stock.var99}%</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-purple-400 mb-4">Expected Shortfall (CVaR)</h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-700/30 rounded-lg">
                          <div className="text-sm text-slate-400 mb-1">95% CVaR</div>
                          <div className="text-2xl font-bold text-orange-400">{deepAnalysis.tailRisk.stock.cvar95}%</div>
                          <div className="text-xs text-slate-500 mt-1">Avg loss when VaR breached</div>
                        </div>
                        <div className="p-4 bg-slate-700/30 rounded-lg">
                          <div className="text-sm text-slate-400 mb-1">99% CVaR</div>
                          <div className="text-2xl font-bold text-red-500">{deepAnalysis.tailRisk.stock.cvar99}%</div>
                          <div className="text-xs text-slate-500 mt-1">Avg loss in worst 1%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                      <div className="text-sm text-red-300 mb-1">Worst Day</div>
                      <div className="text-3xl font-bold text-red-400">{deepAnalysis.tailRisk.stock.worstDay}%</div>
                    </div>
                    <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                      <div className="text-sm text-green-300 mb-1">Best Day</div>
                      <div className="text-3xl font-bold text-green-400">{deepAnalysis.tailRisk.stock.bestDay}%</div>
                    </div>
                    <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                      <div className="text-sm text-yellow-300 mb-1">Extreme Days</div>
                      <div className="text-3xl font-bold text-yellow-400">{deepAnalysis.tailRisk.stock.extremeFrequency}%</div>
                      <div className="text-xs text-slate-400 mt-1">{deepAnalysis.tailRisk.stock.extremeDays} days total</div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <div className="text-sm text-slate-400 mb-2">💡 Tail Risk Explained</div>
                    <p className="text-slate-200 text-sm leading-relaxed">
                      <strong>VaR</strong> = Maximum expected loss at confidence level. 
                      <strong>CVaR</strong> = Average loss when VaR is breached (worse than VaR). 
                      High extreme frequency means more crashes and spikes.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Add remaining dimensions similarly... */}
              
              {activeDimension === 'distribution' && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                  <h2 className="text-2xl font-bold text-white mb-6">📈 Distribution Characteristics</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="p-6 bg-blue-900/20 border border-blue-700/50 rounded-xl">
                      <div className="text-blue-300 text-sm mb-2">Skewness</div>
                      <div className="text-4xl font-bold text-white mb-2">{deepAnalysis.distribution.stock.skewness}</div>
                      <div className="text-sm text-slate-300">{deepAnalysis.distribution.stock.interpretation.skew}</div>
                    </div>
                    
                    <div className="p-6 bg-purple-900/20 border border-purple-700/50 rounded-xl">
                      <div className="text-purple-300 text-sm mb-2">Excess Kurtosis</div>
                      <div className="text-4xl font-bold text-white mb-2">{deepAnalysis.distribution.stock.kurtosis}</div>
                      <div className="text-sm text-slate-300">{deepAnalysis.distribution.stock.interpretation.kurtosis}</div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-xl border border-indigo-700/50">
                    <h4 className="text-white font-semibold mb-3">What This Means</h4>
                    <div className="space-y-2 text-sm text-slate-300">
                      <p><strong>Skewness:</strong> Positive = more big gains, Negative = more big losses</p>
                      <p><strong>Kurtosis:</strong> Positive = fat tails (crashes likely), Negative = thin tails (stable)</p>
                      <p className="text-xs text-slate-400 mt-3">
                        Normal distribution has skewness = 0 and kurtosis = 0. Stock returns rarely follow normal distribution.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {activeDimension === 'regimes' && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                  <h2 className="text-2xl font-bold text-white mb-6">🌊 Regime-Dependent Performance</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="p-6 bg-green-900/20 border border-green-700/50 rounded-xl">
                      <h3 className="text-green-300 font-semibold mb-4">📈 Bull Markets</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate-300">Days:</span>
                          <span className="font-bold text-white">{deepAnalysis.regimes.bull.days}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Avg Return:</span>
                          <span className="font-bold text-green-400">{deepAnalysis.regimes.bull.avgReturn}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Volatility:</span>
                          <span className="font-bold text-yellow-400">{deepAnalysis.regimes.bull.volatility}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Beta:</span>
                          <span className="font-bold text-white">{deepAnalysis.regimes.bull.beta}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 bg-red-900/20 border border-red-700/50 rounded-xl">
                      <h3 className="text-red-300 font-semibold mb-4">📉 Bear Markets</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate-300">Days:</span>
                          <span className="font-bold text-white">{deepAnalysis.regimes.bear.days}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Avg Return:</span>
                          <span className="font-bold text-red-400">{deepAnalysis.regimes.bear.avgReturn}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Volatility:</span>
                          <span className="font-bold text-yellow-400">{deepAnalysis.regimes.bear.volatility}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Beta:</span>
                          <span className="font-bold text-white">{deepAnalysis.regimes.bear.beta}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-700/50">
                    <h4 className="text-white font-semibold mb-4">Asymmetric Capture</h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-slate-400 mb-1">Up Capture</div>
                        <div className="text-2xl font-bold text-green-400">{deepAnalysis.regimes.asymmetry.upCapture}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400 mb-1">Down Capture</div>
                        <div className="text-2xl font-bold text-red-400">{deepAnalysis.regimes.asymmetry.downCapture}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400 mb-1">Capture Ratio</div>
                        <div className="text-2xl font-bold text-white">{deepAnalysis.regimes.asymmetry.captureRatio}</div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300">{deepAnalysis.regimes.asymmetry.interpretation}</p>
                  </div>
                </div>
              )}
              
              {activeDimension === 'consistency' && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                  <h2 className="text-2xl font-bold text-white mb-6">✅ Consistency Analysis</h2>
                  
                  <div className="text-center mb-8 p-8 bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-2xl border border-green-700/50">
                    <div className="text-sm text-slate-400 mb-2">Outperformance Rate (20-day rolling)</div>
                    <div className="text-6xl font-bold text-white mb-4">{deepAnalysis.consistency.outperformanceRate}%</div>
                    <div className="text-lg text-slate-300">{deepAnalysis.consistency.interpretation}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg text-center">
                      <div className="text-sm text-green-300 mb-1">Win Periods</div>
                      <div className="text-3xl font-bold text-white">{deepAnalysis.consistency.outperformingPeriods}</div>
                    </div>
                    <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-center">
                      <div className="text-sm text-red-300 mb-1">Loss Periods</div>
                      <div className="text-3xl font-bold text-white">{deepAnalysis.consistency.underperformingPeriods}</div>
                    </div>
                    <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg text-center">
                      <div className="text-sm text-blue-300 mb-1">Best Streak</div>
                      <div className="text-3xl font-bold text-white">{deepAnalysis.consistency.longestOutperformStreak}</div>
                    </div>
                    <div className="p-4 bg-orange-900/20 border border-orange-700/50 rounded-lg text-center">
                      <div className="text-sm text-orange-300 mb-1">Worst Streak</div>
                      <div className="text-3xl font-bold text-white">{deepAnalysis.consistency.longestUnderperformStreak}</div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-slate-700/30 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Current Streak:</span>
                      <span className={`text-2xl font-bold ${deepAnalysis.consistency.currentStreak > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {Math.abs(deepAnalysis.consistency.currentStreak)} 
                        {deepAnalysis.consistency.currentStreak > 0 ? ' periods winning' : ' periods losing'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeepComparativePage;
