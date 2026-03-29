// MaxPainChart.jsx — Options Max Pain + OI Bar Chart
// Phase 6 Month 29: Options Chain Analyser

import { useMemo } from 'react';

const NUM_STRIKES = 12; // show ±6 strikes from ATM

export default function MaxPainChart({ chain, atmStrike, maxPain, underlyingValue, resistanceLevel, supportLevel }) {
  // Filter to ATM ± window
  const visible = useMemo(() => {
    if (!chain || !chain.length) return [];
    const idx = chain.findIndex(r => r.strikePrice === atmStrike);
    if (idx < 0) return chain.slice(0, NUM_STRIKES);
    const half = Math.floor(NUM_STRIKES / 2);
    const start = Math.max(0, idx - half);
    const end   = Math.min(chain.length, start + NUM_STRIKES);
    return chain.slice(start, end);
  }, [chain, atmStrike]);

  const maxCEOI = Math.max(...visible.map(r => r.CE?.openInterest || 0), 1);
  const maxPEOI = Math.max(...visible.map(r => r.PE?.openInterest || 0), 1);
  const globalMax = Math.max(maxCEOI, maxPEOI, 1);

  const fmt = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
    return n;
  };

  if (!visible.length) {
    return <div className="text-gray-400 text-sm text-center py-8">No OI data available</div>;
  }

  return (
    <div className="w-full overflow-x-auto">
      {/* Legend */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />
          <span className="text-gray-600 dark:text-gray-400">Call OI</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
          <span className="text-gray-600 dark:text-gray-400">Put OI</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-orange-500 inline-block" />
          <span className="text-gray-600 dark:text-gray-400">Max Pain: ₹{maxPain?.toLocaleString('en-IN')}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-blue-500 inline-block border-dashed border border-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">Spot: ₹{underlyingValue?.toLocaleString('en-IN')}</span>
        </span>
      </div>

      {/* Chart */}
      <div className="relative">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[100, 75, 50, 25, 0].map(pct => (
            <div key={pct} className="border-t border-gray-100 dark:border-gray-800 w-full" style={{ marginTop: pct === 100 ? 0 : undefined }} />
          ))}
        </div>

        <div className="flex items-end gap-1 h-48 relative">
          {visible.map((row) => {
            const ceH = ((row.CE?.openInterest || 0) / globalMax) * 100;
            const peH = ((row.PE?.openInterest || 0) / globalMax) * 100;
            const isATM        = row.strikePrice === atmStrike;
            const isMaxPain    = row.strikePrice === maxPain;
            const isResistance = row.strikePrice === resistanceLevel;
            const isSupport    = row.strikePrice === supportLevel;

            return (
              <div key={row.strikePrice} className="flex-1 flex flex-col items-center gap-0.5 group">
                {/* Bars */}
                <div className="flex items-end gap-0.5 h-40 w-full">
                  {/* CE bar */}
                  <div className="flex-1 flex items-end h-full">
                    <div
                      className={`w-full rounded-t transition-all ${isATM ? 'bg-red-600' : 'bg-red-400/80'} group-hover:bg-red-600`}
                      style={{ height: `${Math.max(ceH, 1)}%` }}
                      title={`CE OI: ${fmt(row.CE?.openInterest || 0)}`}
                    />
                  </div>
                  {/* PE bar */}
                  <div className="flex-1 flex items-end h-full">
                    <div
                      className={`w-full rounded-t transition-all ${isATM ? 'bg-green-600' : 'bg-green-400/80'} group-hover:bg-green-600`}
                      style={{ height: `${Math.max(peH, 1)}%` }}
                      title={`PE OI: ${fmt(row.PE?.openInterest || 0)}`}
                    />
                  </div>
                </div>

                {/* Strike label */}
                <div className="relative">
                  <span className={`text-[10px] font-mono whitespace-nowrap ${
                    isATM     ? 'text-blue-600 dark:text-blue-400 font-bold' :
                    isMaxPain ? 'text-orange-500 font-semibold' :
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    {row.strikePrice.toLocaleString('en-IN')}
                  </span>

                  {/* Indicators below strike */}
                  <div className="flex gap-0.5 justify-center mt-0.5">
                    {isATM        && <span className="text-[8px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-0.5 rounded">ATM</span>}
                    {isMaxPain    && <span className="text-[8px] bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-0.5 rounded">MP</span>}
                    {isResistance && <span className="text-[8px] bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-0.5 rounded">R</span>}
                    {isSupport    && <span className="text-[8px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-0.5 rounded">S</span>}
                  </div>
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 z-10 hidden group-hover:block pointer-events-none">
                  <div className="bg-gray-900 text-white text-xs rounded-lg p-2 shadow-xl min-w-32 -translate-x-1/2 left-1/2 relative">
                    <p className="font-bold text-yellow-400 mb-1">₹{row.strikePrice.toLocaleString('en-IN')}</p>
                    <p className="text-red-400">CE OI: {fmt(row.CE?.openInterest || 0)}</p>
                    <p className="text-green-400">PE OI: {fmt(row.PE?.openInterest || 0)}</p>
                    {row.CE?.impliedVolatility > 0 && <p className="text-gray-300">CE IV: {row.CE.impliedVolatility.toFixed(1)}%</p>}
                    {row.PE?.impliedVolatility > 0 && <p className="text-gray-300">PE IV: {row.PE.impliedVolatility.toFixed(1)}%</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Y-axis labels */}
      <div className="flex justify-between text-xs text-gray-400 mt-1 px-2">
        <span>0</span>
        <span>{fmt(Math.round(globalMax * 0.5))}</span>
        <span>{fmt(globalMax)}</span>
      </div>
    </div>
  );
}
