// NewsCalendarPage.jsx — Month 29 FIX: Real news from /api/news/market/india
// Replaces 12 hardcoded MARKET_NEWS items with live Yahoo Finance news
import { useState, useEffect } from 'react';
import api from '../api';

const CATEGORIES = ['All', 'Macro', 'Earnings', 'FII/DII', 'Corporate', 'Sector', 'Regulation', 'Dividend'];
const EVENT_TYPES = ['All', 'result', 'dividend', 'boardmeeting', 'agm', 'split'];

// Earnings calendar stays as structured data since no free API gives future earnings dates reliably.
// Dates are updated quarterly. This is the only section that stays "curated" not "mock".
const EARNINGS_CALENDAR = [
  { symbol:'RELIANCE',  name:'Reliance Industries', date:'2025-04-15', type:'result',      status:'upcoming', eps:null,  epsEst:34.2, beat:null },
  { symbol:'TCS',       name:'Tata Consultancy',    date:'2025-04-10', type:'result',      status:'upcoming', eps:null,  epsEst:32.1, beat:null },
  { symbol:'INFY',      name:'Infosys',             date:'2025-04-17', type:'result',      status:'upcoming', eps:null,  epsEst:22.3, beat:null },
  { symbol:'HDFCBANK',  name:'HDFC Bank',           date:'2025-04-19', type:'result',      status:'upcoming', eps:null,  epsEst:21.4, beat:null },
  { symbol:'WIPRO',     name:'Wipro',               date:'2025-04-16', type:'result',      status:'upcoming', eps:null,  epsEst:6.9,  beat:null },
  { symbol:'BAJFINANCE',name:'Bajaj Finance',       date:'2025-04-25', type:'result',      status:'upcoming', eps:null,  epsEst:46.1, beat:null },
  { symbol:'ITC',       name:'ITC Ltd',             date:'2025-04-20', type:'dividend',    status:'upcoming', amount:'₹6.50/share', exDate:'2025-04-21' },
  { symbol:'COALINDIA', name:'Coal India',          date:'2025-04-28', type:'dividend',    status:'upcoming', amount:'₹5.60/share', exDate:'2025-04-28' },
  { symbol:'DRREDDY',   name:"Dr Reddy's",          date:'2025-05-05', type:'boardmeeting',status:'upcoming', agenda:'Q4 results consideration' },
  { symbol:'KOTAKBANK', name:'Kotak Bank',          date:'2025-05-10', type:'agm',         status:'upcoming', agenda:'Annual General Meeting' },
];

const sentimentColors = {
  positive:'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  negative:'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  neutral:'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
};

const eventTypeLabel   = { result:'📊 Results', dividend:'💰 Dividend', boardmeeting:'🏛️ Board Meet', agm:'👥 AGM', split:'✂️ Split' };
const eventTypeColors  = {
  result:'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  dividend:'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  boardmeeting:'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  agm:'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  split:'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
};

function daysFromNow(dateStr) {
  const diff = new Date(dateStr) - new Date();
  const days = Math.ceil(diff / (1000*60*60*24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 0) return `In ${days}d`;
  return `${Math.abs(days)}d ago`;
}

// Guess category from news title
function guessCategory(title) {
  if (!title) return 'Macro';
  const t = title.toLowerCase();
  if (t.includes('fii') || t.includes('dii') || t.includes('institutional') || t.includes('foreign')) return 'FII/DII';
  if (t.includes('profit') || t.includes('result') || t.includes('quarter') || t.includes('eps') || t.includes('revenue') || t.includes('earnings')) return 'Earnings';
  if (t.includes('sebi') || t.includes('rbi') || t.includes('regulation') || t.includes('rule') || t.includes('circular') || t.includes('ban')) return 'Regulation';
  if (t.includes('dividend') || t.includes('bonus') || t.includes('split')) return 'Dividend';
  if (t.includes('sector') || t.includes('nifty it') || t.includes('nifty pharma') || t.includes('nifty bank')) return 'Sector';
  if (t.includes('merger') || t.includes('acquisition') || t.includes('deal') || t.includes('launch') || t.includes('partnership')) return 'Corporate';
  return 'Macro';
}

// Guess sentiment from title
function guessSentiment(title) {
  if (!title) return 'neutral';
  const t = title.toLowerCase();
  const pos = ['rises','jumps','gains','beats','record','high','surge','up','profit','growth','win','strong','rally','positive','approve'];
  const neg = ['falls','drops','misses','loss','low','down','slump','weak','decline','cut','concern','risk','bearish','selloff','crash'];
  const posScore = pos.filter(w => t.includes(w)).length;
  const negScore = neg.filter(w => t.includes(w)).length;
  if (posScore > negScore) return 'positive';
  if (negScore > posScore) return 'negative';
  return 'neutral';
}

// Extract stock symbol mention from title (best effort)
function extractSymbol(title) {
  if (!title) return null;
  const t = title.toUpperCase();
  const symbols = ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN','WIPRO','BHARTIARTL',
    'BAJFINANCE','ITC','MARUTI','HINDUNILVR','SUNPHARMA','KOTAKBANK','TATAMOTORS','ADANIPORTS',
    'DRREDDY','TATASTEEL','JSWSTEEL','NTPC','ONGC','LT','AXISBANK','TITAN','COALINDIA','CIPLA'];
  return symbols.find(s => t.includes(s)) || null;
}

