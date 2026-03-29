// ScreenerPage.jsx — Month 29 FIX: Real data from Yahoo Finance via /api/financials
// Replaces hardcoded generateResults() with live backend calls
import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const NSE_STOCKS = [
  { symbol: 'RELIANCE.NS',    name: 'Reliance Industries',       sector: 'Energy' },
  { symbol: 'TCS.NS',         name: 'Tata Consultancy Services', sector: 'Technology' },
  { symbol: 'HDFCBANK.NS',    name: 'HDFC Bank',                 sector: 'Financials' },
  { symbol: 'INFY.NS',        name: 'Infosys',                   sector: 'Technology' },
  { symbol: 'ICICIBANK.NS',   name: 'ICICI Bank',                sector: 'Financials' },
  { symbol: 'HINDUNILVR.NS',  name: 'Hindustan Unilever',        sector: 'Consumer Goods' },
  { symbol: 'ITC.NS',         name: 'ITC',                       sector: 'Consumer Goods' },
  { symbol: 'SBIN.NS',        name: 'State Bank of India',       sector: 'Financials' },
  { symbol: 'BHARTIARTL.NS',  name: 'Bharti Airtel',             sector: 'Telecom' },
  { symbol: 'KOTAKBANK.NS',   name: 'Kotak Mahindra Bank',       sector: 'Financials' },
  { symbol: 'LT.NS',          name: 'Larsen & Toubro',           sector: 'Infrastructure' },
  { symbol: 'AXISBANK.NS',    name: 'Axis Bank',                 sector: 'Financials' },
  { symbol: 'ASIANPAINT.NS',  name: 'Asian Paints',              sector: 'Consumer Goods' },
  { symbol: 'MARUTI.NS',      name: 'Maruti Suzuki',             sector: 'Auto' },
  { symbol: 'SUNPHARMA.NS',   name: 'Sun Pharmaceutical',        sector: 'Pharma' },
  { symbol: 'TITAN.NS',       name: 'Titan Company',             sector: 'Consumer Goods' },
  { symbol: 'BAJFINANCE.NS',  name: 'Bajaj Finance',             sector: 'Financials' },
  { symbol: 'WIPRO.NS',       name: 'Wipro',                     sector: 'Technology' },
  { symbol: 'ULTRACEMCO.NS',  name: 'UltraTech Cement',          sector: 'Cement' },
  { symbol: 'NESTLEIND.NS',   name: 'Nestle India',              sector: 'Consumer Goods' },
  { symbol: 'HCLTECH.NS',     name: 'HCL Technologies',          sector: 'Technology' },
  { symbol: 'TECHM.NS',       name: 'Tech Mahindra',             sector: 'Technology' },
  { symbol: 'ONGC.NS',        name: 'ONGC',                      sector: 'Energy' },
  { symbol: 'NTPC.NS',        name: 'NTPC',                      sector: 'Energy' },
  { symbol: 'TATASTEEL.NS',   name: 'Tata Steel',                sector: 'Metals' },
  { symbol: 'JSWSTEEL.NS',    name: 'JSW Steel',                 sector: 'Metals' },
  { symbol: 'DRREDDY.NS',     name: "Dr Reddy's Laboratories",   sector: 'Pharma' },
  { symbol: 'CIPLA.NS',       name: 'Cipla',                     sector: 'Pharma' },
  { symbol: 'TATAMOTORS.NS',  name: 'Tata Motors',               sector: 'Auto' },
  { symbol: 'ADANIPORTS.NS',  name: 'Adani Ports',               sector: 'Infrastructure' },
];

const PRESET_SCREENS = [
  { name: '🚀 High Momentum',      desc: 'High ROE, positive growth',    filters: { peMax: 50, roeMin: 20 } },
  { name: '💰 Value Picks',        desc: 'Low PE, strong ROE, low debt', filters: { peMax: 18, roeMin: 12, debtEqMax: 0.5 } },
  { name: '📈 Quality Growth',     desc: 'Strong margins, low debt',     filters: { roeMin: 18, peMax: 60, debtEqMax: 1 } },
  { name: '🏦 Dividend Kings',     desc: 'High dividend yield',          filters: { divYieldMin: 2 } },
  { name: '🔬 Debt Free',          desc: 'Zero or negligible debt',      filters: { debtEqMax: 0.1 } },
  { name: '⚡ High Profitability', desc: 'Top margin + ROE companies',   filters: { roeMin: 25, profitMarginMin: 15 } },
];

const SECTORS = ['All','Technology','Financials','Energy','Consumer Goods','Pharma','Auto','Metals','Telecom','Cement','Infrastructure'];

