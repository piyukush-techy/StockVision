import { useState, useEffect } from 'react';
import { getIndices } from '../api';

export default function MarketRibbon() {
  const [indices, setIndices] = useState([]);

  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const res = await getIndices();
        setIndices(res.data.indices || []);
      } catch (err) {
        console.error('Failed to fetch indices:', err);
      }
    };

    fetchIndices();

    // Refresh every 10 seconds
    const interval = setInterval(fetchIndices, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-900 text-white py-2 overflow-hidden">
      <div className="flex items-center gap-8 animate-scroll px-4 overflow-x-auto scrollbar-hide whitespace-nowrap">
        {indices.length === 0 ? (
          // Loading placeholders
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0">
              <div className="w-20 h-3 bg-gray-700 rounded animate-pulse" />
              <div className="w-16 h-3 bg-gray-700 rounded animate-pulse" />
            </div>
          ))
        ) : (
          indices.map((index) => (
            <div key={index.symbol} className="flex items-center gap-3 flex-shrink-0">
              <span className="text-gray-400 text-sm font-medium">{index.name}</span>
              <span className="text-white font-semibold text-sm">
                {index.price > 0 ? index.price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '---'}
              </span>
              {index.changePercent !== 0 && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  index.changePercent >= 0
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {index.changePercent >= 0 ? '▲' : '▼'}{' '}
                  {Math.abs(index.changePercent).toFixed(2)}%
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
