// CrisisStressPage.jsx — Month 30: Portfolio Crisis Stress Test
// Backend portfolioStress.js already existed — this is the missing frontend
import { useState } from 'react';
import api from '../api';

const SCENARIOS = [
  { id:'covid_crash',      emoji:'🦠', name:'COVID Crash 2020',     dates:'Feb–Mar 2020',  nifty:-38.0, color:'red',    desc:'Fastest 38% crash in Nifty history — 33 days' },
  { id:'covid_recovery',   emoji:'🚀', name:'COVID Recovery 2020',  dates:'Mar 2020–Feb 2021', nifty:+100.0, color:'green', desc:'Nifty doubled from bottom in 11 months' },
  { id:'fii_selloff_2022', emoji:'📉', name:'FII Sell-Off 2022',    dates:'Jan–Jun 2022',  nifty:-17.9, color:'red',    desc:'FIIs sold ₹2.5L Cr — rising US rates' },
  { id:'russia_ukraine',   emoji:'⚔️',  name:'Russia–Ukraine War',   dates:'Feb–Mar 2022',  nifty:-8.2,  color:'orange', desc:'Geopolitical shock, oil spike, panic' },
  { id:'bull_2023',        emoji:'🐂', name:'Bull Run 2023',         dates:'Jul–Sep 2023',  nifty:+12.3, color:'green',  desc:'Strong domestic flows + IT recovery' },
  { id:'election_shock_2024',emoji:'🗳️',name:'Election Shock 2024', dates:'Jun 2024',      nifty:-4.5,  color:'orange', desc:'Unexpected hung parliament — 2-day panic' },
  { id:'fii_selloff_2024', emoji:'💸', name:'FII Mega Sell-Off 2024',dates:'Oct–Nov 2024',  nifty:-10.4, color:'red',    desc:'FIIs sold record ₹1.1L Cr in 7 weeks' },
  { id:'tariff_crash_2025',emoji:'🛃', name:'Trump Tariff Crash 2025',dates:'Apr 2025',     nifty:-5.1,  color:'orange', desc:'Liberation Day tariffs — global risk-off' },
];

const COLORS = { red:'text-red-600', green:'text-green-600', orange:'text-amber-600' };
const BG_COLORS = { red:'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800', green:'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800', orange:'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' };

const PRESET_PORTFOLIOS = [
  { name:'Nifty 50 Core',    stocks:[{s:'RELIANCE.NS',w:20},{s:'TCS.NS',w:20},{s:'HDFCBANK.NS',w:20},{s:'INFY.NS',w:20},{s:'ICICIBANK.NS',w:20}] },
  { name:'Tech Heavy',       stocks:[{s:'TCS.NS',w:35},{s:'INFY.NS',w:25},{s:'HCLTECH.NS',w:20},{s:'WIPRO.NS',w:20}] },
  { name:'Banking Basket',   stocks:[{s:'HDFCBANK.NS',w:30},{s:'ICICIBANK.NS',w:30},{s:'SBIN.NS',w:20},{s:'AXISBANK.NS',w:20}] },
  { name:'Defensive Mix',    stocks:[{s:'HINDUNILVR.NS',w:25},{s:'ITC.NS',w:25},{s:'NESTLEIND.NS',w:25},{s:'SUNPHARMA.NS',w:25}] },
];

