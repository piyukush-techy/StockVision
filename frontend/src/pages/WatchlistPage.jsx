import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getWatchlists, createWatchlist,
  removeFromWatchlist, deleteWatchlist
} from '../api';
import useSessionId from '../hooks/useSessionId';
import ExportButton from '../components/ExportButton';

export default function WatchlistPage() {
  const sessionId = useSessionId();
  const [watchlists, setWatchlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeWatchlist, setActiveWatchlist] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    fetchWatchlists();
  }, [sessionId]);

  const fetchWatchlists = async () => {
    setLoading(true);
    try {
      const res = await getWatchlists(sessionId);
      const lists = res.data.watchlists || [];
      setWatchlists(lists);
      if (lists.length > 0 && !activeWatchlist) {
        setActiveWatchlist(lists[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch watchlists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWatchlist = async () => {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      await createWatchlist(sessionId, newListName.trim());
      setNewListName('');
      await fetchWatchlists();
    } catch (err) {
      console.error('Failed to create watchlist:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveStock = async (watchlistId, symbol) => {
    try {
      await removeFromWatchlist(watchlistId, symbol);
      await fetchWatchlists();
    } catch (err) {
      console.error('Failed to remove stock:', err);
    }
  };

  const handleDeleteWatchlist = async (watchlistId) => {
    if (!confirm('Delete this watchlist?')) return;
    try {
      await deleteWatchlist(watchlistId);
      setActiveWatchlist(null);
      await fetchWatchlists();
    } catch (err) {
      console.error('Failed to delete watchlist:', err);
    }
  };

  // Export watchlist to CSV
  const handleExportCSV = (watchlist) => {
    const rows = [
      ['Symbol', 'Name', 'Price', 'Change %', 'Day High', 'Day Low', 'Volume', 'Added On'],
      ...watchlist.stocks.map(s => [
        s.symbol.replace('.NS', '').replace('.BO', ''),
        s.name,
        s.liveData?.price || '',
        s.liveData?.changePercent?.toFixed(2) || '',
        s.liveData?.dayHigh || '',
        s.liveData?.dayLow || '',
        s.liveData?.volume || '',
        new Date(s.addedAt).toLocaleDateString('en-IN')
      ])
    ];

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${watchlist.name}-watchlist.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentWatchlist = watchlists.find(w => w._id === activeWatchlist);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📋 My Watchlists</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar - Watchlist list */}
        <div className="w-full md:w-64 flex-shrink-0">
          {/* Create New */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Watchlist</p>
            <input
              type="text"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateWatchlist()}
              placeholder="e.g. Tech Stocks"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <button
              onClick={handleCreateWatchlist}
              disabled={creating || !newListName.trim()}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300"
            >
              {creating ? 'Creating...' : '+ Create'}
            </button>
          </div>

          {/* Watchlist Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : watchlists.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400 dark:text-gray-500">
                No watchlists yet. Create one above!
              </div>
            ) : (
              watchlists.map(wl => (
                <button
                  key={wl._id}
                  onClick={() => setActiveWatchlist(wl._id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left border-b border-gray-100 last:border-0 transition-colors ${
                    activeWatchlist === wl._id
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{wl.name}</p>
                    <p className="text-xs text-gray-400">{wl.stocks.length} stocks</p>
                  </div>
                  {activeWatchlist === wl._id && (
                    <span className="w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content - Active Watchlist */}
        <div className="flex-1">
          {!currentWatchlist ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No watchlist selected</h3>
              <p className="text-sm text-gray-400">Create a watchlist and add stocks from any stock page</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 dark:text-white">{currentWatchlist.name}</h2>
                <div className="flex items-center gap-2">
                  <ExportButton
                    darkMode={document.documentElement.classList.contains('dark')}
                    label="Export"
                    onExportCSV={() => handleExportCSV(currentWatchlist)}
                    onExportPDF={() => {
                      const rows = (currentWatchlist.stocks || []).map(s =>
                        `<tr><td>${s.symbol}</td><td>${s.name || ''}</td><td>₹${s.currentPrice || '—'}</td></tr>`
                      ).join('');
                      const html = `<h1>Watchlist: ${currentWatchlist.name}</h1><table><tr><th>Symbol</th><th>Company</th><th>Price</th></tr>${rows}</table>`;
                      const win = window.open('', '_blank');
                      win.document.write(`<html><head><style>body{font-family:sans-serif;padding:24px}h1{color:#1e40af;margin-bottom:16px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #eee;text-align:left}th{background:#eff6ff;color:#1e40af}</style></head><body>${html}<p style="font-size:11px;color:#999;margin-top:24px">StockVision · Not SEBI registered · Not financial advice</p></body></html>`);
                      win.document.close(); setTimeout(() => { win.print(); win.close(); }, 300);
                    }}
                  />
                  <button
                    onClick={() => handleDeleteWatchlist(currentWatchlist._id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              {/* Stocks Table */}
              {currentWatchlist.stocks.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-3">📈</div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">No stocks added yet</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">
                    Search for a stock and click "Add to Watchlist" on the stock page
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">STOCK</th>
                        <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">PRICE</th>
                        <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">CHANGE</th>
                        <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3 hidden sm:table-cell">HIGH</th>
                        <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3 hidden sm:table-cell">LOW</th>
                        <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3 hidden md:table-cell">VOLUME</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {currentWatchlist.stocks.map((stock) => {
                        const live = stock.liveData || {};
                        const isPos = (live.changePercent || 0) >= 0;
                        const cleanSym = stock.symbol.replace('.NS', '').replace('.BO', '');

                        return (
                          <tr key={stock.symbol} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <Link to={`/stock/${stock.symbol}`} className="flex items-center gap-2 group">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <span className="text-blue-700 text-xs font-bold">{cleanSym.charAt(0)}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{cleanSym}</p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[120px]">{stock.name}</p>
                                </div>
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {live.price > 0 ? `₹${live.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '---'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`text-sm font-medium ${isPos ? 'text-green-600' : 'text-red-600'}`}>
                                {isPos ? '+' : ''}{(live.changePercent || 0).toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right hidden sm:table-cell">
                              <span className="text-sm text-green-600">
                                {live.dayHigh > 0 ? `₹${live.dayHigh.toFixed(2)}` : '---'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right hidden sm:table-cell">
                              <span className="text-sm text-red-600">
                                {live.dayLow > 0 ? `₹${live.dayLow.toFixed(2)}` : '---'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right hidden md:table-cell">
                              <span className="text-xs text-gray-500">
                                {live.volume > 1000000
                                  ? `${(live.volume / 1000000).toFixed(1)}M`
                                  : live.volume > 1000
                                  ? `${(live.volume / 1000).toFixed(0)}K`
                                  : live.volume || '---'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleRemoveStock(currentWatchlist._id, stock.symbol)}
                                className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                                title="Remove from watchlist"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
