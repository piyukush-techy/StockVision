// Navbar.jsx — Month 32 UPDATED
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  {
    group: 'MONTH 32 — JUST LAUNCHED',
    color: 'emerald',
    links: [
      { to: '/scanner', icon: '🎯', label: '52W Breakout Probability', badge: '✨ New' },
    ],
  },
  {
    group: 'MONTH 31 — VIRAL TOOLS',
    color: 'purple',
    links: [
      { to: '/mf-overlap',      icon: '🔀', label: 'MF Overlap Detector',    badge: '✨ New' },
      { to: '/delivery-volume', icon: '📦', label: 'Delivery Volume Tracker', badge: '✨ New' },
      { to: '/asset-compare',   icon: '⚖️', label: 'Asset Comparator',        badge: '✨ New' },
    ],
  },
  {
    group: 'MONTH 30 — GOD-TIER',
    color: 'red',
    links: [
      { to: '/crisis-stress',     icon: '🧨', label: 'Crisis Stress Test',       badge: '🆕' },
      { to: '/sector-heatmap',    icon: '🟩', label: 'Sector Heatmap',           badge: '🆕' },
      { to: '/portfolio-tracker', icon: '🗂️', label: 'Portfolio Tracker (XIRR)', badge: '🆕' },
    ],
  },
  {
    group: 'Markets',
    color: 'gray',
    links: [
      { to: '/',          icon: '🏠', label: 'Home / Markets'      },
      { to: '/watchlist', icon: '⭐', label: 'Watchlist'           },
      { to: '/alerts',    icon: '🔔', label: 'Price Alerts'        },
      { to: '/sentiment', icon: '🧭', label: 'Sentiment & FII/DII' },
    ],
  },
  {
    group: 'Month 28 — Tools & Gamification',
    color: 'green',
    links: [
      { to: '/sip',          icon: '🔁', label: 'SIP Calculator & Goals', badge: '✨ New' },
      { to: '/achievements', icon: '🏆', label: 'Achievements & XP',      badge: '✨ New' },
    ],
  },
  {
    group: 'Month 27 — Mobile & Alerts',
    color: 'blue',
    links: [
      { to: '/news',            icon: '📰', label: 'News & Earnings Cal.', badge: '✨ New' },
      { to: '/advanced-alerts', icon: '🔔', label: 'Advanced Alerts',     badge: '✨ New' },
    ],
  },
  {
    group: 'Month 26 — Launch 2.0',
    color: 'gray',
    links: [
      { to: '/screener',  icon: '🔍', label: 'Stock Screener'  },
      { to: '/options',   icon: '📊', label: 'Options Chain'   },
      { to: '/patterns',  icon: '📐', label: 'Chart Patterns'  },
      { to: '/ipo',       icon: '🏦', label: 'IPO Tracker'     },
      { to: '/help',      icon: '❓', label: 'Help & Docs'     },
      // ✅ FIX: PricingPage existed but had no nav link anywhere
      { to: '/pricing',   icon: '💳', label: 'Pricing'         },
    ],
  },
  {
    group: 'Phase 5 — Polish & Scale',
    color: 'gray',
    links: [
      { to: '/performance',   icon: '⚡', label: 'Performance Dashboard'   },
      { to: '/institutional', icon: '🏛️', label: 'Enterprise & API Access' },
      { to: '/integrations',  icon: '🔌', label: 'Integrations Hub'        },
    ],
  },
  {
    group: 'Phase 4 — Marquee Features',
    color: 'gray',
    links: [
      { to: '/psychology',      icon: '🧠', label: 'Psychological Tools'   },
      { to: '/diversification', icon: '📊', label: 'Diversification Tools' },
      { to: '/predictions',     icon: '🔭', label: 'Predictions & Social'  },
      { to: '/capital-wizard',  icon: '🧮', label: 'Capital Wizard'        },
    ],
  },
  {
    group: 'Phase 3 — Portfolio Engine',
    color: 'gray',
    links: [
      { to: '/portfolio', icon: '💼', label: 'Portfolio Optimizer' },
    ],
  },
  {
    group: 'Phase 2 — Advanced Analysis',
    color: 'gray',
    links: [
      { to: '/scanner',      icon: '🔬', label: 'Historical Scanner'      },
      { to: '/regime',       icon: '🌊', label: 'Regime Analysis'          },
      { to: '/capital',      icon: '💰', label: 'Capital Reality'          },
      { to: '/compare',      icon: '⚖️', label: 'Compare Stocks'           },
      { to: '/intelligence', icon: '🧠', label: 'Comparative Intelligence' },
      { to: '/data-quality', icon: '✅', label: 'Data Quality'             },
      { to: '/execution',    icon: '⚡', label: 'Execution Reality'        },
    ],
  },
];

