// OptionsPage.jsx — Month 26: Options Chain Analyser
import { useState } from 'react';

const SAMPLE_EXPIRIES = ['26-Jun-2025', '31-Jul-2025', '28-Aug-2025', '25-Sep-2025'];

const POPULAR = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK'];

function generateChain(symbol, expiry, spotPrice) {
  const strikes = [];
  const atm = Math.round(spotPrice / 50) * 50;
  for (let i = -10; i <= 10; i++) {
    const strike = atm + i * 50;
    const distance = Math.abs(i);
    const callIV = 18 + distance * 1.5 + Math.random() * 2;
    const putIV = 19 + distance * 1.8 + Math.random() * 2;
    const callLTP = Math.max(0.05, (atm - strike + 200) / 8 + Math.random() * 5).toFixed(2);
    const putLTP = Math.max(0.05, (strike - atm + 200) / 8 + Math.random() * 5).toFixed(2);
    const callOI = Math.floor((10 - distance) * 50000 + Math.random() * 20000);
    const putOI = Math.floor((10 - distance) * 45000 + Math.random() * 20000);
    strikes.push({
      strike,
      isATM: i === 0,
      call: { ltp: parseFloat(callLTP), iv: callIV.toFixed(1), oi: callOI, change: (Math.random() * 20 - 10).toFixed(1) },
      put: { ltp: parseFloat(putLTP), iv: putIV.toFixed(1), oi: putOI, change: (Math.random() * 20 - 10).toFixed(1) },
    });
  }
  return strikes;
}

