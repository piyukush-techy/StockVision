// CandlestickChart.jsx — Month 28: Real OHLC data from Yahoo Finance via backend
// Uses lightweight-charts v4 via CDN (loaded once per session)
import { useEffect, useRef, useState } from 'react';

const API_BASE  = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CDN_URL   = 'https://unpkg.com/lightweight-charts@4.1.1/dist/lightweight-charts.standalone.production.js';

// ── LWC loader (loads the script once, then runs queued callbacks) ─────────
let lwcLoaded  = false;
let lwcLoading = false;
const lwcCallbacks = [];

function loadLWC(cb) {
  if (lwcLoaded)  { cb(); return; }
  lwcCallbacks.push(cb);
  if (lwcLoading) return;
  lwcLoading = true;
  const s    = document.createElement('script');
  s.src      = CDN_URL;
  s.onload   = () => { lwcLoaded = true; lwcCallbacks.forEach(f => f()); };
  s.onerror  = () => console.error('Failed to load lightweight-charts from CDN');
  document.head.appendChild(s);
}

// ── SMA helper ────────────────────────────────────────────────────────────
function calcSMA(candles, period) {
  return candles.map((c, i) => {
    if (i < period - 1) return null;
    const avg = candles.slice(i - period + 1, i + 1).reduce((s, x) => s + x.close, 0) / period;
    return { time: c.time, value: +avg.toFixed(2) };
  }).filter(Boolean);
}

const TIMEFRAMES = ['1M', '3M', '6M', '1Y', '2Y'];

export default function CandlestickChart({ symbol, darkMode }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);

  const [lwcReady,  setLwcReady]  = useState(false);
  const [candles,   setCandles]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [tf,        setTf]        = useState('6M');
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showVol,   setShowVol]   = useState(true);
  const [crosshair, setCrosshair] = useState(null);

  // Step 1: Load LWC library
  useEffect(() => {
    loadLWC(() => setLwcReady(true));
  }, []);

  // Step 2: Fetch REAL candles from backend whenever symbol or timeframe changes
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setCandles([]);

    fetch(`${API_BASE}/api/ohlc/${encodeURIComponent(symbol)}?period=${tf}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (cancelled) return;
        if (!data.candles?.length) throw new Error('No candle data returned');
        setCandles(data.candles);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('OHLC fetch error:', err.message);
        setError('Could not load chart data. Is the backend running?');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [symbol, tf]);

  // Step 3: Render chart — exact same rendering logic as before, just uses real candles now
  useEffect(() => {
    if (!lwcReady || !containerRef.current || candles.length === 0) return;

    const LWC = window.LightweightCharts;
    if (!LWC) return;

    if (chartRef.current) {
      try { chartRef.current.remove(); } catch {}
      chartRef.current = null;
    }

    const chart = LWC.createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: showVol ? 380 : 300,
      layout: {
        background: { type: 'solid', color: darkMode ? '#111827' : '#ffffff' },
        textColor:  darkMode ? '#9ca3af' : '#4b5563',
      },
      grid: {
        vertLines: { color: darkMode ? '#1f2937' : '#f3f4f6' },
        horzLines: { color: darkMode ? '#1f2937' : '#f3f4f6' },
      },
      crosshair:       { mode: LWC.CrosshairMode.Normal },
      rightPriceScale: { borderColor: darkMode ? '#374151' : '#e5e7eb' },
      timeScale: {
        borderColor:    darkMode ? '#374151' : '#e5e7eb',
        timeVisible:    true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

    const cs = chart.addCandlestickSeries({
      upColor:       '#22c55e',
      downColor:     '#ef4444',
      borderVisible: false,
      wickUpColor:   '#22c55e',
      wickDownColor: '#ef4444',
    });
    cs.setData(candles);

    if (showSMA20) {
      const s20 = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1.5, title: 'SMA 20', lastValueVisible: false });
      s20.setData(calcSMA(candles, 20));
    }
    if (showSMA50) {
      const s50 = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1.5, title: 'SMA 50', lastValueVisible: false });
      s50.setData(calcSMA(candles, 50));
    }
    if (showVol) {
      const vol = chart.addHistogramSeries({
        priceFormat:  { type: 'volume' },
        priceScaleId: 'volume',
        scaleMargins: { top: 0.75, bottom: 0 },
      });
      vol.setData(candles.map(c => ({
        time:  c.time,
        value: c.volume,
        color: c.close >= c.open ? '#22c55e40' : '#ef444440',
      })));
    }

    chart.subscribeCrosshairMove(param => {
      if (!param.time || !param.seriesData) { setCrosshair(null); return; }
      const d = param.seriesData.get(cs);
      if (d) setCrosshair({ ...d, time: new Date(param.time * 1000).toLocaleDateString('en-IN') });
    });

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      try { chart.remove(); } catch {}
    };
  }, [lwcReady, candles, darkMode, showSMA20, showSMA50, showVol]);

  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const card  = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';

  return (
    <div className={`rounded-2xl border overflow-hidden ${card}`}>

      {/* Toolbar */}
      <div className={`flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-b ${darkMode ? 'border-gray-800 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(t => (
            <button key={t} onClick={() => setTf(t)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                tf === t ? 'bg-blue-600 text-white' : darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {[['SMA 20','#3b82f6',showSMA20,setShowSMA20],['SMA 50','#f59e0b',showSMA50,setShowSMA50],['Volume','#6b7280',showVol,setShowVol]].map(([lbl,clr,val,set]) => (
            <button key={lbl} onClick={() => set(v => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors ${val ? 'border-blue-600 text-blue-600' : darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: val ? clr : '#6b7280' }} />
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* OHLC crosshair row */}
      {crosshair && (
        <div className={`flex flex-wrap gap-4 px-4 py-2 text-xs font-mono border-b ${darkMode ? 'border-gray-800 text-gray-300' : 'border-gray-100 text-gray-600'}`}>
          <span>{crosshair.time}</span>
          <span>O: ₹{crosshair.open?.toFixed(2)}</span>
          <span>H: ₹{crosshair.high?.toFixed(2)}</span>
          <span>L: ₹{crosshair.low?.toFixed(2)}</span>
          <span className={crosshair.close >= crosshair.open ? 'text-green-500' : 'text-red-500'}>
            C: ₹{crosshair.close?.toFixed(2)}
          </span>
        </div>
      )}

      {/* Chart area */}
      <div className="p-2">
        {loading && (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className={`text-xs ${muted}`}>Loading real market data…</span>
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-4">
            <span className="text-2xl">📡</span>
            <span className={`text-sm ${muted}`}>{error}</span>
            <button onClick={() => { setTf(p => p); }}
              className="text-xs text-blue-500 underline mt-1">Retry</button>
          </div>
        )}
        {!loading && !error && <div ref={containerRef} className="w-full" style={{ minHeight: 300 }} />}
      </div>

      {/* Legend */}
      <div className={`px-4 py-2 flex flex-wrap gap-3 text-xs border-t ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
        <span className="flex items-center gap-1"><span className="w-3 h-1 bg-green-500 inline-block rounded" /> Bullish</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1 bg-red-500 inline-block rounded" /> Bearish</span>
        {showSMA20 && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-blue-500 inline-block" /> SMA 20</span>}
        {showSMA50 && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-amber-500 inline-block" /> SMA 50</span>}
        <span className="ml-auto">📡 Live data · Yahoo Finance</span>
      </div>
    </div>
  );
}
