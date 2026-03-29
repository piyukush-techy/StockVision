// FIIDIIFlow.jsx - FII/DII Daily Flow Display
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function FIIDIIFlow() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/sentiment/fii-dii`);
      setData(response.data);
    } catch (err) {
      console.error('FII/DII fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || !data.today) return null;

  const { today, week, summary } = data;

  const FlowCard = ({ title, data, icon }) => (
    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {icon} {title}
        </div>
        <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: `${data.color}20`, color: data.color }}>
          {data.type}
        </div>
      </div>
      <div className="text-2xl font-bold" style={{ color: data.color }}>
        {data.amount >= 0 ? '+' : ''}₹{Math.abs(data.amount).toLocaleString('en-IN')} Cr
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          💼 FII/DII Flow
        </h3>
        <button 
          onClick={fetchData}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          🔄
        </button>
      </div>

      {/* Today's Flow */}
      <div className="mb-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">Today's Activity:</div>
        <div className="grid grid-cols-1 gap-3">
          <FlowCard title="FII (Foreign Institutional Investors)" data={today.fii} icon="🌍" />
          <FlowCard title="DII (Domestic Institutional Investors)" data={today.dii} icon="🏦" />
          <FlowCard title="Retail Investors" data={today.retail} icon="👥" />
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
        <div className="text-sm text-blue-800 dark:text-blue-200">
          {summary}
        </div>
      </div>

      {/* Weekly Trend */}
      {week && week.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            This Week's Trend:
          </div>
          <div className="space-y-2">
            {week.map((day, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 w-12">{day.day}</span>
                <div className="flex-1 mx-3 flex gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">FII:</span>
                      <span className={`font-medium ${day.fii >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {day.fii >= 0 ? '+' : ''}{day.fii}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">DII:</span>
                      <span className={`font-medium ${day.dii >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {day.dii >= 0 ? '+' : ''}{day.dii}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <strong>📊 What does this mean?</strong> FII buying is generally bullish (brings foreign money), 
          DII buying shows domestic confidence. Heavy selling from both can indicate market weakness.
        </div>
      </div>
    </div>
  );
}
