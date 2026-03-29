export default function BetaIndicator({ beta, loading }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
      </div>
    );
  }

  if (!beta || beta === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Beta (β)
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">Data not available</p>
      </div>
    );
  }

  // Determine volatility category
  let category = '';
  let categoryColor = '';
  let categoryBg = '';
  let description = '';
  let icon = '';

  if (beta < 0.8) {
    category = 'Low Volatility';
    categoryColor = 'text-green-700 dark:text-green-400';
    categoryBg = 'bg-green-50 dark:bg-green-900/20';
    description = 'Less volatile than market. More stable.';
    icon = '🛡️';
  } else if (beta >= 0.8 && beta <= 1.2) {
    category = 'Market Volatility';
    categoryColor = 'text-blue-700 dark:text-blue-400';
    categoryBg = 'bg-blue-50 dark:bg-blue-900/20';
    description = 'Moves in line with the market.';
    icon = '📊';
  } else {
    category = 'High Volatility';
    categoryColor = 'text-orange-700 dark:text-orange-400';
    categoryBg = 'bg-orange-50 dark:bg-orange-900/20';
    description = 'More volatile than market. Higher risk & reward.';
    icon = '⚡';
  }

  return (
    <div className={`${categoryBg} rounded-xl border ${
      beta < 0.8 
        ? 'border-green-200 dark:border-green-800' 
        : beta <= 1.2 
        ? 'border-blue-200 dark:border-blue-800'
        : 'border-orange-200 dark:border-orange-800'
    } p-4 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Beta (β) vs NIFTY 50
          </h4>
        </div>
        <div className="relative group">
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs">
            ⓘ
          </button>
          {/* Tooltip */}
          <div className="hidden group-hover:block absolute right-0 top-6 z-10 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl">
            <p className="font-semibold mb-1">What is Beta?</p>
            <p className="mb-2">Beta measures stock volatility vs the market (NIFTY 50).</p>
            <ul className="space-y-1 text-xs">
              <li>• β &lt; 1: Less volatile (safer)</li>
              <li>• β = 1: Same as market</li>
              <li>• β &gt; 1: More volatile (riskier)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Beta Value */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-3xl font-bold ${categoryColor}`}>
          {beta.toFixed(2)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">beta</span>
      </div>

      {/* Category Badge */}
      <div className="mb-3">
        <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${
          beta < 0.8 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
            : beta <= 1.2
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
        }`}>
          {category}
        </span>
      </div>

      {/* Visual Scale */}
      <div className="mb-3">
        <div className="relative h-8 bg-gradient-to-r from-green-200 via-blue-200 to-orange-200 dark:from-green-900/30 dark:via-blue-900/30 dark:to-orange-900/30 rounded-lg overflow-hidden">
          {/* Marker */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-gray-800 dark:bg-white shadow-lg transition-all duration-500"
            style={{ 
              left: `${Math.min(Math.max((beta / 2) * 100, 0), 100)}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800 dark:bg-white rounded-full" />
          </div>
          
          {/* Scale markers */}
          <div className="absolute inset-0 flex justify-between items-center px-2">
            <span className="text-xs font-medium text-green-800 dark:text-green-300">0</span>
            <span className="text-xs font-medium text-blue-800 dark:text-blue-300">1</span>
            <span className="text-xs font-medium text-orange-800 dark:text-orange-300">2</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        {description}
      </p>

      {/* Examples */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          If NIFTY 50 moves:
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white dark:bg-gray-700/50 rounded p-2">
            <p className="text-gray-500 dark:text-gray-400 mb-1">+1% ↑</p>
            <p className={`font-semibold ${
              beta > 1 ? 'text-green-600 dark:text-green-400' : 'text-green-600 dark:text-green-400'
            }`}>
              +{(beta * 1).toFixed(2)}% ↑
            </p>
          </div>
          <div className="bg-white dark:bg-gray-700/50 rounded p-2">
            <p className="text-gray-500 dark:text-gray-400 mb-1">-1% ↓</p>
            <p className={`font-semibold ${
              beta > 1 ? 'text-red-600 dark:text-red-400' : 'text-red-600 dark:text-red-400'
            }`}>
              -{(beta * 1).toFixed(2)}% ↓
            </p>
          </div>
        </div>
      </div>

      {/* Risk Level */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600 dark:text-gray-400">Risk Level</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((level) => {
              const filled = beta < 0.8 
                ? level <= 2 
                : beta <= 1.2 
                ? level <= 3 
                : level <= 4;
              
              return (
                <div 
                  key={level}
                  className={`w-2 h-4 rounded-sm ${
                    filled 
                      ? beta < 0.8 
                        ? 'bg-green-500 dark:bg-green-400'
                        : beta <= 1.2
                        ? 'bg-blue-500 dark:bg-blue-400'
                        : 'bg-orange-500 dark:bg-orange-400'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
