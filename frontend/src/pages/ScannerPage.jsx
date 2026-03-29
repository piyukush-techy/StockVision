import { useState } from 'react';
import { runScan } from '../api';

// ─── Colour maps ──────────────────────────────────────────────────────────────
const LABEL_STYLES = {
  red:       'bg-red-100   dark:bg-red-900/30   text-red-700   dark:text-red-400   border-red-200   dark:border-red-800',
  orange:    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  yellow:    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  blue:      'bg-blue-100  dark:bg-blue-900/30   text-blue-700  dark:text-blue-400   border-blue-200  dark:border-blue-800',
  green:     'bg-green-100 dark:bg-green-900/30  text-green-700 dark:text-green-400  border-green-200 dark:border-green-800',
  darkgreen: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
};

const RATE_BAR_COLOR = {
  red:       'bg-red-500',
  orange:    'bg-orange-500',
  yellow:    'bg-yellow-500',
  blue:      'bg-blue-500',
  green:     'bg-green-500',
  darkgreen: 'bg-emerald-500',
};

// ─── Small reusable components ────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-xl">{icon}</span>
      <div>
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Feature 1: Success Rate Hero ─────────────────────────────────────────────
function SuccessRateHero({ scan }) {
  const style = LABEL_STYLES[scan.color];
  const barColor = RATE_BAR_COLOR[scan.color];

  return (
    <Card>
      <SectionTitle icon="📊" title="Success Rate" subtitle={`+${scan.targetPct}% target within ${scan.windowDays} days`} />

      {/* Big rate circle */}
      <div className="flex flex-col items-center py-4">
        <div className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center mb-4 ${style}`}>
          <span className="text-4xl font-black">{scan.successRate}%</span>
          <span className="text-xs font-medium mt-1">{scan.emoji}</span>
        </div>
        <span className={`px-4 py-1.5 rounded-full border text-sm font-bold ${style}`}>
          {scan.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${scan.successRate}%` }}
          />
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Entry Points</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{scan.totalEntries.toLocaleString()}</div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-xs text-green-600 dark:text-green-400 mb-1">✅ Hit Target</div>
          <div className="text-lg font-bold text-green-700 dark:text-green-400">{scan.successCount.toLocaleString()}</div>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-xs text-red-600 dark:text-red-400 mb-1">❌ Did Not</div>
          <div className="text-lg font-bold text-red-700 dark:text-red-400">{scan.failCount.toLocaleString()}</div>
        </div>
      </div>
    </Card>
  );
}

