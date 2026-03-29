import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DataQualityDashboard() {
  const [platformQuality, setPlatformQuality] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformQuality();
  }, []);

  const fetchPlatformQuality = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/data-quality/platform`);
      setPlatformQuality(res.data);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!platformQuality) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-red-600">Failed to load data</p>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-blue-600 dark:text-blue-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📊 Data Quality Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor platform health and data reliability
        </p>
      </div>

      {/* Overall Score */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/40 rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Platform Health</h2>
            <div className={`text-6xl font-black ${getScoreColor(platformQuality.overall)}`}>
              {platformQuality.overall}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Healthy Stocks</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {platformQuality.healthyPercentage}%
            </div>
          </div>
        </div>
        <div className="mt-6 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getScoreBg(platformQuality.overall)}`}
            style={{ width: `${platformQuality.overall}%` }}
          ></div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Freshness</h3>
              <p className="text-sm text-gray-500">Data recency</p>
            </div>
          </div>
          <div className={`text-4xl font-bold ${getScoreColor(platformQuality.freshness)}`}>
            {platformQuality.freshness}%
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Completeness</h3>
              <p className="text-sm text-gray-500">Data coverage</p>
            </div>
          </div>
          <div className={`text-4xl font-bold ${getScoreColor(platformQuality.completeness)}`}>
            {platformQuality.completeness}%
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Confidence</h3>
              <p className="text-sm text-gray-500">Reliability</p>
            </div>
          </div>
          <div className={`text-4xl font-bold ${getScoreColor(platformQuality.confidence)}`}>
            {platformQuality.confidence}%
          </div>
        </div>
      </div>

      {/* Issues */}
      {platformQuality.stocksWithIssues > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-200 dark:border-yellow-800 p-6 mb-8">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-300 mb-2">
                Stocks with Data Issues
              </h3>
              <p className="text-yellow-800 dark:text-yellow-400">
                {platformQuality.stocksWithIssues} stocks need attention
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">💡 What is Data Quality?</h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <strong>Freshness:</strong> How recent the data is
            </div>
            <div>
              <strong>Completeness:</strong> % of fields populated
            </div>
            <div>
              <strong>Confidence:</strong> Overall reliability
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📈 Scores</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span>🏆</span>
              <span className="text-green-600">90-100%: Excellent</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span className="text-blue-600">75-89%: Good</span>
            </div>
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span className="text-yellow-600">60-74%: Fair</span>
            </div>
            <div className="flex items-center gap-2">
              <span>❌</span>
              <span className="text-red-600">&lt;60%: Poor</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={fetchPlatformQuality}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}
