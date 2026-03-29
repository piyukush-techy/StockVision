// DiversificationPage.jsx — Phase 4 Month 20
// Feature 1: Correlation Killer — expose hidden portfolio correlations
// Feature 2: Opportunity Cost Calculator — grade A-F vs peers & benchmarks

import { useState, useEffect } from 'react';
import { runCorrelationKiller, runOpportunityCostCalc, getPopularPortfolios } from '../api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtC  = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtP  = (n) => (Number(n) >= 0 ? '+' : '') + Number(n).toFixed(2) + '%';
const fmtN  = (n, d = 2) => Number(n).toFixed(d);

const COLORS = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300', bar: 'bg-emerald-500' },
  green:   { bg: 'bg-green-50 dark:bg-green-900/20',     border: 'border-green-200 dark:border-green-700',     text: 'text-green-700 dark:text-green-400',     badge: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',   bar: 'bg-green-500'   },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       border: 'border-blue-200 dark:border-blue-700',       text: 'text-blue-700 dark:text-blue-400',       badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',     bar: 'bg-blue-500'    },
  yellow:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20',   border: 'border-yellow-200 dark:border-yellow-700',   text: 'text-yellow-700 dark:text-yellow-400',   badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300', bar: 'bg-yellow-500' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20',   border: 'border-orange-200 dark:border-orange-700',   text: 'text-orange-700 dark:text-orange-400',   badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300', bar: 'bg-orange-500' },
  red:     { bg: 'bg-red-50 dark:bg-red-900/20',         border: 'border-red-200 dark:border-red-700',         text: 'text-red-700 dark:text-red-400',         badge: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',       bar: 'bg-red-500'     },
  gray:    { bg: 'bg-gray-50 dark:bg-gray-800',          border: 'border-gray-200 dark:border-gray-700',       text: 'text-gray-700 dark:text-gray-300',       badge: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',     bar: 'bg-gray-400'    },
};

const STOCK_COLORS = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-pink-500','bg-lime-500','bg-indigo-500','bg-orange-500','bg-teal-500','bg-fuchsia-500'];

function Card({ children, className = '' }) {
  return <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 ${className}`}>{children}</div>;
}
function SectionHead({ emoji, title, sub }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
      <span className="text-xl">{emoji}</span>
      <div><h3 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h3>{sub && <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>}</div>
    </div>
  );
}
function Spinner({ msg = 'Analysing…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative w-12 h-12"><div className="w-12 h-12 border-4 border-gray-100 dark:border-gray-700 rounded-full" /><div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{msg}</p>
    </div>
  );
}
function ErrBox({ msg }) {
  return <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">⚠️ {msg}</div>;
}
function GradeBadge({ grade, color }) {
  const sizes = { A: 'text-2xl', B: 'text-2xl', C: 'text-2xl', D: 'text-2xl', E: 'text-2xl', F: 'text-2xl' };
  const c = COLORS[color] || COLORS.gray;
  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${sizes[grade]} border-2 ${c.border} ${c.bg} ${c.text}`}>
      {grade}
    </div>
  );
}

// ─── Correlation heat cell ────────────────────────────────────────────────────
function CorrCell({ value, isSelf }) {
  if (isSelf) return <td className="px-3 py-2.5 text-center text-xs font-black text-gray-400 bg-gray-100 dark:bg-gray-700">1.00</td>;
  const abs = Math.abs(value);
  const bgText =
    abs > 0.8 ? 'bg-red-500 text-white' :
    abs > 0.6 ? 'bg-orange-400 text-white' :
    abs > 0.4 ? 'bg-yellow-300 dark:bg-yellow-600 text-gray-900 dark:text-white' :
    abs > 0.2 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200' :
                'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200';
  return (
    <td className={`px-3 py-2.5 text-center text-xs font-bold ${bgText}`}>
      {fmtN(value, 2)}
    </td>
  );
}

