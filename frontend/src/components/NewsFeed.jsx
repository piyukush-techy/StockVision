/**
 * NewsFeed.jsx - Stock News Feed with Sentiment & Bulk Deals
 * Month 5 - Charts & News
 */

import { useState, useEffect } from 'react';
import { getStockNews, getBulkDeals } from '../api';

// ─── HELPERS ──────────────────────────────────────────────────────────────

function timeAgo(isoString) {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function SentimentBadge({ sentiment }) {
  if (!sentiment) return null;
  const configs = {
    Positive: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: '📈' },
    Negative: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: '📉' },
    Neutral:  { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', icon: '➡️' },
  };
  const c = configs[sentiment.label] || configs.Neutral;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${c.bg}`}>
      <span className="text-sm">{c.icon}</span>
      <div>
        <span className={`text-xs font-semibold ${c.text}`}>{sentiment.label} Sentiment</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
          {sentiment.bullish}↑ {sentiment.bearish}↓ from {sentiment.total} articles
        </span>
      </div>
    </div>
  );
}

function NewsItem({ item, index }) {
  const [expanded, setExpanded] = useState(false);
  const hasSummary = item.summary && item.summary.length > 10;

  return (
    <div className="py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <div className="flex gap-3">
        {/* Number badge */}
        <div className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{index + 1}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2 transition-colors"
          >
            {item.title}
          </a>

          {/* Summary (expandable) */}
          {hasSummary && (
            <div className={`mt-1 text-xs text-gray-500 dark:text-gray-400 ${expanded ? '' : 'line-clamp-2'}`}>
              {item.summary}
            </div>
          )}
          {hasSummary && item.summary.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-500 hover:text-blue-600 mt-0.5"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              🏢 {item.publisher}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              🕐 {timeAgo(item.publishedAt)}
            </span>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-600 ml-auto"
            >
              Read ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkDealsTable({ deals, symbol }) {
  if (!deals || deals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500">
        <div className="text-3xl mb-2">📋</div>
        <p className="text-sm">No bulk/block deals found recently</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <div className="mb-2 px-1">
        <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">
          ℹ️ Simulated data · Production: NSE bulk deals API
        </span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
            <th className="text-left py-2 px-1 font-medium">Date</th>
            <th className="text-left py-2 px-1 font-medium">Type</th>
            <th className="text-left py-2 px-1 font-medium">Client</th>
            <th className="text-center py-2 px-1 font-medium">B/S</th>
            <th className="text-right py-2 px-1 font-medium">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {deals.map(deal => (
            <tr key={deal.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td className="py-2 px-1 text-gray-500 dark:text-gray-400">{deal.date}</td>
              <td className="py-2 px-1">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  deal.dealType === 'BULK'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                }`}>
                  {deal.dealType}
                </span>
              </td>
              <td className="py-2 px-1 text-gray-700 dark:text-gray-300 max-w-24 truncate">
                {deal.clientName}
              </td>
              <td className="py-2 px-1 text-center">
                <span className={`font-semibold ${
                  deal.buyOrSell === 'BUY' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {deal.buyOrSell === 'BUY' ? '🟢 B' : '🔴 S'}
                </span>
              </td>
              <td className="py-2 px-1 text-right font-mono text-gray-800 dark:text-gray-200">
                {(deal.quantity / 100000).toFixed(1)}L
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────

export default function NewsFeed({ symbol }) {
  const [newsData, setNewsData] = useState(null);
  const [dealsData, setDealsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('news');
  const [error, setError] = useState(null);

  const cleanSymbol = symbol?.replace('.NS', '').replace('.BO', '') || '';

  useEffect(() => {
    if (!symbol) return;

    setLoading(true);
    setError(null);
    getStockNews(symbol, 12)
      .then(res => setNewsData(res.data))
      .catch(err => {
        console.error('News fetch error:', err);
        setError('Could not load news');
      })
      .finally(() => setLoading(false));

    setDealsLoading(true);
    getBulkDeals(symbol)
      .then(res => setDealsData(res.data))
      .catch(err => console.error('Bulk deals error:', err))
      .finally(() => setDealsLoading(false));
  }, [symbol]);

  const TABS = [
    { id: 'news', label: 'Latest News', icon: '📰', count: newsData?.news?.length },
    { id: 'deals', label: 'Bulk Deals', icon: '📦', count: dealsData?.totalDeals },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
              <span className="text-lg">📰</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                News & Corporate Actions
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{cleanSymbol} · via Yahoo Finance</p>
            </div>
          </div>
          {newsData && (
            <button
              onClick={() => {
                setLoading(true);
                getStockNews(symbol, 12)
                  .then(res => setNewsData(res.data))
                  .finally(() => setLoading(false));
              }}
              className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              🔄 Refresh
            </button>
          )}
        </div>

        {/* Sentiment bar */}
        {newsData?.sentiment && !loading && (
          <SentimentBadge sentiment={newsData.sentiment} />
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.id
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {activeTab === 'news' && (
          <>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <div className="text-3xl mb-2">⚠️</div>
                <p className="text-sm">{error}</p>
              </div>
            ) : newsData?.news?.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm">No recent news found</p>
              </div>
            ) : (
              <div>
                {newsData?.news?.map((item, i) => (
                  <NewsItem key={item.id || i} item={item} index={i} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'deals' && (
          <>
            {dealsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <BulkDealsTable deals={dealsData?.deals} symbol={symbol} />
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          📌 News via Yahoo Finance · Updates every 15 min · Not financial advice
        </p>
      </div>
    </div>
  );
}
