// CapitalWizardPage.jsx — Phase 4 Month 22
// Feature 1: Kelly Criterion Calculator
// Feature 2: Staged Deployment Strategies
// Feature 3: Barbell Approach (safe + risky split)

import { useState, useEffect, useCallback } from 'react';
import {
  runCapitalWizard, getCapitalWizardMeta, getCapitalWizardPresets,
} from '../api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR  = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtP    = (n) => (Number(n) >= 0 ? '+' : '') + Number(n).toFixed(1) + '%';
const fmtN    = (n, d = 1) => Number(n).toFixed(d);
const fmtX    = (n) => Number(n).toFixed(2) + 'x';

const COLORS = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300', bar: 'bg-emerald-500' },
  green:   { bg: 'bg-green-50 dark:bg-green-900/20',     border: 'border-green-200 dark:border-green-700',     text: 'text-green-700 dark:text-green-400',     badge: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',   bar: 'bg-green-500'   },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       border: 'border-blue-200 dark:border-blue-700',       text: 'text-blue-700 dark:text-blue-400',       badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',     bar: 'bg-blue-500'    },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20',   border: 'border-violet-200 dark:border-violet-700',   text: 'text-violet-700 dark:text-violet-400',   badge: 'bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300', bar: 'bg-violet-500' },
  yellow:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20',   border: 'border-yellow-200 dark:border-yellow-700',   text: 'text-yellow-700 dark:text-yellow-400',   badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300', bar: 'bg-yellow-500' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20',   border: 'border-orange-200 dark:border-orange-700',   text: 'text-orange-700 dark:text-orange-400',   badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300', bar: 'bg-orange-500' },
  red:     { bg: 'bg-red-50 dark:bg-red-900/20',         border: 'border-red-200 dark:border-red-700',         text: 'text-red-700 dark:text-red-400',         badge: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',       bar: 'bg-red-500'     },
  gray:    { bg: 'bg-gray-50 dark:bg-gray-800',          border: 'border-gray-200 dark:border-gray-700',       text: 'text-gray-600 dark:text-gray-300',       badge: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',     bar: 'bg-gray-400'    },
};

const GRADE_COLOR = { A: 'emerald', B: 'green', C: 'yellow', D: 'red' };

// ─── Reusable UI ──────────────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 ${className}`}>{children}</div>;
}
function Head({ emoji, title, sub }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
      <span className="text-xl">{emoji}</span>
      <div><h3 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h3>{sub && <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>}</div>
    </div>
  );
}
function Spinner({ msg = 'Calculating…' }) {
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
function StatPill({ label, value, color = 'gray' }) {
  const c = COLORS[color] || COLORS.gray;
  return (
    <div className={`rounded-xl border p-3 ${c.bg} ${c.border}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={`text-xl font-black ${c.text}`}>{value}</p>
    </div>
  );
}

// ─── Section 1: Kelly Result Cards ────────────────────────────────────────────
function KellyCards({ kelly, totalCapital }) {
  const modes = [
    { key: 'full',    label: 'Full Kelly',    emoji: '🔥', color: 'red',    desc: 'Maximum mathematical edge. Very volatile. Not recommended for most.' },
    { key: 'half',    label: 'Half Kelly',    emoji: '✅', color: 'green',  desc: 'Industry standard. Halves variance while keeping most of the EV.' },
    { key: 'quarter', label: 'Quarter Kelly', emoji: '🛡️', color: 'blue',   desc: 'Conservative. Best for beginners or high-uncertainty setups.' },
  ];
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Kelly Fractions</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {modes.map(m => {
          const frac = kelly[m.key] * 100;
          const amt  = totalCapital * kelly[m.key];
          const c    = COLORS[m.color];
          return (
            <div key={m.key} className={`rounded-2xl border-2 p-4 ${c.bg} ${c.border}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{m.emoji}</span>
                <p className={`font-black text-sm ${c.text}`}>{m.label}</p>
              </div>
              <p className={`text-3xl font-black ${c.text} mb-0.5`}>{fmtN(frac, 1)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">{fmtINR(amt)} of capital</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{m.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section 2: Trade Stats Summary ──────────────────────────────────────────
function TradeStats({ stats, kelly }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatPill label="Win Rate"  value={fmtN(kelly.winRate, 1) + '%'}   color={kelly.winRate > 55 ? 'green' : kelly.winRate > 45 ? 'blue' : 'orange'} />
      <StatPill label="Avg Win"   value={fmtP(kelly.avgWin)}              color="green" />
      <StatPill label="Avg Loss"  value={fmtP(-kelly.avgLoss)}            color="red" />
      <StatPill label="Reward:Risk Ratio" value={fmtN(kelly.R, 2) + ':1'} color={kelly.R > 1.5 ? 'emerald' : kelly.R > 1 ? 'blue' : 'red'} />
    </div>
  );
}

// ─── Section 3: Staged Deployment Plan ────────────────────────────────────────
function DeploymentPlan({ deployment, meta }) {
  const [selectedStrategy, setSelectedStrategy] = useState(Object.keys(deployment.plans)[1]);
  const plan = deployment.plans[selectedStrategy];

  const stratBtns = Object.entries(deployment.plans).map(([key, p]) => ({ key, label: p.emoji + ' ' + p.name }));

  return (
    <Card>
      <Head emoji="📅" title="Staged Deployment Plan" sub={`Kelly suggests deploying ${fmtINR(deployment.deployCapital)} (${deployment.deployPct}%) · Keep ${fmtINR(deployment.keepSafe)} (${deployment.safePct}%) safe`} />
      <div className="p-5 space-y-5">

        {/* Deploy vs Keep */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 p-4">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">🟢 Deploy (Kelly Suggested)</p>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{fmtINR(deployment.deployCapital)}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">{deployment.deployPct}% of total capital</p>
          </div>
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-4">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">🔵 Keep Safe</p>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{fmtINR(deployment.keepSafe)}</p>
            <p className="text-xs text-blue-600 dark:text-blue-500">{deployment.safePct}% — cash, FD, or liquid fund</p>
          </div>
        </div>

        {/* Strategy picker */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Choose Entry Strategy</p>
          <div className="flex flex-wrap gap-2">
            {stratBtns.map(s => (
              <button key={s.key} onClick={() => setSelectedStrategy(s.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  selectedStrategy === s.key
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-violet-300'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected plan detail */}
        {plan && (
          <div className="space-y-4">
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-xl p-4">
              <p className="font-black text-violet-800 dark:text-violet-300 mb-1">{plan.emoji} {plan.name}</p>
              <p className="text-sm text-violet-700 dark:text-violet-400 mb-3">{plan.desc}</p>
              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-bold text-green-700 dark:text-green-400 mb-1">✅ Pros</p>
                  {plan.pros.map((p, i) => <p key={i} className="text-gray-600 dark:text-gray-400">• {p}</p>)}
                </div>
                <div>
                  <p className="font-bold text-red-700 dark:text-red-400 mb-1">⚠️ Cons</p>
                  {plan.cons.map((c, i) => <p key={i} className="text-gray-600 dark:text-gray-400">• {c}</p>)}
                </div>
              </div>
            </div>

            {/* Stages */}
            <div className="space-y-3">
              {plan.stages.map((stage, i) => {
                const pct = (stage.amount / deployment.deployCapital) * 100;
                return (
                  <div key={i} className="flex items-start gap-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center font-black text-sm">
                      {stage.stage}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{stage.label}</p>
                        <p className="text-xl font-black text-violet-700 dark:text-violet-400">{fmtINR(stage.amount)}</p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">({fmtN(pct, 0)}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full mb-1">
                        <div className="h-2 bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">📋 {stage.condition}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Section 4: Barbell Strategy ──────────────────────────────────────────────
function BarbellSection({ barbell, onSafePctChange }) {
  const [localSafe, setLocalSafe] = useState(barbell.safePct);

  return (
    <Card>
      <Head emoji="🏋️" title="Barbell Strategy" sub="Extreme safety on one end + high-risk bets on the other — no middle ground" />
      <div className="p-5 space-y-5">

        {/* Concept explanation */}
        <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
          💡 <strong className="text-gray-900 dark:text-white">Nassim Taleb's Barbell:</strong> Put 90% in the safest possible assets (FDs, liquid funds) and 10% in the riskiest possible bets (small caps, sector themes). Never invest in "medium risk" instruments — they give mediocre returns without protecting against tail risk.
        </div>

        {/* Safe / Risky split visual */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-blue-600 dark:text-blue-400">🔵 Safe: {barbell.safePct}% — {fmtINR(barbell.safeCapital)}</span>
            <span className="text-red-500 dark:text-red-400">🔴 Risky: {barbell.riskyPct}% — {fmtINR(barbell.riskyCapital)}</span>
          </div>
          <div className="h-6 rounded-full overflow-hidden flex">
            <div className="bg-blue-500 h-full flex items-center justify-center text-white font-black text-xs" style={{ width: `${barbell.safePct}%` }}>
              {barbell.safePct > 15 ? `${barbell.safePct}% Safe` : ''}
            </div>
            <div className="bg-red-500 h-full flex items-center justify-center text-white font-black text-xs flex-1">
              {barbell.riskyPct > 10 ? `${barbell.riskyPct}% Risky` : ''}
            </div>
          </div>
        </div>

        {/* Quick Archetype presets */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Barbell Archetypes</p>
          <div className="space-y-2">
            {barbell.archetypes.map((arch, i) => (
              <button key={i}
                onClick={() => onSafePctChange(+arch.safePct)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                  Math.abs(localSafe - arch.safePct) < 3
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700'
                }`}>
                <span className="text-xl">{arch.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 dark:text-white text-xs">{arch.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{arch.desc}</p>
                </div>
                <span className="text-xs font-black text-blue-600 dark:text-blue-400 flex-shrink-0">{arch.safePct}% safe</span>
              </button>
            ))}
          </div>
        </div>

        {/* Safe instrument options */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Safe Allocation Options ({fmtINR(barbell.safeCapital)})</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  {['Instrument', 'Expected Return', 'Risk', 'Liquidity'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {barbell.allSafeInstruments.map((inst, i) => (
                  <tr key={i} className="border-t border-gray-50 dark:border-gray-700/30">
                    <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">{inst.name}</td>
                    <td className="px-3 py-2 text-green-600 dark:text-green-400 font-bold">{inst.expectedReturn}% p.a.</td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold">{inst.risk}</span></td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{inst.liquidity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scenarios */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Portfolio Scenarios (1 Year)</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {barbell.scenarios.map((sc, i) => {
              const c = COLORS[sc.color] || COLORS.gray;
              const positive = sc.portPL >= 0;
              return (
                <div key={i} className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
                  <p className={`font-bold text-sm mb-1 ${c.text}`}>{sc.emoji} {sc.name}</p>
                  <p className={`text-2xl font-black ${positive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {fmtP(sc.portReturn)}
                  </p>
                  <p className={`text-sm font-bold ${positive ? 'text-green-600' : 'text-red-600'} mb-2`}>
                    {positive ? '+' : ''}{fmtINR(sc.portPL)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Safe: {fmtP(sc.safeReturn)} · Risky: {fmtP(sc.riskyReturn)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risky profile detail */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
          <p className="font-bold text-red-800 dark:text-red-300 text-sm mb-1">
            🔴 Risky Portion Profile: {barbell.riskyProfile.emoji} {barbell.riskyProfile.label}
          </p>
          <p className="text-xs text-red-700 dark:text-red-400 mb-2">{barbell.riskyProfile.desc}</p>
          <div className="grid grid-cols-3 gap-3 text-xs mb-2">
            <div><p className="text-gray-500">Expected Return</p><p className="font-black text-red-700 dark:text-red-400">{fmtP(barbell.riskyProfile.expectedRet)}/yr</p></div>
            <div><p className="text-gray-500">Max Drawdown</p><p className="font-black text-red-700 dark:text-red-400">{fmtP(barbell.riskyProfile.maxDD)}</p></div>
            <div><p className="text-gray-500">Beta vs Nifty</p><p className="font-black text-red-700 dark:text-red-400">{barbell.riskyProfile.betaVsNifty}x</p></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Examples: {barbell.riskyProfile.examples.map(s => s.replace('.NS','')).join(', ')}</p>
        </div>
      </div>
    </Card>
  );
}

// ─── Section 5: Multi-Stock Comparison ───────────────────────────────────────
function MultiStockTable({ data }) {
  if (!data || !data.stocks || data.stocks.length === 0) return null;
  return (
    <Card>
      <Head emoji="🏆" title="Kelly-Ranked Stock Comparison" sub="Best allocation based on each stock's historical win rate" />
      <div className="p-5 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                {['Rank','Stock','Grade','Win Rate','Avg Win','Avg Loss','R:R','Half Kelly','Your Allocation','Portfolio Wt'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.stocks.map((s, i) => {
                const gc = COLORS[GRADE_COLOR[s.grade]] || COLORS.gray;
                return (
                  <tr key={i} className="border-t border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                    <td className="px-3 py-2.5 font-black text-gray-400 dark:text-gray-600">#{i+1}</td>
                    <td className="px-3 py-2.5 font-black text-gray-900 dark:text-white">{s.symbol}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full font-black text-sm ${gc.badge}`}>{s.grade}</span>
                    </td>
                    <td className={`px-3 py-2.5 font-bold ${s.winRate > 55 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>{fmtN(s.winRate,1)}%</td>
                    <td className="px-3 py-2.5 text-green-600 dark:text-green-400 font-bold">{fmtP(s.avgWin)}</td>
                    <td className="px-3 py-2.5 text-red-600 dark:text-red-400 font-bold">{fmtP(-s.avgLoss)}</td>
                    <td className={`px-3 py-2.5 font-bold ${s.R > 1.5 ? 'text-emerald-600 dark:text-emerald-400' : s.R > 1 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{fmtN(s.R,2)}</td>
                    <td className="px-3 py-2.5 text-violet-600 dark:text-violet-400 font-bold">{s.halfKelly}%</td>
                    <td className="px-3 py-2.5 font-black text-gray-900 dark:text-white">{fmtINR(s.portfolioAmount)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className="h-2 bg-violet-500 rounded-full" style={{ width: `${Math.min(s.portfolioWeight, 100)}%` }} />
                        </div>
                        <span className="text-gray-500 dark:text-gray-400">{s.portfolioWeight}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <StatPill label="Total Deployed"    value={fmtINR(data.totalAllocated)}   color="violet" />
          <StatPill label="Cash Reserve"      value={fmtINR(data.cashReserve)}       color="blue" />
          <StatPill label="Cash Reserve %"    value={data.cashReservePct + '%'}      color="blue" />
        </div>
      </div>
    </Card>
  );
}

// ─── Section 6: Risk & Projections ────────────────────────────────────────────
function RiskProjections({ riskOfRuin, projections, totalCapital }) {
  return (
    <Card>
      <Head emoji="📈" title="Capital Growth Projections" sub="Based on Kelly fraction + historical win rate compounded over time" />
      <div className="p-5 space-y-5">

        {/* Risk of ruin */}
        <div className={`rounded-xl border p-4 ${riskOfRuin > 30 ? COLORS.red.bg + ' ' + COLORS.red.border : riskOfRuin > 10 ? COLORS.orange.bg + ' ' + COLORS.orange.border : COLORS.green.bg + ' ' + COLORS.green.border}`}>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Risk of Drawdown &gt;75% (over 20 trades)</p>
          <p className={`text-3xl font-black ${riskOfRuin > 30 ? COLORS.red.text : riskOfRuin > 10 ? COLORS.orange.text : COLORS.green.text}`}>
            {riskOfRuin}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {riskOfRuin > 30 ? '⚠️ High risk — consider reducing position size' : riskOfRuin > 10 ? '⚠️ Moderate risk — acceptable with strict stops' : '✅ Low risk — Kelly sizing is appropriate'}
          </p>
        </div>

        {/* Growth projections */}
        <div className="grid sm:grid-cols-4 gap-3">
          {projections.map(p => {
            const growth = p.projected - totalCapital;
            const positive = growth >= 0;
            return (
              <div key={p.months} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{p.months} months ({p.trades} trades)</p>
                <p className={`text-xl font-black ${positive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {fmtINR(p.projected)}
                </p>
                <p className={`text-xs font-bold ${positive ? 'text-green-600' : 'text-red-600'}`}>
                  {positive ? '+' : ''}{fmtINR(growth)} ({fmtX(p.growthFactor)})
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-600">⚠️ Projections assume consistent win rate and Kelly sizing. Past performance ≠ future results. Not financial advice.</p>
      </div>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CapitalWizardPage() {
  const [meta,     setMeta]     = useState(null);
  const [presets,  setPresets]  = useState([]);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState(null);
  const [safePct,  setSafePct]  = useState(80);

  // Form state
  const [symbol,          setSymbol]         = useState('RELIANCE');
  const [symbolsRaw,      setSymbolsRaw]     = useState('RELIANCE, TCS, HDFCBANK');
  const [totalCapital,    setTotalCapital]   = useState(100000);
  const [targetPct,       setTargetPct]      = useState(15);
  const [holdDays,        setHoldDays]       = useState(30);
  const [kellyMode,       setKellyMode]      = useState('half');
  const [deployStrategy,  setDeployStrategy] = useState('three_stage');
  const [riskyProfile,    setRiskyProfile]   = useState('large_cap_momentum');
  const [multiMode,       setMultiMode]      = useState(false);

  useEffect(() => {
    getCapitalWizardMeta().then(r => setMeta(r.data.data)).catch(() => {});
    getCapitalWizardPresets().then(r => setPresets(r.data.data || [])).catch(() => {});
  }, []);

  // Update barbell safePct
  const handleSafePctChange = useCallback((v) => {
    setSafePct(v);
    if (result) {
      setResult(prev => ({ ...prev, barbell: { ...prev.barbell, safePct: v } }));
    }
  }, [result]);

  async function analyze() {
    setLoading(true); setErr(null);
    try {
      const symbols = multiMode
        ? symbolsRaw.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const r = await runCapitalWizard({
        symbol:         multiMode ? undefined : symbol,
        symbols,
        totalCapital:   +totalCapital,
        targetPct:      +targetPct,
        holdDays:       +holdDays,
        safePct:        +safePct,
        riskyProfile,
        deployStrategy,
        kellyMode,
      });
      setResult(r.data.data);
      window.scrollTo({ top: 500, behavior: 'smooth' });
    } catch (e) {
      setErr(e.response?.data?.detail || e.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  function applyPreset(p) {
    setSafePct(p.safePct);
    setRiskyProfile(p.riskyProfile);
    setKellyMode(p.kellyMode);
    setDeployStrategy(p.deployStrategy);
    setTargetPct(p.targetPct);
    setHoldDays(p.holdDays);
  }

  const inp = "w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const sel = inp;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold mb-3">
          🧮 Phase 4 · Month 22 — Capital Wizard
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">🧮 Capital Allocation Wizard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Kelly Criterion · Staged Deployment · Barbell Strategy · Multi-stock comparison
        </p>
      </div>

      {/* Presets */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Investor Profile Presets</p>
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all">
                {p.label}
                <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal text-xs">{p.safePct}% safe</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Config Panel */}
      <Card>
        <Head emoji="⚙️" title="Configure Your Analysis" sub="Enter your capital and trading parameters" />
        <div className="p-5 space-y-5">

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button onClick={() => setMultiMode(false)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${!multiMode ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
              📈 Single Stock Kelly
            </button>
            <button onClick={() => setMultiMode(true)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${multiMode ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
              🏆 Multi-Stock Comparison
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Symbol(s) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                {multiMode ? 'Stocks (comma separated)' : 'Stock Symbol'}
              </label>
              {multiMode
                ? <input type="text" className={inp} value={symbolsRaw} onChange={e => setSymbolsRaw(e.target.value.toUpperCase())} placeholder="RELIANCE, TCS, HDFCBANK, INFY" />
                : <input type="text" className={inp} value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="RELIANCE" />
              }
            </div>

            {/* Total Capital */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total Capital (₹)</label>
              <input type="number" className={inp} value={totalCapital} onChange={e => setTotalCapital(+e.target.value)} min="1000" step="1000" />
            </div>

            {/* Target % */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Target Return (%)</label>
              <input type="number" className={inp} value={targetPct} onChange={e => setTargetPct(+e.target.value)} min="1" max="100" step="1" />
              <p className="text-xs text-gray-400 mt-1">A trade is a "win" if it returns ≥ this %</p>
            </div>

            {/* Hold Days */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Hold Period (Days)</label>
              <select className={sel} value={holdDays} onChange={e => setHoldDays(+e.target.value)}>
                {[7, 14, 21, 30, 45, 60, 90, 180].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>

            {/* Kelly Mode */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Kelly Fraction</label>
              <select className={sel} value={kellyMode} onChange={e => setKellyMode(e.target.value)}>
                {(meta?.kellyModes || [
                  { key: 'full',    label: 'Full Kelly' },
                  { key: 'half',    label: 'Half Kelly (Recommended)' },
                  { key: 'quarter', label: 'Quarter Kelly' },
                ]).map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
            </div>

            {/* Deploy Strategy */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Entry Strategy</label>
              <select className={sel} value={deployStrategy} onChange={e => setDeployStrategy(e.target.value)}>
                {(meta?.deployStrategies || []).map(s => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
              </select>
            </div>

            {/* Safe % (Barbell) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Safe Allocation % (Barbell)</label>
              <input type="range" min="50" max="95" step="5" value={safePct} onChange={e => setSafePct(+e.target.value)} className="w-full accent-blue-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>50% safe</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{safePct}% safe</span>
                <span>95% safe</span>
              </div>
            </div>

            {/* Risky Profile */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Risky Portion Profile</label>
              <select className={sel} value={riskyProfile} onChange={e => setRiskyProfile(e.target.value)}>
                {(meta?.riskyProfiles || []).map(p => <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>)}
              </select>
            </div>
          </div>

          {err && <ErrBox msg={err} />}

          <button onClick={analyze} disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 text-white font-black text-base rounded-xl transition-all shadow-lg hover:shadow-amber-500/30">
            {loading ? '⏳ Calculating…' : '🧮 Calculate Optimal Allocation'}
          </button>
        </div>
      </Card>

      {/* Loading */}
      {loading && <Spinner msg="Analysing 5 years of historical trade data…" />}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">

          {/* Hero summary */}
          <div className="grid sm:grid-cols-4 gap-3">
            <StatPill label="Total Capital"        value={fmtINR(result.kelly.deployAmount + (result.deployment?.keepSafe || 0))} color="gray" />
            <StatPill label="Kelly Deploy Amount"  value={fmtINR(result.kelly.deployAmount)} color="violet" />
            <StatPill label="Kelly Fraction"       value={result.kelly.fractionPct + '%'}    color={result.kelly.fractionPct > 20 ? 'orange' : 'emerald'} />
            <StatPill label="Risk of Ruin"         value={result.riskOfRuin + '%'}            color={result.riskOfRuin > 30 ? 'red' : result.riskOfRuin > 10 ? 'orange' : 'green'} />
          </div>

          {/* Kelly cards */}
          <Card>
            <Head emoji="🧮" title="Kelly Criterion Results"
              sub={`Based on ${result.stats.total} historical trades · Win rate: ${fmtN(result.kelly.winRate,1)}% · R:R ${fmtN(result.kelly.R,2)}:1`} />
            <div className="p-5 space-y-5">
              <TradeStats stats={result.stats} kelly={result.kelly} />
              <KellyCards kelly={result.kelly} totalCapital={result.meta.totalCapital || totalCapital} />
            </div>
          </Card>

          {/* Staged deployment */}
          {result.deployment && (
            <DeploymentPlan deployment={result.deployment} meta={result.meta} />
          )}

          {/* Barbell */}
          {result.barbell && (
            <BarbellSection
              barbell={{ ...result.barbell, safePct }}
              onSafePctChange={handleSafePctChange}
            />
          )}

          {/* Multi-stock */}
          <MultiStockTable data={result.multiStockComparison} />

          {/* Risk + projections */}
          {result.projections && (
            <RiskProjections
              riskOfRuin={result.riskOfRuin}
              projections={result.projections}
              totalCapital={result.meta.totalCapital || totalCapital}
            />
          )}

          <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
            ⚠️ Kelly Criterion analysis based on historical price data from Yahoo Finance. Results are mathematical estimates only.
            Markets can and do behave differently in the future. Not SEBI registered. Not financial advice.
          </p>
        </div>
      )}
    </div>
  );
}
