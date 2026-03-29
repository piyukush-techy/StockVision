// PortfolioScalability.jsx — Phase 3 Month 17: Portfolio Scalability
// Stress Test · What-If Simulator · Rebalancing Comparison · Benchmark Battle

import { useState } from 'react';

const fmtP   = (n, plus = true) => n == null ? '—' : `${n >= 0 && plus ? '+' : ''}${Number(n).toFixed(1)}%`;
const fmtC   = (n) => n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`;
const fmtN   = (n, d = 2) => n == null ? '—' : Number(n).toFixed(d);

function Pill({ val, suffix = '', plus = true, size = 'md' }) {
  const n = parseFloat(val);
  const isPos = n >= 0;
  const cls = isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400';
  const sz  = size === 'lg' ? 'text-xl font-black' : size === 'sm' ? 'text-xs font-semibold' : 'text-sm font-bold';
  return <span className={`${cls} ${sz}`}>{plus && isPos ? '+' : ''}{val}{suffix}</span>;
}

// ─── Mini sparkline ───────────────────────────────────────────────────────────
function Sparkline({ vals, color = 'blue', h = 40 }) {
  if (!vals || vals.length < 2) return null;
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const w = 120;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  const colorMap = {
    blue: '#3b82f6', emerald: '#10b981', yellow: '#f59e0b',
    red: '#ef4444', purple: '#8b5cf6', indigo: '#6366f1', gray: '#9ca3af'
  };
  const stroke = colorMap[color] || colorMap.blue;
  const last = vals[vals.length - 1];
  const isPos = last >= 0;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#sg-${color})`} />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────
