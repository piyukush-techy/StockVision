import { useState } from 'react';
import axios from 'axios';
import { searchStocks } from '../api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ComparePage() {
  const [selectedStocks, setSelectedStocks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Search stocks
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await searchStocks(query);
      setSearchResults(res.data.results || []);
      setShowDropdown(true);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  // Add stock to comparison
  const addStock = (stock) => {
    if (selectedStocks.length >= 10) {
      alert('Maximum 10 stocks allowed');
      return;
    }
    if (selectedStocks.find(s => s.symbol === stock.symbol)) {
      alert('Stock already added');
      return;
    }
    setSelectedStocks([...selectedStocks, stock]);
    setSearchQuery('');
    setShowDropdown(false);
  };

  // Remove stock
  const removeStock = (symbol) => {
    setSelectedStocks(selectedStocks.filter(s => s.symbol !== symbol));
  };

  // Compare stocks with detailed analysis
  const compareStocks = async () => {
    if (selectedStocks.length < 2) {
      alert('Select at least 2 stocks to compare');
      return;
    }

    setLoading(true);
    try {
      const symbols = selectedStocks.map(s => s.symbol);
      const res = await axios.post(`${API_URL}/api/comparative/multi-compare`, { symbols });
      
      // Enrich with detailed analysis
      const enrichedData = {
        ...res.data,
        analysis: analyzeStocks(res.data.stocks)
      };
      
      setComparison(enrichedData);
    } catch (err) {
      console.error('Compare error:', err);
      alert('Failed to compare stocks');
    } finally {
      setLoading(false);
    }
  };

  // Deep stock analysis
  const analyzeStocks = (stocks) => {
    // Find best/worst performers
    const byChange = [...stocks].sort((a, b) => b.change1D - a.change1D);
    const byPE = stocks.filter(s => s.pe > 0).sort((a, b) => a.pe - b.pe);
    const byROE = stocks.filter(s => s.roe > 0).sort((a, b) => b.roe - a.roe);
    const byMarketCap = [...stocks].sort((a, b) => b.marketCap - a.marketCap);
    const byDebt = stocks.filter(s => s.debtToEquity > 0).sort((a, b) => a.debtToEquity - b.debtToEquity);

    // Calculate averages
    const avgPE = stocks.filter(s => s.pe > 0).reduce((sum, s) => sum + s.pe, 0) / stocks.filter(s => s.pe > 0).length || 0;
    const avgROE = stocks.filter(s => s.roe > 0).reduce((sum, s) => sum + s.roe, 0) / stocks.filter(s => s.roe > 0).length || 0;
    const avgDebt = stocks.filter(s => s.debtToEquity > 0).reduce((sum, s) => sum + s.debtToEquity, 0) / stocks.filter(s => s.debtToEquity > 0).length || 0;

    // Risk analysis
    const highDebtStocks = stocks.filter(s => s.debtToEquity > 2);
    const highPEStocks = stocks.filter(s => s.pe > avgPE * 1.5);
    const lowROEStocks = stocks.filter(s => s.roe > 0 && s.roe < 10);

    // Growth potential
    const growthStocks = stocks.filter(s => s.roe > 15 && s.pe < 30);
    const valueStocks = stocks.filter(s => s.pe > 0 && s.pe < avgPE * 0.8);
    
    // Sector diversity
    const sectors = [...new Set(stocks.map(s => s.sector))];

    return {
      bestPerformer: byChange[0],
      worstPerformer: byChange[byChange.length - 1],
      cheapestPE: byPE[0],
      highestPE: byPE[byPE.length - 1],
      bestROE: byROE[0],
      worstROE: byROE[byROE.length - 1],
      largestCap: byMarketCap[0],
      smallestCap: byMarketCap[byMarketCap.length - 1],
      leastDebt: byDebt[0],
      highestDebt: byDebt[byDebt.length - 1],
      averages: {
        pe: avgPE,
        roe: avgROE,
        debt: avgDebt
      },
      risk: {
        highDebt: highDebtStocks.length,
        highPE: highPEStocks.length,
        lowROE: lowROEStocks.length
      },
      opportunities: {
        growth: growthStocks.length,
        value: valueStocks.length
      },
      diversity: {
        sectors: sectors.length,
        sectorList: sectors
      }
    };
  };

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'performance', label: '📈 Performance', icon: '📈' },
    { id: 'valuation', label: '💰 Valuation', icon: '💰' },
    { id: 'profitability', label: '💼 Profitability', icon: '💼' },
    { id: 'risk', label: '⚠️ Risk Analysis', icon: '⚠️' },
    { id: 'correlation', label: '🔗 Correlation', icon: '🔗' },
    { id: 'insights', label: '💡 Insights', icon: '💡' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📊 Deep Stock Comparison
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Professional-grade analysis with 30+ metrics across 7 dimensions
        </p>
      </div>

      {/* Search Box */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Search & Add Stocks
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            placeholder="Search by symbol or name (e.g., RELIANCE, TCS, HDFC...)"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Search Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-2 border-b border-blue-100 dark:border-blue-800">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                    {searchResults.length} Stocks Found
                  </p>
                </div>
                {searchResults.map((stock) => {
                  const cleanSymbol = stock.symbol.replace('.NS', '').replace('.BO', '');
                  const change = stock.liveData?.changePercent || 0;
                  const isPositive = change >= 0;
                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => addStock(stock)}
                      className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all border-b border-gray-100 dark:border-gray-700 last:border-0 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{cleanSymbol.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{cleanSymbol}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{stock.name}</p>
                          </div>
                        </div>
                        {change !== 0 && (
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            isPositive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selected Stocks */}
      {selectedStocks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Selected Stocks ({selectedStocks.length}/10)
            </h2>
            <button
              onClick={compareStocks}
              disabled={selectedStocks.length < 2 || loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {loading ? '⏳ Analyzing...' : '🔍 Deep Compare'}
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {selectedStocks.map((stock) => {
              const cleanSymbol = stock.symbol.replace('.NS', '').replace('.BO', '');
              return (
                <div
                  key={stock.symbol}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <span className="font-semibold text-blue-700 dark:text-blue-400">{cleanSymbol}</span>
                  <button
                    onClick={() => removeStock(stock.symbol)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison Results with Tabs */}
      {comparison && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-b-2 border-blue-600'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Complete Overview</h3>
                  
                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-sm text-blue-700 dark:text-blue-400 font-semibold mb-1">Total Stocks</div>
                      <div className="text-3xl font-bold text-blue-900 dark:text-blue-300">{comparison.stocks.length}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-sm text-green-700 dark:text-green-400 font-semibold mb-1">Sectors Covered</div>
                      <div className="text-3xl font-bold text-green-900 dark:text-green-300">{comparison.analysis.diversity.sectors}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/40 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="text-sm text-purple-700 dark:text-purple-400 font-semibold mb-1">Avg P/E Ratio</div>
                      <div className="text-3xl font-bold text-purple-900 dark:text-purple-300">{comparison.analysis.averages.pe.toFixed(1)}x</div>
                    </div>
                  </div>

                  {/* Full Comparison Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                          <th className="text-left py-3 px-4 font-bold text-gray-900 dark:text-white">Symbol</th>
                          <th className="text-left py-3 px-4 font-bold text-gray-900 dark:text-white">Name</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-900 dark:text-white">Price</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-900 dark:text-white">1D %</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-900 dark:text-white">Mkt Cap</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-900 dark:text-white">P/E</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-900 dark:text-white">P/B</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-900 dark:text-white">ROE</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-900 dark:text-white">ROCE</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-900 dark:text-white">D/E</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.stocks.map((stock, idx) => {
                          const isPositive = stock.change1D >= 0;
                          const isHighlightPE = stock.symbol === comparison.analysis.cheapestPE?.symbol || stock.symbol === comparison.analysis.highestPE?.symbol;
                          const isHighlightROE = stock.symbol === comparison.analysis.bestROE?.symbol;
                          
                          return (
                            <tr 
                              key={stock.symbol} 
                              className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                                idx % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''
                              }`}
                            >
                              <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                                {stock.symbol.replace('.NS', '').replace('.BO', '')}
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">{stock.name}</td>
                              <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-white">
                                ₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </td>
                              <td className={`py-3 px-4 text-right font-bold ${
                                isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {isPositive ? '▲' : '▼'} {Math.abs(stock.change1D).toFixed(2)}%
                              </td>
                              <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                                {stock.marketCap > 0 ? `₹${(stock.marketCap / 10000000).toFixed(1)}Cr` : '—'}
                              </td>
                              <td className={`py-3 px-4 text-right font-semibold ${
                                isHighlightPE ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-400' : 'text-gray-900 dark:text-white'
                              }`}>
                                {stock.pe > 0 ? stock.pe.toFixed(1) + 'x' : '—'}
                              </td>
                              <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                                {stock.pb > 0 ? stock.pb.toFixed(2) + 'x' : '—'}
                              </td>
                              <td className={`py-3 px-4 text-right font-semibold ${
                                isHighlightROE ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-400' : 'text-gray-900 dark:text-white'
                              }`}>
                                {stock.roe > 0 ? stock.roe.toFixed(1) + '%' : '—'}
                              </td>
                              <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                                {stock.roce > 0 ? stock.roce.toFixed(1) + '%' : '—'}
                              </td>
                              <td className={`py-3 px-4 text-right font-semibold ${
                                stock.debtToEquity > 2 ? 'text-red-600 dark:text-red-400' : 
                                stock.debtToEquity > 1 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-green-600 dark:text-green-400'
                              }`}>
                                {stock.debtToEquity > 0 ? stock.debtToEquity.toFixed(2) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === 'performance' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Performance Analysis</h3>
                  
                  {/* Best/Worst Performers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 p-6 rounded-xl border-2 border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                          <span className="text-2xl">🏆</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-green-900 dark:text-green-300">Best Performer</h4>
                          <p className="text-sm text-green-700 dark:text-green-400">Highest 1-day return</p>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-green-900 dark:text-green-300">
                        {comparison.analysis.bestPerformer?.symbol.replace('.NS', '')}
                      </div>
                      <div className="text-xl font-semibold text-green-700 dark:text-green-400 mt-2">
                                ▲ {comparison.analysis.bestPerformer?.change1D.toFixed(2)}%
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                        {comparison.analysis.bestPerformer?.name}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/40 p-6 rounded-xl border-2 border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                          <span className="text-2xl">📉</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-red-900 dark:text-red-300">Worst Performer</h4>
                          <p className="text-sm text-red-700 dark:text-red-400">Lowest 1-day return</p>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-red-900 dark:text-red-300">
                        {comparison.analysis.worstPerformer?.symbol.replace('.NS', '')}
                      </div>
                      <div className="text-xl font-semibold text-red-700 dark:text-red-400 mt-2">
                        ▼ {Math.abs(comparison.analysis.worstPerformer?.change1D || 0).toFixed(2)}%
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-2">
                        {comparison.analysis.worstPerformer?.name}
                      </p>
                    </div>
                  </div>

                  {/* Performance Ranking */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Performance Ranking</h4>
                    <div className="space-y-3">
                      {[...comparison.stocks]
                        .sort((a, b) => b.change1D - a.change1D)
                        .map((stock, idx) => {
                          const isPositive = stock.change1D >= 0;
                          return (
                            <div key={stock.symbol} className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                                idx === 1 ? 'bg-gray-300 text-gray-700' :
                                idx === 2 ? 'bg-orange-300 text-orange-900' :
                                'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}>
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <div className="font-bold text-gray-900 dark:text-white">{stock.symbol.replace('.NS', '')}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{stock.name}</div>
                              </div>
                              <div className="text-right">
                                <div className={`text-lg font-bold ${
                                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {isPositive ? '▲' : '▼'} {Math.abs(stock.change1D).toFixed(2)}%
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  ₹{stock.price.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Valuation Tab */}
              {activeTab === 'valuation' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Valuation Metrics</h3>
                  
                  {/* P/E Analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-2">Cheapest P/E</h4>
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                        {comparison.analysis.cheapestPE?.symbol.replace('.NS', '')}
                      </div>
                      <div className="text-lg font-semibold text-blue-700 dark:text-blue-400 mt-1">
                        {comparison.analysis.cheapestPE?.pe.toFixed(1)}x
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Potentially undervalued</p>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
                      <h4 className="text-sm font-bold text-purple-700 dark:text-purple-400 mb-2">Average P/E</h4>
                      <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                        Group Avg
                      </div>
                      <div className="text-lg font-semibold text-purple-700 dark:text-purple-400 mt-1">
                        {comparison.analysis.averages.pe.toFixed(1)}x
                      </div>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">Benchmark valuation</p>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
                      <h4 className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">Highest P/E</h4>
                      <div className="text-2xl font-bold text-red-900 dark:text-red-300">
                        {comparison.analysis.highestPE?.symbol.replace('.NS', '')}
                      </div>
                      <div className="text-lg font-semibold text-red-700 dark:text-red-400 mt-1">
                        {comparison.analysis.highestPE?.pe.toFixed(1)}x
                      </div>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">Premium valuation</p>
                    </div>
                  </div>

                  {/* Valuation Matrix */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Complete Valuation Matrix</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                            <th className="text-left py-3 px-4 font-bold text-gray-900 dark:text-white">Stock</th>
                            <th className="text-right py-3 px-4 font-bold text-gray-900 dark:text-white">P/E Ratio</th>
                            <th className="text-right py-3 px-4 font-bold text-gray-900 dark:text-white">P/B Ratio</th>
                            <th className="text-right py-3 px-4 font-bold text-gray-900 dark:text-white">Market Cap</th>
                            <th className="text-center py-3 px-4 font-bold text-gray-900 dark:text-white">Valuation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparison.stocks.map((stock) => {
                            const peVsAvg = stock.pe / comparison.analysis.averages.pe;
                            const valuation = stock.pe < comparison.analysis.averages.pe * 0.8 ? 'Undervalued' :
                                            stock.pe > comparison.analysis.averages.pe * 1.2 ? 'Overvalued' : 'Fair';
                            const valuationColor = valuation === 'Undervalued' ? 'text-green-600 dark:text-green-400' :
                                                 valuation === 'Overvalued' ? 'text-red-600 dark:text-red-400' :
                                                 'text-blue-600 dark:text-blue-400';
                            
                            return (
                              <tr key={stock.symbol} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                                  {stock.symbol.replace('.NS', '')}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-white">
                                  {stock.pe > 0 ? `${stock.pe.toFixed(1)}x` : '—'}
                                  {stock.pe > 0 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                      ({peVsAvg > 1 ? '+' : ''}{((peVsAvg - 1) * 100).toFixed(0)}% vs avg)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                                  {stock.pb > 0 ? `${stock.pb.toFixed(2)}x` : '—'}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                                  {stock.marketCap > 0 ? `₹${(stock.marketCap / 10000000).toFixed(0)}Cr` : '—'}
                                </td>
                                <td className={`py-3 px-4 text-center font-bold ${valuationColor}`}>
                                  {stock.pe > 0 ? valuation : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Profitability Tab */}
              {activeTab === 'profitability' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Profitability & Efficiency</h3>
                  
                  {/* ROE Champions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/40 p-6 rounded-xl border-2 border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                          <span className="text-2xl">💎</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-emerald-900 dark:text-emerald-300">Highest ROE</h4>
                          <p className="text-sm text-emerald-700 dark:text-emerald-400">Best return on equity</p>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-300">
                        {comparison.analysis.bestROE?.symbol.replace('.NS', '')}
                      </div>
                      <div className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mt-2">
                        {comparison.analysis.bestROE?.roe.toFixed(1)}%
                      </div>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-2">
                        Exceptional profitability
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/40 p-6 rounded-xl border-2 border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                          <span className="text-2xl">📊</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-amber-900 dark:text-amber-300">Average ROE</h4>
                          <p className="text-sm text-amber-700 dark:text-amber-400">Group benchmark</p>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-amber-900 dark:text-amber-300">
                        Portfolio Avg
                      </div>
                      <div className="text-xl font-semibold text-amber-700 dark:text-amber-400 mt-2">
                        {comparison.analysis.averages.roe.toFixed(1)}%
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                        Industry standard
                      </p>
                    </div>
                  </div>

                  {/* Profitability Matrix */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Profitability Ranking</h4>
                    <div className="space-y-3">
                      {[...comparison.stocks]
                        .filter(s => s.roe > 0)
                        .sort((a, b) => b.roe - a.roe)
                        .map((stock, idx) => {
                          const roeVsAvg = ((stock.roe / comparison.analysis.averages.roe - 1) * 100);
                          const scoreColor = stock.roe > 20 ? 'bg-green-500' :
                                           stock.roe > 15 ? 'bg-blue-500' :
                                           stock.roe > 10 ? 'bg-yellow-500' :
                                           'bg-red-500';
                          
                          return (
                            <div key={stock.symbol} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${scoreColor}`}>
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <div className="font-bold text-gray-900 dark:text-white">{stock.symbol.replace('.NS', '')}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  ROE: {stock.roe.toFixed(1)}% | ROCE: {stock.roce > 0 ? `${stock.roce.toFixed(1)}%` : 'N/A'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-semibold ${
                                  roeVsAvg > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {roeVsAvg > 0 ? '+' : ''}{roeVsAvg.toFixed(0)}% vs avg
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Analysis Tab */}
              {activeTab === 'risk' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Risk Assessment</h3>
                  
                  {/* Risk Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`p-6 rounded-xl border-2 ${
                      comparison.analysis.risk.highDebt > comparison.stocks.length / 2
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800'
                    }`}>
                      <h4 className="text-sm font-bold mb-2">High Debt Stocks</h4>
                      <div className="text-3xl font-bold mb-1">
                        {comparison.analysis.risk.highDebt}/{comparison.stocks.length}
                      </div>
                      <p className="text-xs">Debt/Equity &gt; 2.0</p>
                    </div>

                    <div className={`p-6 rounded-xl border-2 ${
                      comparison.analysis.risk.highPE > comparison.stocks.length / 2
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800'
                    }`}>
                      <h4 className="text-sm font-bold mb-2">High P/E Stocks</h4>
                      <div className="text-3xl font-bold mb-1">
                        {comparison.analysis.risk.highPE}/{comparison.stocks.length}
                      </div>
                      <p className="text-xs">P/E &gt; 1.5× average</p>
                    </div>

                    <div className={`p-6 rounded-xl border-2 ${
                      comparison.analysis.risk.lowROE > comparison.stocks.length / 2
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-800'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800'
                    }`}>
                      <h4 className="text-sm font-bold mb-2">Low ROE Stocks</h4>
                      <div className="text-3xl font-bold mb-1">
                        {comparison.analysis.risk.lowROE}/{comparison.stocks.length}
                      </div>
                      <p className="text-xs">ROE &lt; 10%</p>
                    </div>
                  </div>

                  {/* Debt Analysis */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Debt Analysis</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <h5 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">Lowest Debt</h5>
                        <div className="text-2xl font-bold text-green-900 dark:text-green-300">
                          {comparison.analysis.leastDebt?.symbol.replace('.NS', '')}
                        </div>
                        <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                          D/E: {comparison.analysis.leastDebt?.debtToEquity.toFixed(2)}
                        </div>
                      </div>

                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                        <h5 className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">Highest Debt</h5>
                        <div className="text-2xl font-bold text-red-900 dark:text-red-300">
                          {comparison.analysis.highestDebt?.symbol.replace('.NS', '')}
                        </div>
                        <div className="text-lg font-semibold text-red-700 dark:text-red-400">
                          D/E: {comparison.analysis.highestDebt?.debtToEquity.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[...comparison.stocks]
                        .filter(s => s.debtToEquity > 0)
                        .sort((a, b) => a.debtToEquity - b.debtToEquity)
                        .map((stock) => {
                          const riskLevel = stock.debtToEquity > 2 ? 'High Risk' :
                                          stock.debtToEquity > 1 ? 'Medium Risk' :
                                          stock.debtToEquity > 0.5 ? 'Low Risk' : 'Very Safe';
                          const barColor = stock.debtToEquity > 2 ? 'bg-red-500' :
                                         stock.debtToEquity > 1 ? 'bg-yellow-500' :
                                         'bg-green-500';
                          const barWidth = Math.min((stock.debtToEquity / 3) * 100, 100);
                          
                          return (
                            <div key={stock.symbol} className="flex items-center gap-4">
                              <div className="w-32 font-bold text-sm text-gray-900 dark:text-white">
                                {stock.symbol.replace('.NS', '')}
                              </div>
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                                <div 
                                  className={`${barColor} h-6 rounded-full flex items-center justify-end px-2`}
                                  style={{ width: `${barWidth}%` }}
                                >
                                  <span className="text-xs font-bold text-white">
                                    {stock.debtToEquity.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className={`w-24 text-sm font-semibold text-right ${
                                stock.debtToEquity > 2 ? 'text-red-600 dark:text-red-400' :
                                stock.debtToEquity > 1 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-green-600 dark:text-green-400'
                              }`}>
                                {riskLevel}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Correlation Tab */}
              {activeTab === 'correlation' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Correlation Matrix</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Shows how stocks move together. Higher correlation (closer to 1.0) means stocks tend to move in the same direction.
                    Lower correlation means better diversification.
                  </p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left py-2 px-3 font-bold text-gray-900 dark:text-white"></th>
                          {comparison.stocks.map(s => (
                            <th key={s.symbol} className="text-center py-2 px-3 font-bold text-gray-900 dark:text-white">
                              {s.symbol.replace('.NS', '').replace('.BO', '')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.stocks.map(s1 => (
                          <tr key={s1.symbol} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="py-2 px-3 font-bold text-gray-900 dark:text-white">
                              {s1.symbol.replace('.NS', '').replace('.BO', '')}
                            </td>
                            {comparison.stocks.map(s2 => {
                              const corr = parseFloat(comparison.correlationMatrix[s1.symbol][s2.symbol]);
                              const intensity = Math.abs(corr - 0.5) * 2;
                              const bgColor = corr === 1.0 ? 'rgb(37, 99, 235)' : 
                                            corr > 0.7 ? `rgba(37, 99, 235, ${intensity * 0.6})` :
                                            corr > 0.5 ? `rgba(37, 99, 235, ${intensity * 0.4})` :
                                            `rgba(156, 163, 175, 0.2)`;
                              
                              return (
                                <td
                                  key={s2.symbol}
                                  className="py-2 px-3 text-center font-bold"
                                  style={{
                                    backgroundColor: bgColor,
                                    color: corr > 0.6 ? 'white' : 'inherit'
                                  }}
                                >
                                  {corr.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Correlation Insights */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
                    <h4 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-3">💡 Diversification Tips</h4>
                    <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
                      <li className="flex items-start gap-2">
                        <span>•</span>
                        <span>Stocks with correlation &lt; 0.5 provide better diversification</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>•</span>
                        <span>High correlation (&gt; 0.8) means stocks move together - less diversification benefit</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>•</span>
                        <span>Mix stocks from different sectors for optimal portfolio diversification</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Insights Tab */}
              {activeTab === 'insights' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">💡 AI-Powered Insights</h3>
                  
                  {/* Key Findings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Growth Opportunities */}
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/40 p-6 rounded-xl border-2 border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                          <span className="text-2xl">🚀</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-emerald-900 dark:text-emerald-300">Growth Stocks</h4>
                          <p className="text-sm text-emerald-700 dark:text-emerald-400">ROE &gt; 15% & P/E &lt; 30</p>
                        </div>
                      </div>
                      <div className="text-4xl font-bold text-emerald-900 dark:text-emerald-300 mb-2">
                        {comparison.analysis.opportunities.growth}
                      </div>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        Stocks with strong profitability at reasonable valuations
                      </p>
                    </div>

                    {/* Value Opportunities */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 p-6 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-2xl">💎</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-blue-900 dark:text-blue-300">Value Stocks</h4>
                          <p className="text-sm text-blue-700 dark:text-blue-400">P/E &lt; 80% of average</p>
                        </div>
                      </div>
                      <div className="text-4xl font-bold text-blue-900 dark:text-blue-300 mb-2">
                        {comparison.analysis.opportunities.value}
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        Potentially undervalued investment opportunities
                      </p>
                    </div>
                  </div>

                  {/* Sector Diversity */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Sector Diversification</h4>
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {comparison.analysis.diversity.sectors} Sectors
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {comparison.analysis.diversity.sectorList.map(sector => (
                          <span 
                            key={sector}
                            className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-semibold"
                          >
                            {sector}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {comparison.analysis.diversity.sectors >= 3 
                        ? '✅ Good diversification across multiple sectors' 
                        : '⚠️ Consider adding stocks from different sectors for better diversification'}
                    </p>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/40 rounded-xl border-2 border-purple-200 dark:border-purple-800 p-6">
                    <h4 className="text-lg font-bold text-purple-900 dark:text-purple-300 mb-4">📋 Investment Recommendations</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">1</span>
                        </div>
                        <div>
                          <div className="font-bold text-purple-900 dark:text-purple-300">Best Value Pick</div>
                          <div className="text-sm text-purple-700 dark:text-purple-400">
                            {comparison.analysis.cheapestPE?.symbol.replace('.NS', '')} - Lowest P/E at {comparison.analysis.cheapestPE?.pe.toFixed(1)}x
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">2</span>
                        </div>
                        <div>
                          <div className="font-bold text-purple-900 dark:text-purple-300">Best Quality Pick</div>
                          <div className="text-sm text-purple-700 dark:text-purple-400">
                            {comparison.analysis.bestROE?.symbol.replace('.NS', '')} - Highest ROE at {comparison.analysis.bestROE?.roe.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">3</span>
                        </div>
                        <div>
                          <div className="font-bold text-purple-900 dark:text-purple-300">Safest Pick</div>
                          <div className="text-sm text-purple-700 dark:text-purple-400">
                            {comparison.analysis.leastDebt?.symbol.replace('.NS', '')} - Lowest debt at {comparison.analysis.leastDebt?.debtToEquity.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">⚠</span>
                        </div>
                        <div>
                          <div className="font-bold text-purple-900 dark:text-purple-300">Watch Out For</div>
                          <div className="text-sm text-purple-700 dark:text-purple-400">
                            {comparison.analysis.highestDebt?.symbol.replace('.NS', '')} - High debt at {comparison.analysis.highestDebt?.debtToEquity.toFixed(2)} D/E ratio
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Warning */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-200 dark:border-yellow-800 p-6">
                    <h4 className="text-lg font-bold text-yellow-900 dark:text-yellow-300 mb-3">⚠️ Important Disclaimers</h4>
                    <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-400">
                      <li className="flex items-start gap-2">
                        <span>•</span>
                        <span>This analysis is based on current data and historical metrics</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>•</span>
                        <span>Past performance does not guarantee future results</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>•</span>
                        <span>Always conduct your own research and consult a financial advisor</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>•</span>
                        <span>Consider your risk tolerance and investment goals before making decisions</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedStocks.length === 0 && !comparison && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Professional Stock Comparison
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
            Compare stocks across 30+ metrics including performance, valuation, profitability, risk, and correlation.
            Get AI-powered insights and investment recommendations.
          </p>
          <div className="flex justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span className="font-semibold">💡 Try comparing:</span>
            {['RELIANCE', 'TCS', 'HDFCBANK', 'INFY'].map(symbol => (
              <button
                key={symbol}
                onClick={() => handleSearch(symbol)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-600 transition-all font-semibold text-blue-700 dark:text-blue-400"
              >
                {symbol}
              </button>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl mb-2">📈</div>
              <div className="font-semibold text-gray-900 dark:text-white text-sm">Performance</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Returns & rankings</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl mb-2">💰</div>
              <div className="font-semibold text-gray-900 dark:text-white text-sm">Valuation</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">P/E, P/B analysis</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl mb-2">💼</div>
              <div className="font-semibold text-gray-900 dark:text-white text-sm">Profitability</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">ROE, ROCE metrics</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl mb-2">⚠️</div>
              <div className="font-semibold text-gray-900 dark:text-white text-sm">Risk</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Debt & safety</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
