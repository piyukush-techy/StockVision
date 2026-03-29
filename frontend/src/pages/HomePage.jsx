import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTrending, seedStocks } from '../api';
import StockCard from '../components/StockCard';

const SECTORS = ['All', 'Technology', 'Financials', 'Energy', 'Consumer Goods', 'Pharma', 'Auto', 'Metals', 'Telecom', 'Cement', 'Real Estate', 'Others'];

// Month 28 — new features shown as quick-access cards on homepage
const NEW_FEATURES = [
  { icon: '🧨', label: 'Crisis Stress Test',      sub: 'Survive COVID crash, FII selloff & more',  path: '/crisis-stress',    color: 'from-red-500 to-rose-600'        },
  { icon: '🟩', label: 'Sector Heatmap',          sub: '12 NSE sectors, 5 timeframes, drill-down', path: '/sector-heatmap',   color: 'from-green-500 to-emerald-600'   },
  { icon: '🗂️', label: 'Portfolio Tracker (XIRR)',sub: 'Real annualised returns, live prices',      path: '/portfolio-tracker',color: 'from-blue-500 to-indigo-600'     },
  { icon: '📐', label: 'Altman Z-Score',          sub: 'Bankruptcy risk on every stock page',       path: '/stock/RELIANCE.NS',color: 'from-purple-500 to-violet-600'   },
  { icon: '✅', label: 'Earnings Quality Score',  sub: 'Cash vs reported profit, accrual ratio',    path: '/stock/TCS.NS',     color: 'from-amber-500 to-orange-600'    },
];

export default function HomePage() {
  const [stocks,       setStocks]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [seeding,      setSeeding]      = useState(false);
  const [seedMessage,  setSeedMessage]  = useState('');
  const [sector,       setSector]       = useState('All');
  const [sortBy,       setSortBy]       = useState('marketCap');
  const [searchTerm,   setSearchTerm]   = useState('');

  useEffect(() => { fetchStocks(); }, []);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const res = await getTrending();
      setStocks(res.data.trending || []);
    } catch (err) {
      console.error('Failed to load stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMessage('');
    try {
      await seedStocks();
      setSeedMessage('✅ Stocks loaded! Fetching live prices...');
      setTimeout(fetchStocks, 3000);
    } catch (err) {
      setSeedMessage('❌ Failed to load stocks. Is backend running?');
    } finally {
      setSeeding(false);
    }
  };

  // Filter + sort
  const filtered = stocks
    .filter(s => {
      const matchesSector = sector === 'All' || s.sector === sector;
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q ||
        s.symbol?.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q);
      return matchesSector && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'marketCap')   return (b.marketCap || 0) - (a.marketCap || 0);
      if (sortBy === 'change')      return (b.liveData?.changePercent || 0) - (a.liveData?.changePercent || 0);
      if (sortBy === 'changeAsc')   return (a.liveData?.changePercent || 0) - (b.liveData?.changePercent || 0);
      if (sortBy === 'name')        return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

  const gainers = stocks.filter(s => (s.liveData?.changePercent || 0) > 0).sort((a, b) => b.liveData.changePercent - a.liveData.changePercent).slice(0, 5);
  const losers  = stocks.filter(s => (s.liveData?.changePercent || 0) < 0).sort((a, b) => a.liveData.changePercent - b.liveData.changePercent).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
          📈 StockVision
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          Professional NSE stock analysis — free, fast, no sign-up required
        </p>
      </div>

      {/* ── MONTH 28 — WHAT'S NEW BANNER ── */}
      <div className="mb-8 rounded-2xl border border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">🔥 MONTH 30 — JUST ADDED</span>
          <span className="text-sm text-red-700 dark:text-red-300 font-medium">4 god-tier features are live</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {NEW_FEATURES.map(f => {
            const inner = (
              <div className={`rounded-xl p-3 text-white bg-gradient-to-br ${f.color} shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer`}>
                <div className="text-2xl mb-1">{f.icon}</div>
                <div className="font-bold text-sm leading-tight">{f.label}</div>
                <div className="text-xs text-white/80 mt-0.5 leading-tight">{f.sub}</div>
              </div>
            );
            return f.path
              ? <Link key={f.label} to={f.path}>{inner}</Link>
              : <div key={f.label} onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }); window.dispatchEvent(e); }}>{inner}</div>;
          })}
        </div>
      </div>

      {/* Empty state */}
      {!loading && stocks.length === 0 && (
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 mb-8">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">No stocks loaded yet</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Click below to seed the database with 100+ NSE stocks
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {seeding ? '⏳ Loading stocks...' : '🚀 Load All NSE Stocks'}
          </button>
          {seedMessage && <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{seedMessage}</p>}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && stocks.length > 0 && (
        <>
          {/* Top Gainers / Losers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Gainers */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-bold text-green-600 dark:text-green-400 mb-3 text-sm">🚀 Top Gainers Today</h3>
              <div className="space-y-2">
                {gainers.map(s => (
                  <a key={s.symbol} href={`/stock/${s.symbol}`} className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 px-2 py-1 rounded">
                    <div>
                      <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">{s.symbol?.replace('.NS','')}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{s.name?.split(' ').slice(0,2).join(' ')}</span>
                    </div>
                    <span className="text-green-600 dark:text-green-400 font-bold text-sm">+{(s.liveData?.changePercent||0).toFixed(2)}%</span>
                  </a>
                ))}
              </div>
            </div>
            {/* Losers */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-bold text-red-600 dark:text-red-400 mb-3 text-sm">📉 Top Losers Today</h3>
              <div className="space-y-2">
                {losers.map(s => (
                  <a key={s.symbol} href={`/stock/${s.symbol}`} className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 px-2 py-1 rounded">
                    <div>
                      <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">{s.symbol?.replace('.NS','')}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{s.name?.split(' ').slice(0,2).join(' ')}</span>
                    </div>
                    <span className="text-red-600 dark:text-red-400 font-bold text-sm">{(s.liveData?.changePercent||0).toFixed(2)}%</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Controls bar */}
          <div className="flex flex-wrap gap-3 mb-5 items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">All Stocks</h2>
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-semibold">
                {filtered.length} / {stocks.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Local search */}
              <input
                type="text"
                placeholder="Filter stocks..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
              />
              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="marketCap">Sort: Market Cap</option>
                <option value="change">Sort: Gainers First</option>
                <option value="changeAsc">Sort: Losers First</option>
                <option value="name">Sort: Name A–Z</option>
              </select>
            </div>
          </div>

          {/* Sector filter pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {SECTORS.map(s => (
              <button
                key={s}
                onClick={() => setSector(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  sector === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Stock grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              No stocks match your filter
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(stock => (
                <StockCard key={stock.symbol} stock={stock} />
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-8">
            💡 Click any stock for detailed charts, financials, regime analysis, ownership &amp; more
          </p>
        </>
      )}
    </div>
  );
}
