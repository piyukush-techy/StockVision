// EventsCalendar.jsx - Corporate Events & Market Calendar
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function EventsCalendar({ symbol }) {
  const [stockEvents, setStockEvents] = useState(null);
  const [marketEvents, setMarketEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock');

  useEffect(() => {
    if (symbol) {
      fetchStockEvents();
    }
    fetchMarketEvents();
  }, [symbol]);

  const fetchStockEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/events/${symbol}`);
      setStockEvents(response.data);
    } catch (err) {
      console.error('Stock events error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketEvents = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/events/market/calendar`);
      setMarketEvents(response.data);
    } catch (err) {
      console.error('Market events error:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = date.toDateString();
    const todayOnly = today.toDateString();
    const tomorrowOnly = tomorrow.toDateString();

    if (dateOnly === todayOnly) return 'Today';
    if (dateOnly === tomorrowOnly) return 'Tomorrow';
    
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getDaysUntil = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day';
    if (diff < 0) return 'Past';
    return `${diff} days`;
  };

  if (loading && !symbol) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          📅 Events Calendar
        </h3>
        <button 
          onClick={() => symbol ? fetchStockEvents() : fetchMarketEvents()}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          🔄
        </button>
      </div>

      {/* Tabs (if symbol provided) */}
      {symbol && (
        <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'stock'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            {symbol} Events
          </button>
          <button
            onClick={() => setActiveTab('market')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'market'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Market Events
          </button>
        </div>
      )}

      {/* Stock Events */}
      {(!symbol || activeTab === 'stock') && stockEvents && (
        <div className="space-y-3">
          {stockEvents.events && stockEvents.events.length > 0 ? (
            stockEvents.events.map((event, idx) => (
              <div 
                key={idx}
                className="p-4 border-l-4 rounded-lg bg-gray-50 dark:bg-gray-900"
                style={{ borderColor: event.color }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-2xl">{event.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white mb-1">
                        {event.type}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {event.details}
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>📆 {formatDate(event.date)}</span>
                        {event.exDate && <span>Ex-Date: {formatDate(event.exDate)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: `${event.color}20`, color: event.color }}>
                    {getDaysUntil(event.date)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No upcoming events for {symbol}
            </div>
          )}
        </div>
      )}

      {/* Market Events */}
      {(!symbol || activeTab === 'market') && marketEvents && (
        <div className="space-y-3">
          {marketEvents.events && marketEvents.events.length > 0 ? (
            marketEvents.events.map((event, idx) => {
              const impactColor = event.impact === 'High' ? '#dc2626' : event.impact === 'Medium' ? '#f59e0b' : '#6b7280';
              
              return (
                <div 
                  key={idx}
                  className="p-4 border-l-4 rounded-lg bg-gray-50 dark:bg-gray-900"
                  style={{ borderColor: impactColor }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {event.event}
                    </div>
                    <div className="flex gap-2 items-center">
                      <span 
                        className="text-xs font-semibold px-2 py-1 rounded"
                        style={{ backgroundColor: `${impactColor}20`, color: impactColor }}
                      >
                        {event.impact} Impact
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {getDaysUntil(event.date)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    📆 {formatDate(event.date)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              No upcoming market events
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-xs text-blue-800 dark:text-blue-200">
          <strong>📌 Event Types:</strong> Dividend = Cash payout to shareholders, 
          Board Meeting = Results discussion, AGM = Annual shareholder meeting, 
          Stock Split/Bonus = Share distribution events.
        </div>
      </div>
    </div>
  );
}
