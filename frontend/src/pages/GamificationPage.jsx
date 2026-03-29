// GamificationPage.jsx — Month 28: Streaks, Badges, Leaderboard
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useSessionId from '../hooks/useSessionId';

// ── Badge definitions ────────────────────────────────────────────────────
const BADGE_DEFS = [
  // Explorer badges
  { id: 'first_search',   icon: '🔍', name: 'First Search',     desc: 'Searched for a stock for the first time',     xp: 10,  category: 'explorer', threshold: 1  },
  { id: 'stock_explorer', icon: '🗺️', name: 'Stock Explorer',   desc: 'Searched 10 different stocks',                xp: 50,  category: 'explorer', threshold: 10 },
  { id: 'market_nerd',    icon: '🤓', name: 'Market Nerd',       desc: 'Visited 25 different stock pages',            xp: 150, category: 'explorer', threshold: 25 },

  // Watchlist badges
  { id: 'first_watch',    icon: '⭐', name: 'Watcher',           desc: 'Added your first stock to a watchlist',       xp: 20,  category: 'watchlist', threshold: 1  },
  { id: 'curated',        icon: '📋', name: 'Curated Portfolio', desc: 'Have 10+ stocks across watchlists',           xp: 100, category: 'watchlist', threshold: 10 },
  { id: 'list_maker',     icon: '📝', name: 'List Maker',        desc: 'Created 3+ watchlists',                       xp: 75,  category: 'watchlist', threshold: 3  },

  // Streak badges
  { id: 'streak_3',       icon: '🔥', name: '3-Day Streak',      desc: 'Visited StockVision 3 days in a row',         xp: 30,  category: 'streak', threshold: 3  },
  { id: 'streak_7',       icon: '⚡', name: 'Weekly Warrior',    desc: 'Maintained a 7-day streak',                   xp: 100, category: 'streak', threshold: 7  },
  { id: 'streak_30',      icon: '💎', name: 'Diamond Hands',     desc: '30 consecutive days on StockVision',          xp: 500, category: 'streak', threshold: 30 },

  // Analysis badges
  { id: 'first_alert',    icon: '🔔', name: 'Alert Setter',      desc: 'Set your first price alert',                  xp: 20,  category: 'analysis', threshold: 1  },
  { id: 'scanner_user',   icon: '🔬', name: 'Deep Diver',        desc: 'Used Historical Scanner for the first time',  xp: 50,  category: 'analysis', threshold: 1  },
  { id: 'portfolio_pro',  icon: '💼', name: 'Portfolio Pro',     desc: 'Ran a Portfolio Optimization analysis',        xp: 100, category: 'analysis', threshold: 1  },

  // Milestone badges
  { id: 'xp_100',         icon: '🥉', name: 'Bronze Investor',   desc: 'Earned 100 XP',                               xp: 0,   category: 'milestone', threshold: 100  },
  { id: 'xp_500',         icon: '🥈', name: 'Silver Analyst',    desc: 'Earned 500 XP',                               xp: 0,   category: 'milestone', threshold: 500  },
  { id: 'xp_1000',        icon: '🥇', name: 'Gold Trader',       desc: 'Earned 1,000 XP',                             xp: 0,   category: 'milestone', threshold: 1000 },
  { id: 'xp_5000',        icon: '👑', name: 'Market Legend',     desc: 'Earned 5,000 XP',                             xp: 0,   category: 'milestone', threshold: 5000 },
];

// ── XP level thresholds ──────────────────────────────────────────────────
const LEVELS = [
  { level: 1, min: 0,    label: 'Newbie',      color: 'text-gray-400'   },
  { level: 2, min: 100,  label: 'Learner',     color: 'text-green-500'  },
  { level: 3, min: 300,  label: 'Trader',      color: 'text-blue-500'   },
  { level: 4, min: 700,  label: 'Analyst',     color: 'text-purple-500' },
  { level: 5, min: 1500, label: 'Investor',    color: 'text-amber-500'  },
  { level: 6, min: 3000, label: 'Pro Trader',  color: 'text-orange-500' },
  { level: 7, min: 6000, label: 'Market Guru', color: 'text-red-500'    },
];

function getLevel(xp) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) { current = LEVELS[i]; next = LEVELS[i + 1] || null; }
  }
  return { current, next };
}

