// PerformanceDashboard.jsx — Phase 5 Month 23 (crash-safe rewrite)
import { useState, useEffect, useCallback } from 'react';
import { getHealthDetailed, getHealthMetrics, getHealthErrors, getHealthCache, getHealthRateLimits } from '../api';

// ─── Safe helpers ─────────────────────────────────────────────────────────────
const safe   = (v, fb = '—')   => (v !== null && v !== undefined) ? v : fb;
const fmtSec = (s) => { s = +s || 0; if (s < 60) return s + 's'; if (s < 3600) return Math.floor(s/60) + 'm'; return Math.floor(s/3600) + 'h ' + Math.floor((s%3600)/60) + 'm'; };
const fmtMB  = (n) => (+n || 0).toFixed(1) + ' MB';
const fmtPct = (n) => (+n || 0).toFixed(1) + '%';
const fmtMs  = (n) => (+n || 0).toFixed(0) + 'ms';

function statusColor(s) {
  if (!s) return 'gray';
  const sl = String(s).toLowerCase();
  if (sl === 'healthy' || sl === 'connected' || sl === 'running') return 'green';
  if (sl === 'degraded' || sl === 'connecting') return 'yellow';
  if (sl === 'disconnected') return 'red';
  return 'gray';
}
function hitRateColor(n) { return +n > 80 ? 'green' : +n > 50 ? 'yellow' : 'orange'; }
function errRateColor(n) { return +n < 2 ? 'green' : +n < 10 ? 'yellow' : 'red'; }
function memColor(n)     { return +n < 65 ? 'green' : +n < 85 ? 'yellow' : 'red'; }

const PALETTE = {
  green:   { bg: 'bg-green-50 dark:bg-green-900/20',   border: 'border-green-200 dark:border-green-700',   text: 'text-green-700 dark:text-green-400',   badge: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',   bar: 'bg-green-500',   dot: 'bg-green-500'   },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20',border: 'border-emerald-200 dark:border-emerald-700',text: 'text-emerald-700 dark:text-emerald-400',badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-200 dark:border-blue-700',     text: 'text-blue-700 dark:text-blue-400',     badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',     bar: 'bg-blue-500',   dot: 'bg-blue-500'   },
  yellow:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-700', text: 'text-yellow-700 dark:text-yellow-400', badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300', bar: 'bg-yellow-400', dot: 'bg-yellow-400' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-700', text: 'text-orange-700 dark:text-orange-400', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300', bar: 'bg-orange-500', dot: 'bg-orange-500' },
  red:     { bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-700',       text: 'text-red-700 dark:text-red-400',       badge: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',       bar: 'bg-red-500',   dot: 'bg-red-500'   },
  gray:    { bg: 'bg-gray-50 dark:bg-gray-800',        border: 'border-gray-200 dark:border-gray-700',     text: 'text-gray-600 dark:text-gray-300',     badge: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',     bar: 'bg-gray-400',  dot: 'bg-gray-400'  },
};
const P = (c) => PALETTE[c] || PALETTE.gray;

