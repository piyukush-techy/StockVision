// PortfolioTimeline.jsx — Phase 3 Month 14: Portfolio Historical Analysis
// Shows portfolio value over time, yearly performance, and diversification health timeline

import { useState } from 'react';

const fmtP = (n, showPlus = true) => {
  const sign = n >= 0 && showPlus ? '+' : '';
  return `${sign}${Number(n).toFixed(2)}%`;
};
const fmtPct = (n) => `${Number(n).toFixed(1)}%`;

const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200' },
  green:   { bg: 'bg-green-50 dark:bg-green-900/20',     border: 'border-green-300 dark:border-green-700',     text: 'text-green-700 dark:text-green-400',     badge: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       border: 'border-blue-300 dark:border-blue-700',       text: 'text-blue-700 dark:text-blue-400',       badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200' },
  yellow:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20',   border: 'border-yellow-300 dark:border-yellow-700',   text: 'text-yellow-700 dark:text-yellow-400',   badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20',   border: 'border-orange-300 dark:border-orange-700',   text: 'text-orange-700 dark:text-orange-400',   badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200' },
  red:     { bg: 'bg-red-50 dark:bg-red-900/20',         border: 'border-red-300 dark:border-red-700',         text: 'text-red-700 dark:text-red-400',         badge: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200' },
  gray:    { bg: 'bg-gray-50 dark:bg-gray-800',          border: 'border-gray-200 dark:border-gray-700',       text: 'text-gray-600 dark:text-gray-300',       badge: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
};

// ─── Mini SVG line chart ──────────────────────────────────────────────────────
function MiniLineChart({ data, height = 120, positive = true }) {
  if (!data || data.length < 2) return null;
  const values = data.map(d => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const W = 600, H = height;
  const pad = 8;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - minV) / range) * (H - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  // Zero line
  const zeroY = H - pad - ((0 - minV) / range) * (H - pad * 2);
  const lineColor = positive ? '#10b981' : '#ef4444';
  const fillId = `grad_${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Zero baseline */}
      {minV < 0 && maxV > 0 && (
        <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY}
          stroke="#9ca3af" strokeWidth="1" strokeDasharray="4 4" />
      )}
      {/* Fill area */}
      <polygon
        points={`${pad},${H - pad} ${points} ${W - pad},${H - pad}`}
        fill={`url(#${fillId})`}
      />
      {/* Line */}
      <polyline points={points} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Current value dot */}
      {(() => {
        const last = values[values.length - 1];
        const lx = W - pad;
        const ly = H - pad - ((last - minV) / range) * (H - pad * 2);
        return <circle cx={lx} cy={ly} r="4" fill={lineColor} />;
      })()}
    </svg>
  );
}

// ─── Year card ────────────────────────────────────────────────────────────────
function YearCard({ year }) {
  const [expanded, setExpanded] = useState(false);
  const good = year.portReturn >= 0;
  const exceptional = year.portReturn >= 25;
  const bad = year.portReturn < -10;

  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer transition-all ${
        exceptional ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
        good        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' :
        bad         ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
                      'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
      }`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-black text-gray-900 dark:text-white">{year.year}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 text-gray-600 dark:text-gray-300">{year.label}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`text-xl font-black ${good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {fmtP(year.portReturn)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Max DD: {fmtP(year.maxDD, false)}</p>
          </div>
          <span className="text-gray-400 dark:text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && year.stockReturns && (
        <div className="mt-3 pt-3 border-t border-white/40 dark:border-black/20 grid grid-cols-2 gap-2">
          {year.stockReturns.map(sr => (
            <div key={sr.symbol} className="flex items-center justify-between text-xs bg-white/50 dark:bg-black/20 rounded-lg px-3 py-1.5">
              <span className="font-semibold text-gray-700 dark:text-gray-200">{sr.symbol.replace('.NS', '').replace('.BO', '')}</span>
              <span className={`font-bold ${sr.returnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {fmtP(sr.returnPct)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Diversification timeline bar chart ──────────────────────────────────────
function DivTimeline({ data }) {
  if (!data || data.length === 0) return null;
  const recent = data.slice(-24); // last 24 months

  return (
    <div>
      <div className="flex items-end gap-1 h-24">
        {recent.map((d, i) => {
          const h = Math.max(4, d.diversificationScore);
          const color =
            d.diversificationScore >= 70 ? 'bg-emerald-500 dark:bg-emerald-400' :
            d.diversificationScore >= 50 ? 'bg-blue-500 dark:bg-blue-400' :
            d.diversificationScore >= 30 ? 'bg-yellow-500 dark:bg-yellow-400' :
                                           'bg-red-500 dark:bg-red-400';
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                {d.month}: {d.diversificationScore}% diversified
              </div>
              <div className={`w-full rounded-t ${color} transition-all`} style={{ height: `${h}%` }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
        <span>{recent[0]?.month}</span>
        <span>{recent[recent.length - 1]?.month}</span>
      </div>
      <div className="flex gap-3 mt-2 flex-wrap">
        {[
          { color: 'bg-emerald-500', label: '≥70% Well diversified' },
          { color: 'bg-blue-500',    label: '≥50% Moderate' },
          { color: 'bg-yellow-500',  label: '≥30% Low' },
          { color: 'bg-red-500',     label: '<30% Concentrated' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${l.color}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main PortfolioTimeline component ────────────────────────────────────────
export default function PortfolioTimeline({ data, symbols, weights, isLoading, error }) {
  const [activeTab, setActiveTab] = useState('chart');

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading portfolio history (5 years of data)…</p>
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

  if (!data) return null;

  const { portfolioTimeline, yearlyBreakdown, growthPattern, diversificationTimeline, summary, meta } = data;
  const c = COLOR_MAP[growthPattern?.color] || COLOR_MAP.gray;

  // Determine if overall portfolio is positive
  const lastVal = portfolioTimeline?.[portfolioTimeline.length - 1]?.value ?? 0;
  const isPositive = lastVal >= 0;

  const tabs = [
    { id: 'chart',    label: '📈 Growth Chart' },
    { id: 'yearly',   label: '📅 Year by Year' },
    { id: 'divHealth', label: '🔀 Diversification Health' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <span className="text-xl">📊</span>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Portfolio Historical Analysis</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {meta?.symbols?.length} stocks · {meta?.range} data · {summary?.totalTradingDays?.toLocaleString('en-IN')} trading days
          </p>
        </div>
        {/* Growth pattern badge */}
        <div className={`px-3 py-1.5 rounded-full border text-xs font-bold ${c.badge} ${c.border}`}>
          {growthPattern?.emoji} {growthPattern?.label}
        </div>
      </div>

      {/* Summary pills */}
      <div className="px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total Period</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{summary?.years}y data</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Overall Gain</p>
          <p className={`text-sm font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {fmtP(lastVal)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Best Year</p>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {summary?.bestYear ? `${summary.bestYear.year}: ${fmtP(summary.bestYear.portReturn)}` : '—'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Worst Year</p>
          <p className="text-sm font-bold text-red-500 dark:text-red-400">
            {summary?.worstYear ? `${summary.worstYear.year}: ${fmtP(summary.worstYear.portReturn)}` : '—'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {/* Growth Chart */}
        {activeTab === 'chart' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Portfolio cumulative return from start</p>
                <p className={`text-3xl font-black mt-0.5 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {fmtP(lastVal)}
                </p>
              </div>
              <div className="text-right text-xs text-gray-400 dark:text-gray-500">
                <p>{summary?.posYears} positive years</p>
                <p>{summary?.negYears} negative years</p>
              </div>
            </div>
            {portfolioTimeline && portfolioTimeline.length > 1 && (
              <MiniLineChart data={portfolioTimeline} height={160} positive={isPositive} />
            )}
            {/* Y-axis labels (min/max) */}
            {portfolioTimeline && portfolioTimeline.length > 1 && (() => {
              const vals = portfolioTimeline.map(d => d.value);
              const minV = Math.min(...vals);
              const maxV = Math.max(...vals);
              return (
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                  <span>{portfolioTimeline[0]?.date?.slice(0, 7)}</span>
                  <div className="text-right">
                    <span className="text-emerald-600 dark:text-emerald-400">Peak: {fmtP(maxV)}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="text-red-500 dark:text-red-400">Trough: {fmtP(minV)}</span>
                  </div>
                  <span>{portfolioTimeline[portfolioTimeline.length - 1]?.date?.slice(0, 7)}</span>
                </div>
              );
            })()}

            {/* Growth pattern explanation */}
            <div className={`mt-6 rounded-xl border p-4 ${c.bg} ${c.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{growthPattern?.emoji}</span>
                <span className={`text-sm font-bold ${c.text}`}>{growthPattern?.label}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">{growthPattern?.desc}</p>
            </div>
          </div>
        )}

        {/* Year by Year */}
        {activeTab === 'yearly' && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Click any year to see individual stock performance. Dashed line = zero.
            </p>
            {yearlyBreakdown && yearlyBreakdown.length > 0 ? (
              <div className="space-y-3">
                {/* Horizontal bar chart first */}
                <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 mb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50">
                          <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-semibold">Year</th>
                          <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-semibold w-full">Return</th>
                          <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 font-semibold">Max DD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearlyBreakdown.map(yr => {
                          const pct = yr.portReturn;
                          const maxBar = Math.max(...yearlyBreakdown.map(y => Math.abs(y.portReturn)));
                          const barW = Math.abs(pct / (maxBar || 1)) * 100;
                          const good = pct >= 0;
                          return (
                            <tr key={yr.year} className="border-t border-gray-50 dark:border-gray-700/50">
                              <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">{yr.year}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 flex items-center">
                                    {good ? (
                                      <div className={`h-4 rounded-r ${pct >= 20 ? 'bg-emerald-500' : pct >= 10 ? 'bg-green-400' : 'bg-teal-300'} transition-all`}
                                        style={{ width: `${barW}%`, minWidth: 4 }} />
                                    ) : (
                                      <div className={`h-4 rounded-r ${pct < -20 ? 'bg-red-600' : 'bg-red-400'} transition-all`}
                                        style={{ width: `${barW}%`, minWidth: 4 }} />
                                    )}
                                  </div>
                                  <span className={`font-bold w-16 text-right ${good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                    {fmtP(pct)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right text-red-500 dark:text-red-400 font-semibold">
                                -{fmtPct(yr.maxDD)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Expandable year cards */}
                {yearlyBreakdown.map(yr => <YearCard key={yr.year} year={yr} />)}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No yearly data available</p>
            )}
          </div>
        )}

        {/* Diversification Health */}
        {activeTab === 'divHealth' && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Rolling 90-day average pairwise correlation between stocks in this portfolio.
              High bars = well diversified (low correlation). Low bars = stocks moving together.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              Last 24 months shown. Hover bars for details.
            </p>
            {diversificationTimeline && diversificationTimeline.length > 0 ? (
              <DivTimeline data={diversificationTimeline} />
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                Need at least 2 stocks for diversification analysis
              </p>
            )}
            {/* Current state summary */}
            {diversificationTimeline && diversificationTimeline.length > 0 && (() => {
              const latest = diversificationTimeline[diversificationTimeline.length - 1];
              const c2 =
                latest.diversificationScore >= 70 ? COLOR_MAP.emerald :
                latest.diversificationScore >= 50 ? COLOR_MAP.blue :
                latest.diversificationScore >= 30 ? COLOR_MAP.yellow : COLOR_MAP.red;
              const label =
                latest.diversificationScore >= 70 ? 'Well Diversified' :
                latest.diversificationScore >= 50 ? 'Moderately Diversified' :
                latest.diversificationScore >= 30 ? 'Low Diversification' : 'Highly Concentrated';
              return (
                <div className={`mt-4 rounded-xl border p-4 ${c2.bg} ${c2.border}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Current (last 90 days)</p>
                  <p className={`text-2xl font-black ${c2.text}`}>{latest.diversificationScore}% Diversified</p>
                  <p className={`text-xs font-semibold ${c2.text}`}>{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Avg pairwise correlation: {(latest.avgCorrelation * 100).toFixed(1)}%
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
