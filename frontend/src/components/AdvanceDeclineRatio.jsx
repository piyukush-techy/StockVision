// AdvanceDeclineRatio.jsx - Market Breadth Indicator
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AdvanceDeclineRatio() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/sentiment/advance-decline`);
      setData(response.data);
    } catch (err) {
      console.error('A/D ratio fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { advancing, declining, unchanged, ratio, signal, color, percentage } = data;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          📊 Market Breadth
        </h3>
        <button 
          onClick={fetchData}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          🔄
        </button>
      </div>

      {/* Ratio Display */}
      <div className="text-center mb-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Advance/Decline Ratio</div>
        <div className="text-4xl font-bold mb-2" style={{ color }}>
          {ratio}
        </div>
        <div className="inline-block px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: `${color}20`, color }}>
          {signal}
        </div>
      </div>

      {/* Stocks Breakdown */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {advancing}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Advancing</div>
          <div className="text-xs font-semibold text-green-600 dark:text-green-400">
            {percentage.advancing}%
          </div>
        </div>
        
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {declining}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Declining</div>
          <div className="text-xs font-semibold text-red-600 dark:text-red-400">
            {percentage.declining}%
          </div>
        </div>
        
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {unchanged}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Unchanged</div>
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            {percentage.unchanged}%
          </div>
        </div>
      </div>

      {/* Visual Bar */}
      <div className="mb-4">
        <div className="flex h-8 rounded-lg overflow-hidden">
          <div 
            className="bg-green-500 flex items-center justify-center text-white text-xs font-semibold"
            style={{ width: `${percentage.advancing}%` }}
          >
            {percentage.advancing > 10 && `${percentage.advancing}%`}
          </div>
          <div 
            className="bg-red-500 flex items-center justify-center text-white text-xs font-semibold"
            style={{ width: `${percentage.declining}%` }}
          >
            {percentage.declining > 10 && `${percentage.declining}%`}
          </div>
          <div 
            className="bg-gray-400 flex items-center justify-center text-white text-xs font-semibold"
            style={{ width: `${percentage.unchanged}%` }}
          >
            {percentage.unchanged > 10 && `${percentage.unchanged}%`}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-xs text-blue-800 dark:text-blue-200">
          <strong>💡 Interpretation:</strong> {getRatioExplanation(advancing, declining)}
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <strong>What is A/D Ratio?</strong> Measures market breadth by comparing advancing vs declining stocks. 
          High ratio (&gt;2) = strong broad rally. Low ratio (&lt;0.5) = weak market.
        </div>
      </div>
    </div>
  );
}

function getRatioExplanation(advancing, declining) {
  const ratio = declining > 0 ? advancing / declining : Infinity;
  
  if (ratio > 3) {
    return 'Very strong market breadth. Most stocks are participating in the rally.';
  } else if (ratio > 2) {
    return 'Healthy market breadth. More stocks advancing than declining.';
  } else if (ratio > 1) {
    return 'Positive but weak breadth. Market is up but participation is limited.';
  } else if (ratio === 1) {
    return 'Neutral breadth. Equal stocks advancing and declining.';
  } else if (ratio > 0.5) {
    return 'Negative breadth. More stocks declining despite market being flat/up.';
  } else {
    return 'Very weak breadth. Broad-based selling across the market.';
  }
}