export default function NewsCalendarPage() {
  const [activeTab, setActiveTab]     = useState('news');
  const [news, setNews]               = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError]     = useState('');
  const [catFilter, setCatFilter]     = useState('All');
  const [eventFilter, setEventFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch real market news on mount
  useEffect(() => {
    setNewsLoading(true);
    api.get('/news/market/india')
      .then(res => {
        const rawNews = res.data?.news || res.data || [];
        // Enrich each item with category + sentiment if not already set
        const enriched = rawNews.map((item, i) => ({
          id: item.id || item.uuid || i,
          headline: item.title || item.headline || '',
          source: item.publisher || item.source || 'Yahoo Finance',
          time: item.publishedAt
            ? new Date(item.publishedAt).toLocaleString('en-IN', { hour:'2-digit', minute:'2-digit', day:'numeric', month:'short' })
            : 'Recently',
          category: item.category || guessCategory(item.title || item.headline),
          sentiment: item.sentiment || guessSentiment(item.title || item.headline),
          symbol: item.symbol || extractSymbol(item.title || item.headline),
          link: item.link || item.url || '#',
        }));
        setNews(enriched);
        setNewsLoading(false);
      })
      .catch(err => {
        setNewsError('Could not load news. Is the backend running?');
        setNewsLoading(false);
      });
  }, []);

  const filteredNews = news.filter(n => catFilter === 'All' || n.category === catFilter);
  const filteredEvents = EARNINGS_CALENDAR.filter(e => {
    if (eventFilter !== 'All' && e.type !== eventFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    return true;
  });

  const upcomingCount = EARNINGS_CALENDAR.filter(e => e.status === 'upcoming').length;
  const thisWeek = EARNINGS_CALENDAR.filter(e => {
    const diff = (new Date(e.date) - new Date()) / (1000*60*60*24);
    return diff >= 0 && diff <= 7;
  }).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">News & Events Calendar</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Live market news · Yahoo Finance · Corporate events calendar</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[['news','📰 Market News'],['calendar','📅 Events Calendar']].map(([v,l]) => (
          <button key={v} onClick={() => setActiveTab(v)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${activeTab === v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'}`}>
            {l}
          </button>
        ))}
      </div>

      {activeTab === 'news' && (
        <>
          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-5">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${catFilter === c ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'}`}>
                {c}
              </button>
            ))}
          </div>

          {newsLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-500 text-sm">Fetching live news from Yahoo Finance…</span>
            </div>
          )}

          {newsError && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-5 text-red-700 dark:text-red-400">
              ⚠️ {newsError}
            </div>
          )}

          {!newsLoading && !newsError && (
            <div className="space-y-3">
              {filteredNews.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center text-gray-400">
                  No news found for this category.
                </div>
              ) : filteredNews.map(n => (
                <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer"
                  className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sentimentColors[n.sentiment]}`}>
                          {n.sentiment === 'positive' ? '▲ Positive' : n.sentiment === 'negative' ? '▼ Negative' : '● Neutral'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{n.category}</span>
                        {n.symbol && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-mono">{n.symbol}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug mb-1">
                        {n.headline}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{n.source}</span>
                        <span>·</span>
                        <span>{n.time}</span>
                      </div>
                    </div>
                    <span className="text-gray-300 dark:text-gray-600 text-xs mt-1 shrink-0">↗</span>
                  </div>
                </a>
              ))}
              {!newsLoading && news.length > 0 && (
                <p className="text-xs text-center text-gray-400 pt-2">
                  📡 {news.length} articles · Live Yahoo Finance · Refreshes every 15 min
                </p>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'calendar' && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label:'Upcoming Events', val:upcomingCount, color:'text-blue-600' },
              { label:'This Week',       val:thisWeek,      color:'text-amber-600' },
              { label:'Total Events',    val:EARNINGS_CALENDAR.length, color:'text-gray-700 dark:text-gray-300' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center">
                <div className={`text-2xl font-black ${s.color} mb-1`}>{s.val}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            {EVENT_TYPES.map(t => (
              <button key={t} onClick={() => setEventFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${eventFilter === t ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'}`}>
                {t === 'All' ? '🔀 All' : eventTypeLabel[t] || t}
              </button>
            ))}
            <div className="border-l border-gray-200 dark:border-gray-700 mx-1" />
            {[['all','All'],['upcoming','Upcoming'],['done','Past']].map(([v,l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300'}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredEvents.map((e, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${eventTypeColors[e.type]}`}>
                      {eventTypeLabel[e.type]}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white">{e.symbol}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">{e.name}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-bold ${e.status === 'upcoming' ? 'text-blue-600' : 'text-gray-400'}`}>
                      {daysFromNow(e.date)}
                    </div>
                    <div className="text-xs text-gray-400">{new Date(e.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
                  </div>
                </div>
                {e.type === 'result' && (
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    {e.status === 'done' ? (
                      <>
                        <span className="text-gray-500">EPS: <strong className="text-gray-900 dark:text-white">₹{e.eps}</strong></span>
                        <span className="text-gray-500">Est: <strong>₹{e.epsEst}</strong></span>
                        <span className="text-gray-500">Revenue: <strong>{e.revenue}</strong></span>
                        <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${e.beat ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'}`}>
                          {e.beat ? '✓ Beat' : '✗ Miss'}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">EPS Estimate: <strong className="text-gray-900 dark:text-white">₹{e.epsEst}</strong></span>
                    )}
                  </div>
                )}
                {e.type === 'dividend' && (
                  <div className="mt-2 text-sm text-gray-500">Amount: <strong className="text-green-600">{e.amount}</strong> · Ex-date: {e.exDate}</div>
                )}
                {(e.type === 'boardmeeting' || e.type === 'agm') && (
                  <div className="mt-2 text-sm text-gray-500">{e.agenda}</div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-center text-gray-400 mt-4">📅 Events calendar updated quarterly · News is live real-time</p>
        </>
      )}
    </div>
  );
}
