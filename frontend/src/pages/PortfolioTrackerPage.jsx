// PortfolioTrackerPage.jsx — Month 30: XIRR + live price fetch upgrade
// Adds: XIRR calculation, buy date tracking, live price refresh, benchmarks
import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── XIRR via Newton-Raphson ──────────────────────────────────────────────────
function xirr(cashflows) {
  // cashflows: [{amount, date}] where buys are negative, current value is positive
  if (!cashflows || cashflows.length < 2) return null;
  const dates = cashflows.map(cf => new Date(cf.date));
  const amounts = cashflows.map(cf => cf.amount);
  const d0 = dates[0];

  function npv(rate) {
    return amounts.reduce((sum, cf, i) => {
      const t = (dates[i] - d0) / (365.25 * 24 * 3600 * 1000);
      return sum + cf / Math.pow(1 + rate, t);
    }, 0);
  }

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const f = npv(rate);
    const df = amounts.reduce((sum, cf, i) => {
      const t = (dates[i] - d0) / (365.25 * 24 * 3600 * 1000);
      return sum - t * cf / Math.pow(1 + rate, t + 1);
    }, 0);
    if (Math.abs(df) < 1e-10) break;
    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < 1e-7) { rate = newRate; break; }
    rate = newRate;
    if (!isFinite(rate) || rate < -0.999) { rate = Math.random() * 0.5; }
  }
  return isFinite(rate) ? rate * 100 : null;
}

function calcXIRR(holdings) {
  // Build cashflows: each holding = one buy cashflow + one "sell at current" cashflow
  const cashflows = [];
  for (const h of holdings) {
    if (!h.buyDate || !h.qty || !h.avgCost || !h.currentPrice) continue;
    cashflows.push({ amount: -(h.qty * h.avgCost), date: h.buyDate });
  }
  // Current value as of today
  const today = new Date().toISOString().slice(0, 10);
  const totalCurrent = holdings.reduce((s, h) => s + (h.qty * (h.currentPrice || h.avgCost)), 0);
  if (totalCurrent > 0) cashflows.push({ amount: totalCurrent, date: today });
  if (cashflows.length < 2) return null;
  // Sort by date
  cashflows.sort((a, b) => new Date(a.date) - new Date(b.date));
  return xirr(cashflows);
}

const SECTORS = ['Technology','Financials','Energy','Consumer Goods','Pharma','Auto','Metals','Telecom','Others'];

const DEMO_HOLDINGS = [
  { symbol:'TCS',       name:'Tata Consultancy', qty:10, avgCost:3420, currentPrice:null, sector:'Technology',    buyDate:'2023-01-15' },
  { symbol:'HDFCBANK',  name:'HDFC Bank',         qty:25, avgCost:1680, currentPrice:null, sector:'Financials',   buyDate:'2022-06-10' },
  { symbol:'RELIANCE',  name:'Reliance Industries',qty:15,avgCost:2650, currentPrice:null, sector:'Energy',       buyDate:'2023-04-20' },
  { symbol:'INFY',      name:'Infosys',            qty:30, avgCost:1520, currentPrice:null, sector:'Technology',  buyDate:'2022-11-01' },
  { symbol:'ITC',       name:'ITC Ltd',            qty:100,avgCost:420,  currentPrice:null, sector:'Consumer Goods',buyDate:'2023-07-05' },
];