async function fetchStockRatios(stock) {
  try {
    const [ratiosRes, priceRes] = await Promise.all([
      fetch(`${API_BASE}/api/financials/${stock.symbol}/ratios`),
      fetch(`${API_BASE}/api/stocks/${stock.symbol}`),
    ]);
    const r = ratiosRes.ok ? (await ratiosRes.json()).ratios || (await ratiosRes.json()) : {};
    const p = priceRes.ok ? await priceRes.json() : {};
    return {
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      price: p.price || p.currentPrice || null,
      change: p.changePercent || p.change || 0,
      mcap: r.marketCap || null,
      pe: r.peRatio ?? null,
      roe: r.roe ?? null,
      debtEq: r.debtToEquity ?? null,
      divYield: r.dividendYield ?? null,
      profitMargin: r.profitMargin ?? null,
    };
  } catch { return null; }
}

function passes(stock, filters, sector) {
  if (sector !== 'All' && stock.sector !== sector) return false;
  const check = (val, min, max) => {
    if (val == null) return true; // no data = don't exclude
    if (min != null && val < min) return false;
    if (max != null && val > max) return false;
    return true;
  };
  return (
    check(stock.pe,           filters.peMin,           filters.peMax) &&
    check(stock.roe,          filters.roeMin,          null) &&
    check(stock.debtEq,       null,                    filters.debtEqMax) &&
    check(stock.divYield,     filters.divYieldMin,     null) &&
    check(stock.profitMargin, filters.profitMarginMin, null)
  );
}

