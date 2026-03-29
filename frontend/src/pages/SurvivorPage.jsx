// SurvivorPage.jsx — Phase 4 Month 19: Psychological Tools
// Feature 1: Survivorship Simulator — day-by-day emotional journey
// Feature 2: FOMO Destroyer — entry timing sensitivity

import { useState, useEffect } from 'react';
import { runSurvivorSim, runFomoDestroyer, getPsychologyDates } from '../api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtC   = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtP   = (n) => (Number(n) >= 0 ? '+' : '') + Number(n).toFixed(2) + '%';
const fmtN   = (n, d = 1) => Number(n).toFixed(d);

// ─── Color maps ───────────────────────────────────────────────────────────────
const EMOTION_COLORS = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500' },
  green:   { bg: 'bg-green-50 dark:bg-green-900/20',     border: 'border-green-200 dark:border-green-700',     text: 'text-green-700 dark:text-green-400',     bar: 'bg-green-500'   },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       border: 'border-blue-200 dark:border-blue-700',       text: 'text-blue-700 dark:text-blue-400',       bar: 'bg-blue-500'    },
  gray:    { bg: 'bg-gray-50 dark:bg-gray-700/40',       border: 'border-gray-200 dark:border-gray-600',       text: 'text-gray-700 dark:text-gray-300',       bar: 'bg-gray-400'    },
  yellow:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20',   border: 'border-yellow-200 dark:border-yellow-700',   text: 'text-yellow-700 dark:text-yellow-400',   bar: 'bg-yellow-500'  },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20',   border: 'border-orange-200 dark:border-orange-700',   text: 'text-orange-700 dark:text-orange-400',   bar: 'bg-orange-500'  },
  red:     { bg: 'bg-red-50 dark:bg-red-900/20',         border: 'border-red-200 dark:border-red-700',         text: 'text-red-700 dark:text-red-400',         bar: 'bg-red-500'     },
};

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
}

function SectionHead({ emoji, title, sub }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
      <span className="text-xl">{emoji}</span>
      <div>
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h3>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function Spinner({ msg = 'Simulating…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative w-14 h-14">
        <div className="w-14 h-14 border-4 border-blue-100 dark:border-gray-700 rounded-full" />
        <div className="absolute inset-0 w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{msg}</p>
    </div>
  );
}

function ErrBox({ msg }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
      ⚠️ {msg}
    </div>
  );
}

// ─── Quit probability bar ─────────────────────────────────────────────────────
function QuitBar({ pct, color = 'red' }) {
  const c = EMOTION_COLORS[color] || EMOTION_COLORS.gray;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full ${c.bar} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs font-bold w-10 text-right ${c.text}`}>{pct}%</span>
    </div>
  );
}

// ─── Sentiment indicator ──────────────────────────────────────────────────────
const SENTIMENT_STYLES = {
  panic:    'bg-red-600 text-white',
  fear:     'bg-orange-500 text-white',
  worry:    'bg-yellow-500 text-white',
  neutral:  'bg-gray-400 text-white',
  hope:     'bg-blue-500 text-white',
  greed:    'bg-green-500 text-white',
  euphoria: 'bg-emerald-600 text-white',
};

function SentimentBadge({ sentiment }) {
  return (
    <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${SENTIMENT_STYLES[sentiment] || 'bg-gray-400 text-white'}`}>
      {sentiment}
    </span>
  );
}

