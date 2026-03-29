import { useEffect, useState } from 'react';
import { getStock } from '../api';
import BreakoutBadge from './BreakoutBadge';

export default function PriceHeader({ symbol, initialStock }) {
  const [stock, setStock] = useState(initialStock || null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await getStock(symbol);
        setStock(res.data.stock);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Price refresh failed:', err);
      }
    };
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [symbol]);

  if (!stock) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-36 mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded" />)}
        </div>
      </div>
    );
  }

  const live = stock.liveData || {};
  const ftw = stock.fiftyTwoWeek || {};
  const isPositive = (live.changePercent || 0) >= 0;
  const cleanSymbol = stock.symbol.replace('.NS', '').replace('.BO', '');

  const range52 = ftw.high - ftw.low;
  const currentPos = range52 > 0 ? ((live.price - ftw.low) / range52) * 100 : 50;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      {/* Stock Name & Exchange */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{stock.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded">
              {cleanSymbol}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{stock.exchange}</span>
            {stock.sector && stock.sector !== 'Unknown' && (
              <span className="text-sm text-gray-400 dark:text-gray-500">• {stock.sector}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live
        </div>
      </div>

      {/* Price */}
      <div className="flex items-end gap-4 mt-4 mb-6">
        <span className="text-4xl font-bold text-gray-900 dark:text-white">
          ₹{live.price > 0
            ? live.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })
            : '---'}
        </span>
        <div className="pb-1">
          <span className={`text-lg font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}₹{Math.abs(live.change || 0).toFixed(2)}
          </span>
          <span className={`ml-2 text-sm font-medium px-2 py-0.5 rounded ${
            isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                       : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {isPositive ? '▲' : '▼'} {Math.abs(live.changePercent || 0).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* OHLC Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <OHLCItem label="Open" value={live.open} />
        <OHLCItem label="Day High" value={live.dayHigh} highlight="green" />
        <OHLCItem label="Day Low" value={live.dayLow} highlight="red" />
        <OHLCItem label="Volume" value={live.volume} isVolume />
      </div>

      {/* 52-Week Range */}
      {ftw.high > 0 && ftw.low > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>52W Low: ₹{ftw.low.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            <span>52W High: ₹{ftw.high.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="relative h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-400 to-green-400 rounded-full" style={{ width: '100%' }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white dark:bg-gray-300 border-2 border-blue-600 rounded-full shadow-sm transition-all"
              style={{ left: `calc(${Math.min(Math.max(currentPos, 2), 98)}% - 7px)` }}
            />
          </div>
          {/* 52-Week Breakout Probability */}
          <BreakoutBadge symbol={stock.symbol} />
        </div>
      )}

      {lastUpdated && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          Updated: {lastUpdated.toLocaleTimeString('en-IN')}
        </p>
      )}
    </div>
  );
}

function OHLCItem({ label, value, highlight, isVolume }) {
  const textColor = highlight === 'green' ? 'text-green-600' : highlight === 'red' ? 'text-red-600' : 'text-gray-900 dark:text-white';
  const formatted = isVolume
    ? value > 1000000 ? `${(value / 1000000).toFixed(2)}M` : value > 1000 ? `${(value / 1000).toFixed(1)}K` : value || '---'
    : value > 0 ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '---';

  return (
    <div className="bg-gray-50 dark:bg-gray-700/60 rounded-lg p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-sm font-semibold ${textColor}`}>{formatted}</p>
    </div>
  );
}