// ── Mock leaderboard data ─────────────────────────────────────────────────
const LEADERBOARD = [
  { rank: 1,  name: 'Rahul_Sharma',    xp: 4820, streak: 45, badges: 14, city: 'Mumbai'    },
  { rank: 2,  name: 'Priya_Investor',  xp: 3950, streak: 38, badges: 12, city: 'Bangalore' },
  { rank: 3,  name: 'StockNerd_Delhi', xp: 3200, streak: 29, badges: 11, city: 'Delhi'     },
  { rank: 4,  name: 'NiftyTrader',     xp: 2750, streak: 21, badges: 9,  city: 'Chennai'   },
  { rank: 5,  name: 'MarketWatch42',   xp: 2100, streak: 15, badges: 8,  city: 'Hyderabad' },
  { rank: 6,  name: 'IntraDay_Pro',    xp: 1800, streak: 12, badges: 7,  city: 'Pune'      },
  { rank: 7,  name: 'LongTerm_Karan',  xp: 1450, streak: 10, badges: 6,  city: 'Ahmedabad' },
  { rank: 8,  name: 'DividendKing',    xp: 1200, streak: 8,  badges: 6,  city: 'Kolkata'   },
  { rank: 9,  name: 'ValueBuyer99',    xp: 980,  streak: 6,  badges: 5,  city: 'Jaipur'    },
  { rank: 10, name: 'You',             xp: 0,    streak: 0,  badges: 0,  city: '—',   isYou: true },
];