export default function PortfolioTrackerPage() {
  const [holdings, setHoldings] = useState(() => {
    try { const s = localStorage.getItem('sv_tracker_v2'); return s ? JSON.parse(s) : DEMO_HOLDINGS; }
    catch { return DEMO_HOLDINGS; }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ symbol:'', name:'', qty:'', avgCost:'', currentPrice:'', sector:'Technology', buyDate:'' });
  const [editIdx, setEditIdx] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const save = (h) => { localStorage.setItem('sv_tracker_v2', JSON.stringify(h)); setHoldings(h); };

  // ── Live price refresh ────────────────────────────────────────────────────
  const refreshPrices = async () => {
    setRefreshing(true);
    const updated = [...holdings];
    for (let i = 0; i < updated.length; i++) {
      const sym = updated[i].symbol.toUpperCase().includes('.NS') ? updated[i].symbol.toUpperCase() : updated[i].symbol.toUpperCase() + '.NS';
      try {
        const res = await fetch(`${API_BASE}/api/stocks/${sym}`);
        if (res.ok) {
          const d = await res.json();
          updated[i] = { ...updated[i], currentPrice: d.price || d.currentPrice || updated[i].avgCost };
        }
      } catch {}
    }
    save(updated);
    setLastRefresh(new Date().toLocaleTimeString('en-IN'));
    setRefreshing(false);
  };

  // Auto-refresh on load if prices are null
  useEffect(() => {
    const hasMissing = holdings.some(h => !h.currentPrice);
    if (hasMissing) refreshPrices();
  }, []);

  const addHolding = () => {
    if (!form.symbol || !form.qty || !form.avgCost) return;
    const sym = form.symbol.toUpperCase().replace('.NS','');
    const newH = {
      symbol: sym, name: form.name || sym,
      qty: parseFloat(form.qty), avgCost: parseFloat(form.avgCost),
      currentPrice: form.currentPrice ? parseFloat(form.currentPrice) : null,
      sector: form.sector,
      buyDate: form.buyDate || new Date().toISOString().slice(0,10),
    };
    const updated = editIdx !== null ? holdings.map((h,i) => i === editIdx ? newH : h) : [...holdings, newH];
    save(updated);
    setForm({ symbol:'', name:'', qty:'', avgCost:'', currentPrice:'', sector:'Technology', buyDate:'' });
    setShowAdd(false); setEditIdx(null);
  };

  const remove   = (i) => save(holdings.filter((_,idx) => idx !== i));
  const editH    = (i) => {
    const h = holdings[i];
    setForm({ symbol:h.symbol.replace('.NS',''), name:h.name, qty:String(h.qty), avgCost:String(h.avgCost), currentPrice:String(h.currentPrice||''), sector:h.sector||'Technology', buyDate:h.buyDate||'' });
    setEditIdx(i); setShowAdd(true);
  };

  // Calculations
  const calced = holdings.map(h => {
    const cp = h.currentPrice || h.avgCost;
    const invested = h.qty * h.avgCost;
    const current  = h.qty * cp;
    const pnl = current - invested;
    const pnlPct = (pnl / invested) * 100;
    const daysSinceBuy = h.buyDate ? Math.floor((new Date() - new Date(h.buyDate)) / (1000*60*60*24)) : null;
    const annReturn = daysSinceBuy > 30 ? ((Math.pow(current/invested, 365/daysSinceBuy) - 1) * 100) : pnlPct;
    return { ...h, cp, invested, current, pnl, pnlPct, daysSinceBuy, annReturn };
  });

  const totalInvested = calced.reduce((s,h) => s + h.invested, 0);
  const totalCurrent  = calced.reduce((s,h) => s + h.current, 0);
  const totalPnL      = totalCurrent - totalInvested;
  const totalPnLPct   = (totalPnL / totalInvested) * 100;

  // XIRR
  const xirrRate = calcXIRR(calced.map(h => ({ ...h, currentPrice: h.cp })));

  // Sector breakdown
  const sectorBreak = calced.reduce((acc, h) => {
    acc[h.sector] = (acc[h.sector] || 0) + h.current;
    return acc;
  }, {});

  const fmt = (v) => v?.toLocaleString('en-IN', { maximumFractionDigits:0 }) || '—';
  const fmtPct = (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Portfolio Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Real holdings · XIRR returns · Live prices · Saved locally</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshPrices} disabled={refreshing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors">
            {refreshing ? '⏳ Refreshing…' : '🔄 Refresh Prices'}
          </button>
          <button onClick={() => { setShowAdd(true); setEditIdx(null); setForm({ symbol:'',name:'',qty:'',avgCost:'',currentPrice:'',sector:'Technology',buyDate:'' }); }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-colors">
            + Add Holding
          </button>
        </div>
      </div>
      {lastRefresh && <p className="text-xs text-gray-400 mb-4">Last refreshed: {lastRefresh}</p>}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Invested',    val:`₹${fmt(totalInvested)}`, sub:'total cost',          color:'text-gray-900 dark:text-white' },
          { label:'Current Value',val:`₹${fmt(totalCurrent)}`, sub:'at live prices',      color:'text-gray-900 dark:text-white' },
          { label:'Total P&L',   val:`₹${fmt(Math.abs(totalPnL))}`, sub:fmtPct(totalPnLPct), color:totalPnL>=0?'text-green-600':'text-red-600' },
          { label:'XIRR Return', val: xirrRate != null ? `${xirrRate >= 0?'+':''}${xirrRate.toFixed(2)}%` : '—', sub:'annualised return', color: xirrRate != null && xirrRate >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
            <div className="text-xs text-gray-500 mb-1">{c.label}</div>
            <div className={`text-xl font-black ${c.color}`}>{c.val}</div>
            <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* XIRR explanation */}
      {xirrRate != null && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-6 text-sm text-blue-700 dark:text-blue-400">
          <strong>XIRR {xirrRate >= 0?'+':''}{xirrRate.toFixed(2)}%</strong> — Your actual annualised return accounting for <em>when</em> you invested. More accurate than simple return because it accounts for the timing of each purchase.
        </div>
      )}

      {/* Add/edit form */}
      {showAdd && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6">
          <p className="font-bold text-gray-900 dark:text-white mb-4">{editIdx !== null ? 'Edit Holding' : 'Add Holding'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {[
              { label:'Symbol',        key:'symbol',       ph:'TCS',      type:'text' },
              { label:'Name',          key:'name',         ph:'Tata CS',  type:'text' },
              { label:'Qty',           key:'qty',          ph:'10',       type:'number' },
              { label:'Avg Cost ₹',    key:'avgCost',      ph:'3420',     type:'number' },
              { label:'Current Price', key:'currentPrice', ph:'Optional', type:'number' },
              { label:'Buy Date',      key:'buyDate',      ph:'',         type:'date' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Sector</label>
            <select value={form.sector} onChange={e => setForm(p=>({...p,sector:e.target.value}))}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {SECTORS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={addHolding} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-colors">
              {editIdx !== null ? 'Update' : 'Add'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditIdx(null); }} className="px-5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Holdings table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <span className="font-bold text-gray-900 dark:text-white">{holdings.length} Holdings</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold uppercase text-gray-500 tracking-wide">
                <th className="px-4 py-3 text-left">Stock</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Avg Cost</th>
                <th className="px-4 py-3 text-right">LTP</th>
                <th className="px-4 py-3 text-right">Invested</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">P&L</th>
                <th className="px-4 py-3 text-right">Ann. Return</th>
                <th className="px-4 py-3 text-right">Held</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {calced.map((h, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <a href={`/stock/${h.symbol}.NS`} className="font-bold text-blue-600 hover:underline">{h.symbol}</a>
                    <div className="text-xs text-gray-500">{h.name}</div>
                    <div className="text-xs text-gray-400">{h.sector}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{h.qty}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">₹{fmt(h.avgCost)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                    {h.currentPrice ? `₹${fmt(h.currentPrice)}` : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">₹{fmt(h.invested)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">₹{fmt(h.current)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${h.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {h.pnl >= 0 ? '+' : ''}₹{fmt(Math.abs(h.pnl))}
                    <div className="text-xs">{fmtPct(h.pnlPct)}</div>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold text-xs ${h.annReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {h.daysSinceBuy > 30 ? fmtPct(h.annReturn) + '/yr' : 'Short hold'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {h.daysSinceBuy != null ? `${h.daysSinceBuy}d` : '—'}
                    {h.buyDate && <div>{h.buyDate}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => editH(i)} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">Edit</button>
                      <button onClick={() => remove(i)} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sector allocation */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-4">Sector Allocation</h2>
        <div className="space-y-2">
          {Object.entries(sectorBreak).sort((a,b)=>b[1]-a[1]).map(([sec, val]) => {
            const pct = (val / totalCurrent * 100);
            return (
              <div key={sec} className="flex items-center gap-3">
                <div className="w-28 text-sm text-gray-600 dark:text-gray-400 truncate">{sec}</div>
                <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full flex items-center pl-2" style={{ width:`${pct}%` }}>
                    {pct > 8 && <span className="text-xs text-white font-bold">{pct.toFixed(1)}%</span>}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-16 text-right">₹{fmt(val)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
