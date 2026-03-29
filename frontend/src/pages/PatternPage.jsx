// PatternPage.jsx — Month 29 FIX: Real pattern detection using live OHLC data
// Replaces hardcoded SCAN_STOCKS with actual technical analysis on Yahoo Finance data
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Pattern library stays static — these are timeless educational descriptions
const PATTERNS = [
  { name:'Double Bottom',       emoji:'W',  type:'bullish', reliability:78, desc:'W-shaped reversal pattern. Two troughs at similar price level. Strong bullish signal after neckline break.' },
  { name:'Double Top',          emoji:'M',  type:'bearish', reliability:75, desc:'M-shaped reversal. Two peaks at similar level. Strong bearish signal after neckline break.' },
  { name:'Head & Shoulders',    emoji:'👤', type:'bearish', reliability:83, desc:'Three peaks with middle being highest. One of the most reliable reversal patterns in technical analysis.' },
  { name:'Cup & Handle',        emoji:'☕', type:'bullish', reliability:71, desc:'Rounded bottom followed by brief consolidation. Breakout above handle is the entry signal.' },
  { name:'Bull Flag',           emoji:'🚩', type:'bullish', reliability:67, desc:'Sharp rally followed by tight consolidation. Continuation pattern — breakout usually continues the trend.' },
  { name:'Bear Flag',           emoji:'📉', type:'bearish', reliability:65, desc:'Sharp decline followed by tight consolidation. Breakdown usually continues the downtrend.' },
  { name:'Ascending Triangle',  emoji:'△',  type:'bullish', reliability:72, desc:'Flat resistance + rising support. Bullish bias — breakout above flat top is the signal.' },
  { name:'Descending Triangle', emoji:'▽',  type:'bearish', reliability:70, desc:'Flat support + falling resistance. Bearish bias — breakdown below flat bottom is the signal.' },
  { name:'Symmetrical Triangle',emoji:'◇',  type:'neutral', reliability:60, desc:'Converging trendlines. Breakout direction determines next move. Watch volume on breakout.' },
  { name:'Rounding Bottom',     emoji:'⌣',  type:'bullish', reliability:74, desc:'Gradual U-shaped reversal. Long-term accumulation pattern. Slow but reliable.' },
];

const WATCHLIST = [
  'RELIANCE.NS','TCS.NS','HDFCBANK.NS','INFY.NS','ICICIBANK.NS',
  'BHARTIARTL.NS','BAJFINANCE.NS','MARUTI.NS','WIPRO.NS','SBIN.NS',
  'HINDUNILVR.NS','ITC.NS','SUNPHARMA.NS','TATAMOTORS.NS','LT.NS',
];

// ── Real pattern detection from OHLC candles ─────────────────────────────

function calcSMA(candles, period) {
  return candles.map((c, i) => {
    if (i < period - 1) return null;
    return candles.slice(i - period + 1, i + 1).reduce((s, x) => s + x.close, 0) / period;
  });
}

