// SectorHeatmapPage.jsx — Month 30 FIXED: routes through backend /api/ohlc instead of direct Yahoo (CORS fix)
import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SECTORS = [
  { name:'IT',         emoji:'💻', stocks:['TCS.NS','INFY.NS','WIPRO.NS','HCLTECH.NS','TECHM.NS'] },
  { name:'Banking',    emoji:'🏦', stocks:['HDFCBANK.NS','ICICIBANK.NS','SBIN.NS','KOTAKBANK.NS','AXISBANK.NS'] },
  { name:'Energy',     emoji:'⚡', stocks:['RELIANCE.NS','ONGC.NS','NTPC.NS','POWERGRID.NS','BPCL.NS'] },
  { name:'Auto',       emoji:'🚗', stocks:['MARUTI.NS','TATAMOTORS.NS','BAJAJ-AUTO.NS','EICHERMOT.NS','HEROMOTOCO.NS'] },
  { name:'Pharma',     emoji:'💊', stocks:['SUNPHARMA.NS','DRREDDY.NS','CIPLA.NS','DIVISLAB.NS','APOLLOHOSP.NS'] },
  { name:'FMCG',       emoji:'🛒', stocks:['HINDUNILVR.NS','ITC.NS','NESTLEIND.NS','BRITANNIA.NS','DABUR.NS'] },
  { name:'Metals',     emoji:'🔩', stocks:['TATASTEEL.NS','JSWSTEEL.NS','HINDALCO.NS','COALINDIA.NS','NMDC.NS'] },
  { name:'Infra',      emoji:'🏗️', stocks:['LT.NS','ADANIPORTS.NS','ULTRACEMCO.NS','GRASIM.NS','SIEMENS.NS'] },
  { name:'Financials', emoji:'📈', stocks:['BAJFINANCE.NS','BAJAJFINSV.NS','HDFCLIFE.NS','SBILIFE.NS','ICICIPRULI.NS'] },
  { name:'Telecom',    emoji:'📡', stocks:['BHARTIARTL.NS','INDUSTOWER.NS','TATACOMM.NS'] },
  { name:'Consumer',   emoji:'🛍️', stocks:['TITAN.NS','ASIANPAINT.NS','PIDILITIND.NS','VOLTAS.NS','HAVELLS.NS'] },
  { name:'Healthcare', emoji:'🏥', stocks:['APOLLOHOSP.NS','MAXHEALTH.NS','FORTIS.NS','LALPATHLAB.NS'] },
];

// Map timeframe label → backend period param
const TIMEFRAMES = [
  { label:'1D', period:'1M'  },
  { label:'1W', period:'1M'  },
  { label:'1M', period:'3M'  },
  { label:'3M', period:'6M'  },
  { label:'1Y', period:'1Y'  },
];

function getColor(pct) {
  if (pct === null || pct === undefined)
    return { bg:'bg-gray-100 dark:bg-gray-800', text:'text-gray-400' };
  if (pct >= 4)    return { bg:'bg-green-700',                           text:'text-white' };
  if (pct >= 2)    return { bg:'bg-green-500',                           text:'text-white' };
  if (pct >= 0.5)  return { bg:'bg-green-300 dark:bg-green-700',        text:'text-green-900 dark:text-white' };
  if (pct >= 0)    return { bg:'bg-green-100 dark:bg-green-900/50',     text:'text-green-800 dark:text-green-300' };
  if (pct >= -0.5) return { bg:'bg-red-100 dark:bg-red-900/50',         text:'text-red-800 dark:text-red-300' };
  if (pct >= -2)   return { bg:'bg-red-300 dark:bg-red-700',            text:'text-red-900 dark:text-white' };
  if (pct >= -4)   return { bg:'bg-red-500',                            text:'text-white' };
  return             { bg:'bg-red-700',                                  text:'text-white' };
}

// Fetch OHLC from backend and compute % change over period
async function fetchChange(symbol, period) {
  try {
    const res = await fetch(`${API_BASE}/api/ohlc/${encodeURIComponent(symbol)}?period=${period}`);
    if (!res.ok) return null;
    const data = await res.json();
    // data.candles = [{time, open, high, low, close, volume}, ...]
    const candles = data?.candles || data?.data || [];
    if (candles.length < 2) return null;
    const first = candles[0].close;
    const last  = candles[candles.length - 1].close;
    if (!first || !last) return null;
    return +((last - first) / first * 100).toFixed(2);
  } catch {
    return null;
  }
}

