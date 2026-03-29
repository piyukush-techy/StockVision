// RegimeMatch.jsx — Phase 3 Month 16: Regime Matching Engine
// "Current market looks like Oct 2020 — here's what happened next"

import { useState } from 'react';

const fmtP  = (n, plus = true) => n == null ? '—' : `${n >= 0 && plus ? '+' : ''}${Number(n).toFixed(1)}%`;
const fmtN  = (n, d = 1)       => n == null ? '—' : Number(n).toFixed(d);
const fmtDate = d => {
  if (!d) return '—';
  const [y, m] = d.split('-');
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${mon[+m - 1]} ${y}`;
};

// ─── Regime colours ───────────────────────────────────────────────────────────
const REGIME_META = {
  BULL:     { label: 'Bull Market',  emoji: '🐂', bg: 'bg-green-100 dark:bg-green-900/40',   text: 'text-green-800 dark:text-green-200',   border: 'border-green-300 dark:border-green-700',   bar: 'bg-green-500' },
  BEAR:     { label: 'Bear Market',  emoji: '🐻', bg: 'bg-red-100 dark:bg-red-900/40',       text: 'text-red-800 dark:text-red-200',       border: 'border-red-300 dark:border-red-700',       bar: 'bg-red-500' },
  SIDEWAYS: { label: 'Sideways',     emoji: '🦀', bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-800 dark:text-yellow-200', border: 'border-yellow-300 dark:border-yellow-700', bar: 'bg-yellow-500' },
  UNKNOWN:  { label: 'Unknown',      emoji: '❓', bg: 'bg-gray-100 dark:bg-gray-700',        text: 'text-gray-700 dark:text-gray-300',     border: 'border-gray-300 dark:border-gray-600',     bar: 'bg-gray-400' },
};

const FEASIBILITY_META = {
  green:  { bg: 'bg-green-100 dark:bg-green-900/40',   text: 'text-green-800 dark:text-green-200',   ring: 'ring-green-400' },
  teal:   { bg: 'bg-teal-100 dark:bg-teal-900/40',     text: 'text-teal-800 dark:text-teal-200',     ring: 'ring-teal-400' },
  blue:   { bg: 'bg-blue-100 dark:bg-blue-900/40',     text: 'text-blue-800 dark:text-blue-200',     ring: 'ring-blue-400' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-800 dark:text-yellow-200', ring: 'ring-yellow-400' },
  red:    { bg: 'bg-red-100 dark:bg-red-900/40',       text: 'text-red-800 dark:text-red-200',       ring: 'ring-red-400' },
};

function regimeMeta(r) { return REGIME_META[r] || REGIME_META.UNKNOWN; }

// ─── Gauge ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, label, color }) {
  const meta  = FEASIBILITY_META[color] || FEASIBILITY_META.blue;
  const r     = 36;
  const circ  = 2 * Math.PI * r;
  const dash  = circ * (score / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor"
            className="text-gray-200 dark:text-gray-700" strokeWidth="10" />
          <circle cx="50" cy="50" r={r} fill="none"
            stroke={score >= 80 ? '#22c55e' : score >= 65 ? '#14b8a6' : score >= 50 ? '#3b82f6' : score >= 35 ? '#eab308' : '#ef4444'}
            strokeWidth="10" strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${meta.text}`}>{score}</span>
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>
      <span className={`text-sm font-bold px-3 py-1 rounded-full ${meta.bg} ${meta.text}`}>{label}</span>
    </div>
  );
}

// ─── Metric row ───────────────────────────────────────────────────────────────
function MetricRow({ label, value, suffix = '', highlight, help }) {
  const isPos = parseFloat(value) >= 0;
  const cls   = highlight
    ? isPos ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'
    : 'text-gray-800 dark:text-gray-200 font-semibold';
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <div>
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        {help && <p className="text-xs text-gray-400 dark:text-gray-500">{help}</p>}
      </div>
      <span className={`text-sm ${cls}`}>{value != null ? `${value}${suffix}` : '—'}</span>
    </div>
  );
}

