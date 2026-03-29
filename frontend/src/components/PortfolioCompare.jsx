// PortfolioCompare.jsx — Month 18: Compare Two Portfolios Side by Side
import { useState } from 'react';
import { comparePortfolios } from '../api';

const fmtP  = (n) => (Number(n) >= 0 ? '+' : '') + Number(n).toFixed(2) + '%';
const fmtN  = (n, d = 2) => Number(n).toFixed(d);

const STOCK_COLORS = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-pink-500','bg-lime-500','bg-indigo-500','bg-orange-500'];

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500 dark:text-gray-400">Comparing portfolios — fetching 3 years of data…</p>
    </div>
  );
}

function StockChip({ symbol, i }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white ${STOCK_COLORS[i % STOCK_COLORS.length]}`}>
      {symbol.replace('.NS','').replace('.BO','')}
    </span>
  );
}

function StockInput({ label, stocks, setStocks, name, setName }) {
  const addStock = () => { if (stocks.length < 10) setStocks([...stocks, '']); };
  const removeStock = (i) => setStocks(stocks.filter((_, idx) => idx !== i));
  const setStock = (i, v) => { const n = [...stocks]; n[i] = v.toUpperCase(); setStocks(n); };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Portfolio Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={label}
          className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Stocks ({stocks.length}/10)</label>
        <div className="space-y-2">
          {stocks.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className={`w-4 h-4 rounded-full flex-shrink-0 ${STOCK_COLORS[i % STOCK_COLORS.length]}`} />
              <input type="text" value={s} onChange={e => setStock(i, e.target.value)} placeholder={`STOCK${i+1}.NS`}
                className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {stocks.length > 2 && (
                <button onClick={() => removeStock(i)} className="text-gray-400 hover:text-red-500 text-xs transition-colors">✕</button>
              )}
            </div>
          ))}
        </div>
        {stocks.length < 10 && (
          <button onClick={addStock} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">+ Add stock</button>
        )}
      </div>
    </div>
  );
}

export default function PortfolioCompare() {
  const [nameA, setNameA] = useState('Portfolio A');
  const [nameB, setNameB] = useState('Portfolio B');
  const [stocksA, setStocksA] = useState(['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS']);
  const [stocksB, setStocksB] = useState(['INFY.NS', 'ICICIBANK.NS', 'HINDUNILVR.NS']);
  const [capital, setCapital] = useState(100000);
  const [range, setRange]     = useState('3y');

  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(null);

  async function run() {
    const cleanA = stocksA.map(s => s.trim()).filter(Boolean);
    const cleanB = stocksB.map(s => s.trim()).filter(Boolean);
    if (cleanA.length < 2 || cleanB.length < 2) {
      setErr('Each portfolio needs at least 2 stocks.');
      return;
    }
    setLoading(true); setErr(null); setResult(null);
    try {
      const r = await comparePortfolios({
        portfolioA: { symbols: cleanA, name: nameA },
        portfolioB: { symbols: cleanB, name: nameB },
        totalCapital: +capital,
        range,
      });
      setResult(r.data.data);
    } catch (e) {
      setErr(e.response?.data?.error || e.response?.data?.detail || e.message || 'Comparison failed');
    }
    setLoading(false);
  }

  const inp = "w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white">🆚 Compare Two Portfolios</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Side-by-side analysis of any two NSE/BSE portfolios</p>
      </div>

      {/* Input panels */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-black text-blue-700 dark:text-blue-400 mb-2">🅰️ {nameA}</p>
          <StockInput label="Portfolio A" stocks={stocksA} setStocks={setStocksA} name={nameA} setName={setNameA} />
        </div>
        <div>
          <p className="text-sm font-black text-violet-700 dark:text-violet-400 mb-2">🅱️ {nameB}</p>
          <StockInput label="Portfolio B" stocks={stocksB} setStocks={setStocksB} name={nameB} setName={setNameB} />
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Capital (₹)</label>
            <input type="number" className={inp} value={capital} onChange={e => setCapital(e.target.value)} step={10000} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Period</label>
            <select className={inp} value={range} onChange={e => setRange(e.target.value)}>
              <option value="1y">1 Year</option>
              <option value="3y">3 Years</option>
              <option value="5y">5 Years</option>
            </select>
          </div>
        </div>
      </div>

      {err && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
          ⚠️ {err}
        </div>
      )}

      <button onClick={run} disabled={loading}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-60 text-white font-black text-base rounded-xl transition-all shadow-lg">
        {loading ? '⏳ Comparing…' : '🆚 Compare Portfolios'}
      </button>

      {loading && <Spinner />}

      {/* Results */}
      {result && !loading && (() => {
        const { comparison, resultA, resultB } = result;
        const c = comparison;
        const pA = c.portfolioA;
        const pB = c.portfolioB;
        const isWinA = c.overallWinner === 'A';
        const isWinB = c.overallWinner === 'B';
        const isTie  = c.overallWinner === 'TIE';

        return (
          <div className="space-y-5">
            {/* Winner banner */}
            <div className={`rounded-2xl p-5 text-white text-center ${
              isWinA ? 'bg-gradient-to-r from-blue-600 to-blue-700'
              : isWinB ? 'bg-gradient-to-r from-violet-600 to-violet-700'
              : 'bg-gradient-to-r from-gray-500 to-gray-600'
            }`}>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Overall Winner</p>
              {isTie ? (
                <p className="text-2xl font-black">🤝 It's a Tie!</p>
              ) : (
                <p className="text-2xl font-black">
                  🏆 {isWinA ? pA.name : pB.name} wins!
                </p>
              )}
              <p className="text-sm opacity-80 mt-1">
                {pA.name}: {c.winsA} wins · {pB.name}: {c.winsB} wins
              </p>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-4">
                <p className="font-black text-blue-800 dark:text-blue-300 text-sm">🅰️ {pA.name}</p>
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {pA.symbols.map((s, i) => <StockChip key={s} symbol={s} i={i} />)}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">{pA.growthPattern?.emoji} {pA.growthPattern?.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{pA.bestStrategy?.name}</p>
              </div>

              <div className="flex items-center justify-center">
                <span className="text-4xl font-black text-gray-300 dark:text-gray-600">VS</span>
              </div>

              <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-2xl p-4">
                <p className="font-black text-violet-800 dark:text-violet-300 text-sm">🅱️ {pB.name}</p>
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {pB.symbols.map((s, i) => <StockChip key={s} symbol={s} i={i} />)}
                </div>
                <p className="text-xs text-violet-600 dark:text-violet-400 mt-2">{pB.growthPattern?.emoji} {pB.growthPattern?.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{pB.bestStrategy?.name}</p>
              </div>
            </div>

            {/* Metrics comparison table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">📊 Head-to-Head Metrics</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs">
                      <th className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400">Metric</th>
                      <th className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400">🅰️ {pA.name}</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-400">Winner</th>
                      <th className="px-4 py-3 text-center font-bold text-violet-600 dark:text-violet-400">🅱️ {pB.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.metrics.map(row => {
                      const fmt = (v) => row.format === 'pct' ? fmtP(v) : fmtN(v);
                      const aWin = row.winner === 'A';
                      const bWin = row.winner === 'B';
                      return (
                        <tr key={row.label} className="border-t border-gray-50 dark:border-gray-700/30">
                          <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300 text-xs">{row.label}</td>
                          <td className={`px-4 py-3 text-center font-bold text-sm ${aWin ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10' : 'text-gray-500 dark:text-gray-400'}`}>
                            {aWin && '⭐ '}{fmt(row.fieldA)}
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-400">
                            {row.winner === 'TIE' ? '🤝' : row.winner === 'A' ? '←' : '→'}
                          </td>
                          <td className={`px-4 py-3 text-center font-bold text-sm ${bWin ? 'text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/10' : 'text-gray-500 dark:text-gray-400'}`}>
                            {bWin && '⭐ '}{fmt(row.fieldB)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Diversification comparison */}
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { p: pA, result: resultA, color: 'blue' },
                { p: pB, result: resultB, color: 'violet' },
              ].map(({ p, result: r, color }) => {
                const div = p.diversification || {};
                const score = div.score || 0;
                return (
                  <div key={p.name} className={`bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-700 rounded-2xl p-4 space-y-3`}>
                    <p className={`font-bold text-${color}-800 dark:text-${color}-300 text-sm`}>{p.name} — Diversification</p>
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-full border-4 border-${color}-400 flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-xl font-black text-${color}-700 dark:text-${color}-300`}>{score}</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{div.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Avg correlation: {div.avgCorrelation}%</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Effective stocks: {div.effectiveStocks}</p>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div className={`h-2 rounded-full bg-${color}-500`} style={{ width: `${score}%` }} />
                    </div>
                    {div.warning && (
                      <p className="text-xs text-amber-700 dark:text-amber-300">⚠️ {div.warning}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Year-by-year comparison */}
            {resultA.yearlyPerformance?.length && resultB.yearlyPerformance?.length && (() => {
              const years = resultA.yearlyPerformance.map(y => y.year);
              const mapB  = Object.fromEntries(resultB.yearlyPerformance.map(y => [y.year, y.return]));
              const all   = [...resultA.yearlyPerformance.map(y => y.return), ...resultB.yearlyPerformance.map(y => y.return)];
              const max   = Math.max(...all.map(Math.abs));
              return (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <p className="font-bold text-gray-900 dark:text-white text-sm mb-4">📅 Year-by-Year Returns</p>
                  <div className="flex items-end gap-3 h-36 overflow-x-auto pb-2">
                    {years.map(year => {
                      const rA = resultA.yearlyPerformance.find(y => y.year === year)?.return ?? 0;
                      const rB = mapB[year] ?? 0;
                      const hA = max > 0 ? (Math.abs(rA) / max) * 90 : 4;
                      const hB = max > 0 ? (Math.abs(rB) / max) * 90 : 4;
                      return (
                        <div key={year} className="flex-shrink-0 flex flex-col items-center gap-1" style={{ minWidth: 64 }}>
                          <div className="flex items-end gap-1 h-24">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`text-xs font-bold ${rA >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                                {rA >= 0 ? '+' : ''}{Number(rA).toFixed(0)}%
                              </span>
                              <div className={`w-5 rounded-t-sm ${rA >= 0 ? 'bg-blue-500' : 'bg-blue-300'}`} style={{ height: `${Math.max(hA, 4)}px` }} />
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`text-xs font-bold ${rB >= 0 ? 'text-violet-600 dark:text-violet-400' : 'text-red-500'}`}>
                                {rB >= 0 ? '+' : ''}{Number(rB).toFixed(0)}%
                              </span>
                              <div className={`w-5 rounded-t-sm ${rB >= 0 ? 'bg-violet-500' : 'bg-violet-300'}`} style={{ height: `${Math.max(hB, 4)}px` }} />
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">{year}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500" /><span className="text-xs text-gray-500 dark:text-gray-400">{pA.name}</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-violet-500" /><span className="text-xs text-gray-500 dark:text-gray-400">{pB.name}</span></div>
                  </div>
                </div>
              );
            })()}

            <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
              ⚠️ Historical performance not a guarantee of future returns · Not SEBI registered · Not financial advice
            </p>
          </div>
        );
      })()}
    </div>
  );
}