// ─── Feature 2: Time Distribution ────────────────────────────────────────────
function TimeDistribution({ timeDistribution }) {
  if (!timeDistribution || timeDistribution.total === 0) {
    return (
      <Card>
        <SectionTitle icon="⏱️" title="Time to Target" subtitle="How fast do winning trades hit their target?" />
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No successful trades to analyse</p>
      </Card>
    );
  }

  const { buckets, median, mean, fastest, slowest } = timeDistribution;

  return (
    <Card>
      <SectionTitle icon="⏱️" title="Time to Target" subtitle="Among successful trades — how fast?" />

      <div className="space-y-3">
        {buckets.map((b, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
              <span>Within {b.days} days</span>
              <span className="font-semibold">{b.pct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${b.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-5 text-center">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400">Fastest</div>
          <div className="font-bold text-blue-700 dark:text-blue-400">{fastest}d</div>
        </div>
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400">Median</div>
          <div className="font-bold text-blue-700 dark:text-blue-400">{median}d</div>
        </div>
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400">Avg</div>
          <div className="font-bold text-blue-700 dark:text-blue-400">{mean}d</div>
        </div>
      </div>
    </Card>
  );
}

// ─── Feature 3: Drawdown Severity ────────────────────────────────────────────
function DrawdownAnalysis({ drawdownAnalysis }) {
  const { buckets, avgDrawdown, worstDrawdown, pctWithinFive } = drawdownAnalysis;

  const bucketColors = [
    'bg-green-500',
    'bg-yellow-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-red-700',
  ];

  return (
    <Card>
      <SectionTitle icon="📉" title="Drawdown Before Target" subtitle="How much pain before the gain?" />

      <div className="space-y-3">
        {buckets.map((b, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
              <span>{b.label}</span>
              <span className="font-semibold">{b.pct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${bucketColors[i]}`}
                style={{ width: `${b.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-5 text-center">
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400">Avg DD</div>
          <div className="font-bold text-red-600 dark:text-red-400">{avgDrawdown}%</div>
        </div>
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400">Worst DD</div>
          <div className="font-bold text-red-600 dark:text-red-400">{worstDrawdown}%</div>
        </div>
        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400">Within -5%</div>
          <div className="font-bold text-green-600 dark:text-green-400">{pctWithinFive}%</div>
        </div>
      </div>

      {avgDrawdown < -10 && (
        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <p className="text-xs text-orange-700 dark:text-orange-400">
            ⚠️ Even successful trades had an average drawdown of {avgDrawdown}% — make sure you can hold through this pain without panic selling.
          </p>
        </div>
      )}
    </Card>
  );
}

// ─── Feature 4: Gap Risk ──────────────────────────────────────────────────────
function GapRiskCard({ gapRisk }) {
  const { gapRiskPct, level, marketAvg } = gapRisk;

  const levelStyle = {
    HIGH:   'text-red-700   dark:text-red-400   bg-red-50   dark:bg-red-900/20   border-red-200   dark:border-red-800',
    MEDIUM: 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    LOW:    'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  };

  const diff = gapRiskPct - marketAvg;

  return (
    <Card>
      <SectionTitle icon="🌙" title="Overnight Gap Risk" subtitle="Can your stop-loss actually protect you?" />

      <div className={`p-4 rounded-xl border mb-4 ${levelStyle[level]}`}>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-2xl font-black">{gapRiskPct}%</div>
            <div className="text-xs mt-0.5">of big moves (&gt;3%) are overnight gaps</div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold border ${levelStyle[level]}`}>
            {level} RISK
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">This stock gap risk</span>
          <span className="font-semibold text-gray-900 dark:text-white">{gapRiskPct}%</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">NSE market average</span>
          <span className="font-semibold text-gray-900 dark:text-white">{marketAvg}%</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-600 dark:text-gray-400">vs market</span>
          <span className={`font-semibold ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {diff > 0 ? '+' : ''}{diff}%
          </span>
        </div>
      </div>

      {level === 'HIGH' && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-400">
            ⚠️ HIGH GAP RISK: Stop-loss orders may not execute at your target price. This stock frequently gaps past stop levels overnight. Size positions accordingly.
          </p>
        </div>
      )}
    </Card>
  );
}

// ─── Feature 5: Event Cooldown ───────────────────────────────────────────────
function EventCooldownCard({ eventCooldown }) {
  if (!eventCooldown) {
    return (
      <Card>
        <SectionTitle icon="📅" title="Post-Event Behaviour" subtitle="What happens after big news?" />
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Insufficient event data</p>
      </Card>
    );
  }

  const { afterPositiveMove, afterNegativeMove, totalEvents } = eventCooldown;

  const fmt = (v) => v === null ? '—' : `${v > 0 ? '+' : ''}${v}%`;
  const color = (v) => v === null ? 'text-gray-400' : v > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <Card>
      <SectionTitle icon="📅" title="Post-Event Behaviour" subtitle={`Based on ${totalEvents} large-move events (&gt;3%)`} />

      <div className="space-y-4">
        {/* After positive surge */}
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-xs font-bold text-green-700 dark:text-green-400 mb-2">
            📈 After Big Up Move ({afterPositiveMove.count} events)
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[['7 days', afterPositiveMove.avg7d], ['15 days', afterPositiveMove.avg15d], ['30 days', afterPositiveMove.avg30d]].map(([label, val]) => (
              <div key={label}>
                <div className="text-gray-500 dark:text-gray-400">{label}</div>
                <div className={`font-bold ${color(val)}`}>{fmt(val)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* After negative drop */}
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="text-xs font-bold text-red-700 dark:text-red-400 mb-2">
            📉 After Big Down Move ({afterNegativeMove.count} events)
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[['7 days', afterNegativeMove.avg7d], ['15 days', afterNegativeMove.avg15d], ['30 days', afterNegativeMove.avg30d]].map(([label, val]) => (
              <div key={label}>
                <div className="text-gray-500 dark:text-gray-400">{label}</div>
                <div className={`font-bold ${color(val)}`}>{fmt(val)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        Avg forward returns after large single-day moves (used as proxy for earnings/events)
      </p>
    </Card>
  );
}

// ─── Survival Score Badge ─────────────────────────────────────────────────────
function SurvivalScore({ score, avgDrawdown, windowDays }) {
  const level   = score <= 3 ? 'Low Pain' : score <= 6 ? 'Moderate Pain' : 'High Pain';
  const color   = score <= 3 ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : score <= 6 ? 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                :              'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';

  return (
    <Card className="col-span-full">
      <div className="flex items-center gap-4">
        <div className={`px-5 py-3 rounded-xl border text-center min-w-[100px] ${color}`}>
          <div className="text-3xl font-black">{score}</div>
          <div className="text-xs font-medium">/10</div>
        </div>
        <div>
          <div className="font-bold text-gray-900 dark:text-white">
            🧠 Survival Score — <span className={`${color.split(' ')[0]}`}>{level}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            If your trade fails, you'd likely face ~{avgDrawdown}% drawdown held for weeks.
            Score = |avg drawdown| × time factor. Higher = harder to hold through psychologically.
          </p>
        </div>
      </div>
    </Card>
  );
}

// ─── Input Form ───────────────────────────────────────────────────────────────
const PRESET_TARGETS  = [5, 10, 15, 20, 25, 30];
const PRESET_WINDOWS  = [
  { days: 30,  label: '1M'  },
  { days: 60,  label: '2M'  },
  { days: 90,  label: '3M'  },
  { days: 180, label: '6M'  },
  { days: 252, label: '1Y'  },
];

function ScannerForm({ onSubmit, loading }) {
  const [symbol,     setSymbol]     = useState('RELIANCE');
  const [targetPct,  setTargetPct]  = useState(15);
  const [windowDays, setWindowDays] = useState(90);

  const handleSubmit = () => {
    if (!symbol.trim()) return;
    onSubmit(symbol.trim().toUpperCase(), targetPct, windowDays);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center">
          <span className="text-lg">🔍</span>
        </div>
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white">Historical Scanner</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">5 years of NSE data · Real backtest</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Symbol */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
            Stock Symbol
          </label>
          <input
            type="text"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="RELIANCE"
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">NSE symbol (e.g. TCS, INFY)</p>
        </div>

        {/* Target */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
            Target Gain
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TARGETS.map(t => (
              <button
                key={t}
                onClick={() => setTargetPct(t)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  targetPct === t
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                +{t}%
              </button>
            ))}
          </div>
        </div>

        {/* Window */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
            Time Window
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_WINDOWS.map(w => (
              <button
                key={w.days}
                onClick={() => setWindowDays(w.days)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  windowDays === w.days
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary line */}
      <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <p className="text-sm text-purple-700 dark:text-purple-400">
          🔍 <strong>Question being answered:</strong> If you bought <strong>{symbol || '?'}</strong>, what % of the time did the stock gain <strong>+{targetPct}%</strong> within <strong>{windowDays} days</strong>? (Using 5 years of daily data)
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !symbol.trim()}
        className="mt-4 w-full sm:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Scanning 5 years of data...
          </>
        ) : (
          '🚀 Run Scanner'
        )}
      </button>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function ScannerSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
          <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded mb-3" />
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-full mb-2" />
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ScannerPage() {
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');
  const [lastQuery, setLastQuery] = useState(null);

  const handleScan = async (symbol, targetPct, windowDays) => {
    setLoading(true);
    setError('');
    setResult(null);
    setLastQuery({ symbol, targetPct, windowDays });

    try {
      const res = await runScan(symbol, targetPct, windowDays);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Scan failed. Check the symbol and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">
          🔍 Historical Scanner
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          India's first retail probability scanner — 5 years of NSE data, zero guesswork
        </p>
      </div>

      {/* Form */}
      <ScannerForm onSubmit={handleScan} loading={loading} />

      {/* Error */}
      {error && (
        <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-700 dark:text-red-400 font-medium">❌ {error}</p>
          <p className="text-red-600 dark:text-red-500 text-sm mt-1">
            Try a major NSE stock like RELIANCE, TCS, HDFCBANK, INFY
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && <ScannerSkeleton />}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Result header */}
          <div className="mt-6 mb-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-lg">
                {lastQuery?.symbol} — +{lastQuery?.targetPct}% in {lastQuery?.windowDays} days
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {result.scan.totalEntries.toLocaleString()} historical entry points analysed · 5 years of data
              </p>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {new Date(result.meta?.scannedAt).toLocaleString('en-IN')}
            </span>
          </div>

          {/* 5-feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {/* Feature 1 — Success Rate (spans 1 col) */}
            <SuccessRateHero scan={result.scan} />

            {/* Feature 2 — Time Distribution */}
            <TimeDistribution timeDistribution={result.timeDistribution} />

            {/* Feature 3 — Drawdown */}
            <DrawdownAnalysis drawdownAnalysis={result.drawdownAnalysis} />

            {/* Feature 4 — Gap Risk */}
            <GapRiskCard gapRisk={result.gapRisk} />

            {/* Feature 5 — Event Cooldown */}
            <EventCooldownCard eventCooldown={result.eventCooldown} />

            {/* Survival Score — full width */}
            <SurvivalScore
              score={result.survivalScore}
              avgDrawdown={result.drawdownAnalysis?.avgDrawdown}
              windowDays={lastQuery?.windowDays}
            />
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              ⚠️ <strong>Disclaimer:</strong> Historical probability ≠ future guarantee. Past performance does not predict future results.
              This tool uses 5 years of NSE daily OHLCV data via Yahoo Finance. Results include survivorship bias (only currently-listed stocks).
              Not SEBI registered. Not financial advice. Always do your own research before investing.
            </p>
          </div>
        </>
      )}

      {/* Empty state before first scan */}
      {!result && !loading && !error && (
        <div className="mt-8 text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Ready to scan
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
            Choose a stock, set your profit target and time window above, then click Run Scanner. We'll analyse 5 years of historical data to tell you the real probability.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'SBIN', 'ITC'].map(s => (
              <span key={s} className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-full text-xs font-mono font-semibold border border-purple-200 dark:border-purple-800">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
