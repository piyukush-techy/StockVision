import { useState, useEffect } from 'react';
import { getAlerts, deleteAlert, checkTriggeredAlerts } from '../api';
import useSessionId from '../hooks/useSessionId';
import { Link } from 'react-router-dom';

export default function AlertsPage() {
  const sessionId = useSessionId();
  const [alerts, setAlerts] = useState([]);
  const [triggered, setTriggered] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    fetchAlerts();
  }, [sessionId]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const [alertsRes, triggeredRes] = await Promise.all([
        getAlerts(sessionId),
        checkTriggeredAlerts(sessionId)
      ]);
      setAlerts(alertsRes.data.alerts || []);
      setTriggered(triggeredRes.data.triggered || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (alertId) => {
    try {
      await deleteAlert(alertId);
      await fetchAlerts();
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  const activeAlerts = alerts.filter(a => a.isActive && !a.triggered);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">🔔 Price Alerts</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Set alerts from any stock page. We check prices every minute.
      </p>

      {/* Triggered Alerts */}
      {triggered.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            ✅ Recently Triggered
          </h2>
          <div className="space-y-2">
            {triggered.map(alert => (
              <div key={alert._id} className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {alert.symbol.replace('.NS', '').replace('.BO', '')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      alert.condition === 'above'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {alert.condition === 'above' ? '▲ Above' : '▼ Below'} ₹{alert.targetPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Triggered at ₹{alert.triggeredPrice?.toLocaleString('en-IN')} •{' '}
                    {new Date(alert.triggeredAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <button onClick={() => handleDelete(alert._id)} className="text-gray-300 hover:text-red-500 text-xl">×</button>
              </div>
            ))}
        </div>
        </div>
      )}

      {/* Active Alerts */}
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
        Active Alerts ({activeAlerts.length})
      </h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : activeAlerts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">🔕</div>
          <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">No active alerts</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            Go to any{' '}
            <Link to="/" className="text-blue-600 hover:underline">stock page</Link>
            {' '}and set a price alert
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeAlerts.map(alert => (
            <div key={alert._id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    to={`/stock/${alert.symbol}`}
                    className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {alert.symbol.replace('.NS', '').replace('.BO', '')}
                  </Link>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{alert.stockName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    alert.condition === 'above'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    Alert when {alert.condition === 'above' ? '▲ above' : '▼ below'} ₹{alert.targetPrice.toLocaleString('en-IN')}
                  </span>
                  {alert.currentPriceWhenSet > 0 && (
                    <span className="text-xs text-gray-400">
                      Set at ₹{alert.currentPriceWhenSet.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(alert._id)}
                className="text-gray-300 hover:text-red-500 transition-colors text-xl leading-none ml-4"
                title="Delete alert"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 text-center">
        Alerts are checked every minute. Prices from Yahoo Finance.
      </p>
    </div>
  );
}
