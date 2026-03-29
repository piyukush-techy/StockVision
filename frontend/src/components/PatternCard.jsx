// PatternCard.jsx — Single Pattern Display Card
// Phase 6 Month 31
// JAI SHREE GANESH 🙏

const SIGNAL_STYLE = {
  Bullish: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700', badge: 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300', icon: '🟢' },
  Bearish: { bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-200 dark:border-red-700',     badge: 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300',         icon: '🔴' },
  Neutral: { bg: 'bg-yellow-50 dark:bg-yellow-900/20',border: 'border-yellow-200 dark:border-yellow-700',badge:'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300', icon: '🟡' },
};

const STRENGTH_LABEL = {
  1: 'Very Weak', 2: 'Weak', 3: 'Weak', 4: 'Moderate', 5: 'Moderate',
  6: 'Strong',    7: 'Strong', 8: 'Very Strong', 9: 'Very Strong', 10: 'Exceptional',
};
const STRENGTH_COLOR = score =>
  score >= 8 ? 'text-green-600 dark:text-green-400' :
  score >= 6 ? 'text-blue-600 dark:text-blue-400' :
  score >= 4 ? 'text-yellow-600 dark:text-yellow-400' :
               'text-red-500 dark:text-red-400';

export default function PatternCard({ pattern, compact = false }) {
  const s = SIGNAL_STYLE[pattern.signal] || SIGNAL_STYLE.Neutral;
  const successRate = pattern.successRate || 50;

  if (compact) {
    return (
      <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${s.bg} ${s.border}`}>
        <div className="flex items-center gap-2">
          <span>{s.icon}</span>
          <div>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{pattern.name}</span>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{pattern.date}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${s.badge} px-2 py-0.5 rounded-full`}>{pattern.signal}</span>
          <span className={`text-xs font-bold ${STRENGTH_COLOR(pattern.strength)}`}>{pattern.strength}/10</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{s.icon}</span>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">{pattern.name}</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{pattern.signal}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pattern.date}</div>
        </div>

        {/* Strength score */}
        <div className="text-center">
          <div className={`text-2xl font-black ${STRENGTH_COLOR(pattern.strength)}`}>{pattern.strength}</div>
          <div className="text-[10px] text-gray-500">/ 10</div>
          <div className={`text-[10px] font-semibold ${STRENGTH_COLOR(pattern.strength)}`}>{STRENGTH_LABEL[pattern.strength]}</div>
        </div>
      </div>

      {/* OHLC */}
      <div className="grid grid-cols-5 gap-1 mb-3 bg-white/50 dark:bg-black/20 rounded-xl p-2">
        {[['O', pattern.open], ['H', pattern.high], ['L', pattern.low], ['C', pattern.close]].map(([l, v]) => (
          <div key={l} className="text-center">
            <div className="text-[10px] text-gray-400 font-medium">{l}</div>
            <div className="text-xs font-bold text-gray-700 dark:text-gray-200">₹{v?.toFixed(0)}</div>
          </div>
        ))}
        <div className="text-center">
          <div className="text-[10px] text-gray-400 font-medium">Vol</div>
          <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
            {pattern.volRatio ? `${pattern.volRatio}x` : '-'}
          </div>
        </div>
      </div>

      {/* Success Rate Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500 dark:text-gray-400 font-medium">India Success Rate</span>
          <span className="font-bold text-gray-700 dark:text-gray-200">{successRate}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              successRate >= 65 ? 'bg-green-500' : successRate >= 55 ? 'bg-blue-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${successRate}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>📈 Avg gain: +{pattern.avgGain}%</span>
          <span>📉 Avg loss: -{pattern.avgLoss}%</span>
          <span>n={pattern.samples}</span>
        </div>
      </div>
    </div>
  );
}
