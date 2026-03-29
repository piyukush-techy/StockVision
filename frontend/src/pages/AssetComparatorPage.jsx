// AssetComparatorPage.jsx — Month 31: Stock vs Real Estate vs Gold vs FD Comparator
// ₹X invested in YYYY across different asset classes — inflation & tax adjusted
import { useState } from 'react';

const ASSET_DATA = {
  // Annual returns (CAGR) by era — approximate real Indian data
  nifty:       { label: 'Nifty 50 (Equity)', icon: '📈', color: '#3b82f6', taxType: 'ltcg',  ltcg: 10, stcg: 15 },
  gold:        { label: 'Gold',               icon: '🥇', color: '#f59e0b', taxType: 'ltcg',  ltcg: 20, stcg: 30 },
  realestate:  { label: 'Real Estate',        icon: '🏠', color: '#10b981', taxType: 'ltcg',  ltcg: 20, stcg: 30 },
  fd:          { label: 'Fixed Deposit',      icon: '🏦', color: '#8b5cf6', taxType: 'income', rate: 30 },
  ppf:         { label: 'PPF',                icon: '📋', color: '#06b6d4', taxType: 'exempt' },
};

// Approximate historical CAGR by start year (holding to 2025)
const CAGR_TABLE = {
  //       nifty  gold  realestate  fd    ppf
  2000: [  14.2,  12.8,  11.5,     7.5,  8.0 ],
  2005: [  15.8,  14.2,  13.2,     7.2,  7.8 ],
  2008: [  13.1,  13.5,  10.8,     7.8,  8.0 ],
  2010: [  12.4,  10.2,  9.6,      7.5,  7.9 ],
  2012: [  13.6,  6.8,   8.2,      8.2,  8.1 ],
  2015: [  14.2,  11.2,  7.8,      7.5,  7.9 ],
  2018: [  13.8,  14.5,  7.2,      7.0,  7.7 ],
  2020: [  17.2,  15.8,  9.4,      6.5,  7.1 ],
};

const INFLATION_AVG = 5.5; // avg Indian CPI
const CURRENT_YEAR = 2025;

const START_YEARS = [2000, 2005, 2008, 2010, 2012, 2015, 2018, 2020];
const AMOUNTS     = [100000, 500000, 1000000, 2500000, 5000000, 10000000];

