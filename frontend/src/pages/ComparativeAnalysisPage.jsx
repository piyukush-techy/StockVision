// ComparativeAnalysisPage.jsx - Month 10: Comparative Intelligence UI

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ComparativeAnalysisPage = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('1y');
  const [sector, setSector] = useState('');
  const [peers, setPeers] = useState([]);
  const [peerInput, setPeerInput] = useState('');
  
  const [vsNiftyData, setVsNiftyData] = useState(null);
  const [vsSectorData, setVsSectorData] = useState(null);
  const [peerStrengthData, setPeerStrengthData] = useState(null);
  const [riskAdjustedData, setRiskAdjustedData] = useState(null);
  
  const [activeTab, setActiveTab] = useState('nifty');
  
  // Available sectors
  const sectors = [
    'Technology',
    'Banking',
    'Financial Services',
    'Automobile',
    'Pharmaceutical',
    'FMCG',
    'Energy',
    'Metals',
    'Media',
    'Realty',
    'Infrastructure'
  ];
  
  useEffect(() => {
    if (symbol) {
      fetchComparativeData();
    }
  }, [symbol, period]);
  
  const fetchComparativeData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch vs Nifty50 (always available)
      const niftyResponse = await axios.get(
        `${API_URL}/api/comparative/vs-nifty/${symbol}?period=${period}`
      );
      setVsNiftyData(niftyResponse.data.data);
      
    } catch (err) {
      console.error('Error fetching comparative data:', err);
      setError(err.response?.data?.error || 'Failed to fetch comparative data');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchVsSectorData = async () => {
    if (!sector) {
      alert('Please select a sector first');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/comparative/vs-sector/${symbol}?sector=${sector}&period=${period}`
      );
      setVsSectorData(response.data.data);
      setActiveTab('sector');
    } catch (err) {
      console.error('Error fetching sector comparison:', err);
      alert(err.response?.data?.error || 'Failed to fetch sector comparison');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPeerStrength = async () => {
    if (peers.length === 0) {
      alert('Please add at least one peer stock');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/comparative/peer-strength`,
        {
          symbols: [symbol, ...peers],
          period
        }
      );
      setPeerStrengthData(response.data.data);
      setActiveTab('peers');
    } catch (err) {
      console.error('Error fetching peer strength:', err);
      alert(err.response?.data?.error || 'Failed to fetch peer strength');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchRiskAdjusted = async () => {
    if (!sector) {
      alert('Please select a sector first');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/comparative/risk-adjusted/${symbol}?sector=${sector}&period=${period}`
      );
      setRiskAdjustedData(response.data.data);
      setActiveTab('risk');
    } catch (err) {
      console.error('Error fetching risk-adjusted data:', err);
      alert(err.response?.data?.error || 'Failed to fetch risk-adjusted data');
    } finally {
      setLoading(false);
    }
  };
  
  const addPeer = () => {
    if (!peerInput.trim()) return;
    
    const cleanSymbol = peerInput.trim().toUpperCase();
    if (cleanSymbol === symbol.toUpperCase()) {
      alert('Cannot add the same stock as peer');
      return;
    }
    
    if (peers.includes(cleanSymbol)) {
      alert('Peer already added');
      return;
    }
    
    if (peers.length >= 9) {
      alert('Maximum 9 peers allowed');
      return;
    }
    
    setPeers([...peers, cleanSymbol]);
    setPeerInput('');
  };
  
  const removePeer = (peerSymbol) => {
    setPeers(peers.filter(p => p !== peerSymbol));
  };
  
  const getPerformanceColor = (value) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };
  
  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return 'text-green-600 bg-green-100';
    if (grade.startsWith('B')) return 'text-blue-600 bg-blue-100';
    if (grade.startsWith('C')) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Comparative Intelligence - {symbol}
          </h1>
          <p className="text-gray-600 mt-2">
            Compare stock performance vs benchmarks and peers
          </p>
        </div>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Period Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1mo">1 Month</option>
                <option value="3mo">3 Months</option>
                <option value="6mo">6 Months</option>
                <option value="1y">1 Year</option>
                <option value="3y">3 Years</option>
                <option value="5y">5 Years</option>
              </select>
            </div>
            
            {/* Sector Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sector (for sector comparison)
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Sector</option>
                {sectors.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            
            {/* Peer Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Peers (for peer comparison)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={peerInput}
                  onChange={(e) => setPeerInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPeer()}
                  placeholder="e.g., TCS.NS"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={addPeer}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {peers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {peers.map(peer => (
                    <span
                      key={peer}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                    >
                      {peer}
                      <button
                        onClick={() => removePeer(peer)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={fetchVsSectorData}
              disabled={!sector}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              📊 Compare vs Sector
            </button>
            <button
              onClick={fetchPeerStrength}
              disabled={peers.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              🏆 Peer Relative Strength
            </button>
            <button
              onClick={fetchRiskAdjusted}
              disabled={!sector}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              ⚖️ Risk-Adjusted Analysis
            </button>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading comparative analysis...</p>
          </div>
        )}
        
        {/* Tabs */}
        {!loading && vsNiftyData && (
          <>
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('nifty')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'nifty'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                vs Nifty50
              </button>
              {vsSectorData && (
                <button
                  onClick={() => setActiveTab('sector')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'sector'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  vs Sector
                </button>
              )}
              {peerStrengthData && (
                <button
                  onClick={() => setActiveTab('peers')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'peers'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Peer Strength
                </button>
              )}
              {riskAdjustedData && (
                <button
                  onClick={() => setActiveTab('risk')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'risk'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Risk-Adjusted
                </button>
              )}
            </div>
            
            {/* Tab Content */}
            <div className="space-y-6">
              {/* vs Nifty50 Tab */}
              {activeTab === 'nifty' && vsNiftyData && (
                <div className="space-y-6">
                  {/* Verdict Card */}
                  <div className={`p-6 rounded-lg ${
                    vsNiftyData.comparison.verdict === 'Outperforming'
                      ? 'bg-green-100 border-2 border-green-400'
                      : 'bg-red-100 border-2 border-red-400'
                  }`}>
                    <h2 className="text-2xl font-bold mb-2">
                      {vsNiftyData.comparison.verdict} Nifty50
                    </h2>
                    <p className="text-lg">
                      <span className="font-semibold">
                        {vsNiftyData.comparison.absoluteOutperformance > 0 ? '+' : ''}
                        {vsNiftyData.comparison.absoluteOutperformance}%
                      </span>
                      {' '}absolute outperformance over {period}
                    </p>
                  </div>
                  
                  {/* Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Stock Performance */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold mb-4">{symbol} Performance</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Returns:</span>
                          <span className={`font-bold ${getPerformanceColor(vsNiftyData.stock.returns)}`}>
                            {vsNiftyData.stock.returns}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Volatility:</span>
                          <span className="font-medium">{vsNiftyData.stock.volatility}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sharpe Ratio:</span>
                          <span className="font-medium">{vsNiftyData.stock.sharpeRatio}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Beta:</span>
                          <span className="font-medium">{vsNiftyData.stock.beta}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Alpha:</span>
                          <span className={`font-bold ${getPerformanceColor(vsNiftyData.stock.alpha)}`}>
                            {vsNiftyData.stock.alpha}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Nifty50 Performance */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold mb-4">Nifty50 Performance</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Returns:</span>
                          <span className={`font-bold ${getPerformanceColor(vsNiftyData.nifty50.returns)}`}>
                            {vsNiftyData.nifty50.returns}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Volatility:</span>
                          <span className="font-medium">{vsNiftyData.nifty50.volatility}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sharpe Ratio:</span>
                          <span className="font-medium">{vsNiftyData.nifty50.sharpeRatio}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Insights */}
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-bold mb-4">📊 Key Insights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Market Correlation</p>
                        <p className="font-medium">{vsNiftyData.comparison.correlation}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Risk Level</p>
                        <p className="font-medium">{vsNiftyData.comparison.riskLevel}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Better Sharpe Ratio</p>
                        <p className="font-medium">{vsNiftyData.comparison.betterSharpe}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Relative Outperformance</p>
                        <p className={`font-medium ${getPerformanceColor(vsNiftyData.comparison.relativeOutperformance)}`}>
                          {vsNiftyData.comparison.relativeOutperformance}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* vs Sector Tab */}
              {activeTab === 'sector' && vsSectorData && (
                <div className="space-y-6">
                  {/* Verdict Card */}
                  <div className={`p-6 rounded-lg ${
                    vsSectorData.comparison.verdict === 'Outperforming Sector'
                      ? 'bg-green-100 border-2 border-green-400'
                      : 'bg-red-100 border-2 border-red-400'
                  }`}>
                    <h2 className="text-2xl font-bold mb-2">
                      {vsSectorData.comparison.verdict}
                    </h2>
                    <p className="text-lg">
                      <span className="font-semibold">
                        {vsSectorData.comparison.absoluteOutperformance > 0 ? '+' : ''}
                        {vsSectorData.comparison.absoluteOutperformance}%
                      </span>
                      {' '}vs {vsSectorData.sector} sector over {period}
                    </p>
                    <p className="mt-2 text-gray-700">
                      <strong>Context:</strong> {vsSectorData.comparison.sectorContext}
                    </p>
                  </div>
                  
                  {/* Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Stock Performance */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold mb-4">{symbol} Performance</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Returns:</span>
                          <span className={`font-bold ${getPerformanceColor(vsSectorData.stock.returns)}`}>
                            {vsSectorData.stock.returns}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Volatility:</span>
                          <span className="font-medium">{vsSectorData.stock.volatility}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sharpe Ratio:</span>
                          <span className="font-medium">{vsSectorData.stock.sharpeRatio}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sector Beta:</span>
                          <span className="font-medium">{vsSectorData.stock.beta}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sector Alpha:</span>
                          <span className={`font-bold ${getPerformanceColor(vsSectorData.stock.alpha)}`}>
                            {vsSectorData.stock.alpha}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sector Performance */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold mb-4">{vsSectorData.sector} Sector</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Returns:</span>
                          <span className={`font-bold ${getPerformanceColor(vsSectorData.sectorIndex.returns)}`}>
                            {vsSectorData.sectorIndex.returns}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Volatility:</span>
                          <span className="font-medium">{vsSectorData.sectorIndex.volatility}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sharpe Ratio:</span>
                          <span className="font-medium">{vsSectorData.sectorIndex.sharpeRatio}</span>
                        </div>
                        <div className="mt-4 p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-600">Benchmark Index</p>
                          <p className="font-medium">{vsSectorData.sectorBenchmark}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Peer Strength Tab */}
              {activeTab === 'peers' && peerStrengthData && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b">
                      <h3 className="text-lg font-bold">Peer Relative Strength Rankings</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {peerStrengthData.totalPeers} stocks compared over {period}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Rank</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Symbol</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Returns</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Volatility</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Sharpe</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Momentum</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Strength</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {peerStrengthData.peers.map((peer, index) => (
                            <tr
                              key={peer.symbol}
                              className={peer.symbol === symbol ? 'bg-blue-50' : 'hover:bg-gray-50'}
                            >
                              <td className="px-4 py-3 text-sm">{index + 1}</td>
                              <td className="px-4 py-3 text-sm font-medium">
                                {peer.symbol}
                                {peer.symbol === symbol && (
                                  <span className="ml-2 text-xs text-blue-600">(You)</span>
                                )}
                              </td>
                              <td className={`px-4 py-3 text-sm text-right font-medium ${getPerformanceColor(peer.returns)}`}>
                                {peer.returns}%
                              </td>
                              <td className="px-4 py-3 text-sm text-right">{peer.volatility}%</td>
                              <td className="px-4 py-3 text-sm text-right">{peer.sharpeRatio}</td>
                              <td className={`px-4 py-3 text-sm text-right ${getPerformanceColor(peer.momentum)}`}>
                                {peer.momentum}%
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2 py-1 text-xs rounded ${
                                  peer.relativeStrength === 'Strong' ? 'bg-green-100 text-green-700' :
                                  peer.relativeStrength === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {peer.relativeStrength}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Risk-Adjusted Tab */}
              {activeTab === 'risk' && riskAdjustedData && (
                <div className="space-y-6">
                  {/* Grade Card */}
                  <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-8 text-center">
                    <h2 className="text-sm font-medium text-gray-600 mb-2">Risk-Adjusted Performance Grade</h2>
                    <div className={`inline-block px-6 py-3 rounded-lg text-4xl font-bold ${
                      getGradeColor(riskAdjustedData.riskAdjusted.grade)
                    }`}>
                      {riskAdjustedData.riskAdjusted.grade}
                    </div>
                    <p className="mt-4 text-lg text-gray-700">
                      {riskAdjustedData.riskAdjusted.description}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      Composite Score: {riskAdjustedData.riskAdjusted.compositeScore}
                    </p>
                  </div>
                  
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-sm font-medium text-gray-600 mb-2">Sharpe Ratio</h3>
                      <p className="text-3xl font-bold">{riskAdjustedData.riskAdjusted.sharpeRatio}</p>
                      <p className="text-sm text-gray-500 mt-2">Risk-adjusted returns</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-sm font-medium text-gray-600 mb-2">Alpha</h3>
                      <p className={`text-3xl font-bold ${getPerformanceColor(riskAdjustedData.riskAdjusted.alpha)}`}>
                        {riskAdjustedData.riskAdjusted.alpha}%
                      </p>
                      <p className="text-sm text-gray-500 mt-2">Excess returns</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-sm font-medium text-gray-600 mb-2">Beta</h3>
                      <p className="text-3xl font-bold">{riskAdjustedData.riskAdjusted.beta}</p>
                      <p className="text-sm text-gray-500 mt-2">Market correlation</p>
                    </div>
                  </div>
                  
                  {/* Benchmarks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold mb-4">vs Nifty50</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sharpe Outperformance:</span>
                          <span className={`font-medium ${getPerformanceColor(riskAdjustedData.benchmarks.vsNifty50.sharpeOutperformance)}`}>
                            {riskAdjustedData.benchmarks.vsNifty50.sharpeOutperformance}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Verdict:</span>
                          <span className="font-medium">{riskAdjustedData.benchmarks.vsNifty50.verdict}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold mb-4">vs {sector} Sector</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sharpe Outperformance:</span>
                          <span className={`font-medium ${getPerformanceColor(riskAdjustedData.benchmarks.vsSector.sharpeOutperformance)}`}>
                            {riskAdjustedData.benchmarks.vsSector.sharpeOutperformance}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Verdict:</span>
                          <span className="font-medium">{riskAdjustedData.benchmarks.vsSector.verdict}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Insights */}
                  <div className="bg-purple-50 rounded-lg p-6">
                    <h3 className="text-lg font-bold mb-4">💡 Interpretation</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-gray-700">Beta Interpretation:</p>
                        <p className="text-gray-600">{riskAdjustedData.insights.betaInterpretation}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Alpha Interpretation:</p>
                        <p className="text-gray-600">{riskAdjustedData.insights.alphaInterpretation}</p>
                      </div>
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

export default ComparativeAnalysisPage;
