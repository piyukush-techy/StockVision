// SIPCalculatorPage.jsx — Month 28: SIP Calculator & Goal Planner
import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ExportButton, { exportSIPPlan } from '../components/ExportButton';

const fmt = (n) => n >= 1e7
  ? `₹${(n / 1e7).toFixed(2)}Cr`
  : n >= 1e5
  ? `₹${(n / 1e5).toFixed(2)}L`
  : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const fmtFull = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// ── Preset Goals ───────────────────────────────────────────────────────────
const PRESET_GOALS = [
  { icon: '🏠', label: 'Buy a House',        amount: 5000000,  years: 10 },
  { icon: '🎓', label: "Child's Education",  amount: 2000000,  years: 15 },
  { icon: '🌴', label: 'Retirement',         amount: 10000000, years: 25 },
  { icon: '✈️', label: 'Dream Vacation',     amount: 500000,   years: 3  },
  { icon: '🚗', label: 'New Car',            amount: 1200000,  years: 5  },
  { icon: '💒', label: 'Wedding Fund',       amount: 3000000,  years: 7  },
];

const RETURN_PRESETS = [
  { label: 'FD / Debt (7%)',       rate: 7  },
  { label: 'Balanced Hybrid (10%)', rate: 10 },
  { label: 'Nifty 50 CAGR (12%)',  rate: 12 },
  { label: 'Mid Cap Fund (15%)',    rate: 15 },
  { label: 'Small Cap Fund (18%)', rate: 18 },
];

