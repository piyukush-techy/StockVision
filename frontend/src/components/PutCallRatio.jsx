// PutCallRatio.jsx - Put/Call Ratio Display
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PutCallRatio() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/sentiment/put-call-ratio`);
      setData(response.data);
    } catch (err) {
      console.error('Put/Call fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { ratio, signal, color, explanation } = data;
  const numRatio = parseFloat(ratio);

  // Calculate position on scale (0 to 2)
  const position = Math.min(100, (numRatio / 2) * 100);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          📈 Put/Call Ratio
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
        <div className="text-4xl font-bold mb-2" style={{ color }}>
          {ratio}
        </div>
        <div className="inline-block px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: `${color}20`, color }}>
          {signal}
        </div>
      </div>

      {/* Visual Scale */}
      <div className="mb-4">
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          {/* Gradient background */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, #22c55e 0%, #3b82f6 25%, #6b7280 50%, #f59e0b 75%, #dc2626 100%)'
            }}
          ></div>
          
          {/* Current position marker */}
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white border-2 rounded-full shadow-lg"
            style={{ 
              left: `${position}%`,
              borderColor: color
            }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0.0 (Greed)</span>
          <span>1.0</span>
          <span>2.0 (Fear)</span>
        </div>
      </div>

      {/* Explanation */}
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {explanation}
      </div>

      {/* Info */}
      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <strong>What is Put/Call Ratio?</strong> Ratio of put options (bearish bets) to call options (bullish bets). 
          Higher ratio = more fear/protection buying.
        </div>
      </div>
    </div>
  );
}
