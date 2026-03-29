import { useState } from 'react';
import { runCapitalAnalysis } from '../api';

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
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

// ─── Feature 69: Scalability Tiers ───────────────────────────────────────────
function ScalabilityTiers({ data }) {
  const { tiers, maxRecommendedCapital, capCategory } = data;
  const feasColors = {
    GOOD:    'text-green-700 dark:text-green-400  bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-800',
    CAUTION: 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    POOR:    'text-red-700   dark:text-red-400    bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-800'
  };
  const feasLabel = { GOOD: '✅ Good', CAUTION: '⚠️ Caution', POOR: '❌ Poor' };

  return (
    <Card className="col-span-full">
      <SectionTitle icon="📐" title="Capital Scalability Tiers"
        subtitle={`${capCategory?.replace('_', ' ')} · How success rate changes as you deploy more money`} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {['Capital', 'Base Rate', 'Cost %', 'Adj. Target', 'Adj. Rate', 'Fill Days', 'Verdict'].map(h => (
                <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tiers.map((t, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="py-2.5 px-3 font-mono font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                  {t.emoji} ₹{t.label}
                </td>
                <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{data.baseSuccessRate ?? '—'}%</td>
                <td className="py-2.5 px-3 text-orange-600 dark:text-orange-400 font-mono">+{t.totalCostPct}%</td>
                <td className="py-2.5 px-3 font-mono text-gray-900 dark:text-white">+{t.adjTarget}%</td>
                <td className="py-2.5 px-3">
                  <span className="font-bold text-gray-900 dark:text-white">{t.adjRate}%</span>
                  {t.rateDrop > 0 && (
                    <span className="text-xs text-red-500 ml-1">(-{t.rateDrop})</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                  {t.daysToFill === 1 ? '1 day' : `${t.daysToFill} days`}
                </td>
                <td className="py-2.5 px-3">
                  <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${feasColors[t.feasibility]}`}>
                    {feasLabel[t.feasibility]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          💡 <strong>Max recommended capital for this stock:</strong> ₹{maxRecommendedCapital} — beyond this, market impact significantly reduces your actual returns.
        </p>
      </div>
    </Card>
  );
}

// ─── Feature 70: Volume-Adjusted Probability ─────────────────────────────────
function VolumeAdjusted({ data }) {
  const verdictStyle = {
    MINIMAL:     'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    MODERATE:    'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    SIGNIFICANT: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  };
  const verdictLabel = {
    MINIMAL: '✅ Minimal impact', MODERATE: '⚠️ Moderate impact', SIGNIFICANT: '❌ Significant degradation'
  };
  const drop = data.baseSuccessRate - data.adjRate;

  return (
    <Card>
      <SectionTitle icon="📊" title="Volume-Adjusted Probability"
        subtitle="Real success rate after accounting for your order size" />

      <div className={`p-4 rounded-xl border mb-4 ${verdictStyle[data.verdict]}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-black">{data.adjRate}%</div>
            <div className="text-xs mt-0.5">volume-adjusted success rate</div>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${verdictStyle[data.verdict]}`}>
            {verdictLabel[data.verdict]}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {[
          ['Raw success rate', `${data.baseSuccessRate}%`],
          ['Your order size', `${data.shares?.toLocaleString('en-IN')} shares`],
          ['% of daily volume', `${data.pctOfVol}%`],
          ['Entry slippage', `+${data.entrySlippage}%`],
          ['Exit slippage', `+${data.exitSlippage}%`],
          ['Total slippage', `+${data.totalSlippage}%`],
          ['Effective target needed', `+${data.effectiveTarget}%`],
          ['1-day fill probability', `${data.oneDayFillPct}%`]
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700/50">
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
            <span className="font-semibold text-gray-900 dark:text-white font-mono">{value}</span>
          </div>
        ))}
      </div>

      {drop > 5 && (
        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <p className="text-xs text-orange-700 dark:text-orange-400">
            ⚠️ Your capital size reduces success rate by {drop} percentage points. Consider splitting the position across multiple days.
          </p>
        </div>
      )}
    </Card>
  );
}

// ─── Feature 71: Slippage Estimator ──────────────────────────────────────────
function SlippageEstimator({ data }) {
  const { slippage, regulatory, summary } = data;

  return (
    <Card>
      <SectionTitle icon="💸" title="Slippage Estimator"
        subtitle={`Exact cost breakdown for ₹${data.capitalAmount?.toLocaleString('en-IN')}`} />

      {/* Break-even banner */}
      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 mb-4">
        <div className="text-center">
          <div className="text-2xl font-black text-red-700 dark:text-red-400">+{summary.breakEvenPct}%</div>
          <div className="text-xs text-red-600 dark:text-red-500 mt-0.5">{summary.message}</div>
        </div>
      </div>

      {/* Market slippage */}
      <div className="mb-3">
        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Market Slippage</div>
        {[
          ['Entry slippage', `₹${slippage.entryRs.toLocaleString('en-IN', {maximumFractionDigits:0})}`],
          ['Exit slippage', `₹${slippage.exitRs.toLocaleString('en-IN', {maximumFractionDigits:0})}`],
          ['Subtotal', `₹${slippage.totalRs.toLocaleString('en-IN', {maximumFractionDigits:0})} (${slippage.pct}%)`]
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700/50">
            <span className="text-gray-600 dark:text-gray-400">{l}</span>
            <span className="font-mono font-semibold text-gray-900 dark:text-white">{v}</span>
          </div>
        ))}
      </div>

      {/* Regulatory */}
      <div className="mb-3">
        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Regulatory (Zerodha Delivery)</div>
        {[
          ['Brokerage', regulatory.brokerageRs],
          ['STT (buy+sell)', regulatory.sttRs],
          ['Exchange charges', regulatory.exchangeRs],
          ['GST', regulatory.gstRs],
          ['SEBI fee', regulatory.sebiRs],
          ['Stamp duty', regulatory.stampRs]
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-700/50">
            <span className="text-gray-500 dark:text-gray-400">{l}</span>
            <span className="font-mono text-gray-700 dark:text-gray-300">₹{v.toLocaleString('en-IN', {maximumFractionDigits:2})}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm py-1.5 font-semibold">
          <span className="text-gray-700 dark:text-gray-300">Subtotal regulatory</span>
          <span className="font-mono text-gray-900 dark:text-white">₹{regulatory.totalRs.toLocaleString('en-IN', {maximumFractionDigits:0})}</span>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold">
        <span className="text-gray-900 dark:text-white">Grand Total (round-trip)</span>
        <span className="font-mono text-red-600 dark:text-red-400">₹{summary.grandTotalRs.toLocaleString('en-IN', {maximumFractionDigits:0})}</span>
      </div>
    </Card>
  );
}

// ─── Feature 72: Liquidity Heat Map ──────────────────────────────────────────
function LiquidityHeatmap({ data }) {
  if (!data) return null;
  const { byDay, intraday, bestWindow, worstWindow, tips } = data;

  const ratingColor = {
    HIGH:   'bg-green-500',
    NORMAL: 'bg-yellow-400',
    LOW:    'bg-red-400'
  };
  const ratingBg = {
    HIGH:   'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    NORMAL: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400',
    LOW:    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
  };

  return (
    <Card>
      <SectionTitle icon="🕐" title="Liquidity Heat Map"
        subtitle="Best time of day & day of week to enter/exit" />

      {/* Day of week */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Day of Week</div>
        <div className="grid grid-cols-5 gap-1.5">
          {byDay.map(d => (
            <div key={d.day} className="text-center">
              <div className={`h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold mb-1 ${ratingColor[d.rating]}`} style={{opacity: Math.min(1, d.relVol * 0.7 + 0.3)}}>
                {d.relVol}x
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{d.day}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Intraday slots */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Intraday Liquidity</div>
        <div className="space-y-1.5">
          {intraday.map(slot => (
            <div key={slot.time} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${ratingBg[slot.rating]}`}>
              <span className="font-mono font-semibold w-28 shrink-0">{slot.time}</span>
              <span className="flex-1 mx-2">{slot.label}</span>
              <span className="font-bold">{slot.relVol}x</span>
            </div>
          ))}
        </div>
      </div>

      {/* Best/worst windows */}
      <div className="space-y-2 mb-4">
        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-700 dark:text-green-400">✅ <strong>Best:</strong> {bestWindow}</p>
        </div>
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-400">⚠️ <strong>Avoid:</strong> {worstWindow}</p>
        </div>
      </div>

      {/* Tips */}
      <div className="space-y-1">
        {tips.map((tip, i) => (
          <p key={i} className="text-xs text-gray-600 dark:text-gray-400 flex gap-1.5">
            <span className="text-blue-500 shrink-0">→</span>{tip}
          </p>
        ))}
      </div>
    </Card>
  );
}

// ─── Capital Input Form ───────────────────────────────────────────────────────
const CAPITAL_PRESETS = [
  { label: '₹10K',  amount: 10_000    },
  { label: '₹50K',  amount: 50_000    },
  { label: '₹1L',   amount: 100_000   },
  { label: '₹5L',   amount: 500_000   },
  { label: '₹10L',  amount: 1_000_000 },
  { label: '₹50L',  amount: 5_000_000 }
];

function CapitalForm({ onSubmit, loading }) {
  const [symbol,        setSymbol]        = useState('RELIANCE');
  const [baseRate,      setBaseRate]      = useState('');
  const [targetPct,     setTargetPct]     = useState(15);
  const [capitalAmount, setCapitalAmount] = useState(100_000);

  const handleSubmit = () => {
    if (!symbol.trim() || !baseRate) return;
    onSubmit(symbol.trim().toUpperCase(), parseFloat(baseRate), targetPct, capitalAmount);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center text-lg">💰</div>
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white">Capital Reality Check</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">See how your capital size affects real-world returns</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Symbol */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Stock Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="RELIANCE"
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Base success rate from scanner */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
            Base Success Rate <span className="text-emerald-600 dark:text-emerald-400">(from Scanner)</span>
          </label>
          <input
            type="number"
            value={baseRate}
            onChange={e => setBaseRate(e.target.value)}
            placeholder="e.g. 61"
            min="0" max="100"
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Run the Scanner first, then paste the %</p>
        </div>

        {/* Target % */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Target Gain %</label>
          <input
            type="number"
            value={targetPct}
            onChange={e => setTargetPct(parseFloat(e.target.value))}
            min="1" max="200"
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Capital */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Your Capital</label>
          <div className="flex flex-wrap gap-1">
            {CAPITAL_PRESETS.map(p => (
              <button
                key={p.amount}
                onClick={() => setCapitalAmount(p.amount)}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                  capitalAmount === p.amount
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
            ₹{capitalAmount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {baseRate && (
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            💰 Analysing <strong>{symbol}</strong> — Scanner says <strong>{baseRate}%</strong> success for +{targetPct}%. Capital deployed: <strong>₹{capitalAmount.toLocaleString('en-IN')}</strong>. Let's find the REAL number after costs.
          </p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !symbol.trim() || !baseRate}
        className="mt-4 w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
      >
        {loading ? (
          <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Analysing capital impact...</>
        ) : '💰 Run Capital Reality Check'}
      </button>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, j) => <div key={j} className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-full" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CapitalRealityPage() {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  const [query,   setQuery]   = useState(null);

  const handleSubmit = async (symbol, baseSuccessRate, targetPct, capitalAmount) => {
    setLoading(true);
    setError('');
    setResult(null);
    setQuery({ symbol, baseSuccessRate, targetPct, capitalAmount });
    try {
      const res = await runCapitalAnalysis(symbol, baseSuccessRate, targetPct, capitalAmount);
      // Inject baseSuccessRate into scalability data for table display
      if (res.data?.scalability) res.data.scalability.baseSuccessRate = baseSuccessRate;
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Check symbol and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">💰 Capital Reality</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          The scanner says 61% success — but that's before slippage, STT, brokerage, and your order size. Here's what you'll actually get.
        </p>
      </div>

      {/* Workflow hint */}
      <div className="mb-5 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          <strong>Workflow:</strong> 1. Run 🔍 Scanner → get success rate% → 2. Paste it here → 3. See real capital-adjusted probability
        </p>
      </div>

      <CapitalForm onSubmit={handleSubmit} loading={loading} />

      {error && (
        <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-700 dark:text-red-400 font-medium">❌ {error}</p>
        </div>
      )}

      {loading && <Skeleton />}

      {result && !loading && (
        <>
          <div className="mt-6 mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">
              {query?.symbol} · ₹{query?.capitalAmount?.toLocaleString('en-IN')} · Base: {query?.baseSuccessRate}% → Adjusted: <span className="text-emerald-600 dark:text-emerald-400">{result.volAdj?.adjRate}%</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {new Date(result.meta?.analysedAt).toLocaleString('en-IN')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Feature 69 — full width */}
            {result.scalability && (
              <ScalabilityTiers data={result.scalability} />
            )}

            {/* Feature 70 */}
            {result.volAdj && <VolumeAdjusted data={result.volAdj} />}

            {/* Feature 71 */}
            {result.slippage && <SlippageEstimator data={result.slippage} />}

            {/* Feature 72 */}
            {result.heatmap && <LiquidityHeatmap data={result.heatmap} />}
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              ⚠️ Slippage estimates are approximations based on average daily volumes. Actual impact varies with market conditions, order type (market vs limit), and time of execution. Regulatory costs based on Zerodha delivery charges as of 2024. Not SEBI registered. Not financial advice.
            </p>
          </div>
        </>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="mt-8 text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-5xl mb-4">💰</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Reality check awaits</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-lg mx-auto">
            Run the <a href="/scanner" className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">🔍 Scanner</a> first to get your success rate, then come back here to see how your actual capital size affects that number after slippage, brokerage, STT, and exchange charges.
          </p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto text-center text-sm">
            {[
              ['📐', 'Scalability Tiers', '₹10K vs ₹50L'],
              ['📊', 'Volume-Adjusted %', 'Real probability'],
              ['💸', 'Slippage Breakdown', 'Exact ₹ cost'],
              ['🕐', 'Liquidity Heatmap', 'Best time to trade']
            ].map(([icon, title, sub]) => (
              <div key={title} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="font-semibold text-gray-900 dark:text-white text-xs">{title}</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
