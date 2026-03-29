import { useNavigate } from 'react-router-dom';

export default function PeerComparison({ peers, sector, loading, currentSymbol }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4" />
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!peers || peers.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">🏢 Peer Comparison</h3>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No peer data available</p>
        </div>
      </div>
    );
  }

  const formatMarketCap = (cap) => {
    if (!cap) return 'N/A';
    if (cap >= 1_00_00_00_00_000) return `₹${(cap / 1_00_00_00_00_000).toFixed(2)}L Cr`;
    if (cap >= 1_00_00_00_000) return `₹${(cap / 1_00_00_00_000).toFixed(2)}K Cr`;
    return `₹${(cap / 1_00_00_000).toFixed(0)} Cr`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold dark:text-white">🏢 Peer Comparison</h3>
        {sector && (
          <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full">
            {sector}
          </span>
        )}
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 pr-2 font-semibold text-gray-700 dark:text-gray-300">Stock</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Price</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Change</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">P/E</th>
              <th className="text-right py-2 pl-2 font-semibold text-gray-700 dark:text-gray-300">Mkt Cap</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((peer, idx) => {
              const isCurrentStock = peer.symbol === currentSymbol;
              const cleanSymbol = peer.symbol.replace('.NS', '').replace('.BO', '');
              
              return (
                <tr
                  key={idx}
                  onClick={() => !isCurrentStock && navigate(`/stock/${peer.symbol}`)}
                  className={`border-b border-gray-100 dark:border-gray-700/50 transition-colors ${
                    isCurrentStock 
                      ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer'
                  }`}
                >
                  {/* Stock Name */}
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-2">
                      {isCurrentStock && (
                        <span className="text-blue-600 dark:text-blue-400 text-xs">●</span>
                      )}
                      <div>
                        <div className="font-medium dark:text-white">
                          {cleanSymbol}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                          {peer.name || cleanSymbol}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Current Price */}
                  <td className="text-right py-3 px-2">
                    <span className="font-semibold dark:text-white">
                      ₹{peer.currentPrice ? peer.currentPrice.toLocaleString('en-IN') : 'N/A'}
                    </span>
                  </td>

                  {/* Day Change */}
                  <td className="text-right py-3 px-2">
                    {peer.dayChangePercent !== undefined ? (
                      <div className={`inline-flex items-center gap-1 text-xs font-medium ${
                        peer.dayChangePercent >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        <span>{peer.dayChangePercent >= 0 ? '↑' : '↓'}</span>
                        <span>{Math.abs(peer.dayChangePercent).toFixed(2)}%</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>

                  {/* P/E Ratio */}
                  <td className="text-right py-3 px-2">
                    {peer.pe ? (
                      <span className={`text-xs font-medium ${
                        peer.pe < 15 
                          ? 'text-green-600 dark:text-green-400'
                          : peer.pe > 30 
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {peer.pe.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>

                  {/* Market Cap */}
                  <td className="text-right py-3 pl-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {formatMarketCap(peer.marketCap)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <span className="text-blue-600 dark:text-blue-400">●</span>
          <span>Current Stock</span>
        </div>
        <div className="flex items-center gap-1">
          <span>•</span>
          <span>Click to view peer details</span>
        </div>
      </div>

      {/* Peer Stats Summary */}
      {peers.length > 1 && (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg P/E</div>
              <div className="text-sm font-semibold dark:text-white">
                {(peers.filter(p => p.pe).reduce((acc, p) => acc + p.pe, 0) / 
                  peers.filter(p => p.pe).length || 0).toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gainers</div>
              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                {peers.filter(p => p.dayChangePercent > 0).length}/{peers.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Losers</div>
              <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                {peers.filter(p => p.dayChangePercent < 0).length}/{peers.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
