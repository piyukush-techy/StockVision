// GrowthPattern.jsx — Phase 3 Month 14: Portfolio Historical Analysis
// Sliding window scanner results: success rates, histogram, timeline heatmap

import { useState } from 'react';

const fmtP = (n, plus = true) => `${n >= 0 && plus ? '+' : ''}${Number(n).toFixed(1)}%`;
const fmtN = (n, d = 1) => Number(n).toFixed(d);

const RATE_COLORS = {
  'Very Common':      { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-200', bar: 'bg-emerald-500', border: 'border-emerald-300 dark:border-emerald-700' },
  'Common':           { bg: 'bg-green-100 dark:bg-green-900/40',     text: 'text-green-800 dark:text-green-200',     bar: 'bg-green-500',   border: 'border-green-300 dark:border-green-700' },
  'Occasional':       { bg: 'bg-blue-100 dark:bg-blue-900/30',       text: 'text-blue-800 dark:text-blue-200',       bar: 'bg-blue-500',    border: 'border-blue-300 dark:border-blue-700' },
  'Rare':             { bg: 'bg-yellow-100 dark:bg-yellow-900/30',   text: 'text-yellow-800 dark:text-yellow-200',   bar: 'bg-yellow-500',  border: 'border-yellow-300 dark:border-yellow-700' },
  'Very Rare':        { bg: 'bg-orange-100 dark:bg-orange-900/30',   text: 'text-orange-800 dark:text-orange-200',   bar: 'bg-orange-500',  border: 'border-orange-300 dark:border-orange-700' },
  'Historically Rare':{ bg: 'bg-red-100 dark:bg-red-900/30',         text: 'text-red-800 dark:text-red-200',         bar: 'bg-red-500',     border: 'border-red-300 dark:border-red-700' },
};

const HOLD_LABELS = { 90: '3 months', 180: '6 months', 365: '1 year' };

// ─── Histogram bar chart ──────────────────────────────────────────────────────
function Histogram({ data }) {
  if (!data || data.length === 0) return null;
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Distribution of portfolio returns across all historical windows
      </p>
      <div className="flex items-end gap-1 h-28">
        {data.map((bucket, i) => {
          const h = Math.max(2, (bucket.count / maxCount) * 100);
          const isPositive = bucket.label.startsWith('0') || bucket.label.startsWith('>') || bucket.label.includes('10%') || bucket.label.includes('20%') || bucket.label.includes('30%');
          const isNeutral  = bucket.label.includes('0%') && !bucket.label.includes('>');
          const color = isPositive
            ? bucket.count > maxCount * 0.5 ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-emerald-400 dark:bg-emerald-500'
            : isNeutral ? 'bg-gray-400'
            : bucket.count > maxCount * 0.5 ? 'bg-red-500 dark:bg-red-400' : 'bg-red-300 dark:bg-red-500';

          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 z-10 whitespace-nowrap">
                {bucket.label}<br />{bucket.count} windows ({bucket.pct}%)
              </div>
              <div className={`w-full rounded-t transition-all ${color}`} style={{ height: `${h}%`, minHeight: 2 }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        {data.map((b, i) => (
          <div key={i} className="flex-1 text-center text-xs text-gray-400 dark:text-gray-500 leading-tight" style={{ fontSize: 9 }}>
            {b.label.replace('to ', '').replace('%', '')}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Timeline heatmap (monthly dots) ─────────────────────────────────────────
function TimelineHeatmap({ timeline, targetPct }) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Each dot = one month entry. Green = hit {targetPct}% target. Red = missed.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {timeline.map((t, i) => {
          const size = 'w-3 h-3';
          return (
            <div
              key={i}
              className={`${size} rounded-sm cursor-default group relative ${
                t.hitTarget ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-red-300 dark:bg-red-600'
              }`}
            >
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 z-10 whitespace-nowrap">
                {t.month}<br />Return: {fmtP(t.returnPct)}<br />Max DD: -{fmtP(t.maxDD, false)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Hit target</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-300 dark:bg-red-600" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Missed</span>
        </div>
      </div>
    </div>
  );
}

// ─── Result card for one holding × target combo ───────────────────────────────
function ScanResultCard({ result }) {
  const [tab, setTab] = useState('overview');
  const colors = RATE_COLORS[result.rateLabel] || RATE_COLORS['Historically Rare'];
  const holdLabel = HOLD_LABELS[result.holdingDays] || `${result.holdingDays}d`;

  return (
    <div className={`rounded-2xl border overflow-hidden ${colors.border} bg-white dark:bg-gray-800`}>
      {/* Card header */}
      <div className={`px-5 py-4 ${colors.bg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Hold for {holdLabel} → target {result.targetPct}%</p>
            <p className={`text-2xl font-black mt-0.5 ${colors.text}`}>
              {fmtN(result.successRate)}% success rate
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
            {result.rateLabel}
          </div>
        </div>
        {/* Rate bar */}
        <div className="mt-3">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${colors.bar} transition-all`} style={{ width: `${result.successRate}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            <span>{result.achieved} of {result.totalWindows} windows hit target</span>
            <span>{fmtN(result.successRate, 1)}%</span>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-700">
        {['overview', 'histogram', 'heatmap'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors ${
              tab === t
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t === 'overview' ? '📊 Stats' : t === 'histogram' ? '📉 Distribution' : '🗓️ Heatmap'}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* Overview stats */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Avg Max Drawdown" value={`-${fmtN(result.avgMaxDrawdown)}%`} warn={result.avgMaxDrawdown > 20} />
              <Stat label="Worst Drawdown" value={`-${fmtN(result.worstMaxDrawdown)}%`} warn={result.worstMaxDrawdown > 35} />
              <Stat label="Avg Days to Target" value={result.avgDaysToTarget ? `${result.avgDaysToTarget}d` : 'N/A'} />
              <Stat label="Median Days to Target" value={result.medianDaysToTarget ? `${result.medianDaysToTarget}d` : 'N/A'} />
            </div>
            {result.bestWindow && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">🏆 Best Period</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {result.bestWindow.start} → {result.bestWindow.end}: <strong className="text-emerald-700 dark:text-emerald-300">{fmtP(result.bestWindow.returnPct)}</strong>
                </p>
              </div>
            )}
            {result.worstWindow && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">😓 Worst Period</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {result.worstWindow.start} → {result.worstWindow.end}: <strong className="text-red-700 dark:text-red-300">{fmtP(result.worstWindow.returnPct)}</strong> / Max DD: {fmtP(result.worstWindow.maxDD, false)}
                </p>
              </div>
            )}
          </div>
        )}
        {/* Histogram */}
        {tab === 'histogram' && <Histogram data={result.histogram} />}
        {/* Heatmap */}
        {tab === 'heatmap' && <TimelineHeatmap timeline={result.timeline} targetPct={result.targetPct} />}
      </div>
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className={`text-base font-black ${warn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

// ─── Main GrowthPattern component ─────────────────────────────────────────────
export default function GrowthPattern({ data, isLoading, error }) {
  const [selectedHolding, setSelectedHolding] = useState(365);
  const [selectedTarget,  setSelectedTarget]  = useState(15);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Running sliding window scanner across all historical periods…</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">This analyses thousands of entry points. Please wait.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <p className="text-red-700 dark:text-red-400 text-sm">⚠️ {error}</p>
      </div>
    );
  }

  if (!data || !data.scanResults) return null;

  const { scanResults, growthPattern, summary } = data;

  // Available holding periods and targets
  const holdings = [...new Set(scanResults.map(r => r.holdingDays))].sort((a, b) => a - b);
  const targets  = [...new Set(scanResults.map(r => r.targetPct))].sort((a, b) => a - b);

  // Currently selected result
  const activeResult = scanResults.find(
    r => r.holdingDays === selectedHolding && r.targetPct === selectedTarget
  );

  // Summary matrix: all holding × target combinations
  const matrixRows = holdings.map(h => ({
    holding: h,
    label:   HOLD_LABELS[h] || `${h}d`,
    cols:    targets.map(t => {
      const r = scanResults.find(r => r.holdingDays === h && r.targetPct === t);
      return { target: t, result: r };
    })
  }));

  const rateColor = (rate) => {
    if (rate >= 80) return 'bg-emerald-500 text-white';
    if (rate >= 60) return 'bg-green-500 text-white';
    if (rate >= 40) return 'bg-blue-500 text-white';
    if (rate >= 20) return 'bg-yellow-500 text-white';
    if (rate >= 5)  return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  return (
    <div className="space-y-6">
      {/* Section title */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔬</span>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Portfolio Sliding Window Scanner</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                "If you entered on any date in history, what % of the time did you achieve your target?"
              </p>
            </div>
          </div>
        </div>

        {/* Success rate matrix */}
        <div className="p-6">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Success Rate Matrix</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-gray-400 dark:text-gray-500 font-medium">Hold Period ↓ / Target →</th>
                  {targets.map(t => (
                    <th key={t} className="px-3 py-2 text-center text-gray-500 dark:text-gray-400 font-semibold">+{t}%</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map(row => (
                  <tr key={row.holding} className="border-t border-gray-50 dark:border-gray-700/50">
                    <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">{row.label}</td>
                    {row.cols.map(({ target, result }) => (
                      <td key={target} className="px-3 py-2 text-center">
                        {result ? (
                          <button
                            onClick={() => { setSelectedHolding(row.holding); setSelectedTarget(target); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${rateColor(result.successRate)} ${
                              selectedHolding === row.holding && selectedTarget === target ? 'ring-2 ring-offset-1 ring-gray-900 dark:ring-white scale-110' : 'hover:scale-105'
                            }`}
                          >
                            {fmtN(result.successRate, 0)}%
                          </button>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Click any cell to see detailed breakdown below</p>
        </div>
      </div>

      {/* Detailed result card */}
      {activeResult && <ScanResultCard result={activeResult} />}

      {/* Key insight callout */}
      {activeResult && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-1">Key Insight</p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Historically, entering this portfolio on a <strong>random date</strong> and holding for{' '}
                <strong>{HOLD_LABELS[activeResult.holdingDays] || `${activeResult.holdingDays} days`}</strong> achieved{' '}
                <strong>{fmtN(activeResult.targetPct)}%+ returns</strong> in{' '}
                <strong>{fmtN(activeResult.successRate, 1)}% of cases</strong> ({activeResult.achieved} of {activeResult.totalWindows} windows).
              </p>
              {activeResult.avgMaxDrawdown > 15 && (
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                  ⚠️ Average drawdown was {fmtN(activeResult.avgMaxDrawdown)}% during holding — prepare emotionally for this dip before gains appear.
                </p>
              )}
              {activeResult.avgDaysToTarget && (
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  ⏱️ When target was hit, it typically took {activeResult.avgDaysToTarget} trading days (median: {activeResult.medianDaysToTarget}d).
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