// ─── Reusable UI ──────────────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 ${className}`}>{children}</div>;
}
function Head({ emoji, title, sub }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
      <span className="text-xl">{emoji}</span>
      <div>
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h3>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}
function Pill({ label, value, color = 'gray' }) {
  const c = P(color);
  return (
    <div className={`rounded-xl border p-3 ${c.bg} ${c.border}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={`text-xl font-black ${c.text}`}>{value}</p>
    </div>
  );
}
function Bar({ pct, color = 'green', height = 'h-3' }) {
  const c = P(color);
  return (
    <div className={`w-full ${height} bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden`}>
      <div className={`${height} rounded-full ${c.bar}`} style={{ width: `${Math.min(+pct || 0, 100)}%` }} />
    </div>
  );
}
function Dot({ color = 'gray' }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${P(color).dot}`} />;
}
function Spinner({ msg = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="relative w-10 h-10">
        <div className="w-10 h-10 border-4 border-gray-100 dark:border-gray-700 rounded-full" />
        <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-sm text-gray-500">{msg}</p>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────
function HealthHero({ health }) {
  const overall = health?.status || 'unknown';
  const col     = statusColor(overall);
  const c       = P(col);
  const services = health?.services || {};

  return (
    <div className={`rounded-2xl border-2 p-5 ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="text-4xl">{col === 'green' ? '✅' : col === 'yellow' ? '⚠️' : '❌'}</div>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-0.5">System Status</p>
          <p className={`text-3xl font-black capitalize ${c.text}`}>{overall}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Uptime: {fmtSec(health?.uptime)} · {health?.environment?.node || ''} · {health?.environment?.env || 'dev'}
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          {Object.entries(services).map(([name, svc]) => (
            <div key={name} className="text-center">
              <div className="flex items-center gap-1.5 justify-center">
                <Dot color={statusColor(svc?.status)} />
                <span className={`text-xs font-bold capitalize ${P(statusColor(svc?.status)).text}`}>{svc?.status || '?'}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SystemCard({ system }) {
  if (!system) return null;
  const mem    = system.memory || {};
  const cpu    = system.cpu    || {};
  const sysOs  = system.os     || {};
  const pctVal = +(mem.heapUsedPct || 0);

  return (
    <Card>
      <Head emoji="💻" title="System Resources" sub={`PID ${system.pid || '?'} · ${sysOs.hostname || ''}`} />
      <div className="p-5 space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-bold text-gray-700 dark:text-gray-300">Heap Memory</span>
            <span className={`font-black ${P(memColor(pctVal)).text}`}>
              {fmtMB(mem.heapUsedMB)} / {fmtMB(mem.heapTotalMB)} ({fmtPct(mem.heapUsedPct)})
            </span>
          </div>
          <Bar pct={pctVal} color={memColor(pctVal)} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Pill label="RSS"           value={fmtMB(mem.rssMB)}        color="gray"  />
          <Pill label="Load Avg 1m"   value={+(cpu.loadAvg1m||0).toFixed(2)} color={(cpu.loadAvg1m||0) > (cpu.cores||4) ? 'orange' : 'green'} />
          <Pill label="CPU Cores"     value={cpu.cores || '?'}         color="blue"  />
          <Pill label="Free RAM"      value={sysOs.freeMem || '?'}     color="blue"  />
        </div>
      </div>
    </Card>
  );
}

function CacheCard({ data }) {
  if (!data) return null;
  const hitRate  = +(data.hitRate || 0);
  const hColor   = hitRateColor(hitRate);

  return (
    <Card>
      <Head emoji="💾" title="Cache Performance"
        sub={`${data.type === 'redis' ? '🔴 Redis' : '🔵 In-Memory'} · ${data.size || 0} keys`} />
      <div className="p-5 space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-bold text-gray-700 dark:text-gray-300">Hit Rate</span>
            <span className={`font-black text-lg ${P(hColor).text}`}>{fmtPct(hitRate)}</span>
          </div>
          <Bar pct={hitRate} color={hColor} />
          <p className="text-xs text-gray-400 mt-1">
            {hitRate > 80 ? '✅ Excellent' : hitRate > 50 ? '⚠️ Warming up' : '🔄 Cache cold — improves over time'}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Pill label="Hits"    value={safe(data.hits,    0)} color="green"  />
          <Pill label="Misses"  value={safe(data.misses,  0)} color="gray"   />
          <Pill label="Sets"    value={safe(data.sets,    0)} color="blue"   />
          <Pill label="Deletes" value={safe(data.deletes, 0)} color="orange" />
        </div>
        {data.type === 'memory' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400">
            💡 <strong>Enable Redis:</strong> install Redis Desktop → <code className="bg-blue-100 dark:bg-blue-900/60 px-1 rounded">npm install redis</code> in backend folder. Server auto-detects it.
          </div>
        )}
      </div>
    </Card>
  );
}

function MetricsCard({ data }) {
  if (!data) return null;
  const errRate = +(data.errorRate || 0);

  return (
    <Card>
      <Head emoji="📊" title="Request Metrics" sub="Top API routes — current server session" />
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Pill label="Total Requests" value={safe(data.total, 0)}             color="blue"  />
          <Pill label="Errors"         value={safe(data.errors, 0)}            color={data.errors > 0 ? 'red' : 'green'} />
          <Pill label="Error Rate"     value={fmtPct(errRate)}                 color={errRateColor(errRate)} />
          <Pill label="Avg Response"   value={fmtMs(data.avgDurationMs)}       color={+(data.avgDurationMs||0) > 1000 ? 'orange' : 'green'} />
        </div>

        {(data.topRoutes || []).length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  {['Route', 'Calls', 'Avg Time', 'Error Rate'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topRoutes.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-t border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                    <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300 text-xs truncate max-w-48">{r.route}</td>
                    <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">{r.count}</td>
                    <td className={`px-3 py-2 font-bold ${+(r.avgMs||0) > 1000 ? 'text-orange-600' : 'text-green-600 dark:text-green-400'}`}>{fmtMs(r.avgMs)}</td>
                    <td className={`px-3 py-2 font-bold ${P(errRateColor(r.errorRate||0)).text}`}>{fmtPct(r.errorRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(data.slowestRoutes || []).length > 0 && (
          <div>
            <p className="text-xs font-bold text-orange-500 mb-2">🐢 Slowest Requests (&gt;2s)</p>
            {data.slowestRoutes.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-1 text-xs border-t border-gray-50 dark:border-gray-700/20">
                <span className="font-mono text-gray-600 dark:text-gray-400 flex-1 truncate">{r.route}</span>
                <span className="font-black text-orange-600">{r.durationMs}ms</span>
                <span className="text-gray-400">{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function ErrorsCard({ data }) {
  if (!data) return null;
  const stats  = data.stats  || {};
  const errors = data.errors || [];

  return (
    <Card>
      <Head emoji="🚨" title="Error Monitor" sub="Grouped by fingerprint — most frequent first" />
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Pill label="Total Errors"  value={safe(stats.total, 0)}        color={stats.total > 0 ? 'red' : 'green'} />
          <Pill label="Unique Types"  value={safe(stats.unique, 0)}       color="orange" />
          <Pill label="Errors/Min"    value={safe(stats.errorsPerMin, 0)} color={+(stats.errorsPerMin||0) > 1 ? 'red' : 'green'} />
          <Pill label="Uptime"        value={(+(stats.uptimeHours||0)).toFixed(1) + 'h'} color="blue" />
        </div>

        {errors.length === 0 ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-6 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="font-bold text-green-800 dark:text-green-300">No errors recorded</p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">Your server is running cleanly!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {errors.slice(0, 6).map((e, i) => (
              <div key={i} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3">
                <div className="flex items-start gap-3">
                  <span className="bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-300 font-black text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                    ×{e.total || e.count || 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-red-800 dark:text-red-300 text-xs">{e.message || 'Unknown error'}</p>
                    <p className="text-xs text-red-500 mt-0.5">{e.type} · {e.method} {e.path} · {String(e.timestamp || '').slice(11, 19)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function RateLimitCard({ data }) {
  if (!data) return null;
  const stats = data.stats || {};
  const tiers = data.tiers || [];
  const tierColors = { HEAVY: 'red', STANDARD: 'blue', LIGHT: 'green', SEARCH: 'orange' };

  return (
    <Card>
      <Head emoji="🛡️" title="Rate Limiting" sub="Sliding window per IP — tiered by endpoint weight" />
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Pill label="Total Requests" value={safe(stats.total,     0)} color="blue"   />
          <Pill label="Passed"         value={safe(stats.passed,    0)} color="green"  />
          <Pill label="Blocked"        value={safe(stats.blocked,   0)} color={+(stats.blocked||0) > 0 ? 'orange' : 'green'} />
          <Pill label="Block Rate"     value={safe(stats.blockRate, '0') + '%'} color={+(stats.blockRate||0) > 5 ? 'red' : 'green'} />
        </div>
        {tiers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  {['Tier','Max / min','Window','Block on hit'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => {
                  const col = tierColors[t.name] || 'gray';
                  return (
                    <tr key={i} className="border-t border-gray-50 dark:border-gray-700/30">
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${P(col).badge}`}>{t.name}</span>
                      </td>
                      <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">{t.max} req</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{t.windowSec}s</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{t.blockSec > 0 ? t.blockSec + 's' : 'None'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PerformanceDashboard() {
  const [health,   setHealth]   = useState(null);
  const [metrics,  setMetrics]  = useState(null);
  const [errData,  setErrData]  = useState(null);
  const [cacheD,   setCacheD]   = useState(null);
  const [rlData,   setRlData]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState(null);
  const [lastRef,  setLastRef]  = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFetchErr(null);
    try {
      const [h, m, e, c, rl] = await Promise.allSettled([
        getHealthDetailed(),
        getHealthMetrics(),
        getHealthErrors(),
        getHealthCache(),
        getHealthRateLimits(),
      ]);
      if (h.status  === 'fulfilled' && h.value?.data)         setHealth(h.value.data);
      if (m.status  === 'fulfilled' && m.value?.data?.data)   setMetrics(m.value.data.data);
      if (e.status  === 'fulfilled' && e.value?.data?.data)   setErrData(e.value.data.data);
      if (c.status  === 'fulfilled' && c.value?.data?.data)   setCacheD(c.value.data.data);
      if (rl.status === 'fulfilled' && rl.value?.data?.data)  setRlData(rl.value.data.data);

      // If ALL failed, show connection error
      const allFailed = [h, m, e, c, rl].every(r => r.status === 'rejected');
      if (allFailed) setFetchErr('Cannot reach backend. Make sure the server is running on port 5000.');
    } catch (ex) {
      setFetchErr(ex?.message || 'Unknown error');
    }
    setLoading(false);
    setLastRef(new Date().toLocaleTimeString('en-IN'));
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30000);
    return () => clearInterval(t);
  }, [fetchAll]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-bold mb-3">
            ⚡ Phase 5 · Month 23 — Performance & Reliability
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">⚡ Performance Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Live backend monitoring · Cache · Rate limiting · Error tracking · System health
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {lastRef && <p className="text-xs text-gray-400">Last refresh: {lastRef}</p>}
          <button onClick={fetchAll} disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all">
            {loading ? '⏳ Loading…' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Backend not reachable */}
      {fetchErr && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-5 space-y-2">
          <p className="font-bold text-red-800 dark:text-red-300">⚠️ Cannot reach backend</p>
          <p className="text-sm text-red-700 dark:text-red-400">{fetchErr}</p>
          <p className="text-xs text-red-500">
            Start the backend: <code className="bg-red-100 dark:bg-red-900/60 px-1 rounded">cd backend &amp;&amp; npm run dev</code>
          </p>
        </div>
      )}

      {/* Initial spinner */}
      {loading && !health && <Spinner msg="Fetching backend health data…" />}

      {/* Content — render whatever loaded, gracefully */}
      {!loading && (
        <div className="space-y-6">

          {health && <HealthHero health={health} />}

          {/* Services */}
          {health?.services && (
            <Card>
              <Head emoji="🏥" title="Services" sub="Current status of all backend services" />
              <div className="p-5 grid sm:grid-cols-3 gap-4">
                {Object.entries(health.services).map(([name, svc]) => {
                  const col = statusColor(svc?.status);
                  const c   = P(col);
                  return (
                    <div key={name} className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-gray-900 dark:text-white capitalize text-sm">{name}</p>
                        <div className="flex items-center gap-1">
                          <Dot color={col} />
                          <span className={`text-xs font-bold ${c.text}`}>{svc?.status}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{svc?.type}</p>
                      {svc?.hitRate && <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mt-1">Hit rate: {svc.hitRate}</p>}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* System + Cache */}
          <div className="grid lg:grid-cols-2 gap-5">
            {health?.system && <SystemCard system={health.system} />}
            {cacheD && <CacheCard data={cacheD} />}
          </div>

          {/* Metrics */}
          {metrics && <MetricsCard data={metrics} />}

          {/* Errors + Rate limits */}
          <div className="grid lg:grid-cols-2 gap-5">
            {errData && <ErrorsCard data={errData} />}
            {rlData  && <RateLimitCard data={rlData} />}
          </div>

          {/* Nothing loaded yet */}
          {!health && !fetchErr && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-6 text-center">
              <p className="text-3xl mb-2">🔄</p>
              <p className="font-bold text-blue-800 dark:text-blue-300">Connecting to backend…</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Make sure <code className="bg-blue-100 dark:bg-blue-900/60 px-1 rounded">npm run dev</code> is running in the backend folder.
              </p>
            </div>
          )}

          {/* Tips */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-5">
            <p className="font-bold text-amber-800 dark:text-amber-300 mb-3">💡 Optional Performance Upgrades</p>
            <div className="grid sm:grid-cols-3 gap-4 text-xs text-amber-700 dark:text-amber-400">
              <div>
                <p className="font-bold mb-1">Redis Caching</p>
                <p>Install Redis + run <code className="bg-amber-100 dark:bg-amber-900/60 px-1 rounded">npm install redis</code>. Server auto-detects it for persistent caching.</p>
              </div>
              <div>
                <p className="font-bold mb-1">Gzip Compression</p>
                <p>Run <code className="bg-amber-100 dark:bg-amber-900/60 px-1 rounded">npm install compression</code> to shrink response sizes by ~70%.</p>
              </div>
              <div>
                <p className="font-bold mb-1">Sentry Error Monitoring</p>
                <p>Add <code className="bg-amber-100 dark:bg-amber-900/60 px-1 rounded">SENTRY_DSN=...</code> to .env + <code className="bg-amber-100 dark:bg-amber-900/60 px-1 rounded">npm install @sentry/node</code>.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