// ── Local persistence helpers ────────────────────────────────────────────
function loadProfile(sessionId) {
  try {
    const key = `sv_gamify_${sessionId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveProfile(sessionId, profile) {
  try {
    localStorage.setItem(`sv_gamify_${sessionId}`, JSON.stringify(profile));
  } catch {}
}

function buildInitialProfile() {
  const today = new Date().toDateString();
  return {
    xp: 0,
    badges: [],
    streak: 0,
    lastVisit: today,
    searchCount: 0,
    watchCount: 0,
    alertCount: 0,
    scannerUsed: false,
    portfolioUsed: false,
    watchlistsCreated: 0,
    uniqueStocksViewed: [],
    dailyLog: [today],
  };
}

function updateStreak(profile) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (profile.lastVisit === today) return profile;
  const newStreak = profile.lastVisit === yesterday ? profile.streak + 1 : 1;
  return { ...profile, streak: newStreak, lastVisit: today };
}

function awardBadges(profile) {
  const earned = [...profile.badges];
  let xp = profile.xp;
  const grant = (id) => {
    if (!earned.includes(id)) {
      earned.push(id);
      const def = BADGE_DEFS.find(b => b.id === id);
      if (def) xp += def.xp;
    }
  };
  if (profile.searchCount >= 1)  grant('first_search');
  if (profile.searchCount >= 10) grant('stock_explorer');
  if (profile.uniqueStocksViewed.length >= 25) grant('market_nerd');
  if (profile.watchCount >= 1)  grant('first_watch');
  if (profile.watchCount >= 10) grant('curated');
  if (profile.watchlistsCreated >= 3) grant('list_maker');
  if (profile.streak >= 3)  grant('streak_3');
  if (profile.streak >= 7)  grant('streak_7');
  if (profile.streak >= 30) grant('streak_30');
  if (profile.alertCount >= 1)  grant('first_alert');
  if (profile.scannerUsed)      grant('scanner_user');
  if (profile.portfolioUsed)    grant('portfolio_pro');
  if (xp >= 100)  grant('xp_100');
  if (xp >= 500)  grant('xp_500');
  if (xp >= 1000) grant('xp_1000');
  if (xp >= 5000) grant('xp_5000');
  return { ...profile, badges: earned, xp };
}

// ── Components ────────────────────────────────────────────────────────────
function XPBar({ xp, darkMode }) {
  const { current, next } = getLevel(xp);
  const pct = next ? Math.min(((xp - current.min) / (next.min - current.min)) * 100, 100) : 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-bold ${current.color}`}>Lv.{current.level} {current.label}</span>
        {next && <span className="text-xs text-gray-400">{xp}/{next.min} XP → Lv.{next.level} {next.label}</span>}
      </div>
      <div className={`w-full rounded-full h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div className={`h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const CATEGORY_LABELS = { explorer: '🗺️ Explorer', watchlist: '⭐ Watchlist', streak: '🔥 Streak', analysis: '🔬 Analysis', milestone: '🏆 Milestone' };

export default function GamificationPage() {
  const sessionId = useSessionId();
  const [darkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // profile | badges | leaderboard
  const [newBadge, setNewBadge] = useState(null);

  const bg   = darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    if (!sessionId) return;
    let p = loadProfile(sessionId) || buildInitialProfile();
    p = updateStreak(p);
    // Simulate some activity from searching/using the app
    p.searchCount = Math.max(p.searchCount, 3);
    p.xp = Math.max(p.xp, 35);
    const prev = [...p.badges];
    p = awardBadges(p);
    const gained = p.badges.filter(b => !prev.includes(b));
    if (gained.length > 0) setNewBadge(gained[0]);
    saveProfile(sessionId, p);
    setProfile(p);
  }, [sessionId]);

  const simulateAction = (action) => {
    if (!profile || !sessionId) return;
    let p = { ...profile };
    if (action === 'search') { p.searchCount++; p.xp += 5; }
    if (action === 'watchlist') { p.watchCount++; p.xp += 8; }
    if (action === 'alert') { p.alertCount++; p.xp += 10; }
    if (action === 'scanner') { p.scannerUsed = true; p.xp += 20; }
    if (action === 'portfolio') { p.portfolioUsed = true; p.xp += 30; }
    const prev = [...p.badges];
    p = awardBadges(p);
    const gained = p.badges.filter(b => !prev.includes(b));
    if (gained.length > 0) setNewBadge(gained[0]);
    saveProfile(sessionId, p);
    setProfile(p);
  };

  if (!profile) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { current: lvl } = getLevel(profile.xp);
  const earnedBadges = BADGE_DEFS.filter(b => profile.badges.includes(b.id));
  const lockedBadges = BADGE_DEFS.filter(b => !profile.badges.includes(b.id));
  const categories = [...new Set(BADGE_DEFS.map(b => b.category))];

  const leaderboard = LEADERBOARD.map((u, i) => 
    u.isYou ? { ...u, xp: profile.xp, streak: profile.streak, badges: profile.badges.length } : u
  ).sort((a, b) => b.xp - a.xp).map((u, i) => ({ ...u, rank: i + 1 }));

  return (
    <div className={`min-h-screen ${bg} px-4 py-6`}>
      <div className="max-w-3xl mx-auto">

        {/* Badge popup */}
        {newBadge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setNewBadge(null)}>
            <div className={`rounded-2xl p-8 text-center shadow-2xl border max-w-xs mx-4 ${card} animate-bounce`}>
              <div className="text-6xl mb-3">{BADGE_DEFS.find(b => b.id === newBadge)?.icon}</div>
              <div className="text-xl font-bold mb-1">Badge Unlocked! 🎉</div>
              <div className="text-lg font-semibold text-blue-600 mb-2">{BADGE_DEFS.find(b => b.id === newBadge)?.name}</div>
              <div className={`text-sm ${muted}`}>{BADGE_DEFS.find(b => b.id === newBadge)?.desc}</div>
              <div className="mt-3 text-green-500 font-bold">+{BADGE_DEFS.find(b => b.id === newBadge)?.xp} XP</div>
              <div className={`text-xs mt-3 ${muted}`}>Tap to close</div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm mb-2">
            <Link to="/" className="text-blue-500 hover:underline">Home</Link>
            <span className={muted}>/</span>
            <span className={muted}>Achievements</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            🏆 Achievements & Leaderboard
          </h1>
        </div>

        {/* Profile card */}
        <div className={`rounded-2xl border p-5 mb-6 ${card}`}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {profile.xp > 0 ? lvl.level : '?'}
              </div>
              <div>
                <div className="font-bold text-lg">My Profile</div>
                <div className={`text-sm ${muted}`}>Session: {sessionId?.slice(0, 8)}…</div>
                <div className={`text-sm font-semibold ${lvl.color}`}>{lvl.label}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-extrabold text-blue-600">{profile.xp}</div>
                <div className={`text-xs ${muted}`}>Total XP</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-orange-500">{profile.streak}🔥</div>
                <div className={`text-xs ${muted}`}>Day Streak</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-purple-500">{profile.badges.length}</div>
                <div className={`text-xs ${muted}`}>Badges</div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <XPBar xp={profile.xp} darkMode={darkMode} />
          </div>
        </div>

        {/* Quick actions to earn XP */}
        <div className={`rounded-2xl border p-4 mb-6 ${card}`}>
          <div className="font-semibold mb-3 text-sm">⚡ Earn XP — Use StockVision features</div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '+5 XP Search a stock',      action: 'search',    link: '/markets'    },
              { label: '+8 XP Add to Watchlist',    action: 'watchlist', link: '/watchlist'  },
              { label: '+10 XP Set a Price Alert',  action: 'alert',     link: '/alerts'     },
              { label: '+20 XP Use Scanner',        action: 'scanner',   link: '/scanner'    },
              { label: '+30 XP Run Portfolio Analysis', action: 'portfolio', link: '/portfolio' },
            ].map(a => (
              <Link key={a.action} to={a.link} onClick={() => simulateAction(a.action)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  darkMode ? 'border-gray-700 hover:bg-blue-900/30 hover:border-blue-600 text-gray-300' : 'border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700'
                }`}>
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-xl mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          {[['profile', '📊 Stats'], ['badges', '🏅 Badges'], ['leaderboard', '🏆 Leaderboard']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === id ? 'bg-blue-600 text-white shadow' : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>{label}</button>
          ))}
        </div>

        {/* ── Stats Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Stocks Searched', value: profile.searchCount, icon: '🔍' },
                { label: 'Watchlist Adds',  value: profile.watchCount,  icon: '⭐' },
                { label: 'Alerts Set',       value: profile.alertCount,  icon: '🔔' },
                { label: 'Day Streak',       value: `${profile.streak}🔥`, icon: '📅' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-4 text-center ${card}`}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-2xl font-extrabold">{s.value}</div>
                  <div className={`text-xs ${muted}`}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className={`rounded-2xl border p-5 ${card}`}>
              <div className="font-semibold mb-3">🗺️ Journey Progress</div>
              {[
                { label: 'Stocks Searched',   current: profile.searchCount, target: 25, color: 'bg-blue-500'   },
                { label: 'Day Streak',         current: profile.streak,      target: 30, color: 'bg-orange-500' },
                { label: 'Badges Earned',      current: profile.badges.length, target: BADGE_DEFS.length, color: 'bg-purple-500' },
                { label: 'XP Earned',          current: profile.xp,          target: 1000, color: 'bg-green-500'  },
              ].map(item => (
                <div key={item.label} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.label}</span>
                    <span className={muted}>{item.current} / {item.target}</span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div className={`h-2 rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${Math.min((item.current / item.target) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Badges Tab ────────────────────────────────────────────────── */}
        {activeTab === 'badges' && (
          <div className="space-y-5">
            {earnedBadges.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3 text-green-500">✅ Earned ({earnedBadges.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {earnedBadges.map(b => (
                    <div key={b.id} className={`rounded-xl border p-4 text-center transition-all hover:scale-105 ${darkMode ? 'border-green-700/50 bg-green-900/20' : 'border-green-200 bg-green-50'}`}>
                      <div className="text-3xl mb-2">{b.icon}</div>
                      <div className="font-semibold text-sm">{b.name}</div>
                      <div className={`text-xs mt-1 ${muted}`}>{b.desc}</div>
                      {b.xp > 0 && <div className="text-xs mt-1 text-green-500 font-bold">+{b.xp} XP</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {categories.map(cat => {
              const locked = lockedBadges.filter(b => b.category === cat);
              if (!locked.length) return null;
              return (
                <div key={cat}>
                  <h3 className={`font-semibold text-sm mb-3 ${muted}`}>🔒 {CATEGORY_LABELS[cat]} ({locked.length} to unlock)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {locked.map(b => (
                      <div key={b.id} className={`rounded-xl border p-4 text-center opacity-50 ${card}`}>
                        <div className="text-3xl mb-2 grayscale">{b.icon}</div>
                        <div className="font-semibold text-sm">{b.name}</div>
                        <div className={`text-xs mt-1 ${muted}`}>{b.desc}</div>
                        {b.xp > 0 && <div className="text-xs mt-1 text-gray-400">+{b.xp} XP</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Leaderboard Tab ───────────────────────────────────────────── */}
        {activeTab === 'leaderboard' && (
          <div>
            <div className={`text-xs p-3 rounded-xl mb-4 ${darkMode ? 'bg-amber-900/20 border border-amber-800 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
              📢 Leaderboard shows anonymous users. Your entry shows your real stats. Full multiplayer leaderboard coming with backend sync!
            </div>
            <div className={`rounded-2xl border overflow-hidden ${card}`}>
              <div className={`px-4 py-3 border-b font-semibold text-sm ${darkMode ? 'border-gray-800 bg-gray-800/50' : 'border-gray-100 bg-gray-50'} grid grid-cols-12 gap-2`}>
                <span className="col-span-1 text-center">#</span>
                <span className="col-span-4">User</span>
                <span className="col-span-2 text-right">XP</span>
                <span className="col-span-2 text-right">Streak</span>
                <span className="col-span-2 text-right">Badges</span>
                <span className="col-span-1" />
              </div>
              {leaderboard.map((u) => (
                <div key={u.rank}
                  className={`px-4 py-3 border-b last:border-0 grid grid-cols-12 gap-2 items-center text-sm ${
                    u.isYou
                      ? darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
                      : darkMode ? 'border-gray-800 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'
                  } transition-colors`}>
                  <span className={`col-span-1 text-center font-bold ${u.rank <= 3 ? ['text-amber-400', 'text-gray-300', 'text-amber-600'][u.rank - 1] : muted}`}>
                    {u.rank <= 3 ? ['🥇','🥈','🥉'][u.rank-1] : u.rank}
                  </span>
                  <span className="col-span-4 font-medium flex items-center gap-1">
                    {u.name} {u.isYou && <span className="text-xs text-blue-500 font-bold">(You)</span>}
                  </span>
                  <span className="col-span-2 text-right font-semibold text-blue-600">{u.xp.toLocaleString()}</span>
                  <span className="col-span-2 text-right text-orange-500">{u.streak}🔥</span>
                  <span className="col-span-2 text-right text-purple-500">{u.badges}🏅</span>
                  <span className={`col-span-1 text-xs text-right ${muted}`}>{u.city}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