function detectPatterns(candles) {
  if (!candles || candles.length < 30) return [];
  const detected = [];
  const closes  = candles.map(c => c.close);
  const highs   = candles.map(c => c.high);
  const lows    = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);
  const last    = closes[closes.length - 1];
  const sma20   = calcSMA(candles, 20);
  const sma50   = calcSMA(candles, 50);
  const s20     = sma20[sma20.length - 1];
  const s50     = sma50[sma50.length - 1];

  // ── Bull Flag: strong rally + tight consolidation ──────────────────────
  const recent20 = closes.slice(-20);
  const prevHigh  = Math.max(...closes.slice(-30, -10));
  const recentLow = Math.min(...recent20);
  const recentHighNow = Math.max(...recent20);
  const priorRally = (prevHigh - closes.slice(-35)[0]) / closes.slice(-35)[0];
  const consolidation = (recentHighNow - recentLow) / prevHigh;
  if (priorRally > 0.08 && consolidation < 0.06 && last > s20) {
    detected.push({ pattern:'Bull Flag', type:'bullish', confidence: Math.round(60 + priorRally * 100), timeframe:'Recent' });
  }

  // ── Bear Flag: strong drop + tight consolidation ───────────────────────
  const priorDrop = (closes.slice(-35)[0] - recentLow) / closes.slice(-35)[0];
  if (priorDrop > 0.08 && consolidation < 0.06 && last < s20) {
    detected.push({ pattern:'Bear Flag', type:'bearish', confidence: Math.round(60 + priorDrop * 100), timeframe:'Recent' });
  }

  // ── Double Bottom: two similar lows in last 60 candles ─────────────────
  const window60 = lows.slice(-60);
  const sorted60 = [...window60].sort((a, b) => a - b);
  const low1     = sorted60[0];
  const low2     = sorted60.find((v, i) => i > 0 && Math.abs(v - low1) / low1 < 0.03);
  if (low2) {
    const idx1 = window60.lastIndexOf(low1);
    const idx2 = window60.lastIndexOf(low2);
    if (Math.abs(idx1 - idx2) > 5 && last > sorted60[Math.floor(sorted60.length * 0.3)]) {
      detected.push({ pattern:'Double Bottom', type:'bullish', confidence:72, timeframe:'2M' });
    }
  }

  // ── Double Top: two similar highs in last 60 candles ──────────────────
  const window60h = highs.slice(-60);
  const sortedH   = [...window60h].sort((a, b) => b - a);
  const hi1       = sortedH[0];
  const hi2       = sortedH.find((v, i) => i > 0 && Math.abs(v - hi1) / hi1 < 0.03);
  if (hi2) {
    const idxH1 = window60h.lastIndexOf(hi1);
    const idxH2 = window60h.lastIndexOf(hi2);
    if (Math.abs(idxH1 - idxH2) > 5 && last < sortedH[Math.floor(sortedH.length * 0.3)]) {
      detected.push({ pattern:'Double Top', type:'bearish', confidence:70, timeframe:'2M' });
    }
  }

  // ── Ascending Triangle: flat resistance + rising lows ─────────────────
  const recentHighs = highs.slice(-20);
  const recentLows  = lows.slice(-20);
  const highRange   = (Math.max(...recentHighs) - Math.min(...recentHighs)) / Math.max(...recentHighs);
  const lowSlope    = (recentLows[recentLows.length-1] - recentLows[0]) / recentLows[0];
  if (highRange < 0.03 && lowSlope > 0.02) {
    detected.push({ pattern:'Ascending Triangle', type:'bullish', confidence:68, timeframe:'1M' });
  }

  // ── Descending Triangle: flat support + falling highs ─────────────────
  const lowRange   = (Math.max(...recentLows) - Math.min(...recentLows)) / Math.max(...recentLows);
  const highSlope  = (recentHighs[recentHighs.length-1] - recentHighs[0]) / recentHighs[0];
  if (lowRange < 0.03 && highSlope < -0.02) {
    detected.push({ pattern:'Descending Triangle', type:'bearish', confidence:65, timeframe:'1M' });
  }

  // ── Golden Cross (bonus) ───────────────────────────────────────────────
  const prevS20 = sma20[sma20.length - 2];
  const prevS50 = sma50[sma50.length - 2];
  if (s20 && s50 && prevS20 && prevS50 && prevS20 <= prevS50 && s20 > s50) {
    detected.push({ pattern:'Golden Cross', type:'bullish', confidence:82, timeframe:'Signal' });
  }

  // ── Death Cross (bonus) ────────────────────────────────────────────────
  if (s20 && s50 && prevS20 && prevS50 && prevS20 >= prevS50 && s20 < s50) {
    detected.push({ pattern:'Death Cross', type:'bearish', confidence:80, timeframe:'Signal' });
  }

  return detected;
}

async function analyzeStock(symbolObj) {
  try {
    const res = await fetch(`${API_BASE}/api/ohlc/${encodeURIComponent(symbolObj)}?period=6M`);
    if (!res.ok) return null;
    const data = await res.json();
    const candles = data.candles || [];
    if (candles.length < 30) return null;

    const patterns = detectPatterns(candles);
    if (patterns.length === 0) return null;

    const last = candles[candles.length - 1];
    const first = candles[candles.length - 30];
    const change30d = ((last.close - first.close) / first.close * 100).toFixed(1);

    return {
      symbol: symbolObj.replace('.NS',''),
      fullSymbol: symbolObj,
      price: last.close,
      change30d: parseFloat(change30d),
      patterns,
    };
  } catch { return null; }
}

