import { Link } from 'react-router-dom';

export default function StockCard({ stock }) {
  const price = stock.liveData?.price || 0;
  const change = stock.liveData?.change || 0;
  const changePercent = stock.liveData?.changePercent || 0;
  const volume = stock.liveData?.volume || 0;
  const cleanSymbol = stock.symbol.replace('.NS', '').replace('.BO', '');
  const isPositive = changePercent >= 0;

  return (
    <Link
      to={`/stock/${stock.symbol}`}
      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
            <span className="text-blue-700 dark:text-blue-400 text-xs font-bold">{cleanSymbol.charAt(0)}</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">{cleanSymbol}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stock.exchange || 'NSE'}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          isPositive
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {isPositive ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
        </span>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 truncate">{stock.name}</p>

      <div>
        <p className="text-xl font-bold text-gray-900 dark:text-white">
          ₹{price > 0 ? price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '---'}
        </p>
        <p className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}₹{Math.abs(change).toFixed(2)} today
        </p>
      </div>

      {volume > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Vol: {volume > 1000000 ? `${(volume / 1000000).toFixed(2)}M` : volume > 1000 ? `${(volume / 1000).toFixed(1)}K` : volume}
        </p>
      )}
    </Link>
  );
}