export default function CrisisStressPage() {
  const [stocks, setStocks]     = useState([{ symbol:'', weight:'' }]);
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [activeScenario, setActiveScenario] = useState(null);

  const addRow    = () => setStocks(s => [...s, { symbol:'', weight:'' }]);
  const removeRow = (i) => setStocks(s => s.filter((_,idx)=>idx!==i));
  const update    = (i, field, val) => setStocks(s => s.map((r,idx) => idx===i ? {...r,[field]:val} : r));

  const loadPreset = (p) => {
    setStocks(p.stocks.map(s=>({ symbol:s.s, weight:String(s.w) })));
    setResults(null); setError('');
  };

  const runStress = async () => {
    const valid = stocks.filter(s => s.symbol.trim() && s.weight);
    if (valid.length < 2) { setError('Add at least 2 stocks to stress test.'); return; }
    setLoading(true); setError(''); setResults(null);
    try {
      const symbols = valid.map(s => s.symbol.toUpperCase().includes('.NS') ? s.symbol.toUpperCase() : s.symbol.toUpperCase()+'.NS');
      const weights = valid.map(s => parseFloat(s.weight) || 0);
      const res = await api.post('/portfolio/scalability', { symbols, weights, totalCapital:100000, range:'5y' });
      setResults(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to run stress test. Check backend is running.');
    }
    setLoading(false);
  };

  const stress = results?.stress;
  const bench  = results?.benchmark;

  const fmt = (v, d=1) => v != null ? (v >= 0 ? '+' : '') + v.toFixed(d) + '%' : '—';
  const fmtAbs = (v, d=1) => v != null ? v.toFixed(d) + '%' : '—';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Portfolio Crisis Stress Test</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">How would your portfolio survive India's biggest market crashes? Real historical data.</p>
      </div>

      {/* Scenario preview strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {SCENARIOS.slice(0,4).map(s => (
          <div key={s.id} className={`rounded-xl border p-3 ${BG_COLORS[s.color]}`}>
            <div className="text-lg mb-1">{s.emoji}</div>
            <div className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{s.name}</div>
            <div className={`text-sm font-black ${COLORS[s.color]}`}>{s.nifty >= 0 ? '+' : ''}{s.nifty}%</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.dates}</div>
          </div>
        ))}
      </div>

      {/* Portfolio input */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-gray-900 dark:text-white">Your Portfolio</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_PORTFOLIOS.map(p => (
              <button key={p.name} onClick={() => loadPreset(p)}
                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {stocks.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={row.symbol} onChange={e => update(i,'symbol',e.target.value)}
                placeholder="RELIANCE.NS" className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              <input value={row.weight} onChange={e => update(i,'weight',e.target.value)}
                placeholder="Weight %" type="number" className="w-24 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {stocks.length > 1 && (
                <button onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-500 px-2 py-2 rounded-lg transition-colors">✕</button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={addRow} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-blue-400 transition-colors">+ Add Stock</button>
          <button onClick={runStress} disabled={loading}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-colors">
            {loading ? '⏳ Running stress test…' : '🧨 Run Crisis Stress Test'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">⚠️ {error}</p>}
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-semibold">Fetching 5 years of historical data…</p>
          <p className="text-gray-400 text-sm mt-1">Running your portfolio through every major India crash</p>
        </div>
      )}

      {/* Results */}
      {stress && !loading && (
        <>
          {/* Summary hero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label:'Best Scenario',  val: stress.bestScenario  ? stress.bestScenario.name  + ' ' + fmt(stress.bestScenario.return)  : '—', sub:'your best performance', color:'text-green-600' },
              { label:'Worst Scenario', val: stress.worstScenario ? stress.worstScenario.name + ' ' + fmt(stress.worstScenario.return) : '—', sub:'your worst performance', color:'text-red-600' },
              { label:'Max Drawdown',   val: fmtAbs(stress.maxDrawdown), sub:'worst peak-to-trough', color:'text-red-600' },
              { label:'Total Scenarios',val: stress.scenarios?.length || 0, sub:'crisis periods tested', color:'text-blue-600' },
            ].map(c => (
              <div key={c.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                <div className="text-xs text-gray-500 mb-1">{c.label}</div>
                <div className={`text-sm font-black ${c.color} leading-tight`}>{c.val}</div>
                <div className="text-xs text-gray-400 mt-1">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Per-scenario cards */}
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-3">Performance in Every Crisis</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {(stress.scenarios || []).map((sc, i) => {
                const scenario = SCENARIOS.find(s => s.id === sc.scenarioId) || {};
                const alpha = sc.portfolioReturn - sc.niftyReturn;
                const better = alpha > 0;
                return (
                  <div key={i}
                    onClick={() => setActiveScenario(activeScenario === i ? null : i)}
                    className={`bg-white dark:bg-gray-900 border-2 rounded-2xl p-4 cursor-pointer transition-all ${activeScenario === i ? 'border-blue-500 shadow-lg' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{scenario.emoji || '📊'}</span>
                        <div>
                          <div className="font-bold text-sm text-gray-900 dark:text-white">{sc.name}</div>
                          <div className="text-xs text-gray-500">{sc.startDateActual} → {sc.endDateActual}</div>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${better ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'}`}>
                        {better ? '✓ Beat Nifty' : '✗ Lagged'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className={`text-lg font-black ${sc.portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(sc.portfolioReturn)}</div>
                        <div className="text-xs text-gray-500">Your Portfolio</div>
                      </div>
                      <div>
                        <div className={`text-lg font-black ${sc.niftyReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(sc.niftyReturn)}</div>
                        <div className="text-xs text-gray-500">Nifty 50</div>
                      </div>
                      <div>
                        <div className={`text-lg font-black ${alpha >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(alpha)} α</div>
                        <div className="text-xs text-gray-500">Alpha</div>
                      </div>
                    </div>
                    {activeScenario === i && scenario.desc && (
                      <p className="mt-3 text-xs text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-3">{scenario.desc}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Benchmark comparison */}
          {bench && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4">5-Year Benchmark Comparison</h2>
              <div className="space-y-3">
                {[bench.portfolio, ...(bench.benchmarks || [])].map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-32 text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{b.emoji} {b.name}</div>
                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full flex items-center pl-2 text-xs font-bold text-white transition-all ${i === 0 ? 'bg-blue-600' : 'bg-gray-400'}`}
                        style={{ width: `${Math.max(5, Math.min(100, Math.abs(b.totalReturn || 0) / 3))}%` }}>
                        {b.totalReturn != null ? `${b.totalReturn >= 0 ? '+' : ''}${b.totalReturn.toFixed(1)}%` : ''}
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <div className={`text-sm font-black ${(b.cagr||0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {b.cagr != null ? `${b.cagr >= 0 ? '+' : ''}${b.cagr.toFixed(1)}%` : '—'}
                      </div>
                      <div className="text-xs text-gray-400">CAGR</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-center text-gray-400">📊 Real historical prices · Yahoo Finance · Past performance does not guarantee future results</p>
        </>
      )}
    </div>
  );
}