function MetCard({ label, value, sub, color = 'gray' }) {
  const colorMap = {
    green:  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    red:    'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
    blue:   'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    gray:   'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.gray}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-black text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: STRESS TEST
// ═══════════════════════════════════════════════════════════════════════════
function StressTestTab({ stress, symbols }) {
  const [selected, setSelected] = useState(null);
  if (!stress) return null;

  const { scenarios, summary } = stress;
  const available = scenarios.filter(s => s.available);
  const crashes   = available.filter(s => s.category === 'crash');
  const rallies   = available.filter(s => s.category === 'rally');

  const severityBg = {
    extreme:  'bg-red-600',
    moderate: 'bg-orange-500',
    mild:     'bg-yellow-500',
  };

  return (
    <div className="space-y-6">
      {/* Summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetCard label="Avg Alpha in Crashes" value={fmtP(summary.crashAlpha)} color={summary.crashAlpha >= 0 ? 'green' : 'red'} sub="vs Nifty in downturns" />
        <MetCard label="Avg Alpha in Rallies" value={fmtP(summary.rallyAlpha)} color={summary.rallyAlpha >= 0 ? 'green' : 'red'} sub="vs Nifty in rallies" />
        <MetCard label="Best Period" value={summary.bestScenario?.name || '—'} sub={fmtP(summary.bestScenario?.return)} color="green" />
        <MetCard label="Worst Period" value={summary.worstScenario?.name || '—'} sub={fmtP(summary.worstScenario?.return)} color="red" />
      </div>

      {/* Crash vs Rally label */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"/><span className="text-xs text-gray-500 dark:text-gray-400">Crash scenarios ({crashes.length})</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"/><span className="text-xs text-gray-500 dark:text-gray-400">Rally scenarios ({rallies.length})</span></div>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">Click any row for stock breakdown</span>
      </div>

      {/* Scenario table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Scenario</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nifty</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Portfolio</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Alpha</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Max DD</th>
            </tr>
          </thead>
          <tbody>
            {available.map((sc, i) => {
              const isUp    = sc.portfolioReturn >= 0;
              const alphaUp = sc.alpha >= 0;
              const isOpen  = selected === sc.id;
              return (
                <>
                  <tr
                    key={sc.id}
                    onClick={() => setSelected(isOpen ? null : sc.id)}
                    className={`border-t border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors ${isOpen ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{sc.emoji}</span>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            {sc.name}
                            <span className={`text-xs px-1.5 py-0.5 rounded text-white font-bold ${severityBg[sc.severity] || 'bg-gray-400'}`}>{sc.severity}</span>
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{sc.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${sc.niftyReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>{fmtP(sc.niftyReturn)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>{fmtP(sc.portfolioReturn)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${alphaUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>{fmtP(sc.alpha)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-red-500 dark:text-red-400 font-medium">-{fmtN(sc.maxDrawdown)}%</span>
                    </td>
                  </tr>
                  {isOpen && sc.stockReturns && (
                    <tr className="bg-gray-50 dark:bg-gray-700/30">
                      <td colSpan={5} className="px-6 py-3">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Individual stock returns in this period</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(sc.stockReturns).map(([sym, ret]) => (
                            <div key={sym} className={`rounded-lg px-3 py-1.5 border ${ret >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{sym.replace('.NS','').replace('.BO','')}</p>
                              <p className={`text-sm font-black ${ret >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>{fmtP(ret)}</p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {available.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">No scenario data available for this date range</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Insight box */}
      {summary.crashAlpha !== null && (
        <div className={`rounded-2xl border p-4 ${summary.crashAlpha >= 2 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : summary.crashAlpha >= 0 ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">
            {summary.crashAlpha >= 2 ? '🛡️ Defensive Portfolio' : summary.crashAlpha >= 0 ? '⚖️ Market-Aligned Portfolio' : '⚠️ Crash-Sensitive Portfolio'}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {summary.crashAlpha >= 0
              ? `Your portfolio outperformed Nifty by ${fmtP(summary.crashAlpha)} on average during crash scenarios — providing ${summary.crashAlpha >= 2 ? 'strong' : 'modest'} downside protection.`
              : `Your portfolio underperformed Nifty by ${fmtP(Math.abs(summary.crashAlpha))} during crash scenarios. Consider adding defensive stocks (FMCG, Pharma) to improve resilience.`
            }
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: WHAT-IF SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════
function WhatIfTab({ whatIf, symbols }) {
  if (!whatIf) return null;

  const { base, scenarios, meta } = whatIf;
  const all = [base, ...scenarios];

  const metrics = [
    { key: 'cagr',        label: 'CAGR',         suffix: '%', higher: true  },
    { key: 'totalReturn', label: 'Total Return',  suffix: '%', higher: true  },
    { key: 'vol',         label: 'Volatility',    suffix: '%', higher: false },
    { key: 'maxDD',       label: 'Max Drawdown',  suffix: '%', higher: false },
    { key: 'sharpe',      label: 'Sharpe Ratio',  suffix: '',  higher: true  },
  ];

  const best = (key, higher) => all.reduce((b, s) => (higher ? s[key] > b[key] : s[key] < b[key]) ? s : b);

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Comparing your best-strategy weights against alternative allocations over {meta?.dateRange?.from?.slice(0,7)} → {meta?.dateRange?.to?.slice(0,7)}.
      </p>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Strategy</th>
              {metrics.map(m => (
                <th key={m.key} className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {all.map((sc, i) => (
              <tr key={i} className={`border-t border-gray-100 dark:border-gray-700 ${i === 0 ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {i === 0 && <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">Current</span>}
                    <span className="font-medium text-gray-800 dark:text-gray-200">{sc.name}</span>
                  </div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {symbols.map((sym, si) => (
                      <span key={sym} className="text-xs text-gray-400 dark:text-gray-500">
                        {sym.replace('.NS','').replace('.BO','')}: {((sc.weights?.[si] || 0) * 100).toFixed(0)}%
                      </span>
                    ))}
                  </div>
                </td>
                {metrics.map(m => {
                  const isBest = best(m.key, m.higher).name === sc.name;
                  const val    = sc[m.key];
                  return (
                    <td key={m.key} className="px-4 py-3 text-right">
                      <span className={`font-bold ${
                        isBest
                          ? m.higher ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {isBest && '★ '}
                        {m.key === 'maxDD' ? `-${fmtN(val, 1)}${m.suffix}` : `${fmtN(val, m.key === 'sharpe' ? 2 : 1)}${m.suffix}`}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Timeline comparison sparklines */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Return trajectory (monthly)</p>
        <div className="space-y-3">
          {all.map((sc, i) => {
            const finalVal = sc.timeline?.[sc.timeline.length - 1] ?? 0;
            const colorMap = ['emerald', 'blue', 'purple', 'orange', 'indigo'];
            const color    = colorMap[i % colorMap.length];
            return (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="w-36 shrink-0">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{sc.name}</p>
                  <p className={`text-sm font-black ${finalVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    {fmtP(finalVal)}
                  </p>
                </div>
                <div className="flex-1">
                  <Sparkline vals={sc.timeline} color={color} h={36} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: REBALANCING
// ═══════════════════════════════════════════════════════════════════════════
function RebalancingTab({ rebalance }) {
  if (!rebalance) return null;

  const { strategies, winner, meta } = rebalance;

  return (
    <div className="space-y-6">
      {/* Winner callout */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 flex items-center gap-4">
        <span className="text-4xl">🏆</span>
        <div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wide">Best Strategy for this Portfolio</p>
          <p className="text-xl font-black text-emerald-800 dark:text-emerald-200">{winner}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Based on net gain after transaction costs · Capital: {fmtC(meta.capital)}
          </p>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Strategy</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Final Value</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">CAGR</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Max DD</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Costs</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Net Gain</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((s, i) => {
              const isWinner = s.label === winner;
              return (
                <tr key={i} className={`border-t border-gray-100 dark:border-gray-700 ${isWinner ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isWinner && <span className="text-lg">🏆</span>}
                      <div>
                        <p className={`font-semibold ${isWinner ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'}`}>{s.label}</p>
                        {s.freqDays > 0 && <p className="text-xs text-gray-400 dark:text-gray-500">Every {s.freqDays} trading days</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-gray-200">{fmtC(s.finalValue)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={s.cagr >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-red-500 dark:text-red-400 font-bold'}>{fmtP(s.cagr)}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-red-500 dark:text-red-400 font-medium">-{fmtN(s.maxDD)}%</td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{s.totalCost > 0 ? fmtC(s.totalCost) : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={s.netGain >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-red-500 font-bold'}>{fmtC(s.netGain)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Value growth chart */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Portfolio value over time (monthly)</p>
        <div className="space-y-2">
          {strategies.map((s, i) => {
            const colors = ['emerald', 'blue', 'purple', 'indigo', 'yellow'];
            const color  = colors[i % colors.length];
            const finalPct = s.totalReturn;
            return (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                <div className="w-40 shrink-0">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{s.label}</p>
                  <p className={`text-sm font-black ${finalPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmtP(finalPct)}</p>
                </div>
                <div className="flex-1">
                  <Sparkline vals={s.vals?.map(v => ((v - meta.capital) / meta.capital) * 100)} color={color} h={36} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanation note */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        <strong className="text-gray-700 dark:text-gray-300">How costs are calculated:</strong> Each rebalance trade incurs a 0.1% transaction cost per stock (STT + brokerage approximation). Buy &amp; Hold has zero ongoing costs. Results assume dividends are excluded and prices are adjusted for splits.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: BENCHMARK COMPARISON
// ═══════════════════════════════════════════════════════════════════════════
function BenchmarkTab({ benchmark }) {
  const [viewTab, setViewTab] = useState('table');
  if (!benchmark) return null;

  const { portfolio, benchmarks, yearlyComparison, timelineDates, meta } = benchmark;
  const all = [portfolio, ...benchmarks].filter(Boolean);

  const colorMap = {
    emerald: 'bg-emerald-500',
    blue:    'bg-blue-500',
    indigo:  'bg-indigo-500',
    yellow:  'bg-yellow-500',
    purple:  'bg-purple-500',
    gray:    'bg-gray-400',
  };

  return (
    <div className="space-y-6">
      {/* Subtabs */}
      <div className="flex gap-2">
        {[{id:'table',label:'📊 Metrics Table'},{id:'yearly',label:'📅 Year by Year'},{id:'chart',label:'📈 Return Chart'}].map(t => (
          <button key={t.id} onClick={() => setViewTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewTab === t.id ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Metrics Table */}
      {viewTab === 'table' && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Instrument</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Return</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">CAGR</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Volatility</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Max DD</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sharpe</th>
              </tr>
            </thead>
            <tbody>
              {all.map((item, i) => {
                const isPort = item.label === 'My Portfolio';
                return (
                  <tr key={i} className={`border-t border-gray-100 dark:border-gray-700 ${isPort ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{item.emoji}</span>
                        <span className={`font-semibold ${isPort ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'}`}>{item.label}</span>
                        {isPort && <span className="text-xs bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">You</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right"><Pill val={fmtN(item.totalReturn, 1)} suffix="%" /></td>
                    <td className="px-4 py-3 text-right"><Pill val={fmtN(item.cagr, 1)} suffix="%" /></td>
                    <td className="px-4 py-3 text-right"><span className="text-gray-600 dark:text-gray-300 font-medium">{fmtN(item.vol, 1)}%</span></td>
                    <td className="px-4 py-3 text-right"><span className="text-red-500 dark:text-red-400 font-medium">-{fmtN(item.maxDD, 1)}%</span></td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${item.sharpe >= 1 ? 'text-emerald-600 dark:text-emerald-400' : item.sharpe >= 0.5 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>
                        {fmtN(item.sharpe, 2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Year by Year */}
      {viewTab === 'yearly' && yearlyComparison?.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Year</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">💼 Portfolio</th>
                {yearlyComparison[0] && Object.keys(yearlyComparison[0].benchmarks).map(bm => (
                  <th key={bm} className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{bm}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...yearlyComparison].reverse().map((row, i) => (
                <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-200">{row.year}</td>
                  <td className="px-4 py-3 text-right">
                    <Pill val={fmtN(row.portfolio, 1)} suffix="%" />
                  </td>
                  {Object.entries(row.benchmarks).map(([bm, ret]) => {
                    const alpha = row.portfolio - ret;
                    return (
                      <td key={bm} className="px-4 py-3 text-right">
                        <span className={`text-sm ${ret >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'} font-medium`}>{fmtP(ret)}</span>
                        <span className={`text-xs ml-1 ${alpha >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>({alpha >= 0 ? '+' : ''}{fmtN(alpha, 1)}α)</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Return chart */}
      {viewTab === 'chart' && (
        <div className="space-y-2">
          {all.map((item, i) => {
            const finalVal = item.timeline?.[item.timeline?.length - 1] ?? 0;
            return (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                <div className="w-40 shrink-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className={`w-3 h-3 rounded-full ${colorMap[item.color] || 'bg-gray-400'}`} />
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{item.emoji} {item.label}</p>
                  </div>
                  <p className={`text-lg font-black ${finalVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmtP(finalVal)}</p>
                </div>
                <div className="flex-1">
                  <Sparkline vals={item.timeline} color={item.color} h={40} />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">% return from start date · Monthly snapshots</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function PortfolioScalability({ data, isLoading, error }) {
  const [activeTab, setActiveTab] = useState('stress');

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Running scalability analysis…</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Stress tests · What-If · Rebalancing · 4 benchmarks</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <p className="text-red-700 dark:text-red-400 text-sm font-medium">⚠️ {error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { stress, whatIf, rebalance, benchmark, meta } = data;

  const tabs = [
    { id: 'stress',    label: '🛡️ Stress Test',       sub: `${stress?.scenarios?.filter(s=>s.available).length || 0} scenarios` },
    { id: 'whatif',    label: '🔀 What-If Simulator',  sub: `${whatIf?.scenarios?.length || 0} alternatives` },
    { id: 'rebalance', label: '⚖️ Rebalancing',         sub: `Winner: ${rebalance?.winner?.split(' ')[0] || '—'}` },
    { id: 'benchmark', label: '🏆 vs Benchmarks',       sub: `Nifty · Sensex · Gold · Midcap` },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚡</span>
          <div>
            <h3 className="font-black text-gray-900 dark:text-white">Portfolio Scalability Analysis</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {meta?.symbols?.length} stocks · {meta?.range} data · {meta?.capital ? fmtC(meta.capital) : ''} capital
            </p>
          </div>
        </div>

        {/* Quick summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetCard label="Crash Alpha" value={fmtP(stress?.summary?.crashAlpha)} color={stress?.summary?.crashAlpha >= 0 ? 'green' : 'red'} sub="vs Nifty in downturns" />
          <MetCard label="Best Rebalance" value={rebalance?.winner?.split(' ')[0] || '—'} color="blue" sub="for this portfolio" />
          <MetCard label="vs Nifty (Total)" value={fmtP((benchmark?.portfolio?.totalReturn ?? 0) - (benchmark?.benchmarks?.find(b=>b.label==='Nifty 50')?.totalReturn ?? 0))} color={(benchmark?.portfolio?.totalReturn ?? 0) >= (benchmark?.benchmarks?.find(b=>b.label==='Nifty 50')?.totalReturn ?? 0) ? 'green' : 'red'} sub="total return alpha" />
          <MetCard label="Scenarios Analysed" value={stress?.scenarios?.filter(s=>s.available).length || 0} color="purple" sub="historical periods" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 shrink-0 px-5 py-4 text-left transition-colors ${
              activeTab === tab.id
                ? 'bg-green-50 dark:bg-green-900/20 border-b-2 border-green-600 dark:border-green-400'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <p className={`text-sm font-bold ${activeTab === tab.id ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-200'}`}>{tab.label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{tab.sub}</p>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'stress'    && <StressTestTab    stress={stress}       symbols={meta?.symbols} />}
        {activeTab === 'whatif'    && <WhatIfTab         whatIf={whatIf}       symbols={meta?.symbols} />}
        {activeTab === 'rebalance' && <RebalancingTab    rebalance={rebalance} />}
        {activeTab === 'benchmark' && <BenchmarkTab      benchmark={benchmark} />}
      </div>
    </div>
  );
}
