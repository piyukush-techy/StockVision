// RatiosCard.jsx — Month 30: Added Altman Z-Score + Earnings Quality Score
import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function fmt(val, suffix = '', decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  if (suffix === '₹' || suffix === 'Cr') {
    if (Math.abs(val) >= 10000) return `₹${(val / 10000).toFixed(2)} Cr`;
    if (Math.abs(val) >= 100) return `₹${val.toFixed(0)}`;
    return `₹${val.toFixed(decimals)}`;
  }
  return `${parseFloat(val.toFixed(decimals))}${suffix}`;
}

function RatioRow({ label, value, suffix, good, bad, tooltip }) {
  const numVal = parseFloat(value);
  let color = 'text-gray-800 dark:text-gray-200';
  if (!isNaN(numVal) && good !== undefined) {
    color = numVal >= good ? 'text-green-600' : numVal <= bad ? 'text-red-600' : 'text-yellow-600';
  }
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        {tooltip && (
          <div className="group relative">
            <span className="text-gray-400 dark:text-gray-500 text-xs cursor-help">ⓘ</span>
            <div className="absolute left-0 bottom-5 w-48 bg-gray-800 dark:bg-gray-900 text-white text-xs rounded-lg p-2 hidden group-hover:block z-10 leading-relaxed shadow-lg">{tooltip}</div>
          </div>
        )}
      </div>
      <span className={`text-sm font-semibold ${color}`}>{fmt(value, suffix)}</span>
    </div>
  );
}