export default function PatternPage() {
  const [activeTab, setActiveTab]       = useState('scan');
  const [filter, setFilter]             = useState('all');
  const [selectedPattern, setSelected]  = useState(null);
  const [scanResults, setScanResults]   = useState([]);
  const [scanning, setScanning]         = useState(false);
  const [scanDone, setScanDone]         = useState(false);
  const [progress, setProgress]         = useState(0);

  const runScan = async () => {
    setScanning(true); setScanResults([]); setScanDone(false); setProgress(0);
    const results = [];
    for (let i = 0; i < WATCHLIST.length; i++) {
      const r = await analyzeStock(WATCHLIST[i]);
      if (r) results.push(r);
      setProgress(Math.round(((i + 1) / WATCHLIST.length) * 100));
    }
    setScanResults(results);
    setScanning(false);
    setScanDone(true);
  };

  // Auto-scan on first load
  useEffect(() => { runScan(); }, []);

  // Flatten all (stock, pattern) pairs for display + filtering
  const allDetected = scanResults.flatMap(s =>
    s.patterns.map(p => ({ ...p, symbol: s.symbol, fullSymbol: s.fullSymbol, price: s.price, change30d: s.change30d }))
  );
  const filtered = allDetected.filter(d => filter === 'all' || d.type === filter);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Chart Pattern Recognition</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Real-time pattern detection · 6M OHLC · {WATCHLIST.length} NSE stocks</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[['scan','🔍 Pattern Scanner'],['learn','📚 Pattern Library']].map(([v,l]) => (
          <button key={v} onClick={() => setActiveTab(v)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${activeTab === v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'}`}>
            {l}
          </button>
        ))}
      </div>

      {activeTab === 'scan' && (
        <>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex gap-2">
              {[['all','🔀 All'],['bullish','🟢 Bullish'],['bearish','🔴 Bearish'],['neutral','🟡 Neutral']].map(([v,l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filter === v ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'}`}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={runScan} disabled={scanning}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors">
              {scanning ? `Scanning… ${progress}%` : '🔄 Rescan'}
            </button>
          </div>

          {scanning && (
            <div className="mb-5">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Fetching real OHLC data and detecting patterns…
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width:`${progress}%` }} />
              </div>
            </div>
          )}

          {scanDone && filtered.length === 0 && !scanning && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center text-gray-400">
              <div className="text-4xl mb-3">📊</div>
              <p>No {filter === 'all' ? '' : filter} patterns detected in current market conditions.</p>
              <p className="text-sm mt-2">Market may be in a transitional or trendless phase.</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((s, i) => (
              <div key={`${s.symbol}-${s.pattern}-${i}`}
                className={`bg-white dark:bg-gray-900 rounded-2xl border-2 overflow-hidden hover:shadow-lg transition-all ${s.type === 'bullish' ? 'border-green-200 dark:border-green-800' : s.type === 'bearish' ? 'border-red-200 dark:border-red-800' : 'border-yellow-200 dark:border-yellow-800'}`}>
                <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${s.type === 'bullish' ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400' : s.type === 'bearish' ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400' : 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400'}`}>
                  {s.type === 'bullish' ? '▲ Bullish' : s.type === 'bearish' ? '▼ Bearish' : '◆ Neutral'} · {s.timeframe}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Link to={`/stock/${s.fullSymbol}`} className="text-lg font-black text-gray-900 dark:text-white hover:text-blue-600">{s.symbol}</Link>
                    <span className={`text-sm font-bold ${s.change30d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {s.change30d >= 0 ? '+' : ''}{s.change30d}% 30d
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{s.pattern}</p>
                  <div className="text-xs text-gray-500 mb-1">Confidence</div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
                    <div className={`h-full rounded-full ${s.type === 'bullish' ? 'bg-green-500' : s.type === 'bearish' ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width:`${s.confidence}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-mono font-bold">{s.confidence}% confidence</span>
                    <span>₹{s.price?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {scanDone && filtered.length > 0 && (
            <p className="text-xs text-center text-gray-400 mt-4">
              📡 {filtered.length} pattern signals · Real OHLC from Yahoo Finance · Algorithmic detection
            </p>
          )}
        </>
      )}

      {activeTab === 'learn' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {PATTERNS.map(p => (
            <div key={p.name}
              className={`bg-white dark:bg-gray-900 rounded-2xl border cursor-pointer transition-all ${selectedPattern === p.name ? 'border-blue-500 shadow-lg' : 'border-gray-200 dark:border-gray-800 hover:border-blue-300'}`}
              onClick={() => setSelected(selectedPattern === p.name ? null : p.name)}>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl font-bold">{p.emoji}</span>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">{p.name}</div>
                    <div className={`text-xs font-semibold mt-0.5 ${p.type === 'bullish' ? 'text-green-600' : p.type === 'bearish' ? 'text-red-600' : 'text-yellow-600'}`}>
                      {p.type === 'bullish' ? '▲ Bullish' : p.type === 'bearish' ? '▼ Bearish' : '◆ Neutral'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-gray-900 dark:text-white">{p.reliability}%</div>
                  <div className="text-xs text-gray-500">reliability</div>
                </div>
              </div>
              {selectedPattern === p.name && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{p.desc}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
