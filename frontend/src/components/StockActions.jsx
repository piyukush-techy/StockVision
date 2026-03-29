import { useState, useEffect } from 'react';
import {
  getWatchlists, createWatchlist,
  addToWatchlist, createAlert
} from '../api';
import useSessionId from '../hooks/useSessionId';

export default function StockActions({ stock }) {
  const sessionId = useSessionId();
  const [watchlists, setWatchlists] = useState([]);
  const [showWatchlistMenu, setShowWatchlistMenu] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertCondition, setAlertCondition] = useState('above');
  const [alertPrice, setAlertPrice] = useState('');
  const [alertSaved, setAlertSaved] = useState(false);
  const [addedTo, setAddedTo] = useState('');

  const currentPrice = stock?.liveData?.price || 0;

  useEffect(() => {
    if (!sessionId) return;
    loadWatchlists();
  }, [sessionId]);

  const loadWatchlists = async () => {
    try {
      const res = await getWatchlists(sessionId);
      setWatchlists(res.data.watchlists || []);
    } catch (err) {
      console.error('Failed to load watchlists:', err);
    }
  };

  const handleAddToWatchlist = async (watchlistId, watchlistName) => {
    try {
      await addToWatchlist(watchlistId, stock.symbol, stock.name);
      setAddedTo(watchlistName);
      setShowWatchlistMenu(false);
      setTimeout(() => setAddedTo(''), 3000);
    } catch (err) {
      if (err.response?.data?.error === 'Stock already in watchlist') {
        alert('Already in this watchlist!');
      }
    }
  };

  const handleCreateAndAdd = async () => {
    try {
      const res = await createWatchlist(sessionId, 'My Watchlist');
      const newWl = res.data.watchlist;
      await addToWatchlist(newWl._id, stock.symbol, stock.name);
      setAddedTo('My Watchlist');
      setShowWatchlistMenu(false);
      await loadWatchlists();
      setTimeout(() => setAddedTo(''), 3000);
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  const handleSetAlert = async () => {
    if (!alertPrice) return;
    try {
      await createAlert({
        sessionId,
        symbol: stock.symbol,
        stockName: stock.name,
        condition: alertCondition,
        targetPrice: parseFloat(alertPrice),
        currentPrice
      });
      setAlertSaved(true);
      setAlertPrice('');
      setTimeout(() => {
        setAlertSaved(false);
        setShowAlertModal(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to set alert:', err);
    }
  };

  return (
    <div className="flex items-center gap-2 relative">
      {/* Add to Watchlist */}
      <div className="relative">
        <button
          onClick={() => setShowWatchlistMenu(!showWatchlistMenu)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          ⭐ {addedTo ? `Added to ${addedTo}!` : 'Add to Watchlist'}
        </button>

        {showWatchlistMenu && (
          <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium px-3 pt-3 pb-1">Add to watchlist</p>
            {watchlists.length === 0 ? (
              <button
                onClick={handleCreateAndAdd}
                className="w-full text-left px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                + Create "My Watchlist" and add
              </button>
            ) : (
              watchlists.map(wl => (
                <button
                  key={wl._id}
                  onClick={() => handleAddToWatchlist(wl._id, wl.name)}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-50 dark:border-gray-700 first:border-0"
                >
                  <span className="font-medium">{wl.name}</span>
                  <span className="text-gray-400 dark:text-gray-500 ml-2">({wl.stocks.length})</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Set Alert */}
      <button
        onClick={() => setShowAlertModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
      >
        🔔 Set Alert
      </button>

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAlertModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Set Price Alert</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {stock.symbol.replace('.NS', '')} · Current: ₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>

            {alertSaved ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-medium text-green-700">Alert set successfully!</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setAlertCondition('above')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      alertCondition === 'above'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    ▲ Above
                  </button>
                  <button
                    onClick={() => setAlertCondition('below')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      alertCondition === 'below'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    ▼ Below
                  </button>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Target Price (₹)</label>
                  <input
                    type="number"
                    value={alertPrice}
                    onChange={e => setAlertPrice(e.target.value)}
                    placeholder={`e.g. ${Math.round(currentPrice * 1.05)}`}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAlertModal(false)}
                    className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSetAlert}
                    disabled={!alertPrice}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                  >
                    Set Alert
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
