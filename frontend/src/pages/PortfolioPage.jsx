// PortfolioPage.jsx — Phase 3 Month 13+14+15+16+17+18: Portfolio Optimizer + Historical + Event Attribution + Regime Match + Scalability + Launch
import { useState, useEffect } from 'react';
import { analyzePortfolio, getPortfolioPresets, scanPortfolio, getPortfolioTimeline, getEventAttribution, getRegimeMatch, getScalability } from '../api';
import PortfolioTimeline  from '../components/PortfolioTimeline';
import GrowthPattern      from '../components/GrowthPattern';
import RootCauseAnalysis  from '../components/RootCauseAnalysis';
import RegimeMatch        from '../components/RegimeMatch';
import PortfolioScalability from '../components/PortfolioScalability';
import PortfolioReport    from '../components/PortfolioReport';
import SavedPortfolios    from '../components/SavedPortfolios';
import PortfolioCompare   from '../components/PortfolioCompare';
import useSessionId       from '../hooks/useSessionId';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtC  = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtP  = (n) => (n >= 0 ? '+' : '') + Number(n).toFixed(2) + '%';
const fmtN  = (n, d = 2) => Number(n).toFixed(d);

// ─── Colour maps ──────────────────────────────────────────────────────────────
const COLOR = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' },
  green:   { bg: 'bg-green-50 dark:bg-green-900/20',     border: 'border-green-200 dark:border-green-800',     text: 'text-green-700 dark:text-green-400',     badge: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       border: 'border-blue-200 dark:border-blue-800',       text: 'text-blue-700 dark:text-blue-400',       badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' },
  yellow:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20',   border: 'border-yellow-200 dark:border-yellow-800',   text: 'text-yellow-700 dark:text-yellow-400',   badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20',   border: 'border-orange-200 dark:border-orange-800',   text: 'text-orange-700 dark:text-orange-400',   badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300' },
  red:     { bg: 'bg-red-50 dark:bg-red-900/20',         border: 'border-red-200 dark:border-red-800',         text: 'text-red-700 dark:text-red-400',         badge: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' },
  gray:    { bg: 'bg-gray-50 dark:bg-gray-800',          border: 'border-gray-200 dark:border-gray-700',       text: 'text-gray-700 dark:text-gray-300',       badge: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
};

// ─── Reusable atoms ───────────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
}
function SectionHead({ emoji, title, sub }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
      <span className="text-xl">{emoji}</span>
      <div>
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h3>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}
function StatPill({ label, value, color = 'gray' }) {
  const c = COLOR[color] || COLOR.gray;
  return (
    <div className={`rounded-xl border px-4 py-3 ${c.bg} ${c.border}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={`text-base font-black ${c.text}`}>{value}</p>
    </div>
  );
}
function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500 dark:text-gray-400">Crunching 3 years of data…</p>
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

// ─── Correlation heat-cell ────────────────────────────────────────────────────
function CorrCell({ value, isSelf }) {
  if (isSelf) return <td className="px-3 py-2 text-center text-xs font-black text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700">—</td>;
  const abs = Math.abs(value);
  const bg =
    abs > 0.8 ? 'bg-red-200 dark:bg-red-900/60 text-red-900 dark:text-red-200' :
    abs > 0.6 ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-900 dark:text-orange-200' :
    abs > 0.4 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200' :
    abs > 0.2 ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200' :
                'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200';
  return (
    <td className={`px-3 py-2 text-center text-xs font-bold ${bg}`}>
      {fmtN(value, 2)}
    </td>
  );
}

// ─── Weight donut bar ─────────────────────────────────────────────────────────
const STOCK_COLORS = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-pink-500','bg-lime-500','bg-indigo-500','bg-orange-500'];
const STOCK_TEXT   = ['text-blue-600','text-emerald-600','text-violet-600','text-amber-600','text-rose-600','text-cyan-600','text-pink-600','text-lime-600','text-indigo-600','text-orange-600'];

function WeightBar({ allocations }) {
  return (
    <div className="space-y-2">
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
        {allocations.map((a, i) => (
          <div
            key={a.symbol}
            className={`${STOCK_COLORS[i % STOCK_COLORS.length]} transition-all`}
            style={{ width: `${a.weight}%` }}
            title={`${a.symbol}: ${a.weight}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {allocations.map((a, i) => (
          <div key={a.symbol} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full ${STOCK_COLORS[i % STOCK_COLORS.length]}`} />
            <span className="text-xs text-gray-600 dark:text-gray-400">{a.symbol.replace('.NS','').replace('.BO','')} {a.weight}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section: Stock Comparison Table ─────────────────────────────────────────
function StockComparisonTable({ stocks }) {
  const getReturnColor = (v) => v > 15 ? 'text-emerald-600 dark:text-emerald-400' : v > 8 ? 'text-green-600 dark:text-green-400' : v > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';
  const getSharpeColor = (v) => v > 1.5 ? 'text-emerald-600 dark:text-emerald-400' : v > 1 ? 'text-green-600 dark:text-green-400' : v > 0.5 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';
  const getDDColor     = (v) => v < 20 ? 'text-emerald-600 dark:text-emerald-400' : v < 35 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
  return (
    <Card>
      <SectionHead emoji="📊" title="Individual Stock Analysis" sub="3-year historical performance metrics" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs">
              {['Stock','Price','CAGR','Ann. Return','Volatility','Sharpe','Max Drawdown'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400 first:rounded-tl-xl last:rounded-tr-xl">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stocks.map((s, i) => (
              <tr key={s.symbol} className="border-t border-gray-50 dark:border-gray-700/40 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${STOCK_COLORS[i % STOCK_COLORS.length]}`} />
                    <span className="font-bold text-gray-900 dark:text-white text-xs">{s.symbol.replace('.NS','').replace('.BO','')}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300 text-xs">{fmtC(s.currentPrice)}</td>
                <td className={`px-4 py-3 font-bold text-xs ${getReturnColor(s.cagr)}`}>{fmtP(s.cagr)}</td>
                <td className={`px-4 py-3 font-bold text-xs ${getReturnColor(s.annualReturn)}`}>{fmtP(s.annualReturn)}</td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{fmtN(s.annualVol)}%</td>
                <td className={`px-4 py-3 font-bold text-xs ${getSharpeColor(s.sharpeRatio)}`}>{fmtN(s.sharpeRatio, 2)}</td>
                <td className={`px-4 py-3 font-bold text-xs ${getDDColor(s.maxDrawdown)}`}>-{fmtN(s.maxDrawdown)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Section: Strategy Comparison ────────────────────────────────────────────
function StrategyComparison({ strategies, bestStrategy, allocations, totalCapital, activeStrat, setActiveStrat }) {
  const stratKeys = ['equalWeight', 'riskParity', 'minVolatility'];
  const stratNames = ['Equal Weight', 'Risk-Parity', 'Min Volatility'];
  return (
    <Card>
      <SectionHead emoji="⚖️" title="Portfolio Strategies" sub={`Best: ${bestStrategy.name} — ${bestStrategy.reason}`} />
      <div className="p-6 space-y-6">
        {/* Strategy selector tabs */}
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
          {strategies.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActiveStrat(i)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeStrat === i
                  ? 'bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {s.name === bestStrategy.name ? '⭐ ' : ''}{s.name}
            </button>
          ))}
        </div>

        {/* Active strategy metrics */}
        {strategies[activeStrat] && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatPill label="CAGR" value={fmtP(strategies[activeStrat].metrics.cagr)} color={strategies[activeStrat].metrics.cagr > 12 ? 'green' : strategies[activeStrat].metrics.cagr > 6 ? 'blue' : 'red'} />
              <StatPill label="Sharpe Ratio" value={fmtN(strategies[activeStrat].metrics.sharpe, 2)} color={strategies[activeStrat].metrics.sharpe > 1 ? 'emerald' : strategies[activeStrat].metrics.sharpe > 0.5 ? 'blue' : 'red'} />
              <StatPill label="Max Drawdown" value={`-${fmtN(strategies[activeStrat].metrics.maxDrawdown)}%`} color={strategies[activeStrat].metrics.maxDrawdown < 25 ? 'green' : strategies[activeStrat].metrics.maxDrawdown < 40 ? 'yellow' : 'red'} />
              <StatPill label="Ann. Volatility" value={`${fmtN(strategies[activeStrat].metrics.annualVol)}%`} color="gray" />
              <StatPill label="Ann. Return" value={fmtP(strategies[activeStrat].metrics.annualReturn)} color="blue" />
              <StatPill label="Total Return" value={fmtP(strategies[activeStrat].metrics.totalReturn)} color="gray" />
            </div>

            {/* Weight bar */}
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Allocation Weights</p>
              <WeightBar allocations={allocations[stratKeys[activeStrat]] || []} />
            </div>
          </div>
        )}

        {/* Side-by-side comparison */}
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Strategy Comparison</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  {['Strategy','CAGR','Sharpe','Max DD','Ann. Vol','Total Ret.'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {strategies.map((s, i) => (
                  <tr key={s.name} className={`border-t border-gray-50 dark:border-gray-700/30 ${s.name === bestStrategy.name ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">
                      {s.name === bestStrategy.name && <span className="text-yellow-500 mr-1">⭐</span>}{s.name}
                    </td>
                    <td className={`px-3 py-2 font-bold ${s.metrics.cagr > 12 ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>{fmtP(s.metrics.cagr)}</td>
                    <td className={`px-3 py-2 font-bold ${s.metrics.sharpe > 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>{fmtN(s.metrics.sharpe, 2)}</td>
                    <td className={`px-3 py-2 font-bold ${s.metrics.maxDrawdown < 30 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>-{fmtN(s.metrics.maxDrawdown)}%</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{fmtN(s.metrics.annualVol)}%</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{fmtP(s.metrics.totalReturn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Section: Allocation Table ────────────────────────────────────────────────
function AllocationTable({ allocations, totalCapital, stratName }) {
  const stratKeys = { 'Equal Weight': 'equalWeight', 'Risk-Parity': 'riskParity', 'Min Volatility': 'minVolatility' };
  const key = stratKeys[stratName] || 'equalWeight';
  const rows = allocations[key] || [];
  const deployedTotal = rows.reduce((s, r) => s + r.actualAmount, 0);
  const undeployed = totalCapital - deployedTotal;

  return (
    <Card>
      <SectionHead emoji="💰" title="Exact Allocation — How Much to Buy" sub={`Based on ${stratName} strategy · Total capital: ${fmtC(totalCapital)}`} />
      <div className="p-6 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs">
                {['Stock','Weight','Target ₹','Shares','Actual ₹','Price/Share'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.symbol} className="border-t border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${STOCK_COLORS[i % STOCK_COLORS.length]}`} />
                      <span className="font-bold text-gray-900 dark:text-white text-xs">{r.symbol.replace('.NS','').replace('.BO','')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <div className={`h-2 rounded-full ${STOCK_COLORS[i % STOCK_COLORS.length]}`} style={{ width: `${r.weight}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{fmtN(r.weight)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{fmtC(r.targetAmount)}</td>
                  <td className="px-4 py-3">
                    <span className="font-black text-gray-900 dark:text-white text-sm">{r.shares}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">shares</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-blue-700 dark:text-blue-400">{fmtC(r.actualAmount)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{fmtC(r.pricePerShare)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                <td className="px-4 py-3 font-black text-gray-900 dark:text-white text-xs" colSpan={3}>Total Deployed</td>
                <td className="px-4 py-3 font-black text-gray-900 dark:text-white text-xs">{rows.reduce((s, r) => s + r.shares, 0)} shares</td>
                <td className="px-4 py-3 font-mono font-black text-blue-700 dark:text-blue-400 text-sm">{fmtC(deployedTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        {undeployed > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-2">
            <span>💵</span>
            <span>Undeployed cash (fractional shares): {fmtC(Math.round(undeployed))}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Section: Correlation Matrix ─────────────────────────────────────────────
function CorrelationMatrix({ matrix, symbols }) {
  const short = symbols.map(s => s.replace('.NS','').replace('.BO',''));
  return (
    <Card>
      <SectionHead emoji="🔗" title="Correlation Matrix" sub="How stocks move together — lower = better diversification" />
      <div className="p-6 space-y-4">
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-gray-400" />
                {short.map(s => <th key={s} className="px-3 py-2 font-bold text-gray-600 dark:text-gray-400 text-center">{s}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">{short[i]}</td>
                  {row.map((val, j) => <CorrCell key={j} value={val} isSelf={i === j} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { label: '> 0.8 High correlation',   color: 'bg-red-200' },
            { label: '0.6–0.8 Moderate',          color: 'bg-orange-100' },
            { label: '0.4–0.6 Low-moderate',      color: 'bg-yellow-100' },
            { label: '0–0.4 Low correlation',     color: 'bg-blue-50' },
            { label: '< 0 Negative (best)',        color: 'bg-green-50' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${color} border border-gray-200`} />
              <span className="text-gray-500 dark:text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Section: Diversification Score ──────────────────────────────────────────
function DiversificationCard({ div }) {
  const score = div.score;
  const c = score > 70 ? COLOR.emerald : score > 50 ? COLOR.green : score > 30 ? COLOR.yellow : COLOR.red;
  return (
    <Card>
      <SectionHead emoji="🧩" title="Diversification Analysis" sub="True diversification beyond just stock count" />
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-6">
          {/* Score circle */}
          <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center flex-shrink-0 ${c.border} ${c.bg}`}>
            <span className={`text-3xl font-black ${c.text}`}>{score}</span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
          <div className="space-y-2">
            <p className={`font-black text-lg ${c.text}`}>{div.label}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg correlation: <span className="font-bold">{div.avgCorrelation}%</span></p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Effective stocks: <span className="font-black text-gray-900 dark:text-white">{div.effectiveStocks}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(of {div.effectiveStocks < 3 ? '?' : '?'} total)</span>
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Concentrated</span><span>Diversified</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-3 rounded-full transition-all ${score > 70 ? 'bg-emerald-500' : score > 50 ? 'bg-green-500' : score > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${score}%` }} />
          </div>
        </div>
        {div.warning && (
          <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-4 py-3 text-sm text-orange-800 dark:text-orange-300">
            <span>⚠️</span><span>{div.warning}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Section: Yearly Performance ─────────────────────────────────────────────
function YearlyPerformance({ yearlyPerformance }) {
  if (!yearlyPerformance?.length) return null;
  const max = Math.max(...yearlyPerformance.map(y => Math.abs(y.return)));
  return (
    <Card>
      <SectionHead emoji="📅" title="Year-by-Year Returns" sub="Equal-weight portfolio · Historical performance" />
      <div className="p-6">
        <div className="flex items-end gap-2 h-40">
          {yearlyPerformance.map(y => {
            const pct = max > 0 ? (Math.abs(y.return) / max) * 100 : 0;
            const isPos = y.return >= 0;
            return (
              <div key={y.year} className="flex-1 flex flex-col items-center gap-1">
                <span className={`text-xs font-bold ${isPos ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPos ? '+' : ''}{fmtN(y.return, 1)}%
                </span>
                <div className="w-full flex flex-col items-center justify-end" style={{ height: '80px' }}>
                  <div
                    className={`w-full rounded-t-sm ${isPos ? 'bg-green-400 dark:bg-green-500' : 'bg-red-400 dark:bg-red-500'}`}
                    style={{ height: `${Math.max(pct * 0.8, 4)}px` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">{y.year}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ─── Section: Growth Pattern Badge ───────────────────────────────────────────
function GrowthPatternBanner({ pattern, bestStrategy }) {
  const c = COLOR[pattern.color] || COLOR.gray;
  return (
    <div className={`rounded-2xl border-2 p-6 ${c.bg} ${c.border} flex flex-col md:flex-row items-center gap-4`}>
      <div className="text-5xl">{pattern.emoji}</div>
      <div className="text-center md:text-left">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Portfolio Pattern</p>
        <p className={`text-2xl font-black ${c.text}`}>{pattern.label} Portfolio</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Optimized via <span className="font-bold">{bestStrategy.name}</span> — {bestStrategy.reason}</p>
      </div>
    </div>
  );
}

// ─── Stock input row ──────────────────────────────────────────────────────────
function StockInputRow({ idx, value, onChange, onRemove, canRemove }) {
  return (
    <div className="flex gap-2 items-center">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${STOCK_COLORS[idx % STOCK_COLORS.length]}`}>
        {idx + 1}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value.toUpperCase())}
        placeholder={`STOCK${idx + 1}.NS`}
        className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
      />
      {canRemove && (
        <button onClick={onRemove} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const sessionId = useSessionId();
  const [symbols, setSymbols]         = useState(['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS']);
  const [totalCapital, setTotalCapital] = useState(100000);
  const [range, setRange]             = useState('3y');
  const [presets, setPresets]         = useState([]);
  const [result, setResult]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [err, setErr]                 = useState(null);
  const [activeStrat, setActiveStrat] = useState(0);
  const [allocStrat, setAllocStrat]   = useState('Equal Weight');

  // ── Month 14: Historical Scanner state ──
  const [scanData,     setScanData]     = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [scanLoading,  setScanLoading]  = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [scanErr,      setScanErr]      = useState(null);
  const [timelineErr,  setTimelineErr]  = useState(null);
  const [showScanner,  setShowScanner]  = useState(false);
  const [activeResultTab, setActiveResultTab] = useState('optimizer');

  // ── Month 15: Event Attribution state ──
  const [eventData,    setEventData]    = useState(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventErr,     setEventErr]     = useState(null);

  // ── Month 16: Regime Match state ──
  const [regimeData,    setRegimeData]    = useState(null);
  const [regimeLoading, setRegimeLoading] = useState(false);
  const [regimeErr,     setRegimeErr]     = useState(null);

  // ── Month 17: Scalability ──
  const [scaleData,    setScaleData]    = useState(null);
  const [scaleLoading, setScaleLoading] = useState(false);
  const [scaleErr,     setScaleErr]     = useState(null);
  // Load presets on mount
  useEffect(() => {
    getPortfolioPresets().then(r => setPresets(r.data.data || [])).catch(() => {});
  }, []);

  const setSymbol = (i, val) => {
    const next = [...symbols];
    next[i] = val;
    setSymbols(next);
  };
  const addSymbol = () => {
    if (symbols.length < 10) setSymbols([...symbols, '']);
  };
  const removeSymbol = (i) => {
    setSymbols(symbols.filter((_, idx) => idx !== i));
  };
  const loadPreset = (p) => {
    setSymbols(p.symbols);
    setResult(null);
    setErr(null);
  };

  // Load a saved portfolio
  const loadSaved = (p) => {
    setSymbols(p.symbols || []);
    setTotalCapital(p.totalCapital || 100000);
    setRange(p.range || '3y');
    setResult(null);
    setErr(null);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function run() {
    const clean = symbols.map(s => s.trim()).filter(Boolean);
    if (clean.length < 2) { setErr('Add at least 2 stocks to analyze a portfolio.'); return; }
    setLoading(true); setErr(null); setResult(null);
    // Reset scanner data when running new analysis
    setScanData(null); setTimelineData(null); setShowScanner(false);
    setTimelineErr(null); setScanErr(null); setActiveResultTab('optimizer');
    // Reset Month 15 event data
    setEventData(null); setEventErr(null);
    // Reset Month 16 regime data
    setRegimeData(null); setRegimeErr(null);
    // Reset Month 17 scalability data
    setScaleData(null); setScaleErr(null);
    try {
      const r = await analyzePortfolio({ symbols: clean, totalCapital: +totalCapital, range });
      setResult(r.data.data);
      // Set active strat to best
      const bestIdx = r.data.data.strategies.findIndex(s => s.name === r.data.data.bestStrategy.name);
      if (bestIdx >= 0) { setActiveStrat(bestIdx); setAllocStrat(r.data.data.bestStrategy.name); }
      // Auto-load timeline in background (Month 14)
      loadTimeline(clean, r.data.data.strategies[bestIdx >= 0 ? bestIdx : 0]?.weights?.map(w => w.weight) || clean.map(() => 1));
    } catch(e) {
      setErr(e.response?.data?.error || e.response?.data?.detail || e.message);
    }
    setLoading(false);
  }

  // ── Month 14: Load portfolio timeline (background) ──────────────────────────
  async function loadTimeline(syms, wts) {
    setTimelineLoading(true); setTimelineErr(null);
    try {
      const r = await getPortfolioTimeline({ symbols: syms, weights: wts, range: '5y' });
      setTimelineData(r.data.data);
    } catch(e) {
      setTimelineErr(e.response?.data?.error || e.response?.data?.detail || e.message || 'Failed to load timeline');
    }
    setTimelineLoading(false);
  }

  // ── Month 15: Load event attribution ────────────────────────────────────────
  async function loadEventAttribution(syms, wts) {
    setEventLoading(true); setEventErr(null);
    try {
      const r = await getEventAttribution({ symbols: syms, weights: wts, range: '5y' });
      setEventData(r.data.data);
    } catch(e) {
      setEventErr(e.response?.data?.error || e.response?.data?.detail || e.message || 'Failed to run event attribution');
    }
    setEventLoading(false);
  }

  // ── Month 16: Load regime match ──────────────────────────────────────────────
  async function loadRegimeMatch(syms, wts) {
    setRegimeLoading(true); setRegimeErr(null);
    try {
      const r = await getRegimeMatch({ symbols: syms, weights: wts });
      setRegimeData(r.data.data);
    } catch(e) {
      setRegimeErr(e.response?.data?.error || e.response?.data?.detail || e.message || 'Failed to run regime match');
    }
    setRegimeLoading(false);
  }

  // ── Month 17: Load scalability analysis ──────────────────────────────────────
  async function loadScalability(syms, wts) {
    setScaleLoading(true); setScaleErr(null);
    try {
      const r = await getScalability({
        symbols:      syms,
        weights:      wts,
        totalCapital: +totalCapital,
        range:        range || '3y',
      });
      setScaleData(r.data.data);
    } catch(e) {
      setScaleErr(e.response?.data?.error || e.response?.data?.detail || e.message || 'Scalability analysis failed');
    }
    setScaleLoading(false);
  }

  // ── Month 14: Run full scanner ───────────────────────────────────────────────
  async function runScanner() {
    if (!result) return;
    const clean    = symbols.map(s => s.trim()).filter(Boolean);
    const bestStrat = result.strategies.find(s => s.name === result.bestStrategy.name) || result.strategies[0];
    const wts      = bestStrat.weights.map(w => w.weight);
    setScanLoading(true); setScanErr(null); setScanData(null);
    try {
      const r = await scanPortfolio({
        symbols:         clean,
        weights:         wts,
        totalCapital:    +totalCapital,
        targets:         [10, 15, 20],
        holdingDaysList: [90, 180, 365],
        range:           '5y'
      });
      setScanData(r.data.data);
      setShowScanner(true);
    } catch(e) {
      setScanErr(e.response?.data?.error || e.response?.data?.detail || e.message);
    }
    setScanLoading(false);
  }

  const inp  = "w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">💼 Portfolio Optimizer</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Phase 3 · Months 13–18 — Optimizer · Scanner · Event Attribution · Regime Match · Scalability · 🚀 Launch</p>
      </div>

      {/* Input panel */}
      <Card>
        <SectionHead emoji="🔧" title="Build Your Portfolio" sub="Add 2–10 NSE/BSE stocks and your total capital" />
        <div className="p-6 space-y-6">

          {/* Presets */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Quick Presets</p>
            <div className="flex flex-wrap gap-2">
              {presets.map(p => (
                <button key={p.name} onClick={() => loadPreset(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 transition-all">
                  <span>{p.emoji}</span><span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stock inputs */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Stocks ({symbols.length}/10)</p>
            <div className="space-y-2">
              {symbols.map((s, i) => (
                <StockInputRow
                  key={i} idx={i} value={s}
                  onChange={v => setSymbol(i, v)}
                  onRemove={() => removeSymbol(i)}
                  canRemove={symbols.length > 2}
                />
              ))}
            </div>
            {symbols.length < 10 && (
              <button onClick={addSymbol}
                className="mt-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">
                <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs font-black">+</span>
                Add another stock
              </button>
            )}
          </div>

          {/* Capital + range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total Capital (₹)</label>
              <input type="number" className={inp} value={totalCapital} onChange={e => setTotalCapital(e.target.value)}
                placeholder="100000" step="10000" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Historical Range</label>
              <select className={inp} value={range} onChange={e => setRange(e.target.value)}>
                <option value="1y">1 Year</option>
                <option value="3y">3 Years</option>
                <option value="5y">5 Years</option>
              </select>
            </div>
          </div>

          {err && <ErrBox msg={err} />}

          <button onClick={run} disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-black text-base rounded-xl transition-all shadow-lg hover:shadow-blue-500/25">
            {loading ? '⏳ Analyzing…' : '🚀 Optimize Portfolio'}
          </button>
        </div>
      </Card>

      {/* Loading */}
      {loading && <Spinner />}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">

          {/* Growth pattern banner */}
          <GrowthPatternBanner pattern={result.growthPattern} bestStrategy={result.bestStrategy} />

          {/* ── TAB BAR: switches between all 4 months of features ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
              {[
                { id: 'optimizer',   label: '📊 Optimizer',          sub: 'Allocation & Correlation' },
                { id: 'historical',  label: '📜 Historical Analysis', sub: timelineLoading ? 'Loading…' : timelineData ? 'Ready' : 'Click to load' },
                { id: 'scanner',     label: '🔬 Scanner',             sub: scanData ? 'Ready' : 'Click to run' },
                { id: 'attribution', label: '🔍 Event Attribution',   sub: eventData ? 'Ready' : eventLoading ? 'Analyzing…' : 'Month 15' },
                { id: 'regime',      label: '🌊 Regime Match',        sub: regimeData ? 'Ready' : regimeLoading ? 'Matching…' : 'Month 16 · New' },
                { id: 'scalability', label: '⚡ Scalability',          sub: scaleData  ? 'Ready' : scaleLoading  ? 'Analysing…' : 'Month 17 · New' },
                { id: 'launch',      label: '🚀 Launch',               sub: 'Save · Export · Share' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveResultTab(tab.id);
                    if (tab.id === 'historical' && !timelineData && !timelineLoading) {
                      const clean = symbols.map(s => s.trim()).filter(Boolean);
                      const bestStrat = result.strategies.find(s => s.name === result.bestStrategy.name) || result.strategies[0];
                      const wts = bestStrat.weights.map(w => w.weight);
                      loadTimeline(clean, wts);
                    }
                    if (tab.id === 'scanner' && !scanData && !scanLoading) runScanner();
                    if (tab.id === 'attribution' && !eventData && !eventLoading) {
                      const clean = symbols.map(s => s.trim()).filter(Boolean);
                      const bestStrat = result.strategies.find(s => s.name === result.bestStrategy.name) || result.strategies[0];
                      const wts = bestStrat.weights.map(w => w.weight);
                      loadEventAttribution(clean, wts);
                    }
                    if (tab.id === 'regime' && !regimeData && !regimeLoading) {
                      const clean = symbols.map(s => s.trim()).filter(Boolean);
                      const bestStrat = result.strategies.find(s => s.name === result.bestStrategy.name) || result.strategies[0];
                      const wts = bestStrat.weights.map(w => w.weight);
                      loadRegimeMatch(clean, wts);
                    }
                    if (tab.id === 'scalability' && !scaleData && !scaleLoading) {
                      const clean = symbols.map(s => s.trim()).filter(Boolean);
                      const bestStrat = result.strategies.find(s => s.name === result.bestStrategy.name) || result.strategies[0];
                      const wts = bestStrat.weights.map(w => w.weight);
                      loadScalability(clean, wts);
                    }
                  }}
                  className={`flex-1 shrink-0 px-5 py-4 text-left transition-colors ${
                    activeResultTab === tab.id
                      ? tab.id === 'attribution'
                        ? 'bg-purple-50 dark:bg-purple-900/20 border-b-2 border-purple-600 dark:border-purple-400'
                        : tab.id === 'regime'
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-b-2 border-indigo-600 dark:border-indigo-400'
                          : tab.id === 'scalability'
                            ? 'bg-green-50 dark:bg-green-900/20 border-b-2 border-green-600 dark:border-green-400'
                            : tab.id === 'launch'
                              ? 'bg-amber-50 dark:bg-amber-900/20 border-b-2 border-amber-600 dark:border-amber-400'
                              : 'bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <p className={`text-sm font-bold ${
                    activeResultTab === tab.id
                      ? tab.id === 'attribution' ? 'text-purple-700 dark:text-purple-300'
                        : tab.id === 'regime' ? 'text-indigo-700 dark:text-indigo-300'
                        : tab.id === 'scalability' ? 'text-green-700 dark:text-green-300'
                        : tab.id === 'launch' ? 'text-amber-700 dark:text-amber-300'
                        : 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}>{tab.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{tab.sub}</p>
                </button>
              ))}
            </div>

            {/* ── Tab: Optimizer ── */}
            {activeResultTab === 'optimizer' && (
              <div className="p-6 space-y-6">
                {/* Summary pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Best Strategy',    value: result.bestStrategy.name,                           color: 'blue'   },
                    { label: 'Portfolio CAGR',   value: (result.strategies.find(s=>s.name===result.bestStrategy.name)?.metrics.cagr ?? 0) + '%', color: result.strategies.find(s=>s.name===result.bestStrategy.name)?.metrics.cagr > 0 ? 'green' : 'red' },
                    { label: 'Data Points',      value: result.meta.dataPoints + ' days',                   color: 'gray'   },
                    { label: 'Diversif. Score',  value: result.diversification.score + '/100',              color: result.diversification.score > 60 ? 'green' : 'yellow' },
                  ].map(({ label, value, color }) => (
                    <StatPill key={label} label={label} value={value} color={color} />
                  ))}
                </div>
                <StockComparisonTable stocks={result.stockAnalysis} />
                <StrategyComparison
                  strategies={result.strategies}
                  bestStrategy={result.bestStrategy}
                  allocations={result.allocations}
                  totalCapital={result.meta.totalCapital}
                  activeStrat={activeStrat}
                  setActiveStrat={(i) => { setActiveStrat(i); setAllocStrat(result.strategies[i].name); }}
                />
                <div>
                  <div className="flex gap-2 mb-3">
                    {result.strategies.map((s) => (
                      <button key={s.name} onClick={() => setAllocStrat(s.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          allocStrat === s.name
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}>
                        {s.name === result.bestStrategy.name && '⭐ '}{s.name}
                      </button>
                    ))}
                  </div>
                  <AllocationTable
                    allocations={result.allocations}
                    totalCapital={result.meta.totalCapital}
                    stratName={allocStrat}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <CorrelationMatrix matrix={result.correlationMatrix} symbols={result.meta.symbols} />
                  <DiversificationCard div={result.diversification} />
                </div>
                <YearlyPerformance yearlyPerformance={result.yearlyPerformance} />
              </div>
            )}

            {/* ── Tab: Historical Analysis ── */}
            {activeResultTab === 'historical' && (
              <div className="p-6">
                <PortfolioTimeline
                  data={timelineData}
                  isLoading={timelineLoading}
                  error={timelineErr}
                />
                {!timelineLoading && !timelineData && !timelineErr && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <span className="text-5xl">📜</span>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Loading portfolio history…</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Scanner ── */}
            {activeResultTab === 'scanner' && (
              <div className="p-6">
                <GrowthPattern
                  data={scanData}
                  isLoading={scanLoading}
                  error={scanErr}
                />
                {!scanLoading && !scanData && !scanErr && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <span className="text-5xl">🔬</span>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Starting scanner…</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Event Attribution (Month 15) ── */}
            {activeResultTab === 'attribution' && (
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">🔍 Event Attribution — Root Cause Analysis</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    "Why did this portfolio perform the way it did?" — Correlates 5 years of performance with 60+ major Indian & global events.
                  </p>
                </div>
                <RootCauseAnalysis
                  data={eventData}
                  isLoading={eventLoading}
                  error={eventErr}
                />
              </div>
            )}

            {/* ── Tab: Regime Match (Month 16) ── */}
            {activeResultTab === 'regime' && (
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">🌊 Regime Match — Current Market vs History</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Scans 5 years of Nifty data to find periods that look like today — "Current market resembles Oct 2020" — and shows what happened next.
                  </p>
                </div>
                <RegimeMatch
                  data={regimeData}
                  isLoading={regimeLoading}
                  error={regimeErr}
                />
              </div>
            )}

            {/* ── Tab: Scalability (Month 17) ── */}
            {activeResultTab === 'scalability' && (
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">⚡ Portfolio Scalability — Stress, What-If, Rebalancing & Benchmarks</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    How does this portfolio hold up in crashes? What if you changed weights? Should you rebalance? How does it compare to Nifty 50, Sensex, Gold?
                  </p>
                </div>
                <PortfolioScalability
                  data={scaleData}
                  isLoading={scaleLoading}
                  error={scaleErr}
                />
              </div>
            )}

            {/* ── Tab: Launch (Month 18) ── */}
            {activeResultTab === 'launch' && (
              <div className="p-6">
                <div className="mb-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold mb-3">
                    🎉 Phase 3 Complete — Month 18 of 18
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">🚀 Portfolio Launch — Save, Export & Share</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Save your portfolio for later, download a full CSV report, or share your analysis with anyone.
                  </p>
                </div>
                <PortfolioReport
                  result={result}
                  symbols={symbols.map(s => s.trim()).filter(Boolean)}
                  totalCapital={totalCapital}
                  range={range}
                  sessionId={sessionId}
                />
              </div>
            )}
          </div>


          {/* Footer note */}
          <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
            ⚠️ Historical performance not a guarantee of future returns · Data from Yahoo Finance · Not SEBI registered · Not financial advice
          </p>
        </div>
      )}

      {/* ── Month 18: Saved Portfolios (always visible) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <span className="text-xl">💾</span>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Saved Portfolios</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Click Load to restore any saved portfolio · Month 18</p>
          </div>
        </div>
        <div className="p-6">
          <SavedPortfolios sessionId={sessionId} onLoad={loadSaved} />
        </div>
      </div>

      {/* ── Month 18: Compare Two Portfolios (always visible) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <span className="text-xl">🆚</span>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Portfolio Comparison</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Compare any two portfolios side-by-side · Month 18</p>
          </div>
        </div>
        <div className="p-6">
          <PortfolioCompare />
        </div>
      </div>
    </div>
  );
}
