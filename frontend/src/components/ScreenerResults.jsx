// components/ScreenerResults.jsx — Results Table for Stock Screener
// Phase 6 Month 30

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const COLUMNS = [
  { key: 'score',         label: 'Score',         sortable: true },
  { key: 'name',          label: 'Company',        sortable: true },
  { key: 'sector',        label: 'Sector',         sortable: true },
  { key: 'price',         label: 'Price (₹)',      sortable: true },
  { key: 'change',        label: 'Chg %',          sortable: true },
  { key: 'pe',            label: 'P/E',            sortable: true },
  { key: 'pb',            label: 'P/B',            sortable: true },
  { key: 'roe',           label: 'ROE %',          sortable: true },
  { key: 'dividendYield', label: 'Div Yield %',    sortable: true },
  { key: 'mcap',          label: 'Cap',            sortable: false },
];

function ScoreBadge({ score }) {
  const color =
    score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
    score >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {score}
    </span>
  );
}

function Val({ v, suffix = '', isGood, isBad, decimals = 1 }) {
  if (v == null || v === 0) return <span className="text-gray-400 dark:text-gray-600">—</span>;
  const cls = isGood ? 'text-green-600 dark:text-green-400 font-medium'
             : isBad  ? 'text-red-600 dark:text-red-400 font-medium'
             :           'text-gray-800 dark:text-gray-200';
  return <span className={cls}>{Number(v).toLocaleString('en-IN', { maximumFractionDigits: decimals })}{suffix}</span>;
}

export default function ScreenerResults({ stocks, total, pages, page, onPageChange, onSortChange, sort, order, loading, onExportCSV }) {
  const navigate = useNavigate();

  const handleSort = (key) => {
    if (!COLUMNS.find(c => c.key === key)?.sortable) return;
    if (sort === key) {
      onSortChange(key, order === 'desc' ? 'asc' : 'desc');
    } else {
      onSortChange(key, 'desc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sort !== col) return <span className="text-gray-300 dark:text-gray-600 ml-1">↕</span>;
    return <span className="text-blue-500 ml-1">{order === 'desc' ? '↓' : '↑'}</span>;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Screening {total > 0 ? total : 'NSE'} stocks...</p>
      </div>
    );
  }

  if (!stocks || stocks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">No stocks match your filters</p>
        <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">Try relaxing some conditions</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{total.toLocaleString('en-IN')} stocks found</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">Page {page} of {pages}</span>
        </div>
        <button
          onClick={onExportCSV}
          className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap
                              ${col.sortable ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 select-none' : ''}`}
                >
                  {col.label}
                  {col.sortable && <SortIcon col={col.key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {stocks.map((s, idx) => (
              <tr
                key={s.symbol}
                className="hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                onClick={() => navigate(`/stock/${s.symbol}.NS`)}
              >
                <td className="px-3 py-2.5">
                  <ScoreBadge score={s.score} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-gray-900 dark:text-white text-xs">{s.symbol}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{s.name}</div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                    {s.sector}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">
                  ₹{s.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`font-semibold ${s.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Val v={s.pe} isGood={s.pe > 0 && s.pe < 15} isBad={s.pe > 40} />
                </td>
                <td className="px-3 py-2.5">
                  <Val v={s.pb} isGood={s.pb != null && s.pb < 1} isBad={s.pb != null && s.pb > 5} />
                </td>
                <td className="px-3 py-2.5">
                  <Val v={s.roe} suffix="%" isGood={s.roe > 20} isBad={s.roe != null && s.roe < 5} />
                </td>
                <td className="px-3 py-2.5">
                  <Val v={s.dividendYield} suffix="%" isGood={s.dividendYield > 2} />
                </td>
                <td className="px-3 py-2.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    s.mcap === 'large' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' :
                    s.mcap === 'mid'   ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' :
                                         'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                  }`}>
                    {s.mcap}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
          >
            ← Prev
          </button>
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  p === page
                    ? 'bg-blue-600 text-white font-bold'
                    : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === pages}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
