import { useState, useEffect } from 'react';

export default function ShareholdingChart({ ownership, loading }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
          <div className="flex items-center justify-center h-64">
            <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!ownership || !ownership.shareholding) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">👥 Shareholding Pattern</h3>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-sm">Data not available</p>
        </div>
      </div>
    );
  }

  const { shareholding, changes, topShareholders, companyInfo } = ownership;

  // Prepare pie chart data
  const slices = [
    { label: 'Promoter', value: shareholding.promoter, color: '#3B82F6', change: changes?.promoter || 0 },
    { label: 'FII', value: shareholding.fii, color: '#10B981', change: changes?.fii || 0 },
    { label: 'DII', value: shareholding.dii, color: '#F59E0B', change: changes?.dii || 0 },
    { label: 'Retail', value: shareholding.retail, color: '#8B5CF6', change: 0 }
  ].filter(s => s.value > 0);

  // Calculate pie chart angles
  let currentAngle = -90; // Start from top
  const slicesWithAngles = slices.map(slice => {
    const angle = (slice.value / 100) * 360;
    const start = currentAngle;
    const end = currentAngle + angle;
    currentAngle = end;
    return { ...slice, startAngle: start, endAngle: end, angle };
  });

  // SVG pie chart path generator
  const createPieSlice = (startAngle, endAngle, radius = 90) => {
    const start = polarToCartesian(100, 100, radius, endAngle);
    const end = polarToCartesian(100, 100, radius, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
    return `M 100 100 L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
  };

  const polarToCartesian = (cx, cy, radius, angle) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(radians),
      y: cy + radius * Math.sin(radians)
    };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold dark:text-white">👥 Shareholding Pattern</h3>
        <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
          {companyInfo?.marketCapCategory || 'N/A'}
        </span>
      </div>

      {/* Pledged Shares Warning */}
      {shareholding.pledgedShares > 0 && (
        <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-amber-600 dark:text-amber-400 text-sm">⚠️</span>
            <div>
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Pledged Shares: {shareholding.pledgedShares.toFixed(1)}%
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {shareholding.pledgedShares > 5 ? 'High pledge - monitor closely' : 'Moderate pledge level'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pie Chart */}
      <div className="flex items-center justify-center mb-6">
        <svg width="220" height="220" viewBox="0 0 200 200" className="drop-shadow-md">
          {slicesWithAngles.map((slice, idx) => (
            <g key={idx}>
              <path
                d={createPieSlice(slice.startAngle, slice.endAngle)}
                fill={slice.color}
                opacity={hoveredSlice === idx ? 0.8 : 1}
                className="transition-opacity cursor-pointer"
                onMouseEnter={() => setHoveredSlice(idx)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            </g>
          ))}
          
          {/* Center circle */}
          <circle cx="100" cy="100" r="45" fill="white" className="dark:fill-gray-800" />
          
          {/* Center text */}
          <text x="100" y="95" textAnchor="middle" className="text-xs fill-gray-500 dark:fill-gray-400">
            Total
          </text>
          <text x="100" y="110" textAnchor="middle" className="text-lg font-bold fill-gray-900 dark:fill-white">
            100%
          </text>
        </svg>
      </div>

      {/* Legend with changes */}
      <div className="space-y-3">
        {slicesWithAngles.map((slice, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
            onMouseEnter={() => setHoveredSlice(idx)}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <div className="flex items-center gap-2 flex-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: slice.color }} />
              <span className="text-sm font-medium dark:text-gray-300">{slice.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold dark:text-white">{slice.value.toFixed(1)}%</span>
              {slice.change !== 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  slice.change > 0 
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                    : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                  {slice.change > 0 ? '↑' : '↓'} {Math.abs(slice.change).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Top Shareholders */}
      {topShareholders && topShareholders.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Top Shareholders</h4>
          <div className="space-y-2">
            {topShareholders.slice(0, 3).map((sh, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400 truncate pr-2">{sh.name}</span>
                <span className="font-medium dark:text-gray-300">{sh.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sector Badge */}
      {companyInfo?.sector && (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>🏢</span>
            <span>{companyInfo.sector}</span>
            {companyInfo.industry && <span>• {companyInfo.industry}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