export default function SectorHeatmapPage() {
  const [tf, setTf]               = useState(TIMEFRAMES[0]);
  const [sectorData, setSectorData] = useState({});
  const [loading, setLoading]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selected, setSelected]   = useState(null);
  const [stockData, setStockData] = useState({});

  const loadHeatmap = useCallback(async (timeframe) => {
    setLoading(true);
    setProgress(0);
    setSectorData({});
    setStockData({});
    setSelected(null);

    for (let i = 0; i < SECTORS.length; i++) {
      const sec = SECTORS[i];
      // Use first stock as sector proxy
      const change = await fetchChange(sec.stocks[0], timeframe.period);
      setSectorData(prev => ({ ...prev, [sec.name]: { change, symbol: sec.stocks[0] } }));
      setProgress(Math.round(((i + 1) / SECTORS.length) * 100));
    }

    setLastUpdated(new Date().toLocaleTimeString('en-IN'));
    setLoading(false);
  }, []);

  useEffect(() => { loadHeatmap(tf); }, [tf]);

  const loadSectorStocks = async (sec) => {
    if (selected?.name === sec.name) { setSelected(null); return; }
    setSelected(sec);
    for (const sym of sec.stocks) {
      const change = await fetchChange(sym, tf.period);
      setStockData(prev => ({ ...prev, [sym]: change }));
    }
  };

  const allChanges = SECTORS.map(s => sectorData[s.name]?.change).filter(v => v != null);
  const avgChange  = allChanges.length
    ? (allChanges.reduce((a, b) => a + b, 0) / allChanges.length).toFixed(2)
    : null;
  const gainers = allChanges.filter(v => v > 0).length;
  const losers  = allChanges.filter(v => v < 0).length;
  const best  = SECTORS.reduce((b, s) => {
    const v = sectorData[s.name]?.change;
    return (v != null && (b == null || v > b.change)) ? { ...s, change: v } : b;
  }, null);
  const worst = SECTORS.reduce((b, s) => {
    const v = sectorData[s.name]?.change;
    return (v != null && (b == null || v < b.change)) ? { ...s, change: v } : b;
  }, null);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Sector Rotation Heatmap</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">NSE sector performance · Click any sector to drill down</p>
        </div>
        <div className="flex items-center gap-2">
          {TIMEFRAMES.map(t => (
            <button key={t.label} onClick={() => setTf(t)} disabled={loading}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                tf.label === t.label
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'
              }`}>
              {t.label}
            </button>
          ))}
          <button onClick={() => loadHeatmap(tf)} disabled={loading}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors">
            {loading ? `${progress}%` : '↺'}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: `${tf.label} Market Avg`,
            val: avgChange != null ? `${avgChange >= 0 ? '+' : ''}${avgChange}%` : (loading ? '…' : '—'),
            color: avgChange >= 0 ? 'text-green-600' : 'text-red-600'
          },
          { label: 'Sectors Up',   val: loading ? '…' : gainers, color: 'text-green-600' },
          { label: 'Sectors Down', val: loading ? '…' : losers,  color: 'text-red-600'   },
          {
            label: 'Best Sector',
            val: best ? `${best.emoji} ${best.name} ${best.change >= 0 ? '+' : ''}${best.change}%` : (loading ? '…' : '—'),
            color: 'text-green-600'
          },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">{c.label}</div>
            <div className={`font-black text-sm ${c.color}`}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Loading bar */}
      {loading && (
        <div className="mb-4">
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">Fetching live sector data… {progress}%</p>
        </div>
      )}

      {/* Heatmap grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
        {SECTORS.map(sec => {
          const d      = sectorData[sec.name];
          const change = d?.change ?? null;
          const { bg, text } = getColor(change);
          const isSelected = selected?.name === sec.name;
          return (
            <button key={sec.name} onClick={() => loadSectorStocks(sec)}
              className={`${bg} rounded-2xl p-4 text-left transition-all hover:scale-105 hover:shadow-lg border-2 ${
                isSelected ? 'border-white dark:border-gray-200 shadow-lg scale-105' : 'border-transparent'
              }`}>
              <div className="text-2xl mb-2">{sec.emoji}</div>
              <div className={`font-black text-sm ${text} mb-1`}>{sec.name}</div>
              {change != null ? (
                <div className={`text-xl font-black ${text}`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                </div>
              ) : (
                <div className="text-gray-400 text-lg font-bold">{loading ? '…' : '—'}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Sector drill-down */}
      {selected && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{selected.emoji}</span>
            <h2 className="font-black text-gray-900 dark:text-white text-lg">{selected.name} — Top Stocks</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {selected.stocks.map(sym => {
              const change = stockData[sym];
              const { bg, text } = getColor(change ?? null);
              const ticker = sym.replace('.NS', '');
              return (
                <a key={sym} href={`/stock/${sym}`}
                  className={`${bg} rounded-xl p-3 text-center transition-all hover:scale-105 hover:shadow-md`}>
                  <div className={`font-black text-sm ${text}`}>{ticker}</div>
                  {change != null ? (
                    <div className={`text-base font-black ${text}`}>
                      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">…</div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="text-xs text-gray-500">Legend:</span>
        {[
          ['bg-red-700 text-white',                                    '>-4%'      ],
          ['bg-red-400 text-white',                                    '-2% to -4%'],
          ['bg-red-100 dark:bg-red-900/50 text-red-800',              '0% to -2%' ],
          ['bg-green-100 dark:bg-green-900/50 text-green-800',        '0% to +2%' ],
          ['bg-green-400 text-white',                                  '+2% to +4%'],
          ['bg-green-700 text-white',                                  '>+4%'      ],
        ].map(([cls, label]) => (
          <span key={label} className={`${cls} text-xs px-2 py-1 rounded-lg font-semibold`}>{label}</span>
        ))}
        {lastUpdated && <span className="text-xs text-gray-400 ml-2">Updated {lastUpdated}</span>}
      </div>
    </div>
  );
}