function OIBar({ value, max, color }) {
  return (
    <div className="w-16 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

export default function OptionsPage() {
  const [symbol, setSymbol] = useState('NIFTY');
  const [input, setInput] = useState('NIFTY');
  const [expiry, setExpiry] = useState(SAMPLE_EXPIRIES[0]);
  const [spotPrice] = useState(22450);
  const [loaded, setLoaded] = useState(false);
  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('chain'); // chain | pcr | oi

  const load = () => {
    setLoading(true);
    setTimeout(() => {
      setSymbol(input.toUpperCase());
      setChain(generateChain(input, expiry, spotPrice));
      setLoaded(true);
      setLoading(false);
    }, 800);
  };

  const maxOI = loaded ? Math.max(...chain.map(r => Math.max(r.call.oi, r.put.oi))) : 1;
  const totalCallOI = chain.reduce((s, r) => s + r.call.oi, 0);
  const totalPutOI = chain.reduce((s, r) => s + r.put.oi, 0);
  const pcr = totalPutOI / (totalCallOI || 1);
  const maxCallOIStrike = loaded ? chain.reduce((a, b) => a.call.oi > b.call.oi ? a : b)?.strike : null;
  const maxPutOIStrike = loaded ? chain.reduce((a, b) => a.put.oi > b.put.oi ? a : b)?.strike : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Options Chain Analyser</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">NSE F&O options chain with OI, IV, and PCR analysis · Educational use only</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Symbol</label>
          <input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="NIFTY / RELIANCE..."
            className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Expiry</label>
          <select
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SAMPLE_EXPIRIES.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold transition-colors"
        >
          {loading ? 'Loading...' : 'Load Chain'}
        </button>
        <div className="flex gap-1">
          {POPULAR.map(p => (
            <button
              key={p}
              onClick={() => { setInput(p); }}
              className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {!loaded && !loading && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-16 text-center">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-gray-500 dark:text-gray-400">Select a symbol and expiry, then click "Load Chain"</p>
          <p className="text-xs text-gray-400 mt-2">Note: Demo data shown · Live NSE F&O data requires exchange subscription</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {loaded && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Spot Price</div>
              <div className="text-xl font-black text-gray-900 dark:text-white">₹{spotPrice.toLocaleString('en-IN')}</div>
            </div>
            <div className={`border rounded-xl p-4 ${pcr > 1.2 ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : pcr < 0.8 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
              <div className="text-xs text-gray-500 mb-1">PCR (Put-Call Ratio)</div>
              <div className="text-xl font-black text-gray-900 dark:text-white">{pcr.toFixed(2)}</div>
              <div className="text-xs mt-1 font-semibold">{pcr > 1.2 ? '🟢 Bullish' : pcr < 0.8 ? '🔴 Bearish' : '🟡 Neutral'}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Max Call OI (Resistance)</div>
              <div className="text-xl font-black text-red-700 dark:text-red-400">₹{maxCallOIStrike?.toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Max Put OI (Support)</div>
              <div className="text-xl font-black text-green-700 dark:text-green-400">₹{maxPutOIStrike?.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* View tabs */}
          <div className="flex gap-2 mb-4">
            {[['chain', 'Options Chain'], ['oi', 'OI Analysis']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'}`}
              >
                {l}
              </button>
            ))}
          </div>

          {view === 'chain' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-50 dark:bg-blue-950/30">
                      <th colSpan={4} className="px-4 py-3 text-center text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider border-r border-blue-200 dark:border-blue-800">CALLS</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Strike</th>
                      <th colSpan={4} className="px-4 py-3 text-center text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider border-l border-red-200 dark:border-red-800">PUTS</th>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500">
                      <th className="px-3 py-2 text-right">OI</th>
                      <th className="px-3 py-2 text-right">IV%</th>
                      <th className="px-3 py-2 text-right">Chg%</th>
                      <th className="px-3 py-2 text-right border-r border-gray-100 dark:border-gray-800">LTP</th>
                      <th className="px-3 py-2 text-center font-bold">STRIKE</th>
                      <th className="px-3 py-2 text-left border-l border-gray-100 dark:border-gray-800">LTP</th>
                      <th className="px-3 py-2 text-left">Chg%</th>
                      <th className="px-3 py-2 text-left">IV%</th>
                      <th className="px-3 py-2 text-left">OI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chain.map(row => (
                      <tr
                        key={row.strike}
                        className={`border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${row.isATM ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}`}
                      >
                        {/* Call side */}
                        <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">{(row.call.oi / 1000).toFixed(0)}K</td>
                        <td className="px-3 py-2.5 text-right text-purple-600 dark:text-purple-400">{row.call.iv}</td>
                        <td className={`px-3 py-2.5 text-right ${parseFloat(row.call.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{row.call.change}%</td>
                        <td className="px-3 py-2.5 text-right font-bold text-blue-700 dark:text-blue-300 border-r border-gray-100 dark:border-gray-800">₹{row.call.ltp}</td>
                        {/* Strike */}
                        <td className={`px-4 py-2.5 text-center font-black ${row.isATM ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30' : 'text-gray-900 dark:text-white'}`}>
                          {row.strike.toLocaleString('en-IN')}
                          {row.isATM && <span className="ml-1 text-xs">ATM</span>}
                        </td>
                        {/* Put side */}
                        <td className="px-3 py-2.5 text-left font-bold text-red-700 dark:text-red-300 border-l border-gray-100 dark:border-gray-800">₹{row.put.ltp}</td>
                        <td className={`px-3 py-2.5 text-left ${parseFloat(row.put.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{row.put.change}%</td>
                        <td className="px-3 py-2.5 text-left text-purple-600 dark:text-purple-400">{row.put.iv}</td>
                        <td className="px-3 py-2.5 text-left text-gray-600 dark:text-gray-400">{(row.put.oi / 1000).toFixed(0)}K</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'oi' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Open Interest Distribution</h3>
              <div className="space-y-2">
                {chain.map(row => (
                  <div key={row.strike} className={`flex items-center gap-3 p-2 rounded-lg ${row.isATM ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}`}>
                    <span className={`w-20 text-right text-sm font-bold flex-shrink-0 ${row.isATM ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {row.strike.toLocaleString('en-IN')}
                    </span>
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-blue-600 w-8">CE</span>
                        <OIBar value={row.call.oi} max={maxOI} color="bg-blue-400" />
                        <span className="text-xs text-gray-500">{(row.call.oi / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600 w-8">PE</span>
                        <OIBar value={row.put.oi} max={maxOI} color="bg-red-400" />
                        <span className="text-xs text-gray-500">{(row.put.oi / 1000).toFixed(0)}K</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4 text-center">⚠️ Demo data shown for educational purposes. Live F&O data requires NSE data subscription. Not financial advice.</p>
        </>
      )}
    </div>
  );
}