function calcSIP(monthly, rate, years) {
  const n = years * 12;
  const r = rate / 100 / 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

function monthlySIPNeeded(target, rate, years) {
  const n = years * 12;
  const r = rate / 100 / 12;
  if (r === 0) return target / n;
  return target / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
}

function calcLumpsum(principal, rate, years) {
  return principal * Math.pow(1 + rate / 100, years);
}

function buildSIPTimeline(monthly, rate, years) {
  const data = [];
  let invested = 0;
  let value = 0;
  const r = rate / 100 / 12;
  for (let m = 1; m <= years * 12; m++) {
    invested += monthly;
    value = (value + monthly) * (1 + r);
    if (m % 12 === 0) {
      data.push({ year: m / 12, invested, value: Math.round(value), gains: Math.round(value - invested) });
    }
  }
  return data;
}

// ── Mini bar chart component ───────────────────────────────────────────────
function BarChart({ data, darkMode }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value));
  return (
    <div className="mt-4">
      <div className="flex items-end gap-1 h-32">
        {data.map((d, i) => {
          const invH = Math.round((d.invested / maxVal) * 128);
          const gainH = Math.round((d.gains / maxVal) * 128);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10">
                <div className={`text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-800 text-white'}`}>
                  {fmt(d.value)}
                </div>
              </div>
              <div style={{ height: gainH }} className="w-full bg-green-500 rounded-t-sm opacity-80" />
              <div style={{ height: invH }} className="w-full bg-blue-500 opacity-60" />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-400">
        <span>Yr 1</span>
        <span>Yr {Math.floor(data.length / 2)}</span>
        <span>Yr {data.length}</span>
      </div>
      <div className="flex gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm inline-block opacity-60" />Invested</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-sm inline-block" />Gains</span>
      </div>
    </div>
  );
}

export default function SIPCalculatorPage() {
  const [darkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  // Tabs
  const [tab, setTab] = useState('sip'); // sip | goal | lumpsum | compare

  // SIP tab
  const [sipMonthly, setSipMonthly] = useState(5000);
  const [sipRate, setSipRate] = useState(12);
  const [sipYears, setSipYears] = useState(10);

  // Goal tab
  const [goalAmount, setGoalAmount] = useState(2000000);
  const [goalRate, setGoalRate]     = useState(12);
  const [goalYears, setGoalYears]   = useState(10);

  // Lumpsum tab
  const [lsAmount, setLsAmount] = useState(100000);
  const [lsRate, setLsRate]     = useState(12);
  const [lsYears, setLsYears]   = useState(10);

  // Compare tab
  const [cmpMonthly, setCmpMonthly] = useState(10000);
  const [cmpYears, setCmpYears]     = useState(15);

  const bg   = darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const inp  = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';

  // ── SIP calculations ────────────────────────────────────────────────────
  const sipResult = useMemo(() => {
    const invested = sipMonthly * sipYears * 12;
    const maturity = calcSIP(sipMonthly, sipRate, sipYears);
    const gains = maturity - invested;
    const timeline = buildSIPTimeline(sipMonthly, sipRate, sipYears);
    return { invested, maturity, gains, timeline, xirr: sipRate };
  }, [sipMonthly, sipRate, sipYears]);

  // ── Goal calculations ────────────────────────────────────────────────────
  const goalResult = useMemo(() => {
    const monthly = monthlySIPNeeded(goalAmount, goalRate, goalYears);
    const invested = monthly * goalYears * 12;
    const gains = goalAmount - invested;
    const timeline = buildSIPTimeline(monthly, goalRate, goalYears);
    return { monthly, invested, gains, timeline };
  }, [goalAmount, goalRate, goalYears]);

  // ── Lumpsum calculations ─────────────────────────────────────────────────
  const lsResult = useMemo(() => {
    const maturity = calcLumpsum(lsAmount, lsRate, lsYears);
    const gains = maturity - lsAmount;
    return { maturity, gains };
  }, [lsAmount, lsRate, lsYears]);

  // ── Compare calculations ─────────────────────────────────────────────────
  const cmpResult = useMemo(() => {
    return RETURN_PRESETS.map(p => {
      const maturity = calcSIP(cmpMonthly, p.rate, cmpYears);
      const invested = cmpMonthly * cmpYears * 12;
      return { ...p, maturity, invested, gains: maturity - invested };
    });
  }, [cmpMonthly, cmpYears]);

  const TABS = [
    { id: 'sip',     label: '📈 SIP'         },
    { id: 'goal',    label: '🎯 Goal Planner' },
    { id: 'lumpsum', label: '💰 Lumpsum'     },
    { id: 'compare', label: '⚖️ Compare'      },
  ];

  return (
    <div className={`min-h-screen ${bg} px-4 py-6`}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm mb-2">
            <Link to="/" className="text-blue-500 hover:underline">Home</Link>
            <span className={muted}>/</span>
            <span className={muted}>SIP Calculator</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            SIP Calculator & Goal Planner
          </h1>
          <p className={`mt-1 text-sm ${muted}`}>Plan your financial goals with India's smartest SIP calculator</p>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-xl mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-blue-600 text-white shadow'
                  : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── SIP Tab ─────────────────────────────────────────────────── */}
        {tab === 'sip' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h2 className="font-semibold text-lg mb-4">SIP Parameters</h2>

              <label className={`block text-sm font-medium mb-1 ${muted}`}>Monthly SIP Amount (₹)</label>
              <div className="flex items-center gap-3 mb-1">
                <input type="range" min={500} max={500000} step={500} value={sipMonthly}
                  onChange={e => setSipMonthly(+e.target.value)}
                  className="flex-1 accent-blue-600" />
                <input type="number" value={sipMonthly} onChange={e => setSipMonthly(+e.target.value)}
                  className={`w-28 px-2 py-1 rounded-lg border text-sm font-semibold ${inp}`} />
              </div>
              <div className={`text-xs mb-4 ${muted}`}>₹500 – ₹5,00,000/month</div>

              <label className={`block text-sm font-medium mb-1 ${muted}`}>Expected Annual Return</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {RETURN_PRESETS.map(p => (
                  <button key={p.rate} onClick={() => setSipRate(p.rate)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      sipRate === p.rate
                        ? 'bg-blue-600 text-white border-blue-600'
                        : darkMode ? 'border-gray-700 text-gray-400 hover:border-blue-500' : 'border-gray-300 text-gray-600 hover:border-blue-400'
                    }`}>{p.label}</button>
                ))}
              </div>
              <div className="flex items-center gap-3 mb-4">
                <input type="range" min={1} max={30} step={0.5} value={sipRate}
                  onChange={e => setSipRate(+e.target.value)} className="flex-1 accent-blue-600" />
                <span className="font-bold text-blue-600 w-14 text-right">{sipRate}% p.a.</span>
              </div>

              <label className={`block text-sm font-medium mb-1 ${muted}`}>Investment Period</label>
              <div className="flex items-center gap-3 mb-1">
                <input type="range" min={1} max={40} step={1} value={sipYears}
                  onChange={e => setSipYears(+e.target.value)} className="flex-1 accent-blue-600" />
                <span className="font-bold text-blue-600 w-20 text-right">{sipYears} years</span>
              </div>
            </div>

            <div className={`rounded-2xl border p-5 ${card}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Results</h2>
                <ExportButton
                  darkMode={darkMode}
                  label="Export Plan"
                  onExportCSV={() => exportSIPPlan(
                    { monthly: sipMonthly, rate: sipRate, years: sipYears },
                    sipResult.timeline
                  )}
                  onExportPDF={() => {
                    const rows = sipResult.timeline.map(d =>
                      `<tr><td>Year ${d.year}</td><td>₹${Math.round(d.invested).toLocaleString('en-IN')}</td><td>₹${d.value.toLocaleString('en-IN')}</td><td style="color:#16a34a">+₹${d.gains.toLocaleString('en-IN')}</td></tr>`
                    ).join('');
                    const html = `<h1>SIP Plan — ₹${sipMonthly.toLocaleString('en-IN')}/month @ ${sipRate}% for ${sipYears} years</h1>
                      <table><tr><th>Year</th><th>Invested</th><th>Value</th><th>Gains</th></tr>${rows}</table>
                      <p style="margin-top:16px"><strong>Maturity Value: ₹${Math.round(sipResult.maturity).toLocaleString('en-IN')}</strong> &nbsp;|&nbsp; Total Invested: ₹${Math.round(sipResult.invested).toLocaleString('en-IN')} &nbsp;|&nbsp; Gains: ₹${Math.round(sipResult.gains).toLocaleString('en-IN')}</p>`;
                    const win = window.open('', '_blank');
                    win.document.write(`<html><head><style>body{font-family:sans-serif;padding:24px}h1{color:#1e40af;font-size:16px;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:7px 10px;border-bottom:1px solid #f3f4f6;text-align:left}th{background:#eff6ff;color:#1e40af}tr:nth-child(even)td{background:#f9fafb}</style></head><body>${html}<p style="font-size:10px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px">Generated by StockVision · Not SEBI registered · Not financial advice</p></body></html>`);
                    win.document.close(); setTimeout(() => { win.print(); win.close(); }, 300);
                  }}
                />
              </div>
              <div className="space-y-3">
                <div className={`rounded-xl p-4 ${darkMode ? 'bg-blue-900/30 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className={`text-xs font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'} mb-1`}>Total Invested</div>
                  <div className="text-2xl font-bold text-blue-600">{fmtFull(sipResult.invested)}</div>
                </div>
                <div className={`rounded-xl p-4 ${darkMode ? 'bg-green-900/30 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
                  <div className={`text-xs font-medium ${darkMode ? 'text-green-300' : 'text-green-700'} mb-1`}>Estimated Returns</div>
                  <div className="text-2xl font-bold text-green-600">{fmtFull(sipResult.gains)}</div>
                </div>
                <div className={`rounded-xl p-4 ${darkMode ? 'bg-purple-900/30 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
                  <div className={`text-xs font-medium ${darkMode ? 'text-purple-300' : 'text-purple-700'} mb-1`}>Maturity Value</div>
                  <div className="text-3xl font-extrabold text-purple-600">{fmtFull(sipResult.maturity)}</div>
                  <div className={`text-xs mt-1 ${muted}`}>{fmt(sipResult.maturity)} — wealth ratio {(sipResult.maturity / sipResult.invested).toFixed(2)}x</div>
                </div>
              </div>
              <BarChart data={sipResult.timeline} darkMode={darkMode} />
            </div>
          </div>
        )}

        {/* ── Goal Planner Tab ─────────────────────────────────────────── */}
        {tab === 'goal' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h2 className="font-semibold text-lg mb-4">Define Your Goal</h2>

              <div className="grid grid-cols-3 gap-2 mb-5">
                {PRESET_GOALS.map(g => (
                  <button key={g.label}
                    onClick={() => { setGoalAmount(g.amount); setGoalYears(g.years); }}
                    className={`p-2 rounded-xl border text-center transition-all hover:border-blue-500 ${darkMode ? 'border-gray-700 hover:bg-blue-900/20' : 'border-gray-200 hover:bg-blue-50'}`}>
                    <div className="text-xl">{g.icon}</div>
                    <div className={`text-xs font-medium mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{g.label}</div>
                    <div className="text-xs text-blue-500 font-semibold">{fmt(g.amount)}</div>
                  </button>
                ))}
              </div>

              <label className={`block text-sm font-medium mb-1 ${muted}`}>Target Amount (₹)</label>
              <input type="number" value={goalAmount} onChange={e => setGoalAmount(+e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border mb-4 font-semibold text-lg ${inp}`} />

              <label className={`block text-sm font-medium mb-1 ${muted}`}>Target in (years)</label>
              <div className="flex items-center gap-3 mb-4">
                <input type="range" min={1} max={40} value={goalYears}
                  onChange={e => setGoalYears(+e.target.value)} className="flex-1 accent-blue-600" />
                <span className="font-bold text-blue-600 w-20 text-right">{goalYears} years</span>
              </div>

              <label className={`block text-sm font-medium mb-1 ${muted}`}>Expected Return</label>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={30} step={0.5} value={goalRate}
                  onChange={e => setGoalRate(+e.target.value)} className="flex-1 accent-blue-600" />
                <span className="font-bold text-blue-600 w-14 text-right">{goalRate}%</span>
              </div>
            </div>

            <div className={`rounded-2xl border p-5 ${card}`}>
              <h2 className="font-semibold text-lg mb-4">You Need to Invest</h2>
              <div className={`rounded-2xl p-5 text-center mb-4 ${darkMode ? 'bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-700' : 'bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200'}`}>
                <div className={`text-xs font-semibold uppercase tracking-wider ${muted} mb-1`}>Monthly SIP Required</div>
                <div className="text-4xl font-extrabold text-blue-600">{fmtFull(goalResult.monthly)}</div>
                <div className={`text-sm mt-1 ${muted}`}>per month for {goalYears} years at {goalRate}% p.a.</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`rounded-xl p-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className={`text-xs ${muted} mb-1`}>Total you invest</div>
                  <div className="font-bold text-base">{fmt(goalResult.invested)}</div>
                </div>
                <div className={`rounded-xl p-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className={`text-xs ${muted} mb-1`}>Market does the rest</div>
                  <div className="font-bold text-base text-green-500">+{fmt(goalResult.gains)}</div>
                </div>
              </div>
              <div className={`text-xs p-3 rounded-xl ${darkMode ? 'bg-amber-900/20 border border-amber-800 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                💡 Start a step-up SIP increasing 10% each year to reach goal faster with less monthly commitment.
              </div>
              <BarChart data={goalResult.timeline} darkMode={darkMode} />
            </div>
          </div>
        )}

        {/* ── Lumpsum Tab ──────────────────────────────────────────────── */}
        {tab === 'lumpsum' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h2 className="font-semibold text-lg mb-4">Lumpsum Investment</h2>

              <label className={`block text-sm font-medium mb-1 ${muted}`}>One-time Investment (₹)</label>
              <input type="number" value={lsAmount} onChange={e => setLsAmount(+e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border mb-1 font-semibold text-lg ${inp}`} />
              <div className={`text-xs mb-4 ${muted}`}>{fmt(lsAmount)}</div>

              <label className={`block text-sm font-medium mb-1 ${muted}`}>Expected Annual Return</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {RETURN_PRESETS.map(p => (
                  <button key={p.rate} onClick={() => setLsRate(p.rate)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      lsRate === p.rate
                        ? 'bg-blue-600 text-white border-blue-600'
                        : darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-600'
                    }`}>{p.label}</button>
                ))}
              </div>

              <label className={`block text-sm font-medium mb-1 ${muted}`}>Investment Period</label>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={40} value={lsYears}
                  onChange={e => setLsYears(+e.target.value)} className="flex-1 accent-blue-600" />
                <span className="font-bold text-blue-600 w-20 text-right">{lsYears} years</span>
              </div>
            </div>

            <div className={`rounded-2xl border p-5 ${card}`}>
              <h2 className="font-semibold text-lg mb-4">Lumpsum Results</h2>
              <div className="space-y-3">
                <div className={`rounded-xl p-4 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <div className={`text-xs font-medium ${muted} mb-1`}>You Invest</div>
                  <div className="text-2xl font-bold text-blue-600">{fmtFull(lsAmount)}</div>
                </div>
                <div className={`rounded-xl p-4 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <div className={`text-xs font-medium ${muted} mb-1`}>Estimated Gains</div>
                  <div className="text-2xl font-bold text-green-600">+{fmtFull(lsResult.gains)}</div>
                </div>
                <div className={`rounded-xl p-4 ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                  <div className={`text-xs font-medium ${muted} mb-1`}>Maturity Value</div>
                  <div className="text-3xl font-extrabold text-purple-600">{fmtFull(lsResult.maturity)}</div>
                  <div className={`text-xs mt-1 ${muted}`}>{fmt(lsResult.maturity)} — {(lsResult.maturity / lsAmount).toFixed(2)}x in {lsYears}yr</div>
                </div>
              </div>

              {/* SIP vs Lumpsum comparison */}
              <div className={`mt-4 p-3 rounded-xl text-xs ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="font-semibold mb-2">Lumpsum vs SIP comparison</div>
                <div className="flex justify-between mb-1">
                  <span className={muted}>Lumpsum ₹{lsAmount.toLocaleString('en-IN')} now</span>
                  <span className="font-semibold">{fmt(lsResult.maturity)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={muted}>SIP ₹{Math.round(lsAmount / (lsYears * 12)).toLocaleString('en-IN')}/mo equiv.</span>
                  <span className="font-semibold">{fmt(calcSIP(lsAmount / (lsYears * 12), lsRate, lsYears))}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Compare Tab ──────────────────────────────────────────────── */}
        {tab === 'compare' && (
          <div className={`rounded-2xl border p-5 ${card}`}>
            <h2 className="font-semibold text-lg mb-4">Compare Returns Across Asset Classes</h2>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label className={`block text-sm font-medium mb-1 ${muted}`}>Monthly SIP (₹)</label>
                <input type="number" value={cmpMonthly} onChange={e => setCmpMonthly(+e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-semibold ${inp}`} />
              </div>
              <div className="flex-1">
                <label className={`block text-sm font-medium mb-1 ${muted}`}>Period (years)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={40} value={cmpYears}
                    onChange={e => setCmpYears(+e.target.value)} className="flex-1 accent-blue-600" />
                  <span className="font-bold text-blue-600 w-16 text-right">{cmpYears} yr</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {cmpResult.map((r, i) => {
                const maxMat = cmpResult[cmpResult.length - 1].maturity;
                const pct = (r.maturity / maxMat) * 100;
                return (
                  <div key={r.rate} className={`rounded-xl p-4 border ${darkMode ? 'border-gray-800 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">{r.label}</span>
                      <span className="text-base font-bold text-blue-600">{fmt(r.maturity)}</span>
                    </div>
                    <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                        style={{ width: `${pct}%` }} />
                    </div>
                    <div className={`flex justify-between text-xs mt-1 ${muted}`}>
                      <span>Invested: {fmt(r.invested)}</span>
                      <span className="text-green-500">+{fmt(r.gains)} gains</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`mt-4 p-3 rounded-xl text-xs ${darkMode ? 'bg-amber-900/20 border border-amber-800 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
              ⚠️ Past returns are not guaranteed. Equity returns are subject to market risk. This calculator is for educational purposes only and not financial advice.
            </div>
          </div>
        )}

        {/* Info footer */}
        <div className={`mt-6 p-4 rounded-2xl border text-xs ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-white border-gray-100 text-gray-500'}`}>
          <strong>Disclaimer:</strong> All calculations assume constant returns and are for illustration only. Actual mutual fund returns may vary. StockVision is not SEBI registered and this is not financial advice.
          <span className="ml-2 text-blue-500 font-medium">Always consult a SEBI-registered financial advisor.</span>
        </div>
      </div>
    </div>
  );
}