// ── Altman Z-Score widget ───────────────────────────────────────────────────
function ZScoreWidget({ symbol }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetch(`${API_BASE}/api/financials/${symbol}/deep-scores`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [symbol]);

  if (loading) return <div className="h-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl animate-pulse mt-2" />;
  if (!data?.zScore && !data?.earningsQuality) return null;

  const z  = data.zScore;
  const eq = data.earningsQuality;

  const zBg   = z?.color === 'green' ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
              : z?.color === 'amber' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
  const zText = z?.color === 'green' ? 'text-green-700 dark:text-green-400'
              : z?.color === 'amber' ? 'text-amber-700 dark:text-amber-400'
              : 'text-red-700 dark:text-red-400';

  const eqBg   = eq?.color === 'green' ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
               : eq?.color === 'amber' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
               : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
  const eqText = eq?.color === 'green' ? 'text-green-700 dark:text-green-400'
               : eq?.color === 'amber' ? 'text-amber-700 dark:text-amber-400'
               : 'text-red-700 dark:text-red-400';

  return (
    <div className="mt-4 space-y-3">
      {/* Altman Z-Score */}
      {z && (
        <div className={`rounded-xl border p-3 ${zBg}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Altman Z-Score</span>
            <span className={`text-lg font-black ${zText}`}>{z.score}</span>
          </div>
          <div className={`text-xs font-bold ${zText} mb-0.5`}>{z.zone}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{z.description}</p>
          {/* Score bar: 0 → 1.1 (distress) → 2.6 (grey) → 4+ (safe) */}
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${z.color==='green'?'bg-green-500':z.color==='amber'?'bg-amber-500':'bg-red-500'}`}
              style={{ width:`${Math.min(100, (z.score / 4) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>0 Distress</span><span>1.1</span><span>2.6</span><span>4+ Safe</span>
          </div>
        </div>
      )}

      {/* Earnings Quality */}
      {eq && (
        <div className={`rounded-xl border p-3 ${eqBg}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Earnings Quality</span>
            <span className={`text-lg font-black ${eqText}`}>{eq.score}/10</span>
          </div>
          <div className={`text-xs font-bold ${eqText} mb-0.5`}>{eq.grade}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{eq.summary}</p>
          <div className="mt-2 flex gap-3 text-xs text-gray-500">
            <span>Cash conv: <strong className={eqText}>{eq.cashConversion}×</strong></span>
            <span>Accrual: <strong className={eq.accrualRatio > 5 ? 'text-red-600' : eqText}>{eq.accrualRatio}%</strong></span>
            {eq.receivablesFlag && <span className="text-red-600 font-semibold">⚠ Rec. growing fast</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RatiosCard({ ratios, loading, symbol }) {
  const SectionLabel = ({ children }) => (
    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1 mt-4">{children}</p>
  );

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-28 mb-4 animate-pulse" />
        {[...Array(8)].map((_,i) => (
          <div key={i} className="flex justify-between py-2.5 border-b border-gray-100 dark:border-gray-700">
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-24 animate-pulse" />
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-16 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!ratios) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-center text-sm text-gray-400 dark:text-gray-500 py-10">
        No ratio data available
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="font-bold text-gray-900 dark:text-white mb-1">📐 Key Ratios</h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">TTM = Trailing 12 Months</p>

      <SectionLabel>Valuation</SectionLabel>
      <RatioRow label="P/E Ratio (TTM)"  value={ratios.peRatio}      tooltip="Price-to-Earnings. Lower = cheaper. Industry avg ~25 for Indian large caps." good={0} bad={50} />
      <RatioRow label="Forward P/E"      value={ratios.forwardPE}     tooltip="P/E based on next year's estimated earnings." />
      <RatioRow label="P/B Ratio"        value={ratios.pbRatio}       tooltip="Price-to-Book. Below 1 = trading below book value." good={0} bad={5} />
      <RatioRow label="EV/EBITDA"        value={ratios.evToEbitda}    tooltip="Enterprise Value to EBITDA. Lower is generally better." />

      <SectionLabel>Profitability</SectionLabel>
      <RatioRow label="ROE"              value={ratios.roe}           suffix="%" tooltip="Return on Equity. >15% is considered good." good={15} bad={8} />
      <RatioRow label="ROA"              value={ratios.roa}           suffix="%" tooltip="Return on Assets. Higher is better." good={8} bad={3} />
      <RatioRow label="Net Profit Margin" value={ratios.profitMargin} suffix="%" tooltip="% of revenue that becomes profit." good={15} bad={5} />
      <RatioRow label="Operating Margin" value={ratios.operatingMargin} suffix="%" tooltip="Operating profit as % of revenue." good={15} bad={5} />
      <RatioRow label="Gross Margin"     value={ratios.grossMargin}   suffix="%" tooltip="Revenue minus cost of goods sold, as %." good={30} bad={10} />

      <SectionLabel>Growth (YoY)</SectionLabel>
      <RatioRow label="Revenue Growth"   value={ratios.revenueGrowth}  suffix="%" good={15} bad={5} />
      <RatioRow label="Earnings Growth"  value={ratios.earningsGrowth} suffix="%" good={15} bad={5} />

      <SectionLabel>Per Share</SectionLabel>
      <RatioRow label="EPS (TTM)"        value={ratios.eps}        suffix="₹" tooltip="Earnings Per Share. Higher is better." />
      <RatioRow label="Forward EPS"      value={ratios.forwardEps} suffix="₹" />
      <RatioRow label="Book Value"       value={ratios.bookValue}  suffix="₹" tooltip="Net assets per share." />

      {ratios.dividendYield > 0 && (
        <>
          <SectionLabel>Dividends</SectionLabel>
          <RatioRow label="Dividend Yield" value={ratios.dividendYield} suffix="%" />
          <RatioRow label="Dividend Rate"  value={ratios.dividendRate}  suffix="₹" />
          <RatioRow label="Payout Ratio"   value={ratios.payoutRatio}   suffix="%" />
        </>
      )}

      <SectionLabel>Debt & Liquidity</SectionLabel>
      <RatioRow label="Debt/Equity"   value={ratios.debtToEquity} tooltip="Total debt divided by equity. Lower is safer." good={0} bad={2} />
      <RatioRow label="Current Ratio" value={ratios.currentRatio} tooltip="Current assets ÷ liabilities. >1 means can pay short-term debts." good={1.5} bad={1} />
      <RatioRow label="Quick Ratio"   value={ratios.quickRatio}   tooltip="Like current ratio but excludes inventory." good={1} bad={0.5} />

      <SectionLabel>Risk</SectionLabel>
      <RatioRow label="Beta" value={ratios.beta} tooltip="Volatility vs Nifty50. >1 means more volatile than market." />

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
        🟢 Good &nbsp;|&nbsp; 🟡 Average &nbsp;|&nbsp; 🔴 Needs attention
      </p>

      {/* Month 30: Deep scores — Altman Z-Score + Earnings Quality */}
      {symbol && <ZScoreWidget symbol={symbol} />}
    </div>
  );
}
