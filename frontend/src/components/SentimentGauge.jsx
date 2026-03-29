// SentimentGauge.jsx - Fear & Greed Index Display
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SentimentGauge() {
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSentiment();
  }, []);

  const fetchSentiment = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/sentiment/fear-greed`);
      setSentiment(response.data);
    } catch (err) {
      console.error('Sentiment fetch error:', err);
      setError('Failed to load sentiment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !sentiment) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
        <p className="text-red-500">{error || 'No data'}</p>
        <button 
          onClick={fetchSentiment}
          className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const { score, sentiment: sentimentText, color, signal, components, marketData } = sentiment;

  // Calculate gauge rotation (-90deg to 90deg based on 0-100 score)
  const rotation = -90 + (score * 1.8); // 0 = -90deg, 100 = +90deg

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          📊 Market Sentiment
        </h2>
        <button 
          onClick={fetchSentiment}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="Refresh"
        >
          🔄
        </button>
      </div>

      {/* Gauge Visual */}
      <div className="relative flex justify-center items-center mb-6">
        {/* Semi-circle background */}
        <svg width="280" height="160" viewBox="0 0 280 160" className="overflow-visible">
          {/* Background arc */}
          <path
            d="M 20 140 A 120 120 0 0 1 260 140"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="20"
            className="dark:stroke-gray-700"
          />
          
          {/* Color gradient arc */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#6b7280" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          
          <path
            d="M 20 140 A 120 120 0 0 1 260 140"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="20"
            opacity="0.3"
          />

          {/* Needle */}
          <g transform={`rotate(${rotation} 140 140)`}>
            <line
              x1="140"
              y1="140"
              x2="140"
              y2="40"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="140" cy="140" r="8" fill={color} />
          </g>

          {/* Labels */}
          <text x="20" y="155" fontSize="12" fill="#22c55e" className="font-medium">
            Extreme Fear
          </text>
          <text x="220" y="155" fontSize="12" fill="#dc2626" className="font-medium text-end">
            Extreme Greed
          </text>
        </svg>
      </div>

      {/* Score and Sentiment */}
      <div className="text-center mb-6">
        <div className="text-5xl font-bold mb-2" style={{ color }}>
          {score}
        </div>
        <div className="text-2xl font-semibold mb-2" style={{ color }}>
          {sentimentText}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {signal}
        </div>
      </div>

      {/* Components Breakdown */}
      {components && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Score Components:
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Momentum:</span>
              <span className="font-medium">{components.momentum.value} <span className="text-xs text-gray-500">({components.momentum.weight})</span></span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Volatility:</span>
              <span className="font-medium">{components.volatility.value} <span className="text-xs text-gray-500">({components.volatility.weight})</span></span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Breadth:</span>
              <span className="font-medium">{components.breadth.value} <span className="text-xs text-gray-500">({components.breadth.weight})</span></span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Put/Call:</span>
              <span className="font-medium">{components.putCallRatio.value} <span className="text-xs text-gray-500">({components.putCallRatio.weight})</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Market Data */}
      {marketData && (
        <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-gray-600 dark:text-gray-400 text-xs">NIFTY 50</div>
              <div className="font-semibold">{marketData.nifty?.toLocaleString('en-IN')}</div>
              <div className={`text-xs ${parseFloat(marketData.niftyChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {parseFloat(marketData.niftyChange) >= 0 ? '+' : ''}{marketData.niftyChange}%
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400 text-xs">India VIX</div>
              <div className="font-semibold">{marketData.vix}</div>
              <div className="text-xs text-gray-500">Volatility</div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400 text-xs">Updated</div>
              <div className="font-semibold text-xs">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>
      )}

      {/* Info tooltip */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-xs text-blue-800 dark:text-blue-200">
          <strong>ℹ️ How to use:</strong> Extreme Fear often signals buying opportunities, while Extreme Greed suggests caution. This is a contrarian indicator.
        </div>
      </div>
    </div>
  );
}
