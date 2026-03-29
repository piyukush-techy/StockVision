// PredictionsPage.jsx — Phase 4 Month 21
// Feature 1: Regime Transition Predictor — forward-looking forecasts
// Feature 2: Delusion Leaderboard        — crowd predictions + sector delusion index

import { useState, useEffect, useCallback } from 'react';
import {
  runRegimePrediction, getRegimePresets,
  submitDelusion, getDelusionLeaderboard, getMyPredictions, getPredictionSectors,
} from '../api';
import useSessionId from '../hooks/useSessionId';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtP  = (n) => (Number(n) >= 0 ? '+' : '') + Number(n).toFixed(1) + '%';
const fmtN  = (n, d = 1) => Number(n).toFixed(d);
const fmtC  = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const COLORS = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300', bar: 'bg-emerald-500' },
  green:   { bg: 'bg-green-50 dark:bg-green-900/20',     border: 'border-green-200 dark:border-green-700',     text: 'text-green-700 dark:text-green-400',     badge: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',   bar: 'bg-green-500'   },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       border: 'border-blue-200 dark:border-blue-700',       text: 'text-blue-700 dark:text-blue-400',       badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',     bar: 'bg-blue-500'    },
  yellow:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20',   border: 'border-yellow-200 dark:border-yellow-700',   text: 'text-yellow-700 dark:text-yellow-400',   badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300', bar: 'bg-yellow-500' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20',   border: 'border-orange-200 dark:border-orange-700',   text: 'text-orange-700 dark:text-orange-400',   badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300', bar: 'bg-orange-500' },
  red:     { bg: 'bg-red-50 dark:bg-red-900/20',         border: 'border-red-200 dark:border-red-700',         text: 'text-red-700 dark:text-red-400',         badge: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',       bar: 'bg-red-500'     },
  gray:    { bg: 'bg-gray-50 dark:bg-gray-800',          border: 'border-gray-200 dark:border-gray-700',       text: 'text-gray-600 dark:text-gray-300',       badge: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',     bar: 'bg-gray-400'    },
};

const REGIME_COLORS = {
  STRONG_BULL: 'emerald',
  BULL:        'green',
  SIDEWAYS:    'blue',
  BEAR:        'orange',
  STRONG_BEAR: 'red',
  VOLATILE:    'yellow',
  UNKNOWN:     'gray',
};

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
function Spinner({ msg = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-12 h-12"><div className="w-12 h-12 border-4 border-gray-100 dark:border-gray-700 rounded-full" /><div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{msg}</p>
    </div>
  );
}
function ErrBox({ msg }) {
  return <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">⚠️ {msg}</div>;
}
function RegimeBadge({ regime, size = 'sm' }) {
  const color = REGIME_COLORS[regime] || 'gray';
  const c = COLORS[color];
  const LABELS = { STRONG_BULL: '🚀 Strong Bull', BULL: '📈 Bull', SIDEWAYS: '↔️ Sideways', BEAR: '📉 Bear', STRONG_BEAR: '💀 Strong Bear', VOLATILE: '⚡ Volatile', UNKNOWN: '❓ Unknown' };
  return (
    <span className={`px-2.5 py-1 rounded-full font-bold ${size === 'lg' ? 'text-sm' : 'text-xs'} ${c.badge}`}>
      {LABELS[regime] || regime}
    </span>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 1: Regime Transition Predictor
// ══════════════════════════════════════════════════════════════════════════════
function RegimePredictor({ presets }) {
  const [symbol,  setSymbol]  = useState('^NSEI');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);

  async function run(sym) {
    const s = sym || symbol;
    setLoading(true); setErr(null); setResult(null);
    try {
      const r = await runRegimePrediction({ symbol: s });
      setResult(r.data.data);
    } catch (e) {
      setErr(e.response?.data?.detail || e.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  // Auto-run Nifty on mount
  useEffect(() => { run('^NSEI'); }, []);

  const inp = "flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <Card>
        <SectionHead emoji="🔭" title="Regime Transition Predictor" sub="Based on current market indicators, what historically comes next?" />
        <div className="p-5 space-y-4">

          {/* Quick presets */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Quick Analyse</p>
            <div className="flex flex-wrap gap-2">
              {presets.map(p => (
                <button key={p.symbol} onClick={() => { setSymbol(p.symbol); run(p.symbol); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    symbol === p.symbol
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300'
                  }`} title={p.desc}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom symbol */}
          <div className="flex gap-2">
            <input type="text" className={inp} value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="^NSEI, RELIANCE.NS…" onKeyDown={e => e.key === 'Enter' && run()} />
            <button onClick={() => run()} disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all whitespace-nowrap">
              {loading ? '⏳' : '🔭 Predict'}
            </button>
          </div>

          {err && <ErrBox msg={err} />}
        </div>
      </Card>

      {loading && <Spinner msg="Analysing 5 years of regime history…" />}

      {result && !loading && (() => {
        const cur  = result.current;
        const clr  = COLORS[cur.color] || COLORS.gray;
        const conf = COLORS[cur.confColor] || COLORS.blue;

        return (
          <div className="space-y-5">

            {/* Current regime hero */}
            <div className={`rounded-2xl border-2 p-5 ${clr.bg} ${clr.border}`}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="text-5xl">{cur.emoji}</div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Current Regime · {cur.date}</p>
                  <p className={`text-3xl font-black ${clr.text} mb-1`}>{cur.label}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{cur.desc}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${conf.badge}`}>
                      {cur.confidence} Confidence
                    </span>
                    {cur.isUnstable && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300">
                        ⚠️ {cur.regimeChanges} regime changes in 90 days — unstable
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      Strength: {cur.strength}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Indicators bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Price vs MA50',  value: fmtP(cur.indicators.pVsM50),  color: cur.indicators.pVsM50 >= 0 ? 'green' : 'red' },
                { label: 'Price vs MA200', value: fmtP(cur.indicators.pVsM200), color: cur.indicators.pVsM200 >= 0 ? 'green' : 'red' },
                { label: 'RSI (14)',       value: fmtN(cur.indicators.rsi, 1),   color: cur.indicators.rsi > 70 ? 'red' : cur.indicators.rsi < 30 ? 'emerald' : 'blue' },
                { label: 'Annual Vol',     value: fmtN(cur.indicators.vol, 1) + '%', color: cur.indicators.vol > 25 ? 'orange' : 'gray' },
              ].map(({ label, value, color }) => {
                const c = COLORS[color] || COLORS.gray;
                return (
                  <div key={label} className={`rounded-xl border p-3 ${c.bg} ${c.border}`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className={`text-lg font-black ${c.text}`}>{value}</p>
                  </div>
                );
              })}
            </div>

            {/* MACD signal */}
            <div className={`rounded-xl border p-3 flex items-center gap-3 ${cur.indicators.macdBull ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'}`}>
              <span className="text-xl">{cur.indicators.macdBull ? '✅' : '❌'}</span>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                MACD is <strong>{cur.indicators.macdBull ? 'bullish' : 'bearish'}</strong> — signal line {cur.indicators.macdBull ? 'below' : 'above'} MACD line
              </p>
            </div>

            {/* Transition forecast */}
            <Card>
              <SectionHead emoji="🎯" title="What Historically Happens Next"
                sub={`Based on past ${cur.label} regimes in Indian markets`} />
              <div className="p-5 space-y-4">

                {/* Most likely outcome */}
                {result.topPrediction && (() => {
                  const tp  = result.topPrediction;
                  const tc  = COLORS[REGIME_COLORS[tp.outcome]] || COLORS.gray;
                  return (
                    <div className={`rounded-2xl border-2 p-4 ${tc.bg} ${tc.border}`}>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">🎯 Most Likely Next Regime</p>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{tp.outcomeMeta?.emoji}</span>
                        <div>
                          <p className={`text-xl font-black ${tc.text}`}>{tp.outcomeMeta?.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{tp.probability}% probability · within ~{tp.days} days</p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className={`text-2xl font-black ${tp.niftyReturn >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                            {fmtP(tp.niftyReturn)}
                          </p>
                          <p className="text-xs text-gray-400">expected Nifty move</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic">Historical precedent: "{tp.trigger}"</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Reference period: {tp.period}</p>
                    </div>
                  );
                })()}

                {/* All scenarios */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">All Possible Transitions</p>
                  {result.transitions.map((t, i) => {
                    const tc = COLORS[REGIME_COLORS[t.outcome]] || COLORS.gray;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-28 flex-shrink-0">
                          <RegimeBadge regime={t.outcome} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className={`h-2.5 rounded-full ${tc.bar}`} style={{ width: `${t.probability}%` }} />
                            </div>
                            <span className={`text-sm font-black w-10 text-right ${tc.text}`}>{t.probability}%</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t.trigger} · ~{t.days}d · {fmtP(t.niftyReturn)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Recent regime history timeline */}
            <Card>
              <SectionHead emoji="🕒" title="Regime History (Last 90 Days)" sub="How stable has the current regime been?" />
              <div className="p-5">
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {result.recentHistory.map((h, i) => {
                    const c = COLORS[REGIME_COLORS[h.regime]] || COLORS.gray;
                    const SHORTS = { STRONG_BULL: 'S🐂', BULL: '🐂', SIDEWAYS: '↔', BEAR: '🐻', STRONG_BEAR: 'S🐻', VOLATILE: '⚡', UNKNOWN: '?' };
                    return (
                      <div key={i} className="flex flex-col items-center flex-1 min-w-0" title={`${h.date}: ${h.regime}`}>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${c.badge} truncate w-full text-center`} style={{ fontSize: '9px' }}>
                          {SHORTS[h.regime] || h.regime.slice(0, 3)}
                        </span>
                        <span className="text-gray-400 dark:text-gray-600 mt-1" style={{ fontSize: '8px' }}>{h.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Disclaimer */}
            <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
              ⚠️ Regime predictions are based on historical patterns only. Markets can behave differently. Not financial advice.
            </p>
          </div>
        );
      })()}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 2: Delusion Leaderboard
// ══════════════════════════════════════════════════════════════════════════════
function DelusionLeaderboard() {
  const sessionId = useSessionId();
  const [sectors,    setSectors]    = useState([]);
  const [board,      setBoard]      = useState(null);
  const [myPreds,    setMyPreds]    = useState([]);
  const [loadBoard,  setLoadBoard]  = useState(false);
  const [loadMine,   setLoadMine]   = useState(false);
  const [errBoard,   setErrBoard]   = useState(null);
  const [activeTab,  setActiveTab]  = useState('board');  // board | mine | submit

  // Submit form state
  const [symbol,      setSymbol]      = useState('RELIANCE');
  const [sector,      setSector]      = useState('Energy');
  const [predicted,   setPredicted]   = useState('');
  const [holdDays,    setHoldDays]    = useState(30);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitDone,  setSubmitDone]  = useState(null);
  const [errSubmit,   setErrSubmit]   = useState(null);

  useEffect(() => {
    getPredictionSectors().then(r => setSectors(r.data.data || [])).catch(() => {});
    loadLeaderboard();
  }, []);

  useEffect(() => {
    if (sessionId && activeTab === 'mine') loadMyPreds();
  }, [sessionId, activeTab]);

  async function loadLeaderboard() {
    setLoadBoard(true); setErrBoard(null);
    try {
      const r = await getDelusionLeaderboard();
      setBoard(r.data.data);
    } catch (e) {
      setErrBoard(e.response?.data?.error || e.message);
    }
    setLoadBoard(false);
  }

  async function loadMyPreds() {
    if (!sessionId) return;
    setLoadMine(true);
    try {
      const r = await getMyPredictions(sessionId);
      setMyPreds(r.data.data || []);
    } catch { /* silent */ }
    setLoadMine(false);
  }

  async function handleSubmit() {
    if (!predicted || !symbol) { setErrSubmit('Fill in all fields'); return; }
    if (!sessionId) { setErrSubmit('Session not ready — try again in a moment'); return; }
    setSubmitting(true); setErrSubmit(null); setSubmitDone(null);
    try {
      const r = await submitDelusion({ symbol, sector, predictedReturn: +predicted, holdDays: +holdDays, sessionId });
      setSubmitDone(r.data.data);
      setPredicted(''); setSymbol('RELIANCE');
    } catch (e) {
      setErrSubmit(e.response?.data?.detail || e.response?.data?.error || e.message);
    }
    setSubmitting(false);
  }

  const inp = "w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <SectionHead emoji="🎪" title="Delusion Leaderboard" sub="Anonymous crowd predictions vs actual outcomes — which sector is most deluded?" />
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Predict a stock's return, come back after your hold period, and see how close you were.
            The leaderboard ranks sectors by their <strong className="text-gray-900 dark:text-white">Delusion Index</strong> — average gap between what people predicted and what actually happened.
          </p>
        </div>
      </Card>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
        {[
          { id: 'board',  label: '🏆 Leaderboard' },
          { id: 'mine',   label: '📋 My Predictions' },
          { id: 'submit', label: '🎯 Make Prediction' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === t.id ? 'bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Leaderboard tab ─────────────────────────────────────────────── */}
      {activeTab === 'board' && (
        <div className="space-y-5">
          {loadBoard && <Spinner msg="Loading predictions data…" />}
          {errBoard  && <ErrBox msg={errBoard} />}

          {board && !loadBoard && (() => {
            const gs = board.globalStats;
            return (
              <div className="space-y-5">

                {/* Global stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Predictions', value: gs.totalResolved + gs.totalPending, color: 'blue' },
                    { label: 'Resolved',           value: gs.totalResolved,                  color: 'green' },
                    { label: 'Avg Delusion',       value: fmtP(gs.avgGlobalDelusion),         color: gs.avgGlobalDelusion > 10 ? 'red' : 'emerald' },
                    { label: 'Direction Accuracy', value: gs.dirAccuracyPct + '%',            color: gs.dirAccuracyPct > 60 ? 'green' : 'orange' },
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

                {/* No data yet */}
                {board.sectorRankings.length === 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-8 text-center">
                    <p className="text-4xl mb-3">🌱</p>
                    <p className="font-bold text-blue-800 dark:text-blue-300 text-lg">Be the first to make a prediction!</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                      The leaderboard will populate as predictions mature. Switch to "Make Prediction" to get started.
                    </p>
                    <button onClick={() => setActiveTab('submit')}
                      className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all">
                      Make First Prediction →
                    </button>
                  </div>
                )}

                {/* Sector rankings */}
                {board.sectorRankings.length > 0 && (
                  <Card>
                    <SectionHead emoji="🏆" title="Sector Delusion Index" sub="Higher = crowd overestimates this sector the most" />
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-700/50">
                            {['Rank','Sector','Delusion Index','Avg Predicted','Avg Actual','Accuracy','Level'].map(h => (
                              <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {board.sectorRankings.map((s, i) => {
                            const c = COLORS[s.delusionColor] || COLORS.gray;
                            return (
                              <tr key={s.sector} className="border-t border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                <td className="px-3 py-2.5 font-black text-gray-400 dark:text-gray-600">
                                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                                </td>
                                <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white">{s.sector}</td>
                                <td className={`px-3 py-2.5 font-black text-base ${c.text}`}>+{fmtN(s.avgDelusion)}%</td>
                                <td className="px-3 py-2.5 text-blue-600 dark:text-blue-400 font-bold">{fmtP(s.avgPredicted)}</td>
                                <td className={`px-3 py-2.5 font-bold ${s.avgActual >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmtP(s.avgActual)}</td>
                                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{s.accuracyPct}% correct dir.</td>
                                <td className="px-3 py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full font-bold ${c.badge}`}>{s.delusionLevel}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {/* Top individual delusions */}
                {board.topDelusions.length > 0 && (
                  <Card>
                    <SectionHead emoji="🤡" title="Hall of Delusion" sub="Most overconfident predictions (anonymous)" />
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-700/50">
                            {['User','Stock','Sector','Predicted','Actual','Delusion Gap','Hold'].map(h => (
                              <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {board.topDelusions.map((d, i) => (
                            <tr key={i} className="border-t border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                              <td className="px-3 py-2.5 font-mono text-gray-500 dark:text-gray-400 text-xs">{d.sessionId}</td>
                              <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white">{d.symbol.replace('.NS','')}</td>
                              <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{d.sector}</td>
                              <td className="px-3 py-2.5 font-bold text-blue-600 dark:text-blue-400">{fmtP(d.predictedReturn)}</td>
                              <td className={`px-3 py-2.5 font-bold ${d.actualReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmtP(d.actualReturn)}</td>
                              <td className={`px-3 py-2.5 font-black ${d.delusion > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {d.delusion > 0 ? '+' : ''}{fmtN(d.delusion)}%
                              </td>
                              <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{d.holdDays}d</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── My Predictions tab ──────────────────────────────────────────── */}
      {activeTab === 'mine' && (
        <div className="space-y-4">
          {loadMine && <Spinner msg="Loading your predictions…" />}
          {!loadMine && myPreds.length === 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-bold text-gray-700 dark:text-gray-300">No predictions yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Switch to "Make Prediction" to start tracking your calls.</p>
              <button onClick={() => setActiveTab('submit')}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all">
                Make a Prediction →
              </button>
            </div>
          )}
          {myPreds.length > 0 && (
            <Card>
              <SectionHead emoji="📋" title="My Prediction History" sub="Your anonymous calls — resolved ones show actual outcome" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      {['Stock','Sector','Entry Price','Predicted','Actual','Delusion','Hold','Status'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myPreds.map((p, i) => (
                      <tr key={i} className="border-t border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                        <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white">{p.symbol.replace('.NS','')}</td>
                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{p.sector}</td>
                        <td className="px-3 py-2.5 font-mono text-gray-600 dark:text-gray-400">{fmtC(p.entryPrice)}</td>
                        <td className="px-3 py-2.5 font-bold text-blue-600 dark:text-blue-400">{fmtP(p.predictedReturn)}</td>
                        <td className={`px-3 py-2.5 font-bold ${p.resolved ? (p.actualReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : 'text-gray-400 dark:text-gray-600'}`}>
                          {p.resolved ? fmtP(p.actualReturn) : '—'}
                        </td>
                        <td className={`px-3 py-2.5 font-black ${p.resolved ? (p.delusion > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400') : 'text-gray-400 dark:text-gray-600'}`}>
                          {p.resolved ? (p.delusion > 0 ? '+' : '') + fmtN(p.delusion) + '%' : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{p.holdDays}d</td>
                        <td className="px-3 py-2.5">
                          {p.resolved
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Resolved ✅</span>
                            : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">Pending ⏳</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Submit tab ───────────────────────────────────────────────────── */}
      {activeTab === 'submit' && (
        <Card>
          <SectionHead emoji="🎯" title="Make a Prediction" sub="Anonymous — your session ID is used, no login required" />
          <div className="p-5 space-y-4">

            {submitDone && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
                <p className="font-bold text-emerald-800 dark:text-emerald-300">✅ Prediction submitted!</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                  Entry price locked at <strong>{fmtC(submitDone.entryPrice)}</strong> on {submitDone.entryDate}.
                  Come back after your hold period to see how you did!
                </p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Stock Symbol</label>
                <input type="text" className={inp} value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="RELIANCE" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Sector</label>
                <select className={inp} value={sector} onChange={e => setSector(e.target.value)}>
                  {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Predicted Return (%)</label>
                <input type="number" className={inp} value={predicted} onChange={e => setPredicted(e.target.value)} placeholder="e.g. 15 for +15%" step="0.5" />
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Positive = bullish, Negative = bearish</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Hold Period</label>
                <select className={inp} value={holdDays} onChange={e => setHoldDays(e.target.value)}>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            </div>

            {errSubmit && <ErrBox msg={errSubmit} />}

            <button onClick={handleSubmit} disabled={submitting || !predicted || !symbol}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-60 text-white font-black text-base rounded-xl transition-all shadow-lg hover:shadow-violet-500/25">
              {submitting ? '⏳ Submitting…' : '🎯 Lock In My Prediction'}
            </button>

            <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
              Your prediction is stored anonymously using your session ID. No account needed. Entry price is locked at today's close.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PredictionsPage() {
  const [activeTab, setActiveTab] = useState('regime');
  const [presets,   setPresets]   = useState([]);

  useEffect(() => {
    getRegimePresets().then(r => setPresets(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 rounded-full text-xs font-bold mb-3">
          🔭 Phase 4 · Month 21 — Predictions & Social
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">🔭 Predictions & Social</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Forward-looking regime forecasts · Anonymous crowd predictions · Sector delusion index
        </p>
      </div>

      {/* Tool selector */}
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          {
            id:    'regime',
            emoji: '🔭',
            title: 'Regime Transition Predictor',
            desc:  "Current market is in BULL regime. Historically, 40% of the time this transitions to STRONG_BULL in 60–90 days.",
            color: 'blue',
          },
          {
            id:    'delusion',
            emoji: '🎪',
            title: 'Delusion Leaderboard',
            desc:  'Make anonymous return predictions. The leaderboard tracks which sector\'s crowd is most overconfident.',
            color: 'violet',
          },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              activeTab === tab.id
                ? tab.color === 'blue'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                  : 'bg-violet-50 dark:bg-violet-900/20 border-violet-500'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{tab.emoji}</span>
              <p className={`font-black text-sm ${
                activeTab === tab.id
                  ? tab.color === 'blue' ? 'text-blue-700 dark:text-blue-300' : 'text-violet-700 dark:text-violet-300'
                  : 'text-gray-900 dark:text-white'
              }`}>{tab.title}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{tab.desc}</p>
          </button>
        ))}
      </div>

      {activeTab === 'regime'   && <RegimePredictor presets={presets} />}
      {activeTab === 'delusion' && <DelusionLeaderboard />}

      <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
        ⚠️ Historical regime patterns · Anonymous crowd data · Not SEBI registered · Not financial advice
      </p>
    </div>
  );
}