// ─── Correlation pair card ────────────────────────────────────────────────────
function PairCard({ pair }) {
  const c = COLORS[pair.riskColor] || COLORS.gray;
  return (
    <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-black text-gray-900 dark:text-white text-sm">{pair.symbolA}</span>
          <span className="text-gray-400 dark:text-gray-600 text-xs">↔</span>
          <span className="font-black text-gray-900 dark:text-white text-sm">{pair.symbolB}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.badge}`}>{pair.risk}</span>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-2.5 rounded-full ${c.bar}`} style={{ width: `${Math.abs(pair.correlation) * 100}%` }} />
        </div>
        <span className={`text-base font-black ${c.text} w-12 text-right`}>{fmtN(pair.correlation, 2)}</span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">{pair.insight}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 1: Correlation Killer
// ══════════════════════════════════════════════════════════════════════════════
function CorrelationKiller({ popularPortfolios }) {
  const [symbols,  setSymbols]  = useState(['RELIANCE.NS','TCS.NS','HDFCBANK.NS','INFY.NS','ICICIBANK.NS']);
  const [range,    setRange]    = useState('2y');
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState(null);
  const [activeView, setActiveView] = useState('overview'); // overview | matrix | pairs | suggestions

  const setSymbol = (i, v) => { const n = [...symbols]; n[i] = v.toUpperCase(); setSymbols(n); };
  const addSymbol = () => { if (symbols.length < 12) setSymbols([...symbols, '']); };
  const removeSymbol = (i) => setSymbols(symbols.filter((_, idx) => idx !== i));

  async function run() {
    const clean = symbols.map(s => s.trim()).filter(Boolean);
    if (clean.length < 2) { setErr('Add at least 2 stocks'); return; }
    setLoading(true); setErr(null); setResult(null);
    try {
      const r = await runCorrelationKiller({ symbols: clean, range });
      setResult(r.data.data);
    } catch (e) {
      setErr(e.response?.data?.detail || e.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  const inp = "w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <Card>
        <SectionHead emoji="🔬" title="Correlation Killer" sub="Expose hidden correlations — see how many of your stocks are actually the same bet" />
        <div className="p-5 space-y-5">

          {/* Quick portfolios */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Quick Portfolios</p>
            <div className="flex flex-wrap gap-2">
              {popularPortfolios.map(p => (
                <button key={p.label} onClick={() => setSymbols(p.symbols)}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-600 hover:border-blue-300 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 transition-all"
                  title={p.desc}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stock inputs */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Stocks ({symbols.length}/12)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {symbols.map((s, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STOCK_COLORS[i % STOCK_COLORS.length]}`} />
                  <input type="text" value={s} onChange={e => setSymbol(i, e.target.value)} placeholder={`STOCK${i+1}.NS`}
                    className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {symbols.length > 2 && <button onClick={() => removeSymbol(i)} className="text-gray-400 hover:text-red-500 text-xs flex-shrink-0">✕</button>}
                </div>
              ))}
            </div>
            {symbols.length < 12 && (
              <button onClick={addSymbol} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">+ Add stock</button>
            )}
          </div>

          <div className="flex gap-3">
            <select className={inp} value={range} onChange={e => setRange(e.target.value)}>
              <option value="1y">1 Year</option>
              <option value="2y">2 Years</option>
              <option value="3y">3 Years</option>
            </select>
            <button onClick={run} disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-60 text-white font-black rounded-xl text-sm transition-all shadow-lg whitespace-nowrap">
              {loading ? '⏳ Analysing…' : '🔬 Kill the Correlation'}
            </button>
          </div>

          {err && <ErrBox msg={err} />}
        </div>
      </Card>

      {loading && <Spinner msg="Fetching returns data + computing correlation matrix…" />}

      {result && !loading && (
        <div className="space-y-5">

          {/* Diversification score hero */}
          {(() => {
            const d = result.diversification;
            const c = COLORS[d.color] || COLORS.gray;
            return (
              <div className={`rounded-2xl border-2 p-5 ${c.bg} ${c.border}`}>
                <div className="flex items-center gap-5 flex-wrap">
                  {/* Score circle */}
                  <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center flex-shrink-0 ${c.border} ${c.bg}`}>
                    <span className={`text-3xl font-black ${c.text}`}>{d.score}</span>
                    <span className="text-xs text-gray-500">/100</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Diversification Score</p>
                    <p className={`text-2xl font-black ${c.text} mb-1`}>{d.label}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Effective stocks: <strong className="text-gray-900 dark:text-white">{d.effectiveN}</strong> out of {d.actualN} —
                      {d.effectiveN < d.actualN * 0.6 ? ` ${d.actualN - Math.round(d.effectiveN)} of your positions add little diversification` : ' good spread across holdings'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Avg correlation: {fmtN(d.avgCorr * 100, 0)}%</p>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full mt-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-3 rounded-full ${c.bar} transition-all`} style={{ width: `${d.score}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0 — Fully Correlated</span><span>100 — Perfectly Diversified</span></div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Key stat pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Stocks',      value: result.meta.stockCount,                             color: 'gray'    },
              { label: 'Effective Stocks',  value: result.diversification.effectiveN,                  color: result.diversification.effectiveN >= result.meta.stockCount * 0.7 ? 'green' : 'orange' },
              { label: 'Redundant Pairs',   value: result.redundantPairs.length,                       color: result.redundantPairs.length === 0 ? 'emerald' : result.redundantPairs.length > 3 ? 'red' : 'yellow' },
              { label: 'Avg Correlation',   value: fmtN(result.diversification.avgCorr * 100, 0) + '%', color: result.diversification.avgCorr > 0.6 ? 'red' : result.diversification.avgCorr > 0.4 ? 'yellow' : 'green' },
            ].map(({ label, value, color }) => {
              const c = COLORS[color] || COLORS.gray;
              return (
                <div key={label} className={`rounded-xl border p-3 ${c.bg} ${c.border}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                  <p className={`text-xl font-black ${c.text}`}>{value}</p>
                </div>
              );
            })}
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 overflow-x-auto">
            {[
              { id: 'overview',     label: '📊 Overview'     },
              { id: 'matrix',       label: '🔗 Matrix'       },
              { id: 'pairs',        label: '⚠️ Pairs'        },
              { id: 'suggestions',  label: '💡 Fix It'       },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveView(t.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeView === t.id ? 'bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Overview tab ─────────────────────────────────────────────── */}
          {activeView === 'overview' && (
            <div className="space-y-4">
              {/* Per-stock table */}
              <Card>
                <SectionHead emoji="📈" title="Individual Stock Performance" sub={`${result.meta.range} historical metrics`} />
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        {['Stock','CAGR','Sharpe','Max DD','Vol','Corr Nifty','Beta'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.stocks.map((s, i) => (
                        <tr key={s.symbol} className="border-t border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${STOCK_COLORS[i % STOCK_COLORS.length]}`} />
                              <span className="font-bold text-gray-900 dark:text-white">{s.short}</span>
                            </div>
                          </td>
                          <td className={`px-3 py-2.5 font-bold ${s.cagr >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmtP(s.cagr)}</td>
                          <td className={`px-3 py-2.5 font-bold ${s.sharpe > 1 ? 'text-emerald-600 dark:text-emerald-400' : s.sharpe > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{fmtN(s.sharpe)}</td>
                          <td className="px-3 py-2.5 text-orange-600 dark:text-orange-400">-{fmtN(s.maxDrawdown)}%</td>
                          <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{fmtN(s.annualVol)}%</td>
                          <td className={`px-3 py-2.5 font-bold ${s.corrNifty > 0.7 ? 'text-red-600 dark:text-red-400' : s.corrNifty > 0.5 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>{fmtN(s.corrNifty, 2)}</td>
                          <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{fmtN(s.betaVsNifty, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Sector concentration */}
              {result.sectorConcentration.length > 0 && (
                <Card>
                  <SectionHead emoji="🏭" title="Sector Concentration" sub="How much of your portfolio is in each sector?" />
                  <div className="p-5 space-y-3">
                    {result.sectorConcentration.map(s => (
                      <div key={s.sector} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-36 truncate">{s.sector}</span>
                        <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-2.5 rounded-full ${s.pct > 50 ? 'bg-red-500' : s.pct > 30 ? 'bg-orange-500' : 'bg-blue-500'}`}
                            style={{ width: `${s.pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-16 text-right">{s.count} stock{s.count > 1 ? 's' : ''} ({s.pct}%)</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── Matrix tab ───────────────────────────────────────────────── */}
          {activeView === 'matrix' && (
            <Card>
              <SectionHead emoji="🔗" title="Full Correlation Matrix" sub="Values close to 1.0 = stocks move together = no diversification benefit" />
              <div className="p-5">
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-gray-400" />
                        {result.stocks.map(s => (
                          <th key={s.symbol} className="px-3 py-2 font-bold text-gray-600 dark:text-gray-400 text-center">{s.short}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.matrix.map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2.5 font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">{result.stocks[i].short}</td>
                          {row.map((val, j) => <CorrCell key={j} value={val} isSelf={i === j} />)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-4 text-xs">
                  {[
                    { label: '> 0.8 Critical', bg: 'bg-red-500' },
                    { label: '0.6–0.8 High',   bg: 'bg-orange-400' },
                    { label: '0.4–0.6 Moderate', bg: 'bg-yellow-300' },
                    { label: '< 0.4 Low',      bg: 'bg-blue-200' },
                    { label: 'Negative (best)',  bg: 'bg-emerald-200' },
                  ].map(({ label, bg }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded ${bg}`} />
                      <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ── Pairs tab ────────────────────────────────────────────────── */}
          {activeView === 'pairs' && (
            <div className="space-y-4">
              {result.redundantPairs.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
                  <p className="text-sm font-bold text-red-800 dark:text-red-300 mb-1">
                    ⚠️ {result.redundantPairs.length} redundant pair{result.redundantPairs.length > 1 ? 's' : ''} detected
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400">
                    These pairs have correlation &gt; 0.7 — you are essentially doubling your exposure to the same risk without meaningful diversification benefit.
                  </p>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                {result.pairs.map((pair, i) => <PairCard key={i} pair={pair} />)}
              </div>
            </div>
          )}

          {/* ── Suggestions tab ─────────────────────────────────────────── */}
          {activeView === 'suggestions' && (
            <div className="space-y-4">
              {result.suggestions.length === 0 ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-6 text-center">
                  <p className="text-4xl mb-3">🎉</p>
                  <p className="font-bold text-emerald-800 dark:text-emerald-300">Your portfolio is already well diversified!</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">No critical redundancies found. Keep it up!</p>
                </div>
              ) : (
                result.suggestions.map((s, i) => (
                  <Card key={i}>
                    <div className="p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black text-white ${s.action === 'Replace' ? 'bg-orange-500' : 'bg-blue-600'}`}>
                          {s.action}
                        </span>
                        <div>
                          {s.from && <p className="text-sm font-bold text-gray-900 dark:text-white">Consider replacing <span className="text-red-600 dark:text-red-400">{s.from}</span></p>}
                          {!s.from && <p className="text-sm font-bold text-gray-900 dark:text-white">Add to portfolio</p>}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.reason}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Suggested alternatives</p>
                        <div className="flex flex-wrap gap-2">
                          {s.alternatives.map(alt => (
                            <span key={alt.symbol} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold">
                              {alt.name} <span className="text-blue-400 dark:text-blue-600 font-mono">{alt.symbol.replace('.NS','')}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
              <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
                ⚠️ Suggestions are based on historical correlation data only. Not financial advice.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 2: Opportunity Cost Calculator (Enhanced)
// ══════════════════════════════════════════════════════════════════════════════
function OpportunityCostCalc() {
  const [symbol,  setSymbol]  = useState('WIPRO');
  const [range,   setRange]   = useState('2y');
  const [capital, setCapital] = useState(100000);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);

  async function run() {
    setLoading(true); setErr(null); setResult(null);
    try {
      const r = await runOpportunityCostCalc({ symbol: symbol.trim(), range, capital: +capital });
      setResult(r.data.data);
    } catch (e) {
      setErr(e.response?.data?.detail || e.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  const inp = "w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <Card>
        <SectionHead emoji="💸" title="Opportunity Cost Calculator" sub="Grade A–F: Was this stock worth holding vs peers and Nifty 50?" />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">NSE Stock Symbol</label>
              <input type="text" className={inp} value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="WIPRO" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Analysis Period</label>
              <select className={inp} value={range} onChange={e => setRange(e.target.value)}>
                <option value="1y">1 Year</option>
                <option value="2y">2 Years</option>
                <option value="3y">3 Years</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Investment Amount (₹)</label>
              <input type="number" className={inp} value={capital} onChange={e => setCapital(e.target.value)} step={10000} />
            </div>
          </div>

          {err && <ErrBox msg={err} />}

          <button onClick={run} disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 text-white font-black text-base rounded-xl transition-all shadow-lg hover:shadow-orange-500/25">
            {loading ? '⏳ Comparing vs peers…' : '💸 Calculate Opportunity Cost'}
          </button>
        </div>
      </Card>

      {loading && <Spinner msg="Fetching peer universe + benchmarks…" />}

      {result && !loading && (() => {
        const { main, peers, benchmarks, summary, betterPeerCount, totalPeerCount } = result;
        const mc = COLORS[main.grade.color] || COLORS.gray;

        return (
          <div className="space-y-5">

            {/* Main stock hero */}
            <div className={`rounded-2xl border-2 p-5 ${mc.bg} ${mc.border}`}>
              <div className="flex items-center gap-4 flex-wrap">
                <GradeBadge grade={main.grade.grade} color={main.grade.color} />
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {main.short} · {result.meta.sector} · {result.meta.range}
                  </p>
                  <p className={`text-xl font-black ${mc.text}`}>{main.grade.label}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {betterPeerCount} of {totalPeerCount} sector peers outperformed
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-black ${main.totalReturn >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {fmtP(main.totalReturn)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total return</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{fmtC(main.portfolioValue)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{fmtC(capital)} → today</p>
                </div>
              </div>
            </div>

            {/* Summary bullets */}
            <Card>
              <SectionHead emoji="💡" title="Key Insights" sub="Opportunity cost analysis" />
              <div className="p-5 space-y-3">
                {summary.map((line, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                    {line}
                  </div>
                ))}
              </div>
            </Card>

            {/* Peer comparison table */}
            {peers.length > 0 && (
              <Card>
                <SectionHead emoji="👥" title="vs Sector Peers" sub={`${result.meta.sector} — ranked by total return`} />
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        {['Stock','Grade','Total Return','CAGR','Sharpe','Max DD','Portfolio Value','vs Your Stock'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Main stock as first row */}
                      <tr className="border-t border-gray-50 dark:border-gray-700/30 bg-blue-50/50 dark:bg-blue-900/10">
                        <td className="px-3 py-2.5 font-black text-blue-700 dark:text-blue-400">● {main.short}</td>
                        <td className="px-3 py-2.5"><GradeBadge grade={main.grade.grade} color={main.grade.color} /></td>
                        <td className={`px-3 py-2.5 font-bold ${main.totalReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmtP(main.totalReturn)}</td>
                        <td className={`px-3 py-2.5 font-bold ${main.cagr >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmtP(main.cagr)}</td>
                        <td className={`px-3 py-2.5 ${main.sharpe > 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}>{fmtN(main.sharpe)}</td>
                        <td className="px-3 py-2.5 text-orange-600 dark:text-orange-400">-{fmtN(main.maxDrawdown)}%</td>
                        <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white">{fmtC(main.portfolioValue)}</td>
                        <td className="px-3 py-2.5 text-gray-400 dark:text-gray-600 text-xs">Baseline</td>
                      </tr>
                      {peers.map((p, i) => {
                        const pg = p.grade;
                        const pc = COLORS[pg.color] || COLORS.gray;
                        return (
                          <tr key={p.symbol} className={`border-t border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20 ${p.betterThan ? '' : 'opacity-70'}`}>
                            <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white">{p.short}</td>
                            <td className="px-3 py-2.5"><GradeBadge grade={pg.grade} color={pg.color} /></td>
                            <td className={`px-3 py-2.5 font-bold ${p.totalReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmtP(p.totalReturn)}</td>
                            <td className={`px-3 py-2.5 font-bold ${p.cagr >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmtP(p.cagr)}</td>
                            <td className={`px-3 py-2.5 ${p.sharpe > 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}>{fmtN(p.sharpe)}</td>
                            <td className="px-3 py-2.5 text-orange-600 dark:text-orange-400">-{fmtN(p.maxDrawdown)}%</td>
                            <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white">{fmtC(p.portfolioValue)}</td>
                            <td className={`px-3 py-2.5 font-bold ${p.gainVsMain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {p.gainVsMain >= 0 ? '+' : ''}{fmtC(Math.abs(p.gainVsMain))}
                              <span className="block text-xs opacity-70">{p.alpha >= 0 ? '+' : ''}{fmtN(p.alpha)}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Benchmark comparison */}
            {benchmarks.length > 0 && (
              <Card>
                <SectionHead emoji="📊" title="vs Benchmarks" sub="Would a simple index fund have done better?" />
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        {['Benchmark','Total Return','CAGR','Sharpe','Max DD','₹ Value','Alpha vs Stock'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarks.map(b => (
                        <tr key={b.symbol} className="border-t border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                          <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white">{b.label}</td>
                          <td className={`px-3 py-2.5 font-bold ${b.totalReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmtP(b.totalReturn)}</td>
                          <td className={`px-3 py-2.5 font-bold ${b.cagr >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmtP(b.cagr)}</td>
                          <td className={`px-3 py-2.5 ${b.sharpe > 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}>{fmtN(b.sharpe)}</td>
                          <td className="px-3 py-2.5 text-orange-600 dark:text-orange-400">-{fmtN(b.maxDrawdown)}%</td>
                          <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white">{fmtC(b.portfolioValue)}</td>
                          <td className={`px-3 py-2.5 font-bold ${b.stockBeats ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {b.stockBeats ? `✅ +${fmtN(b.alpha)}%` : `❌ ${fmtN(b.alpha)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="px-5 py-3 text-xs text-gray-400 dark:text-gray-600">
                  Alpha &gt; 0 means your stock beat the index — you earned genuine alpha by picking this stock.
                </p>
              </Card>
            )}

          </div>
        );
      })()}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DiversificationPage() {
  const [activeTab,        setActiveTab]        = useState('correlation');
  const [popularPortfolios, setPopularPortfolios] = useState([]);

  useEffect(() => {
    getPopularPortfolios()
      .then(r => setPopularPortfolios(r.data.data || []))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-bold mb-3">
          📊 Phase 4 · Month 20 — Diversification Tools
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">📊 Diversification Tools</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Expose hidden correlations in your portfolio · Grade any stock A–F vs its peers
        </p>
      </div>

      {/* Tool selector */}
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          {
            id: 'correlation',
            emoji: '🔬',
            title: 'Correlation Killer',
            desc: '5 IT stocks ≠ 5 positions. Find out how many "real" stocks you actually own.',
            color: 'blue',
          },
          {
            id: 'opportunity',
            emoji: '💸',
            title: 'Opportunity Cost',
            desc: 'Grade A–F: Was this stock worth holding vs sector peers and Nifty 50?',
            color: 'orange',
          },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              activeTab === tab.id
                ? tab.color === 'blue'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                  : 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{tab.emoji}</span>
              <p className={`font-black text-sm ${
                activeTab === tab.id
                  ? tab.color === 'blue' ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'
                  : 'text-gray-900 dark:text-white'
              }`}>{tab.title}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{tab.desc}</p>
          </button>
        ))}
      </div>

      {activeTab === 'correlation' && <CorrelationKiller popularPortfolios={popularPortfolios} />}
      {activeTab === 'opportunity' && <OpportunityCostCalc />}

      <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
        ⚠️ Historical data from Yahoo Finance · Not SEBI registered · Not financial advice
      </p>
    </div>
  );
}
