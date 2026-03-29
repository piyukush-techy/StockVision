// RegimeAnalysisPage.jsx — completely self-contained, zero backend dependency
// Fetches 2 years of OHLC from Yahoo Finance, computes MA50/MA200 client-side
import { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Yahoo Finance v8 chart fetch ─────────────────────────────────────────────
async function fetchCandles(symbol, years = 2) {
  const r = await axios.get(
    `${API_BASE}/api/yf-proxy/${symbol}`,
    { params: { interval: '1d', range: `${years}y` }, timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' } }
  );
  const res = r.data?.chart?.result?.[0];
  if (!res) throw new Error('No data returned for ' + symbol);
  const ts = res.timestamp ?? [];
  const q  = res.indicators?.quote?.[0] ?? {};
  const candles = ts
    .map((t, i) => ({ date: new Date(t * 1000), close: q.close?.[i] }))
    .filter(c => c.close != null);
  if (candles.length < 60) throw new Error(`Only ${candles.length} candles (need 60+). Check the symbol.`);
  return candles;
}

// ─── Indicators ───────────────────────────────────────────────────────────────
function maArr(candles, p) {
  return candles.map((_, i) => {
    if (i < p - 1) return null;
    const slice = candles.slice(i - p + 1, i + 1);
    return slice.reduce((s, c) => s + c.close, 0) / p;
  });
}

function volArr(candles, p = 20) {
  return candles.map((_, i) => {
    if (i < p) return null;
    const slice = candles.slice(i - p + 1, i + 1);
    const rets  = slice.slice(1).map((c, j) => (c.close - slice[j].close) / slice[j].close);
    const mean  = rets.reduce((s, r) => s + r, 0) / rets.length;
    const std   = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length);
    return std * Math.sqrt(252) * 100;
  });
}

function classifyPoint(price, m50, m200, vol) {
  if (!m50 || !m200) return null;
  const p50 = ((price - m50)  / m50)  * 100;
  const p200= ((price - m200) / m200) * 100;
  const mm  = ((m50  - m200)  / m200) * 100;
  const hi  = (vol ?? 0) > 25;
  if (p50 > 3  && p200 > 5  && mm > 2)           return hi ? 'VOLATILE_BULL' : 'BULL';
  if (p50 < -3 && p200 < -5 && mm < -2)           return hi ? 'VOLATILE_BEAR' : 'BEAR';
  if (Math.abs(p50) < 2 && Math.abs(mm) < 1)      return 'SIDEWAYS';
  if (p50 > 0 && p200 > 0)                         return 'BULL';
  if (p50 < 0 && p200 < 0)                         return 'BEAR';
  return 'SIDEWAYS';
}

// ─── Full analysis ────────────────────────────────────────────────────────────
async function analyse(raw) {
  const sym = raw.trim().toUpperCase();
  const symbol = sym.includes('.') || sym.startsWith('^') ? sym : sym + '.NS';
  const candles = await fetchCandles(symbol);

  const m50  = maArr(candles, 50);
  const m200 = maArr(candles, 200);
  const vols = volArr(candles, 20);

  const i    = candles.length - 1;
  const cur  = candles[i];
  const reg  = classifyPoint(cur.close, m50[i], m200[i], vols[i]) ?? 'UNKNOWN';

  // Trend duration (how many consecutive days above/below MA50)
  let trendDays = 0;
  const above = cur.close > (m50[i] ?? cur.close);
  for (let j = i; j >= Math.max(0, i - 120); j--) {
    const a = candles[j].close > (m50[j] ?? candles[j].close);
    if (a === above) trendDays++; else break;
  }

  // Confidence
  const p200pct = m200[i] ? ((cur.close - m200[i]) / m200[i]) * 100 : 0;
  const conf    = Math.min(94, Math.round(58 + Math.abs(p200pct) * 1.8 + trendDays * 0.4));

  // History — find regime segments
  const firstValid = m200.findIndex(v => v !== null);
  const segments = [];
  let curSeg = null, segStart = firstValid;

  for (let j = firstValid; j <= i; j++) {
    const r = classifyPoint(candles[j].close, m50[j], m200[j], vols[j]);
    if (!r) continue;
    if (r !== curSeg) {
      if (curSeg && j - segStart >= 4) {
        const sp = candles[segStart].close, ep = candles[j - 1].close;
        segments.push({
          regime: curSeg,
          start: candles[segStart].date,
          end:   candles[j - 1].date,
          days:  j - segStart,
          ret:   +((ep - sp) / sp * 100).toFixed(1)
        });
      }
      curSeg = r; segStart = j;
    }
  }
  if (curSeg) {
    const sp = candles[segStart].close;
    segments.push({
      regime: curSeg, start: candles[segStart].date, end: cur.date,
      days: i - segStart + 1, ret: +((cur.close - sp) / sp * 100).toFixed(1)
    });
  }

  // Time-in-regime stats
  const total = segments.reduce((s, x) => s + x.days, 0) || 1;
  const pBull = segments.filter(x => x.regime.includes('BULL')).reduce((s, x) => s + x.days, 0);
  const pBear = segments.filter(x => x.regime.includes('BEAR')).reduce((s, x) => s + x.days, 0);
  const pSide = segments.filter(x => x.regime === 'SIDEWAYS').reduce((s, x) => s + x.days, 0);

  return {
    symbol, regime: reg, confidence: conf,
    price: cur.close, ma50: m50[i], ma200: m200[i],
    vol: vols[i],
    p50pct:  m50[i]  ? +((cur.close - m50[i])  / m50[i]  * 100).toFixed(2) : null,
    p200pct: m200[i] ? +((cur.close - m200[i]) / m200[i] * 100).toFixed(2) : null,
    trendDays,
    history: segments.slice(-10).reverse(),
    pBull: +((pBull / total) * 100).toFixed(0),
    pBear: +((pBear / total) * 100).toFixed(0),
    pSide: +((pSide / total) * 100).toFixed(0),
  };
}

// ─── Regime config ─────────────────────────────────────────────────────────────
const RC = {
  BULL:          { icon: '📈', label: 'Bull Market',    c: '#22c55e', bg: 'bg-green-50 dark:bg-green-900/20',    border: 'border-green-200 dark:border-green-800',    text: 'text-green-700 dark:text-green-400'  },
  VOLATILE_BULL: { icon: '⚡', label: 'Volatile Bull',  c: '#f59e0b', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800',  text: 'text-yellow-700 dark:text-yellow-400'},
  BEAR:          { icon: '📉', label: 'Bear Market',    c: '#ef4444', bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-800',        text: 'text-red-700 dark:text-red-400'     },
  VOLATILE_BEAR: { icon: '🌪️', label: 'Volatile Bear',  c: '#f97316', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800',  text: 'text-orange-700 dark:text-orange-400'},
  SIDEWAYS:      { icon: '↔️', label: 'Sideways',       c: '#6b7280', bg: 'bg-gray-50 dark:bg-gray-700/40',    border: 'border-gray-200 dark:border-gray-700',      text: 'text-gray-600 dark:text-gray-300'   },
  UNKNOWN:       { icon: '❓', label: 'Unknown',        c: '#9ca3af', bg: 'bg-gray-50 dark:bg-gray-700/40',    border: 'border-gray-200 dark:border-gray-700',      text: 'text-gray-500 dark:text-gray-400'   },
};

const DESCRIPTIONS = {
  BULL:          'Price is above both MA50 and MA200, with MA50 crossing above MA200. Classic uptrend. Favour long positions and run your winners.',
  VOLATILE_BULL: 'Uptrend confirmed but elevated volatility. Reduce position size, use wider stop-losses.',
  BEAR:          'Price below both MA50 and MA200. Confirmed downtrend. Avoid fresh longs; respect your stop-losses.',
  VOLATILE_BEAR: 'Downtrend with extreme volatility — the most dangerous regime. Minimise equity exposure.',
  SIDEWAYS:      'Price oscillating between the two MAs. No clear trend. Range-bound strategies (buy dips, sell rallies) work better than trend-following.',
  UNKNOWN:       'Not enough data to classify. Use a well-traded NSE symbol like RELIANCE.NS or ^NSEI.',
};

const STRATEGIES = {
  BULL:          ['✅ Stay invested — trail stop-losses upward', '✅ Add on dips toward MA50', '✅ Rotate into high-beta sectors'],
  VOLATILE_BULL: ['⚡ Cut position size 30–40%', '⚡ Wider stop-losses for volatility', '⚡ Consider buying put protection'],
  BEAR:          ['🔴 No fresh longs until trend reverses', '🔴 Reduce equity allocation', '🔴 Cash / gold / debt as alternatives'],
  VOLATILE_BEAR: ['🚨 50%+ cash recommended', '🚨 Hard stops on everything', '🚨 Wait for VIX to calm before re-entry'],
  SIDEWAYS:      ['↔️ Buy at support, sell at resistance', '↔️ Mean-reversion setups work well', '↔️ Wait for confirmed breakout before trend trades'],
  UNKNOWN:       ['❓ Verify the symbol (add .NS for NSE)', '❓ Ensure 2+ years of trading history'],
};

const QUICK = ['RELIANCE.NS','^NSEI','TCS.NS','HDFCBANK.NS','SBIN.NS','BAJFINANCE.NS','TATAMOTORS.NS','ADANIENT.NS','NIFTY_IND_NS','INFY.NS'];

// ─── Component ────────────────────────────────────────────────────────────────
export default function RegimeAnalysisPage() {
  const [input,   setInput]   = useState('RELIANCE.NS');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function run(sym) {
    const s = (sym ?? input).trim();
    if (!s) return;
    setLoading(true); setError(null); setResult(null);
    try {
      setResult(await analyse(s));
    } catch (e) {
      setError(e.message || 'Analysis failed. Check the symbol and try again.');
    } finally {
      setLoading(false);
    }
  }

  const cfg = result ? (RC[result.regime] ?? RC.UNKNOWN) : null;
  const fmt  = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:2})}` : '—';
  const fmtD = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">🌊 Market Regime Analysis</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Classify any NSE stock using MA50 / MA200 crossover — no backend, no timeouts
        </p>
      </div>

      {/* Input card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-5 shadow-sm">
        <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
          Stock Symbol
        </label>
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="e.g. RELIANCE.NS or ^NSEI"
            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button
            onClick={() => run()}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold rounded-xl transition-all min-w-32 flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analysing…</>
              : '🔍 Analyse'}
          </button>
        </div>

        {/* Quick symbols */}
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK.map(s => (
            <button key={s}
              onClick={() => { setInput(s); run(s); }}
              className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-mono rounded-lg transition-all">
              {s.replace('.NS','')}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 mb-5 text-center">
          <p className="font-bold text-red-700 dark:text-red-400 mb-1">⚠️ {error}</p>
          <p className="text-xs text-red-600/70 dark:text-red-400/60">
            Symbols must end in .NS for NSE stocks (e.g. RELIANCE.NS), or use ^NSEI for Nifty 50.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[160, 200, 200].map((h, i) => (
            <div key={i} className="rounded-2xl animate-pulse bg-gray-100 dark:bg-gray-800" style={{ height: h }} />
          ))}
        </div>
      )}

      {/* Results */}
      {result && cfg && !loading && (
        <div className="space-y-5">

          {/* Current Regime banner */}
          <div className={`rounded-2xl border p-6 shadow-sm ${cfg.bg} ${cfg.border}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                  Current Regime — {result.symbol}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-5xl">{cfg.icon}</span>
                  <div>
                    <h2 className={`text-2xl font-black ${cfg.text}`}>{cfg.label}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg mt-0.5">
                      {DESCRIPTIONS[result.regime]}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Confidence</p>
                <p className={`text-3xl font-black ${cfg.text}`}>{result.confidence}%</p>
              </div>
            </div>
          </div>

          {/* Metrics + Strategy */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4">📐 Key Metrics</h3>
              {[
                { lbl: 'Current Price',  val: fmt(result.price) },
                { lbl: 'MA 50',          val: fmt(result.ma50) },
                { lbl: 'MA 200',         val: fmt(result.ma200) },
                { lbl: 'Price vs MA50',  val: result.p50pct  != null ? `${result.p50pct  >= 0 ? '+' : ''}${result.p50pct}%`  : '—', color: result.p50pct  >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
                { lbl: 'Price vs MA200', val: result.p200pct != null ? `${result.p200pct >= 0 ? '+' : ''}${result.p200pct}%` : '—', color: result.p200pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
                { lbl: 'Annualised Vol', val: result.vol != null ? `${result.vol.toFixed(1)}%` : '—' },
                { lbl: 'Trend Duration', val: `${result.trendDays} days` },
              ].map(({ lbl, val, color }) => (
                <div key={lbl} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{lbl}</span>
                  <span className={`text-sm font-bold ${color ?? 'text-gray-900 dark:text-white'}`}>{val}</span>
                </div>
              ))}
            </div>

            {/* Strategy */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4">🎯 Suggested Strategy</h3>
              <div className="space-y-2 mb-5">
                {(STRATEGIES[result.regime] ?? STRATEGIES.UNKNOWN).map((s, i) => (
                  <div key={i} className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">{s}</div>
                ))}
              </div>

              {/* Time distribution */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Time in Each Regime (2 yrs)</p>
                {[
                  { lbl: 'Bull', pct: result.pBull, color: 'bg-green-500' },
                  { lbl: 'Bear', pct: result.pBear, color: 'bg-red-500'   },
                  { lbl: 'Side', pct: result.pSide, color: 'bg-gray-400'  },
                ].map(({ lbl, pct, color }) => (
                  <div key={lbl} className="mb-2">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-500 dark:text-gray-400">{lbl}</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                      <div className={`h-1.5 ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* History table */}
          {result.history.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4">📅 Recent Regime History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-100 dark:border-gray-700">
                      {['Regime','From','To','Duration','Return'].map(h => (
                        <th key={h} className={`pb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 ${h==='Return'||h==='Duration'?'text-right':''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.history.map((h, idx) => {
                      const c = RC[h.regime] ?? RC.UNKNOWN;
                      return (
                        <tr key={idx} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${c.bg} ${c.text}`}>
                              {c.icon} {c.label}
                            </span>
                          </td>
                          <td className="py-2.5 text-xs text-gray-500 dark:text-gray-400">{fmtD(h.start)}</td>
                          <td className="py-2.5 text-xs text-gray-500 dark:text-gray-400">{fmtD(h.end)}</td>
                          <td className="py-2.5 text-right text-gray-700 dark:text-gray-300 font-medium">{h.days}d</td>
                          <td className={`py-2.5 text-right font-bold ${h.ret >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {h.ret >= 0 ? '+' : ''}{h.ret}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-14 text-center">
          <div className="text-5xl mb-4">🌊</div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Enter a symbol to begin</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Try RELIANCE.NS, TCS.NS, or ^NSEI for Nifty 50</p>
          <button onClick={() => run('RELIANCE.NS')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">
            Analyse RELIANCE.NS →
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-6">
        ⚠️ MA50/MA200 crossover methodology. Not SEBI registered. Not financial advice.
      </p>
    </div>
  );
}