const ACCOUNT_LINKS = [
  { to: '/dashboard', icon: '👤', label: 'My Dashboard' },
  { to: '/watchlist', icon: '⭐', label: 'My Watchlist'  },
  { to: '/alerts',    icon: '🔔', label: 'My Alerts'     },
];

const GROUP_HEADER_STYLES = {
  emerald: 'text-emerald-400',
  purple:  'text-purple-500',
  red:     'text-red-500',
  green:   'text-green-500',
  blue:    'text-blue-500',
  gray:    'text-gray-400',
};

export default function Navbar({ darkMode, toggleDarkMode, sidebarOpen, setSidebarOpen }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Guest';
  const avatar = user?.photoURL;
  const initials = (displayName[0] || 'G').toUpperCase();

  function isActive(to) {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  }

  function SideLink({ to, icon, label, badge }) {
    const active = isActive(to);
    const isNew = badge === '✨ New';
    const isM30 = badge === '🆕';

    let cls = 'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm font-medium transition-all ';
    if (active) {
      cls += 'bg-blue-600 text-white shadow-sm';
    } else if (isNew) {
      cls += darkMode
        ? 'bg-green-900/25 text-green-300 hover:bg-green-900/40 border border-green-800/40'
        : 'bg-green-50 text-green-800 hover:bg-green-100 border border-green-200';
    } else if (isM30) {
      cls += darkMode
        ? 'bg-red-900/20 text-red-300 hover:bg-red-900/35 border border-red-800/40'
        : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200';
    } else {
      cls += darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100';
    }

    return (
      <Link to={to} className={cls}>
        <span className="w-5 text-center text-base flex-shrink-0">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {badge && !active && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
            isM30 ? 'bg-red-500 text-white' : isNew ? 'bg-green-500 text-white' : 'bg-indigo-100 text-indigo-600'
          }`}>
            {badge}
          </span>
        )}
        {active && <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />}
      </Link>
    );
  }

  return (
    <aside className={`h-screen w-full flex flex-col border-r overflow-hidden ${
      darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
    }`}>

      {/* Logo */}
      <div className={`flex-shrink-0 flex items-center justify-between px-4 h-16 border-b ${
        darkMode ? 'border-gray-800' : 'border-gray-100'
      }`}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>StockVision</span>
        </Link>
        {/* ✅ This close button collapses the sidebar — clicking ☰ in the header reopens it */}
        <button onClick={() => setSidebarOpen(false)}
          className={`p-2 rounded-lg ${darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Profile */}
      <div className={`flex-shrink-0 px-4 py-4 border-b ${
        darkMode ? 'border-gray-800 bg-gray-800/40' : 'border-gray-100 bg-slate-50'
      }`}>
        {user ? (
          <div className="flex items-center gap-3">
            {avatar
              ? <img src={avatar} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
              : <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-black bg-gradient-to-br from-blue-500 to-indigo-600">{initials}</div>
            }
            <div className="min-w-0">
              <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{displayName}</p>
              <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>👤</div>
            <div>
              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Not signed in</p>
              <Link to="/login" className="text-xs font-semibold text-blue-600 hover:underline">Sign in →</Link>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(section => (
          <div key={section.group} className="mb-1">
            <p className={`px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 ${GROUP_HEADER_STYLES[section.color]}`}>
              {(section.color === 'emerald' || section.color === 'purple' || section.color === 'red' || section.color === 'green' || section.color === 'blue') && (
                <span className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 animate-pulse bg-${section.color}-500`} />
              )}
              {section.group}
            </p>
            <div className="space-y-0.5">
              {section.links.map(link => <SideLink key={link.to + link.label} {...link} />)}
            </div>
          </div>
        ))}

        {user && (
          <div className="mb-1">
            <p className={`px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>Account</p>
            <div className="space-y-0.5">
              {ACCOUNT_LINKS.map(link => <SideLink key={link.to} {...link} />)}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className={`flex-shrink-0 p-3 border-t space-y-1 ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <button onClick={toggleDarkMode}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
          }`}>
          <span className="w-5 text-center">{darkMode ? '☀️' : '🌙'}</span>
          <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        {user ? (
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
            <span className="w-5 text-center">🚪</span>
            <span>Sign Out</span>
          </button>
        ) : (
          <Link to="/login" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all">
            <span className="w-5 text-center">🔐</span>
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </aside>
  );
}