export default function ScreenerPage() {
  const [sector, setSector]           = useState('All');
  const [peMax, setPeMax]             = useState('');
  const [peMin, setPeMin]             = useState('');
  const [roeMin, setRoeMin]           = useState('');
  const [debtEqMax, setDebtEqMax]     = useState('');
  const [divYieldMin, setDivYieldMin] = useState('');
  const [profitMarginMin, setPMMin]   = useState('');
  const [results, setResults]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [progress, setProgress]       = useState(0);
  const [sortBy, setSortBy]           = useState('mcap');
  const [sortDir, setSortDir]         = useState('desc');
  const [activePreset, setActivePreset] = useState(null);
  const [error, setError]             = useState('');

  const buildFilters = (override) => override || {
    peMax:           peMax           ? +peMax           : null,
    peMin:           peMin           ? +peMin           : null,
    roeMin:          roeMin          ? +roeMin          : null,
    debtEqMax:       debtEqMax       ? +debtEqMax       : null,
    divYieldMin:     divYieldMin     ? +divYieldMin     : null,
    profitMarginMin: profitMarginMin ? +profitMarginMin : null,
  };

  const runScreen = async (overrideFilters) => {
    setLoading(true); setError(''); setResults(null); setProgress(0);
    const filters = buildFilters(overrideFilters);
    const BATCH = 5;
    const allData = [];
    for (let i = 0; i < NSE_STOCKS.length; i += BATCH) {
      const batch = NSE_STOCKS.slice(i, i + BATCH);
      const batchRes = await Promise.all(batch.map(fetchStockRatios));
      allData.push(...batchRes.filter(Boolean));
      setProgress(Math.min(100, Math.round(((i + BATCH) / NSE_STOCKS.length) * 100)));
    }
    if (allData.length === 0) { setError('Could not fetch data. Is the backend running?'); setLoading(false); return; }
    setResults(allData.filter(s => passes(s, filters, sector)));
    setLoading(false);
  };

  const applyPreset = (preset) => {
    setActivePreset(preset.name);
    const f = preset.filters;
    setPeMax(f.peMax?.toString() || '');
    setPeMin(f.peMin?.toString() || '');
    setRoeMin(f.roeMin?.toString() || '');
    setDebtEqMax(f.debtEqMax?.toString() || '');
    setDivYieldMin(f.divYieldMin?.toString() || '');
    setPMMin(f.profitMarginMin?.toString() || '');
    runScreen(f);
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const sorted = (results || []).slice().sort((a, b) => {
    const av = a[sortBy], bv = b[sortBy];
    if (av == null && bv == null) return 0;
    if (av == null) return 1; if (bv == null) return -1;
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const fmt = (v, d=1) => v != null ? v.toFixed(d) : '—';
  const fmtMcap = (v) => {
    if (v == null) return '—';
    if (v >= 100000) return `₹${(v/100000).toFixed(1)}L Cr`;
    if (v >= 1000)   return `₹${(v/1000).toFixed(1)}K Cr`;
    return `₹${v.toFixed(0)} Cr`;
  };

  const Th = ({ col, label }) => (
    <th onClick={() => handleSort(col)}
      className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-blue-600 select-none">
      {label} {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Stock Screener</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Live fundamentals · Yahoo Finance · {NSE_STOCKS.length} NSE stocks</p>
      </div>

      {/* Presets */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Quick Screens</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {PRESET_SCREENS.map(p => (
            <button key={p.name} onClick={() => applyPreset(p)}
              className={`p-3 rounded-xl border text-left transition-all ${activePreset === p.name ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300'}`}>
              <div className="font-semibold text-xs text-gray-900 dark:text-white mb-1">{p.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Custom Filters</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Sector</label>
            <select value={sector} onChange={e => setSector(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {SECTORS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {[
            { label:'PE Max',          val:peMax,       set:setPeMax,       ph:'e.g. 25' },
            { label:'PE Min',          val:peMin,       set:setPeMin,       ph:'e.g. 5' },
            { label:'ROE Min %',       val:roeMin,      set:setRoeMin,      ph:'e.g. 15' },
            { label:'Debt/Eq Max',     val:debtEqMax,   set:setDebtEqMax,   ph:'e.g. 1' },
            { label:'Div Yield Min%',  val:divYieldMin, set:setDivYieldMin, ph:'e.g. 2' },
            { label:'Profit Margin%',  val:profitMarginMin, set:setPMMin,   ph:'e.g. 10' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
              <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <button onClick={() => { setActivePreset(null); runScreen(); }} disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold transition-colors">
            {loading ? `Screening… ${progress}%` : '🔍 Run Screen'}
          </button>
          <button onClick={() => { setPeMax(''); setPeMin(''); setRoeMin(''); setDebtEqMax(''); setDivYieldMin(''); setPMMin(''); setSector('All'); setResults(null); setActivePreset(null); setError(''); }}
            className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors">
            Clear
          </button>
          {loading && <span className="text-sm text-gray-500 flex items-center gap-2"><span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" /> Fetching live Yahoo Finance data…</span>}
        </div>
        {loading && (
          <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-5 mb-6 text-red-700 dark:text-red-400">⚠️ {error}</div>}

      {results !== null && !loading && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="font-bold text-gray-900 dark:text-white">{sorted.length} stocks found <span className="text-gray-400 font-normal text-sm">· Live Yahoo Finance</span></span>
            <span className="text-sm text-gray-500">— means data unavailable for that stock</span>
          </div>
          {sorted.length === 0 ? (
            <div className="py-16 text-center text-gray-400"><div className="text-4xl mb-3">🔍</div><p>No stocks match your filters.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Sector</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Chg%</th>
                    <Th col="mcap"          label="MCap" />
                    <Th col="pe"            label="P/E" />
                    <Th col="roe"           label="ROE%" />
                    <Th col="debtEq"        label="D/E" />
                    <Th col="divYield"      label="Div%" />
                    <Th col="profitMargin"  label="Margin%" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(s => (
                    <tr key={s.symbol} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <a href={`/stock/${s.symbol}`} className="font-bold text-blue-600 hover:underline">{s.symbol.replace('.NS','')}</a>
                        <div className="text-xs text-gray-500">{s.name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{s.sector}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{s.price ? `₹${s.price.toLocaleString('en-IN')}` : '—'}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${(s.change||0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.change != null ? `${s.change>=0?'+':''}${fmt(s.change,2)}%` : '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmtMcap(s.mcap)}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(s.pe,1)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${s.roe==null?'text-gray-400':s.roe>=20?'text-green-600':s.roe>=12?'text-yellow-600':'text-red-600'}`}>{s.roe!=null?`${fmt(s.roe)}%`:'—'}</td>
                      <td className={`px-4 py-3 text-right ${s.debtEq==null?'text-gray-400':s.debtEq<=0.5?'text-green-600':s.debtEq<=1.5?'text-yellow-600':'text-red-600'}`}>{fmt(s.debtEq,2)}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{s.divYield!=null?`${fmt(s.divYield,2)}%`:'—'}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${s.profitMargin==null?'text-gray-400':s.profitMargin>=20?'text-green-600':s.profitMargin>=10?'text-yellow-600':'text-red-600'}`}>{s.profitMargin!=null?`${fmt(s.profitMargin)}%`:'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {results === null && !loading && !error && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-16 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-500 dark:text-gray-400">Apply filters or choose a preset screen above</p>
          <p className="text-xs text-gray-400 mt-2">Fetches real data from Yahoo Finance — takes ~15s for all 30 stocks</p>
        </div>
      )}
    </div>
  );
}
