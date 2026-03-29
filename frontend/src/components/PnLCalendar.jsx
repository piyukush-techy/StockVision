// components/PnLCalendar.jsx — GitHub-style P&L Calendar
// Phase 6 Month 32 — Feature 20
// JAI SHREE GANESH 🙏

function colorForPct(pct) {
  if (pct === null || pct === undefined) return 'bg-gray-100 dark:bg-gray-700';
  if (pct >=  3)  return 'bg-green-600';
  if (pct >=  1)  return 'bg-green-400';
  if (pct >   0)  return 'bg-green-200';
  if (pct === 0)  return 'bg-gray-200 dark:bg-gray-600';
  if (pct >= -1)  return 'bg-red-200';
  if (pct >= -3)  return 'bg-red-400';
  return 'bg-red-600';
}

function groupByWeeks(calendar) {
  // Build a map date → entry
  const map = {};
  calendar.forEach(d => { map[d.date] = d; });

  // Find date range: last 52 weeks
  const end   = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);

  // Align start to Sunday
  const dow = start.getDay();
  start.setDate(start.getDate() - dow);

  const weeks = [];
  let cur = new Date(start);
  while (cur <= end) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const ds = cur.toISOString().slice(0, 10);
      week.push({ date: ds, ...(map[ds] || { pnl: null, pct: null }) });
      cur = new Date(cur.getTime() + 24 * 3600 * 1000);
    }
    weeks.push(week);
  }
  return weeks;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['S','M','T','W','T','F','S'];

export default function PnLCalendar({ calendar = [], stats = {} }) {
  const weeks = groupByWeeks(calendar);

  // Month labels
  const monthLabels = [];
  weeks.forEach((week, wi) => {
    const firstDay = week.find(d => d.date);
    if (firstDay) {
      const date = new Date(firstDay.date);
      if (date.getDate() <= 7) {
        monthLabels.push({ wi, label: MONTHS[date.getMonth()] });
      }
    }
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">
        📅 P&amp;L Calendar
        <span className="ml-2 text-xs text-gray-400 font-normal">Last 12 months · Each cell = one trading day</span>
      </h3>

      {/* Stats row */}
      {stats.totalDays > 0 && (
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-green-500">{stats.greenDays}</div>
            <div className="text-xs text-gray-400">Green Days</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-500">{stats.redDays}</div>
            <div className="text-xs text-gray-400">Red Days</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-500">{stats.winRate}%</div>
            <div className="text-xs text-gray-400">Win Rate</div>
          </div>
          {stats.bestDay?.date && (
            <div className="text-center">
              <div className="text-sm font-bold text-green-500">+₹{stats.bestDay.pnl?.toLocaleString('en-IN')}</div>
              <div className="text-xs text-gray-400">Best Day ({stats.bestDay.date?.slice(5)})</div>
            </div>
          )}
          {stats.worstDay?.date && (
            <div className="text-center">
              <div className="text-sm font-bold text-red-500">₹{stats.worstDay.pnl?.toLocaleString('en-IN')}</div>
              <div className="text-xs text-gray-400">Worst Day ({stats.worstDay.date?.slice(5)})</div>
            </div>
          )}
        </div>
      )}

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: 680 }}>
          {/* Month labels */}
          <div className="flex ml-6 mb-1" style={{ gap: 2 }}>
            {weeks.map((_, wi) => {
              const label = monthLabels.find(m => m.wi === wi);
              return (
                <div key={wi} style={{ width: 13, flexShrink: 0 }} className="text-xs text-gray-400">
                  {label ? label.label : ''}
                </div>
              );
            })}
          </div>

          {/* Day labels + grid */}
          <div className="flex">
            <div className="flex flex-col mr-1" style={{ gap: 2 }}>
              {DAYS.map((d, i) => (
                <div key={i} className="text-xs text-gray-400 text-right" style={{ height: 13, lineHeight: '13px' }}>{i % 2 === 1 ? d : ''}</div>
              ))}
            </div>

            <div className="flex" style={{ gap: 2 }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: 2 }}>
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={`rounded-sm ${colorForPct(day.pct)}`}
                      style={{ width: 13, height: 13 }}
                      title={day.pct !== null ? `${day.date}\n${day.pct > 0 ? '+' : ''}${day.pct?.toFixed(2)}%  ₹${day.pnl?.toLocaleString('en-IN')}` : day.date}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-gray-400">Less</span>
        {['bg-red-600','bg-red-400','bg-red-200','bg-gray-200 dark:bg-gray-600','bg-green-200','bg-green-400','bg-green-600'].map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span className="text-xs text-gray-400">More</span>
      </div>
    </div>
  );
}
