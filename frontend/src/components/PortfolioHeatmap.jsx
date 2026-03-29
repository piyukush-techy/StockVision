// components/PortfolioHeatmap.jsx — Portfolio Treemap Heatmap
// Phase 6 Month 32 — Feature 19
// JAI SHREE GANESH 🙏

import { useNavigate } from 'react-router-dom';

function pnlColor(pnlPct) {
  if (pnlPct >= 10)  return { bg: '#15803d', text: '#fff' };
  if (pnlPct >= 5)   return { bg: '#16a34a', text: '#fff' };
  if (pnlPct >= 2)   return { bg: '#22c55e', text: '#000' };
  if (pnlPct >= 0)   return { bg: '#4ade80', text: '#000' };
  if (pnlPct >= -2)  return { bg: '#fca5a5', text: '#000' };
  if (pnlPct >= -5)  return { bg: '#f87171', text: '#000' };
  if (pnlPct >= -10) return { bg: '#ef4444', text: '#fff' };
  return { bg: '#b91c1c', text: '#fff' };
}

export default function PortfolioHeatmap({ holdings }) {
  const navigate = useNavigate();

  if (!holdings || !holdings.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-400">
        No holdings to display. Add trades to see the heatmap.
      </div>
    );
  }

  // Total current value for sizing
  const total = holdings.reduce((s, h) => s + h.currentValue, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">
        📊 Portfolio Heatmap
        <span className="ml-2 text-xs text-gray-400 font-normal">Box size = portfolio weight · Color = gain/loss</span>
      </h3>

      {/* Treemap-style flex layout */}
      <div className="flex flex-wrap gap-1 min-h-48">
        {holdings
          .slice()
          .sort((a, b) => b.currentValue - a.currentValue)
          .map(h => {
            const weight = total > 0 ? (h.currentValue / total) * 100 : 0;
            const { bg, text } = pnlColor(h.pnlPct);
            // Min width 60px, scale with weight
            const minW = 60;
            const maxW = 220;
            const w    = Math.max(minW, Math.min(maxW, weight * 8));
            const minH = 60;
            const maxH = 160;
            const hh   = Math.max(minH, Math.min(maxH, weight * 6));

            return (
              <div
                key={h.symbol}
                onClick={() => navigate(`/stock/${h.symbol}`)}
                className="cursor-pointer rounded-lg flex flex-col items-center justify-center p-2 transition-transform hover:scale-105 hover:shadow-lg select-none"
                style={{ backgroundColor: bg, color: text, width: w, height: hh, minWidth: 60, minHeight: 60 }}
                title={`${h.name}\nWeight: ${h.weight}%\nP&L: ₹${h.pnl?.toLocaleString('en-IN')} (${h.pnlPct > 0 ? '+' : ''}${h.pnlPct}%)`}
              >
                <div className="font-bold text-xs leading-tight text-center">{h.symbol}</div>
                <div className="text-xs leading-tight text-center opacity-90">
                  {h.pnlPct > 0 ? '+' : ''}{h.pnlPct?.toFixed(1)}%
                </div>
                {weight > 5 && (
                  <div className="text-xs opacity-75">{h.weight}%</div>
                )}
              </div>
            );
          })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-xs text-gray-400">P&L Scale:</span>
        {[
          { bg: '#15803d', label: '>10%' },
          { bg: '#22c55e', label: '2–10%' },
          { bg: '#4ade80', label: '0–2%' },
          { bg: '#fca5a5', label: '0–-2%' },
          { bg: '#ef4444', label: '-2–-10%' },
          { bg: '#b91c1c', label: '<-10%' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: l.bg }} />
            <span className="text-xs text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