function formatINR(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function computeReturn(principal, cagr, years, taxType, taxSlab = 30) {
  const gross = principal * Math.pow(1 + cagr / 100, years);
  let gain = gross - principal;
  let tax = 0;
  if (taxType === 'ltcg') {
    const exemption = 125000; // 1.25L LTCG exempt
    tax = Math.max(0, gain - exemption) * 0.10;
  } else if (taxType === 'income') {
    tax = gain * (taxSlab / 100);
  }
  const net = gross - tax;
  const inflAdj = net / Math.pow(1 + INFLATION_AVG / 100, years);
  return { gross, net, tax, inflAdj, cagr };
}

function BarChart({ results, principal }) {
  const maxVal = Math.max(...results.map(r => r.inflAdj));
  return (
    <div className="space-y-3">
      {results.map(r => {
        const pct = (r.inflAdj / maxVal) * 100;
        const isBest = r.inflAdj === maxVal;
        return (
          <div key={r.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200">
                <span>{ASSET_DATA[r.id].icon}</span>
                {ASSET_DATA[r.id].label}
                {isBest && <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full font-bold">Best</span>}
              </span>
              <span className={`font-bold ${isBest ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {formatINR(r.inflAdj)}
              </span>
            </div>
            <div className="w-full h-7 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative">
              <div
                className="h-full rounded-lg transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: ASSET_DATA[r.id].color, opacity: isBest ? 1 : 0.65 }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500 dark:text-gray-400">
                {r.cagr}% CAGR
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AssetComparatorPage() {
  const [amount, setAmount]         = useState(1000000);
  const [startYear, setStartYear]   = useState(2010);
  const [taxSlab, setTaxSlab]       = useState(30);
  const [results, setResults]       = useState(null);

  function calculate() {
    const years = CURRENT_YEAR - startYear;
    if (years <= 0) return;
    const row = CAGR_TABLE[startYear] || CAGR_TABLE[2010];
    const assets = ['nifty', 'gold', 'realestate', 'fd', 'ppf'];
    const cagrs = row;
    const res = assets.map((id, i) => ({
      id,
      ...computeReturn(amount, cagrs[i], years, ASSET_DATA[id].taxType, taxSlab),
    })).sort((a, b) => b.inflAdj - a.inflAdj);
    setResults({ res, years });
  }

  const bestAsset = results?.res[0];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">⚖️</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asset Comparator</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Month 31 • Stock vs Real Estate vs Gold vs FD</p>
          </div>
          <span className="ml-auto px-3 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full">🆕 New</span>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-200">
          <strong>💡 The Emotional Truth:</strong> "If I'd put ₹10 lakh in Nifty in 2010 vs a flat in Delhi?" 
          Compare inflation-adjusted, after-tax real wealth across India's most common investments.
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-5">Configure Your Comparison</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Investment Amount
            </label>
            <select
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {AMOUNTS.map(a => <option key={a} value={a}>{formatINR(a)}</option>)}
            </select>
          </div>
          {/* Start year */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Invested in
            </label>
            <select
              value={startYear}
              onChange={e => setStartYear(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {START_YEARS.map(y => <option key={y} value={y}>{y} ({CURRENT_YEAR - y} yrs ago)</option>)}
            </select>
          </div>
          {/* Tax slab */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Income Tax Slab (for FD)
            </label>
            <select
              value={taxSlab}
              onChange={e => setTaxSlab(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value={0}>0% (No tax)</option>
              <option value={5}>5%</option>
              <option value={20}>20%</option>
              <option value={30}>30% (Highest)</option>
            </select>
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors text-sm"
        >
          ⚖️ Compare All Assets
        </button>
      </div>

      {/* Results */}
      {results && (
        <>
          {/* Winner callout */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-5 flex items-center gap-4">
            <span className="text-4xl">{ASSET_DATA[bestAsset.id].icon}</span>
            <div>
              <p className="text-lg font-black text-green-700 dark:text-green-300">
                🏆 {ASSET_DATA[bestAsset.id].label} wins over {results.years} years
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatINR(amount)} invested in {startYear} → <strong>{formatINR(bestAsset.inflAdj)}</strong> today (inflation-adjusted, after-tax)
                <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                  {((bestAsset.inflAdj / amount - 1) * 100).toFixed(0)}x real return
                </span>
              </p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-1">Real Value Today (Inflation + Tax Adjusted)</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              {formatINR(amount)} invested in {startYear} · After {results.years} years · Inflation at {INFLATION_AVG}%/yr
            </p>
            <BarChart results={results.res} principal={amount} />
          </div>

          {/* Detail table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 overflow-x-auto">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">Full Breakdown</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Asset','CAGR','Gross Value','Tax Paid','Net Value','Real Value*'].map(h => (
                    <th key={h} className="text-left py-2 pr-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.res.map((r, i) => (
                  <tr key={r.id} className={`border-b border-gray-50 dark:border-gray-800/50 ${i === 0 ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                      {ASSET_DATA[r.id].icon} {ASSET_DATA[r.id].label}
                      {i === 0 && <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full font-bold">Best</span>}
                    </td>
                    <td className="py-3 pr-4 font-mono text-blue-600 dark:text-blue-400">{r.cagr}%</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{formatINR(r.gross)}</td>
                    <td className="py-3 pr-4 text-red-500 dark:text-red-400">{formatINR(r.tax)}</td>
                    <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-white">{formatINR(r.net)}</td>
                    <td className={`py-3 pr-4 font-bold ${i === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatINR(r.inflAdj)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-3">
              * Real Value = net value deflated by {INFLATION_AVG}% average Indian inflation. LTCG on equity exempt up to ₹1.25L. Returns based on historical CAGR estimates.
            </p>
          </div>

          {/* Insight */}
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">💡 Key Takeaways</h3>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>• <strong>Equity (Nifty)</strong> has historically beaten all asset classes over 10+ year periods in India after accounting for taxes.</p>
              <p>• <strong>Real estate</strong> returns look large nominally but lose significant value after inflation and transaction costs (stamp duty, brokerage).</p>
              <p>• <strong>FDs</strong> are worst for high-tax-bracket investors — 30% tax on interest crushes real returns below inflation in some years.</p>
              <p>• <strong>PPF</strong> is tax-free and beats FD for long horizons, but has contribution and lock-in limits.</p>
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
        Returns are based on historical CAGR estimates and do not guarantee future results. Tax calculations are simplified.
        Consult a SEBI-registered advisor before investing. Not financial advice.
      </p>
    </div>
  );
}
