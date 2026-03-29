// SentimentPage.jsx — Month 31 FIX: routes through backend to avoid CORS
// All data fetched directly from Yahoo Finance via Vite proxy
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Yahoo Finance fetcher (same v8 endpoint the Scanner uses) ────────────────
const YF = (sym) => `/api/yf/${sym}`; // goes through Vite proxy → Yahoo

async function yf(symbol, range = '1d', interval = '1d') {
  // Use backend as a passthrough to avoid CORS — or call directly
  try {
    const r = await axios.get(
      `${API_BASE}/api/ohlc/${symbol}`,
      { params: { interval, range }, timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    return r.data?.chart?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

async function getQuote(symbol) {
  const res = await yf(symbol, '2d', '1d');
  if (!res) return null;
  const meta = res.meta;
  const closes = res.indicators?.quote?.[0]?.close ?? [];
  const prev = closes[closes.length - 2] ?? meta.chartPreviousClose ?? meta.regularMarketPrice;
  const cur  = meta.regularMarketPrice;
  return { price: cur, prev, changePct: prev ? ((cur - prev) / prev) * 100 : 0 };
}

async function getHistory(symbol, range = '1mo') {
  const res = await yf(symbol, range, '1d');
  if (!res) return [];
  const ts  = res.timestamp ?? [];
  const cls = res.indicators?.quote?.[0]?.close ?? [];
  return ts.map((t, i) => ({ date: new Date(t * 1000), close: cls[i] }))
            .filter(d => d.close != null);
}

// ─── Score calculations ───────────────────────────────────────────────────────
function scoreFromPriceChange(candles) {
  if (candles.length < 5) return 50;
  const cur   = candles[candles.length - 1].close;
  const wk    = candles[Math.max(0, candles.length - 5)].close;
  const month = candles[0].close;
  const wkPct  = ((cur - wk) / wk) * 100;
  const moPct  = ((cur - month) / month) * 100;
  const s = Math.round(
    Math.min(100, Math.max(0, 50 + wkPct * 8)) * 0.55 +
    Math.min(100, Math.max(0, 50 + moPct * 4)) * 0.45
  );
  return s;
}
function scoreFromVIX(vix) {
  if (vix < 12) return 88; if (vix < 14) return 75;
  if (vix < 17) return 60; if (vix < 21) return 47;
  if (vix < 26) return 33; return 16;
}
function scoreFromBreadth(quotes) {
  const valid = quotes.filter(Boolean);
  if (!valid.length) return 50;
  const up = valid.filter(q => q.changePct > 0).length;
  return Math.round((up / valid.length) * 100);
}
function scoreFromPCR(vix) {
  if (vix < 12) return 82; if (vix < 15) return 66;
  if (vix < 18) return 50; if (vix < 24) return 36; return 20;
}

// ─── Gauges & visuals ─────────────────────────────────────────────────────────
const NIFTY_SAMPLE = [
  'RELIANCE.NS','TCS.NS','HDFCBANK.NS','INFY.NS','ICICIBANK.NS',
  'HINDUNILVR.NS','ITC.NS','SBIN.NS','BHARTIARTL.NS','KOTAKBANK.NS',
  'LT.NS','AXISBANK.NS','MARUTI.NS','SUNPHARMA.NS','TITAN.NS'
];

function scoreLabel(s) {
  if (s >= 76) return 'Extreme Greed';
  if (s >= 56) return 'Greed';
  if (s >= 44) return 'Neutral';
  if (s >= 24) return 'Fear';
  return 'Extreme Fear';
}
function scoreColor(s) {
  if (s >= 76) return '#ef4444';
  if (s >= 56) return '#f59e0b';
  if (s >= 44) return '#6b7280';
  if (s >= 24) return '#3b82f6';
  return '#22c55e';
}
function scoreSignal(s) {
  if (s >= 76) return 'Market is overbought. Consider booking partial profits.';
  if (s >= 56) return 'Bullish momentum. Stay invested but use trailing stop-losses.';
  if (s >= 44) return 'Mixed signals. Wait for clearer direction before new positions.';
  if (s >= 24) return 'Bearish pressure. Accumulation zone for long-term investors.';
  return 'Extreme pessimism — historically strong buying opportunity (contrarian).';
}

// Semi-circle gauge
function Gauge({ score }) {
  const angle = ((score / 100) * 180 - 90) * (Math.PI / 180);
  const cx = 110, cy = 100, r = 82;
  const nx = cx + r * Math.cos(angle);
  const ny = cy + r * Math.sin(angle);
  const color = scoreColor(score);

  const zones = [
    { color: '#22c55e', a1: -90, a2: -54 },
    { color: '#3b82f6', a1: -54, a2: -18 },
    { color: '#9ca3af', a1: -18, a2:  18 },
    { color: '#f59e0b', a1:  18, a2:  54 },
    { color: '#ef4444', a1:  54, a2:  90 },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg width="220" height="120" viewBox="0 0 220 120">
        {zones.map(({ color: c, a1, a2 }, i) => {
          const r1 = (a1 * Math.PI) / 180, r2 = (a2 * Math.PI) / 180;
          const x1 = cx + r * Math.cos(r1), y1 = cy + r * Math.sin(r1);
          const x2 = cx + r * Math.cos(r2), y2 = cy + r * Math.sin(r2);
          return (
            <path key={i}
              d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
              fill={c} opacity="0.20" />
          );
        })}
        {/* Arc outline */}
        <path d={`M${cx - r},${cy} A${r},${r} 0 0,1 ${cx + r},${cy}`}
          fill="none" stroke="#d1d5db" strokeWidth="2" className="dark:stroke-gray-700" />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={color} />
        {/* Labels */}
        <text x={cx} y={cy - 20} textAnchor="middle"
          style={{ fontSize: 26, fontWeight: 900, fill: color }}>{score}</text>
        <text x={cx} y={cy - 6} textAnchor="middle"
          style={{ fontSize: 10, fontWeight: 700, fill: color }}>{scoreLabel(score)}</text>
      </svg>
      <div className="flex justify-between w-48 text-xs text-gray-400 dark:text-gray-500 mt-1">
        <span>Extreme Fear</span><span>Extreme Greed</span>
      </div>
    </div>
  );
}

function Bar({ label, value, weight, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-gray-400">{label} <span className="text-gray-400 dark:text-gray-600">({weight})</span></span>
        <span className="font-bold" style={{ color }}>{Math.round(value)}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SentimentPage() {
  const [state, setState] = useState({ status: 'idle' }); // idle | loading | done | error

  async function load() {
    setState({ status: 'loading' });
    try {
      // Fetch all data in parallel — any null result is handled gracefully
      const [nifty, vixRes, history, ...breadth] = await Promise.all([
        getQuote('^NSEI'),
        getQuote('^INDIAVIX'),
        getHistory('^NSEI', '1mo'),
        ...NIFTY_SAMPLE.map(s => getQuote(s))
      ]);

      const vix  = vixRes?.price ?? 16;
      const mom  = scoreFromPriceChange(history);
      const vol  = scoreFromVIX(vix);
      const brd  = scoreFromBreadth(breadth);
      const pcr  = scoreFromPCR(vix);
      const score = Math.round(mom * 0.30 + vol * 0.25 + brd * 0.25 + pcr * 0.20);

      const adv = breadth.filter(q => q && q.changePct > 0).length;
      const dec = breadth.filter(q => q && q.changePct < 0).length;

      const pcrVal = vix < 12 ? 0.65 : vix < 15 ? 0.85 : vix < 18 ? 1.05 : vix < 25 ? 1.35 : 1.65;
      const pcrLbl = pcrVal < 0.7 ? 'Extreme Bullish' : pcrVal < 1.0 ? 'Bullish' :
                     pcrVal < 1.2 ? 'Neutral' : pcrVal < 1.5 ? 'Bearish' : 'Extreme Bearish';

      setState({
        status: 'done', score, vix, nifty, adv, dec,
        pcrVal, pcrLbl,
        components: { mom, vol, brd, pcr },
        updatedAt: new Date()
      });
    } catch (e) {
      setState({ status: 'error', msg: e.message });
    }
  }

  useEffect(() => { load(); }, []);

  const { status } = state;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading' || status === 'idle') return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-4">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[...Array(4)].map((_, i) => <div key={i} className="h-52 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
      </div>
      <p className="text-center text-sm text-gray-400 animate-pulse">Fetching live market data…</p>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === 'error') return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Could not load market data</h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Yahoo Finance may be temporarily unavailable. Try again in a moment.</p>
      <button onClick={load}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">
        Try Again
      </button>
    </div>
  );

  // ── Data ───────────────────────────────────────────────────────────────────
  const { score, vix, nifty, adv, dec, pcrVal, pcrLbl, components, updatedAt } = state;
  const color  = scoreColor(score);
  const label  = scoreLabel(score);
  const signal = scoreSignal(score);
  const total  = adv + dec || 1;

  const pcrColor = pcrVal < 0.7  ? '#22c55e' : pcrVal < 1.0 ? '#3b82f6' :
                   pcrVal < 1.2  ? '#6b7280' : pcrVal < 1.5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-7 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">📊 Market Sentiment</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Live Fear & Greed indicators — NSE / Nifty 50</p>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && <span className="text-xs text-gray-400">Updated {updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
          <button onClick={load}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Market strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { lbl: 'Nifty 50',
            val: nifty ? `₹${nifty.price.toLocaleString('en-IN',{maximumFractionDigits:1})}` : '—',
            sub: nifty ? `${nifty.changePct >= 0 ? '+' : ''}${nifty.changePct.toFixed(2)}%` : '',
            pos: (nifty?.changePct ?? 0) >= 0 },
          { lbl: 'India VIX',
            val: vix.toFixed(2),
            sub: vix < 15 ? 'Low Volatility' : vix < 25 ? 'Moderate' : 'High Volatility',
            pos: vix < 20 },
          { lbl: 'Adv / Dec',
            val: `${adv} / ${dec}`,
            sub: `Ratio ${dec > 0 ? (adv/dec).toFixed(1) : adv}x`,
            pos: adv >= dec },
        ].map(({ lbl, val, sub, pos }) => (
          <div key={lbl} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{lbl}</p>
            <p className="text-lg font-black text-gray-900 dark:text-white">{val}</p>
            <p className={`text-xs font-semibold ${pos ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Fear & Greed + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 dark:text-white mb-0.5">😱 Fear & Greed Index</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Composite of 4 market indicators</p>
          <Gauge score={score} />
          <div className="mt-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
            💡 {signal}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 dark:text-white mb-0.5">🔬 Component Breakdown</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">How the score is calculated</p>
          <div className="space-y-4">
            <Bar label="Price Momentum"   value={components.mom} weight="30%" color="#3b82f6" />
            <Bar label="VIX Volatility"   value={components.vol} weight="25%" color="#8b5cf6" />
            <Bar label="Market Breadth"   value={components.brd} weight="25%" color="#10b981" />
            <Bar label="Put/Call (proxy)" value={components.pcr} weight="20%" color="#f59e0b" />
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Overall Score</span>
            <span className="text-2xl font-black" style={{ color }}>{score} — {label}</span>
          </div>
        </div>
      </div>

      {/* Put/Call + Advance/Decline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Put/Call */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 dark:text-white mb-0.5">📊 Put/Call Ratio</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Options market fear gauge (VIX-derived)</p>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl font-black text-gray-900 dark:text-white">{pcrVal.toFixed(2)}</span>
            <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: pcrColor + '22', color: pcrColor }}>
              {pcrLbl}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {pcrVal < 1.0
              ? 'More calls than puts — bulls dominate the options market.'
              : pcrVal < 1.2
              ? 'Balanced market. Hedgers and speculators in equilibrium.'
              : 'More puts than calls — traders buying downside protection.'}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[['< 0.7','Extreme\nBullish','#22c55e'],['0.7–1.2','Neutral','#6b7280'],['> 1.2','Bearish','#ef4444']].map(([r,l,c]) => (
              <div key={r} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                <div className="font-bold" style={{ color: c }}>{r}</div>
                <div className="text-gray-400 leading-tight">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Advance / Decline */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 dark:text-white mb-0.5">📈 Advance / Decline</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Breadth of Nifty 50 stocks today</p>
          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-green-600 dark:text-green-400">{adv}</div>
              <div className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">Advancing ↑</div>
            </div>
            <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-red-600 dark:text-red-400">{dec}</div>
              <div className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">Declining ↓</div>
            </div>
          </div>
          <div className="h-3 rounded-full bg-red-100 dark:bg-red-900/30 overflow-hidden mb-1">
            <div className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{ width: `${(adv / total) * 100}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mb-3"><span>Bearish</span><span>Bullish</span></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {adv >= dec
              ? `${adv} of ${total} Nifty stocks are up — broad-based rally.`
              : `${dec} of ${total} Nifty stocks are down — wide selling pressure.`}
          </p>
        </div>
      </div>

      {/* How to read */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5 mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3">💡 How to Read These Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
          <p><strong className="text-gray-800 dark:text-gray-200">Fear & Greed:</strong> Extreme Fear = historically good buying zone. Extreme Greed = time to take profits (contrarian).</p>
          <p><strong className="text-gray-800 dark:text-gray-200">VIX:</strong> Below 15 = calm market. Above 25 = high fear, expect sharp swings.</p>
          <p><strong className="text-gray-800 dark:text-gray-200">Put/Call:</strong> Above 1.2 = bearish hedge buying (potential bottom). Below 0.7 = complacency (potential top).</p>
          <p><strong className="text-gray-800 dark:text-gray-200">Adv/Dec:</strong> High advances confirm rally strength. Low advances during a rise = weak breadth, be careful.</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-600 text-center">⚠️ For informational purposes only. Not SEBI registered. Not financial advice.</p>
    </div>
  );
}
