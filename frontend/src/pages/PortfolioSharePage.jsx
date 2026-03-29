// PortfolioSharePage.jsx — Month 18: View a Shared Portfolio
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadSharedPortfolio } from '../api';

const fmtC = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtP = (n) => (Number(n) >= 0 ? '+' : '') + Number(n).toFixed(2) + '%';
const fmtN = (n, d = 2) => Number(n).toFixed(d);

const STOCK_COLORS = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-pink-500','bg-lime-500','bg-indigo-500','bg-orange-500'];

function StatCard({ label, value, sub, color = 'gray' }) {
  const colors = {
    blue:    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400',
    green:   'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400',
    red:     'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400',
    gray:    'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
    yellow:  'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.gray}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className="text-xl font-black">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function PortfolioSharePage() {
  const { shareId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await loadSharedPortfolio(shareId);
        setReport(r.data.data);
      } catch (e) {
        setErr(e.response?.data?.error || 'Portfolio not found or link is broken.');
      }
      setLoading(false);
    }
    load();
  }, [shareId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 dark:text-gray-400">Loading shared portfolio…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <span className="text-6xl">😔</span>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Portfolio Not Found</h1>
        <p className="text-gray-500 dark:text-gray-400">{err}</p>
        <Link to="/portfolio" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl">
          ← Go to Portfolio Optimizer
        </Link>
      </div>
    );
  }

  const snap = report.resultSnapshot;
  const best = snap?.strategies?.find(s => s.name === snap?.bestStrategy?.name) || snap?.strategies?.[0];
  const m    = best?.metrics || {};
  const div  = snap?.diversification || {};
  const pat  = snap?.growthPattern   || {};
  const syms = (report.symbols || []).map(s => s.replace('.NS','').replace('.BO',''));

  const createdDate = new Date(report.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 bg-white/20 rounded-full">📤 Shared Portfolio</span>
            </div>
            <h1 className="text-2xl font-black">{report.name}</h1>
            <p className="text-blue-200 text-sm mt-1">
              Shared on {createdDate} · Viewed {report.viewCount} time{report.viewCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">{Number(m.cagr || 0) >= 0 ? '+' : ''}{Number(m.cagr || 0).toFixed(1)}%</p>
            <p className="text-blue-200 text-xs mt-1">CAGR</p>
          </div>
        </div>

        {/* Stock chips */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {syms.map((s, i) => (
            <span key={s} className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-bold">{s}</span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Capital', value: fmtC(report.totalCapital) },
            { label: 'Period',  value: report.range },
            { label: 'Strategy', value: snap?.bestStrategy?.name || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-xl px-3 py-2 text-center">
              <p className="text-sm font-bold">{value}</p>
              <p className="text-blue-200 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pattern badge */}
      {pat.label && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex items-center gap-4">
          <span className="text-4xl">{pat.emoji || '📈'}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Portfolio Classification</p>
            <p className="text-xl font-black text-gray-900 dark:text-white">{pat.label} Portfolio</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{snap?.bestStrategy?.reason}</p>
          </div>
        </div>
      )}

      {/* Key metrics */}
      {snap && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="CAGR"          value={fmtP(m.cagr || 0)}          color={Number(m.cagr) > 0 ? 'green' : 'red'} />
          <StatCard label="Sharpe Ratio"  value={fmtN(m.sharpe || 0)}         color={Number(m.sharpe) > 1 ? 'emerald' : 'gray'} />
          <StatCard label="Max Drawdown"  value={`-${fmtN(m.maxDrawdown || 0)}%`} color="yellow" />
          <StatCard label="Ann. Volatility" value={`${fmtN(m.annualVol || 0)}%`} color="gray" />
          <StatCard label="Total Return"  value={fmtP(m.totalReturn || 0)}    color={Number(m.totalReturn) > 0 ? 'blue' : 'red'} />
          <StatCard label="Diversification" value={`${div.score || 0}/100`}   sub={div.label} color={div.score > 60 ? 'green' : 'yellow'} />
        </div>
      )}

      {/* Allocation (if snapshot available) */}
      {snap?.allocations && snap?.bestStrategy && (() => {
        const bestKey = snap.bestStrategy.name === 'Equal Weight' ? 'equalWeight'
          : snap.bestStrategy.name === 'Risk-Parity' ? 'riskParity'
          : snap.bestStrategy.name === 'Min Volatility' ? 'minVolatility'
          : 'equalWeight';
        const rows = snap.allocations[bestKey] || [];
        if (!rows.length) return null;
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">💰 Exact Allocation — {snap.bestStrategy.name}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    {['Stock','Weight','Shares','Amount'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.symbol} className="border-t border-gray-50 dark:border-gray-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${STOCK_COLORS[i % STOCK_COLORS.length]}`} />
                          <span className="font-bold text-gray-900 dark:text-white">{r.symbol.replace('.NS','').replace('.BO','')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{Number(r.weight).toFixed(1)}%</td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{r.shares} shares</td>
                      <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-400">{fmtC(r.actualAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* CTA */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-5 text-center space-y-3">
        <p className="text-sm font-bold text-gray-900 dark:text-white">Want to analyze your own portfolio?</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">StockVision — India's most powerful stock analysis platform</p>
        <Link to="/portfolio"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-sm transition-all">
          🚀 Try Portfolio Optimizer Free
        </Link>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
        ⚠️ Historical performance not a guarantee of future returns · Not SEBI registered · Not financial advice
      </p>
    </div>
  );
}
