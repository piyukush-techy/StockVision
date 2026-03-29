export default function SectorPerformance({ sector, loading }) {
  // Simulated sector performance data
  // In production, fetch from NSE sector indices API
  const sectorData = {
    'Energy': { index: 'NIFTY Energy', change: 1.8, status: 'outperforming' },
    'Technology': { index: 'NIFTY IT', change: -0.5, status: 'underperforming' },
    'Financials': { index: 'NIFTY Bank', change: 0.9, status: 'inline' },
    'Consumer Goods': { index: 'NIFTY FMCG', change: 0.3, status: 'inline' },
    'Telecom': { index: 'NIFTY Telecom', change: -1.2, status: 'underperforming' },
    'Unknown': { index: 'NIFTY 50', change: 0.5, status: 'inline' }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-blue-200 dark:border-gray-600 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-2" />
          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-24" />
        </div>
      </div>
    );
  }

  const data = sectorData[sector] || sectorData['Unknown'];
  const isPositive = data.change >= 0;
  const isNeutral = Math.abs(data.change) < 0.5;

  // Determine status badge
  let statusColor = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  let statusIcon = '●';
  
  if (data.status === 'outperforming') {
    statusColor = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    statusIcon = '↗';
  } else if (data.status === 'underperforming') {
    statusColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    statusIcon = '↘';
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-blue-200 dark:border-gray-600 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 dark:text-blue-400 text-lg">📊</span>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Sector Performance
          </h4>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>
          {statusIcon} {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
        </span>
      </div>

      {/* Sector Index */}
      <div className="mb-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          {sector || 'Market'} Sector
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {data.index}
          </span>
        </div>
      </div>

      {/* Performance */}
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${
          isPositive 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-red-600 dark:text-red-400'
        }`}>
          {isPositive ? '+' : ''}{data.change.toFixed(2)}%
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">today</span>
      </div>

      {/* Visual Bar */}
      <div className="mt-3 relative h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div 
          className={`absolute left-1/2 h-full rounded-full transition-all duration-500 ${
            isPositive ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{
            width: `${Math.min(Math.abs(data.change) * 10, 50)}%`,
            [isPositive ? 'left' : 'right']: '50%'
          }}
        />
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-500" />
      </div>

      {/* Context */}
      <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
        {isPositive 
          ? `${sector || 'This sector'} is ${isNeutral ? 'slightly' : ''} outperforming the market today`
          : `${sector || 'This sector'} is ${isNeutral ? 'slightly' : ''} underperforming the market today`
        }
      </p>

      {/* Market Context (vs Nifty 50) */}
      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-gray-600">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 dark:text-gray-400">vs NIFTY 50</span>
          <span className={`font-medium ${
            data.change > 0.5 
              ? 'text-green-600 dark:text-green-400' 
              : data.change < -0.5
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            {data.change > 0.5 ? '+' : ''}{(data.change - 0.5).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
