// RootCauseAnalysis.jsx — Phase 3 Month 15: Event Attribution Engine
// Correlates portfolio performance with major Indian & global market events
// "This portfolio succeeded/failed because of X event"

import { useState } from 'react';

const fmtP = (n, plus = true) => `${n >= 0 && plus ? '+' : ''}${Number(n).toFixed(1)}%`;
const fmtDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${months[+m - 1]} ${y}`;
};

const CATEGORY_COLORS = {
  budget:    { bg: 'bg-blue-100 dark:bg-blue-900/40',    text: 'text-blue-800 dark:text-blue-200',    border: 'border-blue-300 dark:border-blue-700' },
  crisis:    { bg: 'bg-red-100 dark:bg-red-900/40',      text: 'text-red-800 dark:text-red-200',      border: 'border-red-300 dark:border-red-700' },
  crash:     { bg: 'bg-red-100 dark:bg-red-900/40',      text: 'text-red-800 dark:text-red-200',      border: 'border-red-300 dark:border-red-700' },
  recovery:  { bg: 'bg-green-100 dark:bg-green-900/40',  text: 'text-green-800 dark:text-green-200',  border: 'border-green-300 dark:border-green-700' },
  election:  { bg: 'bg-purple-100 dark:bg-purple-900/40',text: 'text-purple-800 dark:text-purple-200',border: 'border-purple-300 dark:border-purple-700' },
  policy:    { bg: 'bg-indigo-100 dark:bg-indigo-900/40',text: 'text-indigo-800 dark:text-indigo-200',border: 'border-indigo-300 dark:border-indigo-700' },
  rbi:       { bg: 'bg-yellow-100 dark:bg-yellow-900/40',text: 'text-yellow-800 dark:text-yellow-200',border: 'border-yellow-300 dark:border-yellow-700' },
  global:    { bg: 'bg-gray-100 dark:bg-gray-700',       text: 'text-gray-800 dark:text-gray-200',    border: 'border-gray-300 dark:border-gray-600' },
  fii:       { bg: 'bg-orange-100 dark:bg-orange-900/40',text: 'text-orange-800 dark:text-orange-200',border: 'border-orange-300 dark:border-orange-700' },
  macro:     { bg: 'bg-teal-100 dark:bg-teal-900/40',    text: 'text-teal-800 dark:text-teal-200',    border: 'border-teal-300 dark:border-teal-700' },
  milestone: { bg: 'bg-amber-100 dark:bg-amber-900/40',  text: 'text-amber-800 dark:text-amber-200',  border: 'border-amber-300 dark:border-amber-700' },
  earnings:  { bg: 'bg-green-100 dark:bg-green-900/40',  text: 'text-green-800 dark:text-green-200',  border: 'border-green-300 dark:border-green-700' },
  event:     { bg: 'bg-pink-100 dark:bg-pink-900/40',    text: 'text-pink-800 dark:text-pink-200',    border: 'border-pink-300 dark:border-pink-700' },
};

function getCatColor(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.global;
}

// ─── Mini Impact Bar ──────────────────────────────────────────────────────────
function ImpactBar({ value, max = 20 }) {
  const pct = Math.min(Math.abs(value) / max * 100, 100);
  const isPos = value >= 0;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full ${isPos ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${isPos ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {fmtP(value)}
      </span>
    </div>
  );
}

// ─── Timeline Chart ───────────────────────────────────────────────────────────
function TimelineChart({ monthlyTimeline, allEventsInRange }) {
  if (!monthlyTimeline || monthlyTimeline.length < 2) return null;

  const min  = Math.min(...monthlyTimeline.map(d => d.value));
  const max  = Math.max(...monthlyTimeline.map(d => d.value));
  const range = max - min || 1;
  const W = 800, H = 200, PAD = 20;

  // Build SVG polyline
  const pts = monthlyTimeline.map((d, i) => {
    const x = PAD + (i / (monthlyTimeline.length - 1)) * (W - 2 * PAD);
    const y = H - PAD - ((d.value - min) / range) * (H - 2 * PAD);
    return `${x},${y}`;
  }).join(' ');

  // Major events as vertical lines
  const eventMarkers = (allEventsInRange || [])
    .filter(e => Math.abs(e.impact) >= 2)
    .map(e => {
      const idx = monthlyTimeline.findIndex(d => d.date >= e.date);
      if (idx < 0) return null;
      const x = PAD + (idx / (monthlyTimeline.length - 1)) * (W - 2 * PAD);
      return { x, event: e, idx };
    }).filter(Boolean);

  // Base line (100)
  const baseY = H - PAD - ((100 - min) / range) * (H - 2 * PAD);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 400 }}>
        {/* Base line */}
        <line x1={PAD} y1={baseY} x2={W - PAD} y2={baseY}
          stroke="#d1d5db" strokeWidth="1" strokeDasharray="4,4" />

        {/* Fill under curve */}
        <defs>
          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polyline
          points={`${PAD},${H - PAD} ${pts} ${W - PAD},${H - PAD}`}
          fill="url(#portfolioGrad)"
          stroke="none"
        />

        {/* Event markers */}
        {eventMarkers.map(({ x, event }, i) => (
          <g key={i}>
            <line x1={x} y1={PAD} x2={x} y2={H - PAD}
              stroke={event.impact > 0 ? '#22c55e' : '#ef4444'}
              strokeWidth="1.5" strokeDasharray="3,3" opacity="0.7" />
            <circle cx={x} cy={PAD + 4} r="4"
              fill={event.impact > 0 ? '#22c55e' : '#ef4444'} opacity="0.9" />
          </g>
        ))}

        {/* Portfolio line */}
        <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-blue-500" />
          <span>Portfolio Value (rebased 100)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-0.5 h-3 bg-green-500" />
          <span>Positive event</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-0.5 h-3 bg-red-500" />
          <span>Negative event</span>
        </div>
      </div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event, showImpact = true }) {
  const [expanded, setExpanded] = useState(false);
  const cat   = getCatColor(event.category);
  const isPos = (event.postMove ?? event.impact ?? 0) >= 0;

  return (
    <div
      className={`border rounded-xl p-4 transition-all cursor-pointer hover:shadow-sm ${cat.border} ${cat.bg}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{event.meta?.emoji || '📌'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className={`text-sm font-bold ${cat.text}`}>{event.label}</p>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{fmtDate(event.date)}</span>
          </div>
          {showImpact && event.postMove !== undefined && (
            <div className="mt-1.5">
              <ImpactBar value={event.postMove} />
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-600 dark:text-gray-300">{event.description}</p>
          {event.postMove !== undefined && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <p className="text-xs text-gray-400">Pre-event (10d)</p>
                <p className={`text-sm font-bold ${event.preDrop >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {fmtP(event.preDrop)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Post-event (30d)</p>
                <p className={`text-sm font-bold ${event.postMove >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {fmtP(event.postMove)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Total (40d)</p>
                <p className={`text-sm font-bold ${event.totalMove >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {fmtP(event.totalMove)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Period Card ──────────────────────────────────────────────────────────────
function PeriodCard({ period, type }) {
  const isGood = type === 'best';
  const borderColor = isGood ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700';
  const bgColor     = isGood ? 'bg-green-50 dark:bg-green-900/20'       : 'bg-red-50 dark:bg-red-900/20';
  const textColor   = isGood ? 'text-green-700 dark:text-green-400'     : 'text-red-700 dark:text-red-400';

  return (
    <div className={`border rounded-xl p-4 ${borderColor} ${bgColor}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {fmtDate(period.startDate)} → {fmtDate(period.endDate)}
          </p>
          <p className={`text-xl font-black mt-1 ${textColor}`}>
            {fmtP(period.return)}
          </p>
        </div>
        <span className="text-2xl">{isGood ? '🚀' : '📉'}</span>
      </div>
      <div className={`mt-3 pt-3 border-t ${isGood ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
        <p className="text-xs text-gray-600 dark:text-gray-400">{period.explanation}</p>
        {period.event && (
          <div className="mt-2">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isGood ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'}`}>
              {period.event.meta?.emoji} {period.event.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Category Summary Bar ─────────────────────────────────────────────────────
function CategorySummary({ categories }) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="space-y-2">
      {categories.slice(0, 8).map(cat => {
        const color = getCatColor(cat.category);
        const isNet  = cat.netImpact >= 0;
        const barPct = Math.min(Math.abs(cat.netImpact) / 8 * 100, 100);

        return (
          <div key={cat.category} className="flex items-center gap-3">
            <div className="w-28 flex-shrink-0 flex items-center gap-1">
              <span className="text-base">{cat.meta?.emoji}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{cat.meta?.label || cat.category}</span>
            </div>
            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full ${isNet ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <div className="w-12 text-right">
              <span className={`text-xs font-bold ${isNet ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isNet ? '+' : ''}{cat.netImpact.toFixed(1)}
              </span>
            </div>
            <div className="w-6 text-right">
              <span className="text-xs text-gray-400">{cat.count}</span>
            </div>
          </div>
        );
      })}
      <div className="flex text-xs text-gray-400 dark:text-gray-500 gap-3 mt-1 pl-31">
        <span className="w-28" />
        <span className="flex-1 text-center">← Negative / Positive →</span>
        <span className="w-12 text-right">Net</span>
        <span className="w-6 text-right">#</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RootCauseAnalysis({ data, isLoading, error }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing events across {'{'}5{'}'}  years of history…</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Correlating with 60+ major Indian & global events</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
        ⚠️ {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-5xl">🔍</span>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Event Attribution</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Run after portfolio analysis to see root cause of gains/losses</p>
      </div>
    );
  }

  const { summary, topEvents, monthlyTimeline, categorySummary, bestPeriods, worstPeriods, allEventsInRange } = data;

  const tabs = [
    { id: 'overview',  label: '📊 Overview' },
    { id: 'timeline',  label: '📈 Timeline' },
    { id: 'events',    label: `🗓️ All Events (${allEventsInRange?.length || 0})` },
    { id: 'periods',   label: '🏆 Best / Worst' },
    { id: 'categories',label: '🗂️ Categories' },
  ];

  return (
    <div className="space-y-6">

      {/* Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Return',     value: fmtP(summary.totalReturn), color: summary.totalReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
          { label: 'Events Analyzed',  value: summary.eventsAnalyzed,    color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Positive Events',  value: summary.positiveEvents,    color: 'text-green-600 dark:text-green-400' },
          { label: 'Negative Events',  value: summary.negativeEvents,    color: 'text-red-600 dark:text-red-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Biggest Boost / Drag */}
      {(summary.biggestBoost || summary.biggestDrag) && (
        <div className="grid md:grid-cols-2 gap-4">
          {summary.biggestBoost && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">💚 Biggest Portfolio Booster</p>
              <div className="flex items-start gap-2">
                <span className="text-xl">{summary.biggestBoost.meta?.emoji || '📈'}</span>
                <div>
                  <p className="font-bold text-green-800 dark:text-green-300 text-sm">{summary.biggestBoost.label}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{fmtDate(summary.biggestBoost.date)} · +{summary.biggestBoost.postMove?.toFixed(1)}% post-event</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{summary.biggestBoost.description}</p>
                </div>
              </div>
            </div>
          )}
          {summary.biggestDrag && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide mb-2">🔴 Biggest Portfolio Drag</p>
              <div className="flex items-start gap-2">
                <span className="text-xl">{summary.biggestDrag.meta?.emoji || '📉'}</span>
                <div>
                  <p className="font-bold text-red-800 dark:text-red-300 text-sm">{summary.biggestDrag.label}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{fmtDate(summary.biggestDrag.date)} · {summary.biggestDrag.postMove?.toFixed(1)}% post-event</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{summary.biggestDrag.description}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-b-2 border-purple-600 text-purple-700 dark:text-purple-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                  Top 6 Most Impactful Events
                </p>
                <div className="space-y-3">
                  {topEvents.slice(0, 6).map((event, i) => (
                    <EventCard key={i} event={event} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Portfolio rebased to 100 at start · Colored markers = major events (green = positive, red = negative)
              </p>
              <TimelineChart
                monthlyTimeline={monthlyTimeline}
                allEventsInRange={allEventsInRange}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Only events with impact ≥ 2 shown as markers
              </p>
            </div>
          )}

          {/* All Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                All {allEventsInRange?.length} major events during your portfolio's analysis period · Click any event to expand
              </p>
              {(allEventsInRange || []).map((event, i) => {
                // Merge with impact data if available
                const withImpact = topEvents.find(t => t.label === event.label) || event;
                return <EventCard key={i} event={withImpact} showImpact={!!withImpact.postMove} />;
              })}
            </div>
          )}

          {/* Best/Worst Periods Tab */}
          {activeTab === 'periods' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-green-600 dark:text-green-400 mb-3">🚀 Best 90-Day Periods</p>
                {(bestPeriods || []).map((p, i) => (
                  <PeriodCard key={i} period={p} type="best" />
                ))}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400 mb-3">📉 Worst 90-Day Periods</p>
                {(worstPeriods || []).map((p, i) => (
                  <PeriodCard key={i} period={p} type="worst" />
                ))}
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-4">
                  Impact by Event Category — Net Positive/Negative Score
                </p>
                <CategorySummary categories={categorySummary} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                {(categorySummary || []).slice(0, 6).map((cat, i) => (
                  <div key={i} className={`rounded-xl border p-4 ${getCatColor(cat.category).bg} ${getCatColor(cat.category).border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{cat.meta?.emoji}</span>
                      <span className={`text-sm font-bold ${getCatColor(cat.category).text}`}>{cat.meta?.label}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{cat.count} event{cat.count !== 1 ? 's' : ''}</span>
                      <span className={cat.netImpact >= 0 ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'}>
                        Net: {cat.netImpact >= 0 ? '+' : ''}{cat.netImpact.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