// ─── Journey Timeline Card ────────────────────────────────────────────────────
function JourneyCard({ step, entryPrice }) {
  const c       = EMOTION_COLORS[step.emotion.color] || EMOTION_COLORS.gray;
  const isPos   = step.pnlPct >= 0;
  const hasEvt  = step.events?.length > 0;

  return (
    <div className={`relative rounded-xl border p-4 ${c.bg} ${c.border} transition-all hover:shadow-md`}>
      {/* Top row: day + date + P&L */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Day {step.day}</span>
          <span className="text-xs text-gray-400 dark:text-gray-600 ml-2">{step.date}</span>
        </div>
        <div className="text-right">
          <p className={`text-base font-black ${isPos ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {fmtP(step.pnlPct)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{fmtC(step.price)}</p>
        </div>
      </div>

      {/* Emotion row */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{step.emotion.emoji}</span>
        <div className="flex-1">
          <p className={`text-xs font-black ${c.text}`}>{step.emotion.label}</p>
          <QuitBar pct={step.emotion.quit} color={step.emotion.color} />
        </div>
      </div>

      {/* Thought bubble */}
      <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg px-3 py-2 text-xs italic text-gray-600 dark:text-gray-300 mb-2">
        {step.thought}
      </div>

      {/* Market events */}
      {hasEvt && (
        <div className="space-y-1">
          {step.events.slice(0, 1).map((e, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <SentimentBadge sentiment={e.sentiment} />
              <span className="text-gray-600 dark:text-gray-400 leading-tight">{e.headline}</span>
            </div>
          ))}
        </div>
      )}

      {/* Drawdown indicator */}
      {step.ddFromPeak < -5 && (
        <div className="mt-2 text-xs text-orange-600 dark:text-orange-400 font-bold">
          ⚠️ {fmtN(Math.abs(step.ddFromPeak))}% off peak
        </div>
      )}
    </div>
  );
}

// ─── FOMO chart bar ───────────────────────────────────────────────────────────
function FomoBar({ scenario, maxAbs, height = 80 }) {
  const pct     = scenario.returnPct;
  const isPos   = pct >= 0;
  const barH    = maxAbs > 0 ? Math.max((Math.abs(pct) / maxAbs) * (height * 0.9), 3) : 3;
  const isRef   = scenario.isReference;
  const hitTgt  = scenario.hitTarget;

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0" title={`${scenario.label}: ${fmtP(pct)}`}>
      {/* P&L label above positive bars */}
      <span className={`text-xs font-bold truncate w-full text-center ${isPos ? 'text-green-600 dark:text-green-400' : 'opacity-0'}`}
        style={{ fontSize: '9px' }}>
        {isPos ? '+' + fmtN(pct, 0) + '%' : ''}
      </span>

      {/* Bar */}
      <div className="flex flex-col items-center justify-end" style={{ height: `${height}px` }}>
        {isPos && (
          <div
            className={`w-full rounded-t-sm transition-all ${isRef ? 'bg-blue-600' : hitTgt ? 'bg-emerald-500' : 'bg-blue-300 dark:bg-blue-700'}`}
            style={{ height: `${barH}px` }}
          />
        )}
      </div>

      {/* Zero line */}
      <div className={`w-full h-0.5 ${isRef ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`} />

      {/* Negative bar below */}
      <div className="flex flex-col items-center justify-start" style={{ height: `${height}px` }}>
        {!isPos && (
          <div
            className={`w-full rounded-b-sm transition-all ${isRef ? 'bg-blue-600' : 'bg-red-400 dark:bg-red-700'}`}
            style={{ height: `${barH}px` }}
          />
        )}
      </div>

      {/* P&L label below negative bars */}
      <span className={`text-xs font-bold truncate w-full text-center ${!isPos ? 'text-red-600 dark:text-red-400' : 'opacity-0'}`}
        style={{ fontSize: '9px' }}>
        {!isPos ? fmtN(pct, 0) + '%' : ''}
      </span>

      {/* Day label */}
      {isRef ? (
        <span className="text-xs font-black text-blue-600 dark:text-blue-400" style={{ fontSize: '9px' }}>REF</span>
      ) : (
        <span className="text-gray-400 dark:text-gray-600" style={{ fontSize: '8px' }}>
          {scenario.daysFromRef > 0 ? `+${scenario.daysFromRef}` : scenario.daysFromRef}
        </span>
      )}
    </div>
  );
}

// ─── Feature 1: Survivorship Simulator ───────────────────────────────────────
function SurvivorSimulator({ popularDates }) {
  const [symbol,    setSymbol]    = useState('RELIANCE');
  const [entryDate, setEntryDate] = useState('2020-03-24');
  const [holdDays,  setHoldDays]  = useState(180);
  const [target,    setTarget]    = useState(20);
  const [stopLoss,  setStopLoss]  = useState(-15);

  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState(null);
  const [expanded, setExpanded] = useState(false); // show all journey steps

  async function run() {
    setLoading(true); setErr(null); setResult(null);
    try {
      const r = await runSurvivorSim({ symbol: symbol.trim(), entryDate, holdDays: +holdDays, target: +target, stopLoss: +stopLoss });
      setResult(r.data.data);
    } catch (e) {
      setErr(e.response?.data?.detail || e.response?.data?.error || e.message || 'Simulation failed');
    }
    setLoading(false);
  }

  const inp = "w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  const journeyToShow = result ? (expanded ? result.journey : result.journey.slice(0, 8)) : [];

  return (
    <div className="space-y-6">
      {/* Input card */}
      <Card>
        <SectionHead emoji="🎭" title="Survivorship Simulator" sub="What would you have felt, day by day, holding through a real market event?" />
        <div className="p-5 space-y-5">

          {/* Popular date shortcuts */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">📅 Famous Entry Dates</p>
            <div className="flex flex-wrap gap-2">
              {popularDates.map(d => (
                <button key={d.date} onClick={() => setEntryDate(d.date)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    entryDate === d.date
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300'
                  }`}
                  title={d.reason}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">NSE Stock Symbol</label>
              <input type="text" className={inp} value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="RELIANCE" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Entry Date</label>
              <input type="date" className={inp} value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Hold Period (days)</label>
              <select className={inp} value={holdDays} onChange={e => setHoldDays(e.target.value)}>
                <option value={30}>30 days (1 month)</option>
                <option value={90}>90 days (3 months)</option>
                <option value={180}>180 days (6 months)</option>
                <option value={365}>365 days (1 year)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Profit Target</label>
              <select className={inp} value={target} onChange={e => setTarget(e.target.value)}>
                <option value={10}>+10%</option>
                <option value={15}>+15%</option>
                <option value={20}>+20%</option>
                <option value={30}>+30%</option>
                <option value={50}>+50%</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Stop Loss</label>
              <select className={inp} value={stopLoss} onChange={e => setStopLoss(e.target.value)}>
                <option value={-8}>-8%</option>
                <option value={-10}>-10%</option>
                <option value={-15}>-15%</option>
                <option value={-20}>-20%</option>
                <option value={-30}>-30%</option>
              </select>
            </div>
          </div>

          {err && <ErrBox msg={err} />}

          <button onClick={run} disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 text-white font-black text-base rounded-xl transition-all shadow-lg hover:shadow-purple-500/25">
            {loading ? '⏳ Simulating journey…' : '🎭 Start Simulation'}
          </button>
        </div>
      </Card>

      {loading && <Spinner msg="Fetching 5 years of data + matching real market events…" />}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-5">

          {/* Verdict banner */}
          {(() => {
            const v = result.verdict;
            const c = EMOTION_COLORS[v.color] || EMOTION_COLORS.gray;
            return (
              <div className={`rounded-2xl border-2 p-5 ${c.bg} ${c.border}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">{v.emoji}</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Simulation Verdict</p>
                    <p className={`text-2xl font-black ${c.text}`}>{v.title}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{v.summary}</p>
                <div className="flex items-start gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-3 text-sm">
                  <span>💡</span>
                  <p className="text-gray-700 dark:text-gray-300 italic">{v.lesson}</p>
                </div>
              </div>
            );
          })()}

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Final Return',       value: fmtP(result.outcome.totalReturn),       color: result.outcome.totalReturn > 0 ? 'green' : 'red' },
              { label: 'Peak Gain',          value: '+' + fmtN(result.outcome.peakPnl) + '%', color: 'emerald' },
              { label: 'Max Drawdown',       value: '-' + fmtN(result.outcome.maxDrawdown) + '%', color: 'orange' },
              { label: 'Avg Quit Prob.',     value: result.outcome.avgQuitProb + '%',        color: result.outcome.avgQuitProb > 50 ? 'red' : 'yellow' },
            ].map(({ label, value, color }) => {
              const c = EMOTION_COLORS[color] || EMOTION_COLORS.gray;
              return (
                <div key={label} className={`rounded-xl border p-3 ${c.bg} ${c.border}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                  <p className={`text-lg font-black ${c.text}`}>{value}</p>
                </div>
              );
            })}
          </div>

          {/* Survived? */}
          <div className={`rounded-xl border p-4 flex items-center gap-4 ${result.outcome.survivedLikely
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'}`}>
            <span className="text-3xl">{result.outcome.survivedLikely ? '🏅' : '💀'}</span>
            <div>
              <p className={`font-black text-base ${result.outcome.survivedLikely ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
                {result.outcome.survivedLikely ? 'Most investors would have survived this journey' : 'Most investors would have quit before reaching the outcome'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Peak quit probability was <strong>{result.outcome.maxQuitProb}%</strong> — at {result.keyMoments.worst?.emotion?.label?.toLowerCase() || 'the worst moment'}
              </p>
            </div>
          </div>

          {/* Journey timeline */}
          <Card>
            <SectionHead emoji="📅" title="Day-by-Day Emotional Journey"
              sub={`${result.meta.entryDate} → ${result.journey[result.journey.length - 1]?.date} · Entry: ${fmtC(result.meta.entryPrice)}`} />
            <div className="p-5 space-y-4">

              {/* Journey grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {journeyToShow.map((step, i) => (
                  <JourneyCard key={i} step={step} entryPrice={result.meta.entryPrice} />
                ))}
              </div>

              {result.journey.length > 8 && (
                <button onClick={() => setExpanded(!expanded)}
                  className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-all">
                  {expanded ? '▲ Show less' : `▼ Show all ${result.journey.length} milestones`}
                </button>
              )}
            </div>
          </Card>

          {/* Key moments */}
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: 'Worst Moment', step: result.keyMoments.worst, emoji: '😱', color: 'red' },
              { label: 'Best Moment',  step: result.keyMoments.best,  emoji: '🤩', color: 'emerald' },
            ].map(({ label, step, emoji, color }) => {
              if (!step) return null;
              const c = EMOTION_COLORS[color];
              return (
                <div key={label} className={`rounded-2xl border p-4 ${c.bg} ${c.border}`}>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">{emoji} {label}</p>
                  <p className={`text-2xl font-black ${c.text} mb-1`}>{fmtP(step.pnlPct)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Day {step.day} · {step.date}</p>
                  <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-2">{step.thought}</p>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Feature 2: FOMO Destroyer ───────────────────────────────────────────────
function FomoDestroyer({ popularDates }) {
  const [symbol,        setSymbol]        = useState('RELIANCE');
  const [referenceDate, setReferenceDate] = useState('2020-11-09');
  const [windowDays,    setWindowDays]    = useState(15);
  const [holdDays,      setHoldDays]      = useState(180);
  const [target,        setTarget]        = useState(20);

  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);

  async function run() {
    setLoading(true); setErr(null); setResult(null);
    try {
      const r = await runFomoDestroyer({ symbol: symbol.trim(), referenceDate, windowDays: +windowDays, holdDays: +holdDays, target: +target });
      setResult(r.data.data);
    } catch (e) {
      setErr(e.response?.data?.detail || e.response?.data?.error || e.message || 'Analysis failed');
    }
    setLoading(false);
  }

  const inp = "w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  const maxAbs = result ? Math.max(...result.scenarios.map(s => Math.abs(s.returnPct))) : 0;

  return (
    <div className="space-y-6">
      {/* Input */}
      <Card>
        <SectionHead emoji="🎯" title="FOMO Destroyer" sub="Shows how much ±1 week in entry timing changes your outcome" />
        <div className="p-5 space-y-5">

          {/* Popular date shortcuts */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">📅 Famous Dates to Test</p>
            <div className="flex flex-wrap gap-2">
              {popularDates.map(d => (
                <button key={d.date} onClick={() => setReferenceDate(d.date)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    referenceDate === d.date
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-orange-300'
                  }`}
                  title={d.reason}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">NSE Stock Symbol</label>
              <input type="text" className={inp} value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="RELIANCE" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Reference Date (FOMO point)</label>
              <input type="date" className={inp} value={referenceDate} onChange={e => setReferenceDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Test Window (±days)</label>
              <select className={inp} value={windowDays} onChange={e => setWindowDays(e.target.value)}>
                <option value={7}>±7 days</option>
                <option value={10}>±10 days</option>
                <option value={15}>±15 days</option>
                <option value={20}>±20 days</option>
                <option value={30}>±30 days</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Hold Period</label>
              <select className={inp} value={holdDays} onChange={e => setHoldDays(e.target.value)}>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>365 days</option>
              </select>
            </div>
          </div>

          {err && <ErrBox msg={err} />}

          <button onClick={run} disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-60 text-white font-black text-base rounded-xl transition-all shadow-lg hover:shadow-orange-500/25">
            {loading ? '⏳ Analyzing entry timing…' : '🎯 Destroy the FOMO'}
          </button>
        </div>
      </Card>

      {loading && <Spinner msg="Testing every entry date in window…" />}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-5">

          {/* Verdict */}
          {(() => {
            const v = result.verdict;
            const c = EMOTION_COLORS[v.color] || EMOTION_COLORS.gray;
            return (
              <div className={`rounded-2xl border-2 p-5 ${c.bg} ${c.border}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">{v.emoji}</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">FOMO Verdict</p>
                    <p className={`text-2xl font-black ${c.text}`}>{v.title}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{v.summary}</p>
                <div className="flex items-start gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-3 text-sm">
                  <span>💡</span>
                  <p className="text-gray-700 dark:text-gray-300 italic">{v.lesson}</p>
                </div>
              </div>
            );
          })()}

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Best Entry Return',  value: fmtP(result.stats.bestReturn),   color: 'emerald' },
              { label: 'Worst Entry Return', value: fmtP(result.stats.worstReturn),  color: 'red'     },
              { label: 'Return Spread',      value: fmtN(result.stats.returnSpread, 1) + '%', color: result.stats.returnSpread > 20 ? 'red' : 'yellow' },
              { label: '±1-Week Range',      value: fmtN(result.stats.week1Range, 1) + '%',  color: result.stats.timingLuckColor },
            ].map(({ label, value, color }) => {
              const c = EMOTION_COLORS[color] || EMOTION_COLORS.gray;
              return (
                <div key={label} className={`rounded-xl border p-3 ${c.bg} ${c.border}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                  <p className={`text-lg font-black ${c.text}`}>{value}</p>
                </div>
              );
            })}
          </div>

          {/* Timing luck badge */}
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className={`px-4 py-2 rounded-xl font-black text-sm text-white ${
              result.stats.timingLuck === 'Very High' ? 'bg-red-600' :
              result.stats.timingLuck === 'High'      ? 'bg-orange-500' :
              result.stats.timingLuck === 'Moderate'  ? 'bg-yellow-500' : 'bg-green-500'
            }`}>
              {result.stats.timingLuck} Timing Luck
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {result.stats.hitTargetPct}% of entry dates hit the {target}% target
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Best: {result.stats.bestEntry} · Worst: {result.stats.worstEntry}
              </p>
            </div>
          </div>

          {/* Bar chart */}
          <Card>
            <SectionHead emoji="📊" title="Return by Entry Date"
              sub={`Blue bar = reference date · Green = hit ${target}% target · Red = loss`} />
            <div className="p-5">
              <div className="flex items-center gap-1 overflow-x-auto pb-2" style={{ minHeight: 220 }}>
                {result.scenarios.map((s, i) => (
                  <FomoBar key={i} scenario={s} maxAbs={maxAbs} height={90} />
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-600 rounded-sm" /><span className="text-gray-600 dark:text-gray-400">Reference date</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-sm" /><span className="text-gray-600 dark:text-gray-400">Hit target +{target}%</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-300 rounded-sm" /><span className="text-gray-600 dark:text-gray-400">Profit (no target)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-400 rounded-sm" /><span className="text-gray-600 dark:text-gray-400">Loss</span></div>
              </div>
            </div>
          </Card>

          {/* Detailed table */}
          <Card>
            <SectionHead emoji="📋" title="All Entry Scenarios" sub="Every tested entry date with outcome" />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    {['Entry Date', 'Offset', 'Entry Price', 'Exit Price', 'Return', 'Max DD', 'Hit Target?'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.scenarios.map((s, i) => (
                    <tr key={i} className={`border-t border-gray-50 dark:border-gray-700/30 ${s.isReference ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/20'}`}>
                      <td className="px-3 py-2 font-mono font-bold text-gray-900 dark:text-white">
                        {s.isReference && <span className="mr-1 text-blue-600">●</span>}{s.date}
                      </td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{s.label}</td>
                      <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">{fmtC(s.entryPrice)}</td>
                      <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">{fmtC(s.exitPrice)}</td>
                      <td className={`px-3 py-2 font-black ${s.returnPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {fmtP(s.returnPct)}
                      </td>
                      <td className="px-3 py-2 text-orange-600 dark:text-orange-400">-{fmtN(s.maxDrawdown)}%</td>
                      <td className="px-3 py-2">
                        {s.hitTarget
                          ? <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full font-bold">✅ Yes</span>
                          : <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">No</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SurvivorPage() {
  const [activeTab,    setActiveTab]    = useState('survivor');
  const [popularDates, setPopularDates] = useState([]);

  useEffect(() => {
    getPsychologyDates()
      .then(r => setPopularDates(r.data.data || []))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-bold mb-3">
          🧠 Phase 4 · Month 19 — Psychological Tools
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">🧠 Psychological Tools</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The mental side of investing — survive drawdowns, destroy FOMO, understand your emotional edge.
        </p>
      </div>

      {/* Tab selector */}
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          {
            id: 'survivor',
            emoji: '🎭',
            title: 'Survivorship Simulator',
            desc: 'Live the day-by-day emotional journey of a real historical trade. Would you have survived?',
            color: 'purple',
          },
          {
            id: 'fomo',
            emoji: '🎯',
            title: 'FOMO Destroyer',
            desc: 'How much does ±1 week in entry timing actually change your outcome? Less than you think.',
            color: 'orange',
          },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              activeTab === tab.id
                ? tab.color === 'purple'
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 dark:border-purple-500'
                  : 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-500'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{tab.emoji}</span>
              <p className={`font-black text-sm ${
                activeTab === tab.id
                  ? tab.color === 'purple' ? 'text-purple-700 dark:text-purple-300' : 'text-orange-700 dark:text-orange-300'
                  : 'text-gray-900 dark:text-white'
              }`}>{tab.title}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{tab.desc}</p>
          </button>
        ))}
      </div>

      {/* Feature content */}
      {activeTab === 'survivor' && <SurvivorSimulator popularDates={popularDates} />}
      {activeTab === 'fomo'     && <FomoDestroyer     popularDates={popularDates} />}

      <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
        ⚠️ Simulations use real historical data from Yahoo Finance · For educational purposes only · Not financial advice
      </p>
    </div>
  );
}
