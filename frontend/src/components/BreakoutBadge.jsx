// BreakoutBadge.jsx — Month 32: 52-Week Breakout Probability
// Shows below the 52w range bar in PriceHeader:
//   "Broke out 6/9 times (67%) · Avg gain +8.2% in 30 days"
import { useState, useEffect } from 'react';
import { getBreakoutProbability } from '../api';

export default function BreakoutBadge({ symbol }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(false);
    setData(null);

    getBreakoutProbability(symbol)
      .then(res => {
        setData(res.data.data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [symbol]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mt-3 h-10 bg-gray-100 dark:bg-gray-700/60 rounded-lg animate-pulse" />
    );
  }

  // ── Error / no data ───────────────────────────────────────────────────────
  if (error || !data) return null;

  // ── Low confidence (< 3 attempts) ─────────────────────────────────────────
  if (data.lowConfidence) {
    return (
      <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-200 dark:border-gray-600">
        <span className="text-base">📊</span>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Not enough 52W near-high events to compute breakout probability ({data.attempts} found, need 3+)
        </p>
      </div>
    );
  }

  const { successRate, successCount, attempts, avgGain30d, avgLoss30d,
          isNearNow, currentDistPct, proximityLabel, color } = data;

  // ── Color scheme based on signal ─────────────────────────────────────────
  const colorMap = {
    green:  { bg: 'bg-green-50 dark:bg-green-900/20',  border: 'border-green-200 dark:border-green-700',  text: 'text-green-700 dark:text-green-400',  badge: 'bg-green-100 dark:bg-green-800/40 text-green-800 dark:text-green-300'  },
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',    border: 'border-blue-200 dark:border-blue-700',    text: 'text-blue-700 dark:text-blue-400',    badge: 'bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-300'    },
    yellow: { bg: 'bg-amber-50 dark:bg-amber-900/20',  border: 'border-amber-200 dark:border-amber-700',  text: 'text-amber-700 dark:text-amber-400',  badge: 'bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-300' },
    red:    { bg: 'bg-red-50 dark:bg-red-900/20',      border: 'border-red-200 dark:border-red-700',      text: 'text-red-700 dark:text-red-400',      badge: 'bg-red-100 dark:bg-red-800/40 text-red-800 dark:text-red-300'        },
  };
  const c = colorMap[color] || colorMap.blue;

  // ── Not near high — show compact summary ─────────────────────────────────
  if (!isNearNow) {
    return (
      <div className={`mt-3 flex items-center gap-3 px-3 py-2 ${c.bg} rounded-lg border ${c.border}`}>
        <span className="text-base flex-shrink-0">📊</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            <span className="font-semibold">52W breakout history:</span>{' '}
            {successCount}/{attempts} times ({successRate}%)
            {avgGain30d !== null && (
              <span className="text-green-600 dark:text-green-400"> · Avg +{avgGain30d}% in 30d</span>
            )}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Currently {currentDistPct !== null ? `${currentDistPct}% below 52W high` : 'away from 52W high'}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge} flex-shrink-0`}>
          {successRate}%
        </span>
      </div>
    );
  }

  // ── Near high — prominent alert card ─────────────────────────────────────
  return (
    <div className={`mt-3 px-4 py-3 ${c.bg} rounded-xl border ${c.border}`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <div>
            <p className={`text-sm font-semibold ${c.text}`}>
              Near 52-Week High
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {proximityLabel?.zone} — {currentDistPct}% away
            </p>
          </div>
        </div>
        <div className={`text-center px-3 py-1.5 rounded-lg ${c.badge}`}>
          <p className="text-lg font-bold leading-none">{successRate}%</p>
          <p className="text-xs leading-none mt-0.5">breakout rate</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <StatCell
          label="Attempts"
          value={`${successCount}/${attempts}`}
          sub="near-high events"
        />
        <StatCell
          label="Avg gain (30d)"
          value={avgGain30d !== null ? `+${avgGain30d}%` : '—'}
          sub="when broke out"
          positive
        />
        <StatCell
          label="Avg loss (30d)"
          value={avgLoss30d !== null ? `${avgLoss30d}%` : '—'}
          sub="when failed"
          negative
        />
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Based on 5Y daily data · {attempts} near-high events (within 3% of 52W high)
      </p>
    </div>
  );
}

function StatCell({ label, value, sub, positive, negative }) {
  const valColor = positive
    ? 'text-green-600 dark:text-green-400'
    : negative
    ? 'text-red-600 dark:text-red-400'
    : 'text-gray-900 dark:text-white';

  return (
    <div className="bg-white dark:bg-gray-800/60 rounded-lg p-2 text-center">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-sm font-bold ${valColor}`}>{value}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>
    </div>
  );
}
