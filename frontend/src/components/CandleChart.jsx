// CandleChart.jsx — Pure SVG Candlestick Chart
// Phase 6 Month 31 — No external library, 100% custom
// JAI SHREE GANESH 🙏

import { useState, useMemo } from 'react';

const SIGNAL_COLOR = { Bullish: '#22c55e', Bearish: '#ef4444', Neutral: '#f59e0b' };

export default function CandleChart({ candles = [], patterns = [], height = 320 }) {
  const [tooltip, setTooltip]   = useState(null);
  const [range, setRange]       = useState('1M');

  const RANGES = { '5D': 5, '1M': 22, '3M': 66 };

  const visible = useMemo(() => {
    const n = RANGES[range] || 22;
    return candles.slice(-n);
  }, [candles, range]);

  const patternDates = useMemo(() => {
    const map = {};
    for (const p of patterns) {
      if (!map[p.date]) map[p.date] = [];
      map[p.date].push(p);
    }
    return map;
  }, [patterns]);

  if (!visible.length) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
      No chart data available
    </div>
  );

  const W     = 800;
  const H     = height;
  const PAD   = { top: 24, right: 16, bottom: 32, left: 56 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const allHigh = Math.max(...visible.map(c => c.high));
  const allLow  = Math.min(...visible.map(c => c.low));
  const priceRange = allHigh - allLow || 1;

  const candleW  = Math.max(3, Math.floor(chartW / visible.length) - 1);
  const candleGap = Math.floor(chartW / visible.length);

  const toY = price => PAD.top + chartH - ((price - allLow) / priceRange) * chartH;
  const toX = idx   => PAD.left + idx * candleGap + candleGap / 2;

  // Y-axis grid lines
  const gridLines = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const price = allLow + (priceRange * i / steps);
    const y     = toY(price);
    gridLines.push({ y, price });
  }

  return (
    <div className="relative">
      {/* Range buttons */}
      <div className="flex gap-2 mb-3">
        {Object.keys(RANGES).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              range === r
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {r}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">{visible.length} candles</span>
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: Math.max(400, visible.length * 12) }}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Grid lines */}
          {gridLines.map(({ y, price }, i) => (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                fontSize="10" fill="#9ca3af">
                {price >= 1000 ? `₹${(price / 1000).toFixed(1)}K` : `₹${price.toFixed(0)}`}
              </text>
            </g>
          ))}

          {/* Candles */}
          {visible.map((c, i) => {
            const x      = toX(i);
            const yHigh  = toY(c.high);
            const yLow   = toY(c.low);
            const yOpen  = toY(c.open);
            const yClose = toY(c.close);
            const bull   = c.close >= c.open;
            const color  = bull ? '#22c55e' : '#ef4444';
            const bodyTop    = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1, Math.abs(yOpen - yClose));

            const patList = patternDates[c.date];

            return (
              <g key={i}
                onMouseEnter={() => setTooltip({ c, x, i, patList })}
                style={{ cursor: 'pointer' }}
              >
                {/* Wick */}
                <line x1={x} y1={yHigh} x2={x} y2={yLow}
                  stroke={color} strokeWidth="1" />
                {/* Body */}
                <rect
                  x={x - candleW / 2} y={bodyTop}
                  width={candleW} height={bodyHeight}
                  fill={color} rx="1"
                />
                {/* Pattern marker dot */}
                {patList && (
                  <circle
                    cx={x} cy={yHigh - 8}
                    r={4}
                    fill={SIGNAL_COLOR[patList[0].signal]}
                    stroke="white" strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}

          {/* X-axis dates — show every Nth label */}
          {visible.map((c, i) => {
            const step = visible.length > 40 ? 10 : visible.length > 15 ? 5 : 2;
            if (i % step !== 0) return null;
            return (
              <text key={i}
                x={toX(i)} y={H - 8}
                textAnchor="middle" fontSize="9" fill="#9ca3af"
              >
                {c.date.substring(5)} {/* MM-DD */}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute top-10 left-4 z-10 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-xl pointer-events-none min-w-[180px]">
          <div className="font-bold text-gray-300 mb-1">{tooltip.c.date}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-gray-400">O</span><span>₹{tooltip.c.open.toFixed(2)}</span>
            <span className="text-gray-400">H</span><span className="text-green-400">₹{tooltip.c.high.toFixed(2)}</span>
            <span className="text-gray-400">L</span><span className="text-red-400">₹{tooltip.c.low.toFixed(2)}</span>
            <span className="text-gray-400">C</span><span>₹{tooltip.c.close.toFixed(2)}</span>
            <span className="text-gray-400">Vol</span><span>{(tooltip.c.volume / 1e6).toFixed(2)}M</span>
          </div>
          {tooltip.patList && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              {tooltip.patList.map((p, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span style={{ color: SIGNAL_COLOR[p.signal] }}>●</span>
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-gray-400 text-[10px]">({p.signal})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
