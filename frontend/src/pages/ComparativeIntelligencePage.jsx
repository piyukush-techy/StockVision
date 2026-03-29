// ComparativeIntelligencePage.jsx — Month 10: Comparative Intelligence
// 4 features: Stock vs Nifty | Stock vs Sector | Peer Strength | Risk-Adjusted
import { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TABS = [
  { id: 'nifty',  icon: '📊', label: 'Vs Nifty 50'       },
  { id: 'sector', icon: '🏭', label: 'Vs Sector'          },
  { id: 'peers',  icon: '🔗', label: 'Peer Strength'      },
  { id: 'risk',   icon: '⚖️', label: 'Risk-Adjusted'      },
];

const QUICK = ['RELIANCE','TCS','HDFCBANK','INFY','SBIN','BAJFINANCE','TATAMOTORS','SUNPHARMA','MARUTI','LT'];

function norm(s) {
  const u = s.trim().toUpperCase();
  return (u.startsWith('^') || u.includes('.')) ? u : u + '.NS';
}

// ─── Shared mini-components ─────────────────────────────────────────────────

function RetBadge({ v }) {
  if (v == null) return <span className="text-gray-400 text-xs">—</span>;
  const pos = v >= 0;
  return (
    <span className={`font-bold text-sm ${pos ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      {pos ? '+' : ''}{v.toFixed(2)}%
    </span>
  );
}

function AlphaBadge({ v }) {
  if (v == null) return <span className="text-gray-400 text-xs">—</span>;
  const pos = v >= 0;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
      pos ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    }`}>
      {pos ? '▲' : '▼'} {Math.abs(v).toFixed(2)}%
    </span>
  );
}

function MetricCard({ label, stock, nifty, unit = '', higherBetter = true, invert = false }) {
  const sv = stock ?? null;
  const nv = nifty ?? null;
  const better = sv != null && nv != null
    ? (higherBetter ? sv > nv : sv < nv)
    : null;
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold uppercase tracking-wide">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Stock</p>
          <p className={`text-xl font-black ${
            better === null ? 'text-gray-900 dark:text-white'
            : better ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {sv != null ? `${sv}${unit}` : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-0.5">Nifty</p>
          <p className="text-base font-bold text-gray-500 dark:text-gray-400">
            {nv != null ? `${nv}${unit}` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
      </div>
      <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
    </div>
  );
}

function ErrBox({ msg, onRetry }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
      <p className="text-4xl mb-3">⚠️</p>
      <p className="font-bold text-red-700 dark:text-red-400 mb-1">{msg}</p>
      <p className="text-sm text-red-600/70 dark:text-red-400/60 mb-4">Ensure symbol ends with .NS (e.g. RELIANCE.NS)</p>
      <button onClick={onRetry} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">
        Try Again
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 1 — Stock vs Nifty 50
// ═══════════════════════════════════════════════════════════════
function VsNiftyTab({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await axios.get(`${API}/api/comparative/vs-nifty-full/${norm(symbol)}`);
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load comparison');
    } finally { setLoading(false); }
  }

  if (!symbol) return <p className="text-center text-gray-400 py-12">Enter a symbol above to analyse</p>;
  if (!data && !loading && !error) return (
    <div className="text-center py-12">
      <p className="text-gray-500 dark:text-gray-400 mb-4">See how <strong className="text-gray-900 dark:text-white">{symbol.replace('.NS','')}</strong> compares to Nifty 50 across 6 time periods</p>
      <button onClick={load} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">Analyse vs Nifty →</button>
    </div>
  );
  if (loading) return <LoadSkeleton />;
  if (error)   return <ErrBox msg={error} onRetry={load} />;

  const { periods, verdict, outperformCount, totalPeriods, riskComparison } = data;

  const verdictColor =
    verdict.includes('Strong Out') ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
    verdict.includes('Outperform') ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
    verdict.includes('Mixed')      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                     'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';

  return (
    <div className="space-y-6">
      {/* Verdict banner */}
      <div className={`rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 ${verdictColor}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">{symbol.replace('.NS','')} vs Nifty 50 — Overall Verdict</p>
          <p className="text-2xl font-black">{verdict}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black">{outperformCount}/{totalPeriods}</p>
          <p className="text-sm font-semibold opacity-80">periods outperformed</p>
        </div>
      </div>

      {/* Period-by-period table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white">Period-by-Period Returns vs Nifty 50</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Period</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">{symbol.replace('.NS','')}</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Nifty 50</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Alpha</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Result</th>
              </tr>
            </thead>
            <tbody>
              {periods.map(p => (
                <tr key={p.key} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-gray-700 dark:text-gray-300">{p.label}</td>
                  <td className="py-3.5 px-4 text-right"><RetBadge v={p.stockRet} /></td>
                  <td className="py-3.5 px-4 text-right"><RetBadge v={p.niftyRet} /></td>
                  <td className="py-3.5 px-4 text-right"><AlphaBadge v={p.alpha} /></td>
                  <td className="py-3.5 px-4 text-center">
                    {p.outperforms === null ? '—'
                    : p.outperforms
                      ? <span className="text-green-600 dark:text-green-400 font-bold">✓ Beats</span>
                      : <span className="text-red-500 dark:text-red-400 font-bold">✗ Lags</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">📐 Risk Metrics Comparison</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard label="Sharpe Ratio"    stock={riskComparison.stock.sharpe}   nifty={riskComparison.nifty.sharpe}   higherBetter={true}  />
          <MetricCard label="Sortino Ratio"   stock={riskComparison.stock.sortino}  nifty={riskComparison.nifty.sortino}  higherBetter={true}  />
          <MetricCard label="Calmar Ratio"    stock={riskComparison.stock.calmar}   nifty={riskComparison.nifty.calmar}   higherBetter={true}  />
          <MetricCard label="Volatility (%)"  stock={riskComparison.stock.vol}      nifty={riskComparison.nifty.vol}      higherBetter={false} unit="%" />
          <MetricCard label="Max Drawdown"    stock={riskComparison.stock.drawdown} nifty={riskComparison.nifty.drawdown} higherBetter={false} unit="%" />
          <MetricCard label="1-Year Return"   stock={data.periods.find(p=>p.key==='r1Y')?.stockRet} nifty={data.periods.find(p=>p.key==='r1Y')?.niftyRet} higherBetter={true} unit="%" />
        </div>
      </div>

      <button onClick={() => setData(null)} className="text-sm text-gray-400 hover:text-blue-500 transition-colors">← Analyse different period</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 2 — Stock vs Sector
// ═══════════════════════════════════════════════════════════════
function VsSectorTab({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await axios.get(`${API}/api/comparative/vs-sector/${norm(symbol)}`);
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load sector comparison');
    } finally { setLoading(false); }
  }

  if (!symbol) return <p className="text-center text-gray-400 py-12">Enter a symbol above</p>;
  if (!data && !loading && !error) return (
    <div className="text-center py-12">
      <p className="text-gray-500 dark:text-gray-400 mb-4">Compare <strong className="text-gray-900 dark:text-white">{symbol.replace('.NS','')}</strong> against its sector benchmark</p>
      <button onClick={load} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all">Analyse vs Sector →</button>
    </div>
  );
  if (loading) return <LoadSkeleton />;
  if (error)   return <ErrBox msg={error} onRetry={load} />;

  const { rows, summary } = data;
  const vColor =
    summary.verdict === 'Sector Leader'      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' :
    summary.verdict === 'In Line with Sector'? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800':
                                               'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4 ${vColor}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">{symbol.replace('.NS','')} — {data.sector}</p>
          <p className="text-2xl font-black">{summary.verdict}</p>
          <p className="text-sm opacity-80 mt-1">Sector proxy: {data.sectorProxy.replace('.NS','')}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black">{summary.outperformCount}/{summary.totalPeriods}</p>
          <p className="text-sm font-semibold opacity-80">periods beat sector</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white">Returns: Stock vs Sector vs Nifty</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Period</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">{symbol.replace('.NS','')}</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Sector</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Nifty</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">vs Sector</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-gray-700 dark:text-gray-300">{row.label}</td>
                  <td className="py-3.5 px-4 text-right"><RetBadge v={row.stockRet} /></td>
                  <td className="py-3.5 px-4 text-right"><RetBadge v={row.sectorRet} /></td>
                  <td className="py-3.5 px-4 text-right"><RetBadge v={row.niftyRet} /></td>
                  <td className="py-3.5 px-4 text-right"><AlphaBadge v={row.alphaVsSector} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk vs Sector */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">📐 Risk vs Sector Benchmark</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard label="Sharpe Ratio"  stock={summary.stockSharpe}   nifty={summary.sectorSharpe}   higherBetter={true} />
          <MetricCard label="Volatility"    stock={summary.stockVol}       nifty={summary.sectorVol}       higherBetter={false} unit="%" />
          <MetricCard label="Max Drawdown"  stock={summary.stockDrawdown}  nifty={summary.sectorDrawdown}  higherBetter={false} unit="%" />
        </div>
      </div>

      <button onClick={() => setData(null)} className="text-sm text-gray-400 hover:text-blue-500 transition-colors">← Reset</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 3 — Peer Relative Strength
// ═══════════════════════════════════════════════════════════════
function PeerStrengthTab({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('r3M');

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await axios.get(`${API}/api/comparative/peer-strength/${norm(symbol)}`);
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Peer analysis failed');
    } finally { setLoading(false); }
  }

  if (!symbol) return <p className="text-center text-gray-400 py-12">Enter a symbol above</p>;
  if (!data && !loading && !error) return (
    <div className="text-center py-12">
      <p className="text-gray-500 dark:text-gray-400 mb-4">Rank <strong className="text-gray-900 dark:text-white">{symbol.replace('.NS','')}</strong> against its sector peers</p>
      <button onClick={load} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all">Analyse Peer Strength →</button>
    </div>
  );
  if (loading) return <LoadSkeleton />;
  if (error)   return <ErrBox msg={error} onRetry={load} />;

  const { rsScore, rsLabel, peers, sector, rankings } = data;

  const scoreColor =
    rsScore >= 70 ? 'text-green-600 dark:text-green-400' :
    rsScore >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';

  const sortedPeers = [...peers].sort((a, b) => (b[sortBy] ?? -999) - (a[sortBy] ?? -999));

  return (
    <div className="space-y-6">
      {/* RS Score */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Relative Strength Score — {sector}</p>
            <p className={`text-5xl font-black ${scoreColor}`}>{rsScore}</p>
            <p className={`text-lg font-bold mt-1 ${scoreColor}`}>{rsLabel}</p>
          </div>
          {/* Score arc */}
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" strokeDasharray="251" strokeDashoffset="0" />
              <circle cx="60" cy="60" r="50" fill="none"
                stroke={rsScore >= 70 ? '#22c55e' : rsScore >= 40 ? '#f59e0b' : '#ef4444'}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray="251"
                strokeDashoffset={251 - (rsScore / 100) * 251}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-black ${scoreColor}`}>{rsScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Peer Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold text-gray-900 dark:text-white">Peer Comparison — {sector}</h3>
          <div className="flex gap-2">
            {['r1M','r3M','r6M','r1Y'].map(p => (
              <button key={p} onClick={() => setSortBy(p)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  sortBy === p ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                {p.replace('r','')}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Rank</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Symbol</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">1M</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">3M</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">6M</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">1Y</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Volatility</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Sharpe</th>
              </tr>
            </thead>
            <tbody>
              {sortedPeers.map((p, idx) => (
                <tr key={p.symbol}
                  className={`border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-colors ${
                    p.isTarget ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}>
                  <td className="py-3.5 px-4">
                    <span className={`w-7 h-7 inline-flex items-center justify-center rounded-full text-xs font-black ${
                      idx === 0 ? 'bg-yellow-400 text-yellow-900'
                      : idx === 1 ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                      : idx === 2 ? 'bg-orange-300 text-orange-900'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>{idx + 1}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`font-bold ${p.isTarget ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                      {p.symbol.replace('.NS','')}
                    </span>
                    {p.isTarget && <span className="ml-2 px-1.5 py-0.5 bg-blue-600 text-white rounded text-xs font-bold">YOU</span>}
                  </td>
                  <td className="py-3.5 px-4 text-right"><RetBadge v={p.r1M} /></td>
                  <td className="py-3.5 px-4 text-right"><RetBadge v={p.r3M} /></td>
                  <td className="py-3.5 px-4 text-right"><RetBadge v={p.r6M} /></td>
                  <td className="py-3.5 px-4 text-right"><RetBadge v={p.r1Y} /></td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-gray-700 dark:text-gray-300 text-sm">{p.vol != null ? `${p.vol}%` : '—'}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className={`text-sm font-bold ${p.sharpe >= 1 ? 'text-green-600 dark:text-green-400' : p.sharpe >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {p.sharpe != null ? p.sharpe : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={() => setData(null)} className="text-sm text-gray-400 hover:text-blue-500 transition-colors">← Reset</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 4 — Risk-Adjusted Outperformance
// ═══════════════════════════════════════════════════════════════
function RiskAdjustedTab({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await axios.get(`${API}/api/comparative/risk-adjusted/${norm(symbol)}`);
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Risk analysis failed');
    } finally { setLoading(false); }
  }

  if (!symbol) return <p className="text-center text-gray-400 py-12">Enter a symbol above</p>;
  if (!data && !loading && !error) return (
    <div className="text-center py-12">
      <p className="text-gray-500 dark:text-gray-400 mb-4">Deep risk-adjusted analysis for <strong className="text-gray-900 dark:text-white">{symbol.replace('.NS','')}</strong></p>
      <button onClick={load} className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all">Analyse Risk-Adjusted Returns →</button>
    </div>
  );
  if (loading) return <LoadSkeleton />;
  if (error)   return <ErrBox msg={error} onRetry={load} />;

  const { score, scoreLabel, scoreBg, metrics, nifty, interpret } = data;

  const bgGrad =
    scoreBg === 'green'  ? 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800' :
    scoreBg === 'yellow' ? 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800' :
                           'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800';
  const scoreCol =
    scoreBg === 'green' ? 'text-green-700 dark:text-green-300' :
    scoreBg === 'yellow'? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300';

  const METRIC_ROWS = [
    { label: 'Sharpe Ratio',        desc: 'Return per unit of total risk (higher = better)', sk: 'sharpe',    nk: 'sharpe',    hb: true },
    { label: 'Sortino Ratio',       desc: 'Return per unit of downside risk only',            sk: 'sortino',   nk: 'sortino',   hb: true },
    { label: 'Calmar Ratio',        desc: 'Annualised return ÷ max drawdown',                 sk: 'calmar',    nk: 'calmar',    hb: true },
    { label: 'Information Ratio',   desc: 'Active return ÷ tracking error vs Nifty',          sk: 'infoRatio', nk: null,        hb: true },
    { label: '1-Year Alpha',        desc: 'Return above Nifty 50 in 1 year',                  sk: 'alpha1Y',   nk: null,        hb: true, unit: '%' },
    { label: 'Volatility',          desc: 'Annualised standard deviation of daily returns',   sk: 'vol',       nk: 'vol',       hb: false, unit: '%' },
    { label: 'Max Drawdown',        desc: 'Worst peak-to-trough decline in 1 year',           sk: 'drawdown',  nk: 'drawdown',  hb: false, unit: '%' },
    { label: 'Tracking Error',      desc: 'Vol difference vs Nifty (lower = closer to index)',sk: 'trackingErr',nk: null,       hb: false, unit: '%' },
  ];

  return (
    <div className="space-y-6">
      {/* Score banner */}
      <div className={`bg-gradient-to-r border rounded-2xl p-6 ${bgGrad}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">Risk-Adjusted Score — {symbol.replace('.NS','')}</p>
            <p className={`text-4xl font-black ${scoreCol}`}>{score}/100</p>
            <p className={`text-lg font-bold mt-1 ${scoreCol}`}>{scoreLabel}</p>
          </div>
          {/* Score bar */}
          <div className="flex-1 min-w-48">
            <div className="h-4 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${
                scoreBg === 'green' ? 'bg-green-500' : scoreBg === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
              }`} style={{ width: `${score}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-1 opacity-60">
              <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white">All Risk Metrics vs Nifty 50</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Metric</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">{symbol.replace('.NS','')}</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Nifty 50</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Edge</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map(row => {
                const sv = metrics[row.sk];
                const nv = nifty[row.nk];
                const hasEdge = sv != null && nv != null;
                const better  = hasEdge ? (row.hb ? sv > nv : sv < nv) : null;
                return (
                  <tr key={row.label} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-gray-900 dark:text-white">{row.label}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{row.desc}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`text-base font-black ${
                        better === null ? 'text-gray-900 dark:text-white' :
                        better ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {sv != null ? `${sv}${row.unit || ''}` : '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-gray-500 dark:text-gray-400">
                        {nv != null ? `${nv}${row.unit || ''}` : '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {better === null ? <span className="text-gray-400 text-xs">—</span>
                      : better
                        ? <span className="text-green-600 dark:text-green-400 font-bold text-sm">✓</span>
                        : <span className="text-red-500 dark:text-red-400 font-bold text-sm">✗</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interpretations */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3">💡 What These Numbers Mean</h3>
        <div className="space-y-2">
          {[
            { label: 'Sharpe',   text: interpret.sharpe   },
            { label: 'Drawdown', text: interpret.drawdown },
            { label: 'Alpha',    text: interpret.alpha    },
          ].map(({ label, text }) => (
            <div key={label} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="font-bold text-blue-700 dark:text-blue-400 min-w-20">{label}:</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setData(null)} className="text-sm text-gray-400 hover:text-blue-500 transition-colors">← Reset</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function ComparativeIntelligencePage() {
  const [activeTab, setActiveTab] = useState('nifty');
  const [inputSym, setInputSym] = useState('');
  const [symbol,   setSymbol]   = useState('');

  function applySymbol(s) {
    const clean = s.trim().toUpperCase();
    setInputSym(clean);
    setSymbol(clean);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">🧠 Comparative Intelligence</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Month 10 — 4 deep-analysis features: Nifty comparison · Sector benchmark · Peer ranking · Risk-adjusted returns
        </p>
      </div>

      {/* Symbol input */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-6 shadow-sm">
        <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Stock Symbol</label>
        <div className="flex gap-3 mb-3">
          <input
            value={inputSym}
            onChange={e => setInputSym(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && applySymbol(inputSym)}
            placeholder="e.g. RELIANCE or RELIANCE.NS"
            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button
            onClick={() => applySymbol(inputSym)}
            disabled={!inputSym.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold rounded-xl transition-all">
            Set Symbol
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK.map(s => (
            <button key={s} onClick={() => applySymbol(s)}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-all ${
                symbol.replace('.NS','') === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
              }`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-700">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'nifty'  && <VsNiftyTab    symbol={symbol} />}
          {activeTab === 'sector' && <VsSectorTab   symbol={symbol} />}
          {activeTab === 'peers'  && <PeerStrengthTab symbol={symbol} />}
          {activeTab === 'risk'   && <RiskAdjustedTab symbol={symbol} />}
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-5">
        ⚠️ Based on 1-year Yahoo Finance data. Not SEBI registered. Not financial advice.
      </p>
    </div>
  );
}