// ─── Forward return distribution bar ─────────────────────────────────────────
function ReturnBar({ stats, label }) {
  if (!stats) return null;
  const maxAbs = Math.max(Math.abs(stats.min), Math.abs(stats.max), 20);
  const toX = v => Math.max(0, Math.min(100, (v + maxAbs) / (2 * maxAbs) * 100));
  const medX = toX(stats.median);
  const p25X = toX(stats.p25);
  const p75X = toX(stats.p75);
  const midX = 50; // zero line

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-0.5">
        <span className="font-semibold">{label}</span>
        <span>
          <span className={stats.mean >= 0 ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'}>
            {fmtP(stats.mean)}
          </span>
          <span className="text-gray-400 ml-1">avg · {stats.winPct}% win</span>
        </span>
      </div>
      <div className="relative h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        {/* IQR band */}
        <div
          className="absolute h-full bg-blue-200 dark:bg-blue-800/50"
          style={{ left: `${p25X}%`, width: `${p75X - p25X}%` }}
        />
        {/* Zero line */}
        <div className="absolute h-full w-px bg-gray-400 dark:bg-gray-500"
          style={{ left: `${midX}%` }} />
        {/* Median marker */}
        <div className="absolute h-full w-1 rounded bg-blue-600 dark:bg-blue-400"
          style={{ left: `${medX}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>{fmtP(stats.min)}</span>
        <span>P25:{fmtP(stats.p25)} · Med:{fmtP(stats.median)} · P75:{fmtP(stats.p75)}</span>
        <span>{fmtP(stats.max)}</span>
      </div>
    </div>
  );
}

// ─── Historical match card ────────────────────────────────────────────────────
function MatchCard({ match, rank }) {
  const [open, setOpen] = useState(false);
  const rm = regimeMeta(match.regime);
  const pct = Math.round(match.sim * 100);

  return (
    <div
      onClick={() => setOpen(!open)}
      className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center flex-shrink-0">
          #{rank}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {match.namedPeriod ? match.namedPeriod.name : fmtDate(match.date)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(match.date)}</p>
            </div>
            {/* Similarity bar */}
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{pct}%</span>
            </div>
          </div>

          {/* Forward returns summary */}
          <div className="flex gap-4 mt-2">
            {[['30d', match.fwd30], ['90d', match.fwd90], ['180d', match.fwd180]].map(([lbl, val]) => (
              <div key={lbl}>
                <p className="text-xs text-gray-400">{lbl}</p>
                <p className={`text-xs font-bold ${val == null ? 'text-gray-400' : val >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {fmtP(val)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded: named period description + fingerprint */}
      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
          {match.namedPeriod && (
            <p className="text-xs text-gray-600 dark:text-gray-300 italic">"{match.namedPeriod.desc}"</p>
          )}
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { k: 'vs MA50',    v: match.fingerprint.pVsM50,    s: '%' },
              { k: 'vs MA200',   v: match.fingerprint.pVsM200,   s: '%' },
              { k: 'MA50/MA200', v: match.fingerprint.m50VsM200, s: '%' },
              { k: 'RSI',        v: match.fingerprint.rsi,       s: '' },
              { k: 'Volatility', v: match.fingerprint.vol,       s: '%' },
              { k: 'Momentum',   v: match.fingerprint.momentum,  s: '' },
            ].map(({ k, v, s }) => (
              <div key={k} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                <p className="text-gray-400">{k}</p>
                <p className={`font-bold ${parseFloat(v) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {v >= 0 ? '+' : ''}{fmtN(v, 1)}{s}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stock alignment table ────────────────────────────────────────────────────
function AlignmentTable({ details, marketRegime }) {
  if (!details || !details.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs">
            {['Stock','Regime','Aligned?','RSI','Momentum','vs MA50'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {details.map(s => {
            const rm = regimeMeta(s.regime);
            return (
              <tr key={s.symbol} className="border-t border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-white text-xs">
                  {s.symbol.replace('.NS','').replace('.BO','')}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${rm.bg} ${rm.text}`}>
                    {rm.emoji} {rm.label}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {s.aligned
                    ? <span className="text-xs font-bold text-green-600 dark:text-green-400">✅ Aligned</span>
                    : <span className="text-xs font-bold text-orange-600 dark:text-orange-400">⚠️ Diverging</span>}
                </td>
                <td className={`px-4 py-2.5 text-xs font-bold ${
                  s.rsi > 70 ? 'text-red-600 dark:text-red-400' :
                  s.rsi < 30 ? 'text-green-600 dark:text-green-400' :
                  'text-gray-700 dark:text-gray-300'
                }`}>{fmtN(s.rsi, 1)}</td>
                <td className={`px-4 py-2.5 text-xs font-bold ${
                  (s.momentum || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>{fmtN(s.momentum, 1)}</td>
                <td className={`px-4 py-2.5 text-xs font-bold ${
                  (s.pVsM50 || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>{fmtP(s.pVsM50)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RegimeMatch({ data, isLoading, error }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500 dark:text-gray-400">Scanning 5 years of market history…</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">Finding periods that look like right now</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
      ⚠️ {error}
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="text-5xl">🌊</span>
      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Regime Matching</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">Run after portfolio analysis to see current regime vs history</p>
    </div>
  );

  const { currentMetrics, feasibility, feasibilityLabel, feasibilityColor,
          bestNarrative, transitionRisk, stats, topMatches, totalMatches,
          portfolioAlignment, meta } = data;

  const rm = regimeMeta(currentMetrics.regime);

  const tabs = [
    { id: 'overview',    label: '📊 Overview' },
    { id: 'matches',     label: `🕒 Historical Matches (${topMatches?.length || 0})` },
    { id: 'forecast',    label: '📈 Forward Outlook' },
    { id: 'alignment',   label: '🎯 Portfolio Alignment' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Hero: Current Regime + Feasibility ── */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Current Regime card */}
        <div className={`border-2 rounded-2xl p-5 flex items-center gap-5 ${rm.border} ${rm.bg}`}>
          <div className="text-5xl">{rm.emoji}</div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Current Market Regime</p>
            <p className={`text-2xl font-black ${rm.text}`}>{rm.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              As of {meta?.analysisDate} · {totalMatches} historical matches found
            </p>
          </div>
        </div>

        {/* Feasibility gauge */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex items-center gap-5">
          <ScoreRing score={feasibility} label={feasibilityLabel} color={feasibilityColor} />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Feasibility Score</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Regime conditions are <span className="font-bold">{feasibilityLabel.toLowerCase()}</span> for new entries based on historical outcomes
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
              ⚡ Transition risk: <span className="font-bold">{transitionRisk}%</span> chance of major move in 90d
            </p>
          </div>
        </div>
      </div>

      {/* ── Best narrative ── */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl px-5 py-4">
        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">🔮 Best Historical Match</p>
        <p className="text-sm text-indigo-900 dark:text-indigo-200">{bestNarrative}</p>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-b-2 border-indigo-600 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >{tab.label}</button>
          ))}
        </div>

        <div className="p-6">

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">

              {/* Current metrics */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Current Market Fingerprint (Nifty 50)</p>
                <div className="grid sm:grid-cols-2 gap-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y dark:divide-gray-700 sm:divide-y-0">
                  <div className="p-4 space-y-0">
                    <MetricRow label="Price vs MA50"    value={fmtP(currentMetrics.pVsM50)}    highlight />
                    <MetricRow label="Price vs MA200"   value={fmtP(currentMetrics.pVsM200)}   highlight />
                    <MetricRow label="MA50 vs MA200"    value={fmtP(currentMetrics.m50VsM200)} highlight help="Golden/Death cross indicator" />
                  </div>
                  <div className="p-4 space-y-0">
                    <MetricRow label="RSI (14)"         value={`${fmtN(currentMetrics.rsi, 1)}`} help="<30 oversold · >70 overbought" />
                    <MetricRow label="Annual Volatility" value={`${fmtN(currentMetrics.vol, 1)}%`} />
                    <MetricRow label="Momentum Score"   value={fmtN(currentMetrics.momentum, 1)} highlight help="-100 (weak) to +100 (strong)" />
                  </div>
                </div>
              </div>

              {/* Quick stats from top matches */}
              {stats?.fwd90 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    What Happened Next — Based on {stats.fwd90.n} Historical Matches
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: '30-day avg',  val: stats.fwd30?.mean,  win: stats.fwd30?.winPct },
                      { label: '90-day avg',  val: stats.fwd90?.mean,  win: stats.fwd90?.winPct },
                      { label: '180-day avg', val: stats.fwd180?.mean, win: stats.fwd180?.winPct },
                    ].map(({ label, val, win }) => (
                      <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-400 mb-1">{label}</p>
                        <p className={`text-xl font-black ${(val || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {fmtP(val)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{win}% win rate</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Historical Matches */}
          {activeTab === 'matches' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Top {topMatches?.length} most similar historical periods — click any to expand fingerprint details
              </p>
              {(topMatches || []).map((m, i) => (
                <MatchCard key={i} match={m} rank={i + 1} />
              ))}
            </div>
          )}

          {/* Forward Outlook */}
          {activeTab === 'forecast' && (
            <div className="space-y-6">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Distribution of forward returns across all {totalMatches} historical regime matches. IQR = interquartile range (middle 50% of outcomes).
              </p>
              <div className="space-y-5">
                <ReturnBar stats={stats?.fwd30}  label="30-day Forward Return Distribution" />
                <ReturnBar stats={stats?.fwd90}  label="90-day Forward Return Distribution" />
                <ReturnBar stats={stats?.fwd180} label="180-day Forward Return Distribution" />
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-5 py-4 text-xs text-yellow-800 dark:text-yellow-200">
                ⚠️ These are <strong>historical base rates</strong>, not predictions. Past regime outcomes do not guarantee future performance. Always consider current macro context.
              </div>
            </div>
          )}

          {/* Portfolio Alignment */}
          {activeTab === 'alignment' && portfolioAlignment && (
            <div className="space-y-5">
              {/* Alignment score */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400">Market Regime</p>
                  <p className={`text-xl font-black mt-1 ${regimeMeta(portfolioAlignment.marketRegime).text}`}>
                    {regimeMeta(portfolioAlignment.marketRegime).emoji} {regimeMeta(portfolioAlignment.marketRegime).label}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400">Aligned Stocks</p>
                  <p className="text-xl font-black mt-1 text-green-600 dark:text-green-400">
                    {portfolioAlignment.alignedStocks.length} / {portfolioAlignment.stockDetails.length}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400">Alignment Score</p>
                  <p className={`text-xl font-black mt-1 ${portfolioAlignment.alignmentScore >= 70 ? 'text-green-600 dark:text-green-400' : portfolioAlignment.alignmentScore >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                    {portfolioAlignment.alignmentScore}%
                  </p>
                </div>
              </div>

              {/* Alignment message */}
              {portfolioAlignment.misalignedStocks.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl px-4 py-3 text-sm text-orange-800 dark:text-orange-200">
                  ⚠️ <strong>Diverging stocks:</strong> {portfolioAlignment.misalignedStocks.map(s => s.replace('.NS','').replace('.BO','')).join(', ')} — these stocks are in a different regime than the broader market
                </div>
              )}
              {portfolioAlignment.alignmentScore === 100 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3 text-sm text-green-800 dark:text-green-200">
                  ✅ All portfolio stocks are aligned with the current market regime — ideal conditions for this portfolio
                </div>
              )}

              {/* Per-stock table */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Per-Stock Regime Details</p>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <AlignmentTable
                    details={portfolioAlignment.stockDetails}
                    marketRegime={portfolioAlignment.marketRegime}
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
