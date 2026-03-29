// GlobalSearch.jsx — Command Palette (upgraded from Month 28)
// Cmd+K / Ctrl+K to open. Arrow keys to navigate. Enter to select. Esc to close.
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Static feature pages index ────────────────────────────────────────────────
const FEATURE_PAGES = [
  // Markets & Stocks
  { label: 'Markets & Trending Stocks', path: '/markets',          icon: '📊', category: 'Markets',   keywords: ['market','trending','stocks','nifty','sensex']              },
  { label: 'Watchlist',                 path: '/watchlist',         icon: '⭐', category: 'Portfolio', keywords: ['watchlist','watch','portfolio','track','monitor']          },
  { label: 'Price Alerts',              path: '/alerts',            icon: '🔔', category: 'Alerts',    keywords: ['alert','notify','price','target','trigger']               },
  { label: 'Advanced Alerts',           path: '/advanced-alerts',   icon: '🔔', category: 'Alerts',    keywords: ['smart alert','rsi alert','technical alert']               },
  // Analysis
  { label: 'Historical Scanner',        path: '/scanner',           icon: '🔬', category: 'Analysis',  keywords: ['scanner','historical','backtest','probability']           },
  { label: 'Regime Analysis',           path: '/regime',            icon: '🌊', category: 'Analysis',  keywords: ['regime','bull','bear','market phase']                     },
  { label: 'Capital Reality',           path: '/capital',           icon: '💰', category: 'Analysis',  keywords: ['capital','scalability','slippage','liquidity']            },
  { label: 'Comparative Intelligence',  path: '/intelligence',      icon: '🧠', category: 'Analysis',  keywords: ['compare','peer','sector','benchmark']                     },
  { label: 'Execution Reality',         path: '/execution',         icon: '⚡', category: 'Analysis',  keywords: ['execution','brokerage','tax','friction','cost']           },
  { label: 'Data Quality Dashboard',    path: '/data-quality',      icon: '✅', category: 'Analysis',  keywords: ['data quality','bias','survivorship','snooping']           },
  { label: 'Deep Comparative',          path: '/deep-compare',      icon: '🔍', category: 'Analysis',  keywords: ['deep compare','detailed','advanced compare']              },
  { label: 'Crisis Stress Test',        path: '/crisis-stress',     icon: '🧨', category: 'Analysis',  keywords: ['crisis','stress','2008','covid','crash']                  },
  // Portfolio
  { label: 'Portfolio Optimizer',       path: '/portfolio',         icon: '💼', category: 'Portfolio', keywords: ['portfolio','optimize','allocation','multi stock']         },
  { label: 'Portfolio Tracker',         path: '/portfolio-tracker', icon: '🗂️', category: 'Portfolio', keywords: ['tracker','p&l','profit loss','holdings','xirr']           },
  { label: 'Diversification Tools',     path: '/diversification',   icon: '📊', category: 'Portfolio', keywords: ['diversify','correlation','diversification','sector']      },
  { label: 'MF Overlap Detector',       path: '/mf-overlap',        icon: '🔀', category: 'Portfolio', keywords: ['mutual fund','overlap','mf','duplication']                },
  { label: 'Asset Comparator',          path: '/asset-compare',     icon: '⚖️', category: 'Portfolio', keywords: ['asset compare','gold','fd','nifty','returns']             },
  // Tools
  { label: 'SIP Calculator & Goals',    path: '/sip',               icon: '🔁', category: 'Tools',     keywords: ['sip','systematic','goal','planner','calculator','invest'] },
  { label: 'Sentiment & FII/DII',       path: '/sentiment',         icon: '🧭', category: 'Markets',   keywords: ['sentiment','fii','dii','flow','fear','greed']             },
  { label: 'Capital Wizard',            path: '/capital-wizard',    icon: '🧮', category: 'Tools',     keywords: ['kelly','capital wizard','allocation','risk','position size'] },
  { label: 'Stock Screener',            path: '/screener',          icon: '🔍', category: 'Tools',     keywords: ['screener','filter','fundamental','screen']                },
  { label: 'Chart Patterns',            path: '/patterns',          icon: '📐', category: 'Tools',     keywords: ['patterns','candlestick','technical','chart']              },
  { label: 'Options Chain',             path: '/options',           icon: '📊', category: 'Tools',     keywords: ['options','chain','put','call','derivatives','oi']         },
  { label: 'IPO Tracker',               path: '/ipo',               icon: '🏦', category: 'Tools',     keywords: ['ipo','listing','new issue','primary market']              },
  { label: 'Delivery Volume Tracker',   path: '/delivery-volume',   icon: '📦', category: 'Tools',     keywords: ['delivery','volume','dii','cash','delivery %']             },
  { label: 'Sector Heatmap',            path: '/sector-heatmap',    icon: '🟩', category: 'Markets',   keywords: ['sector','heatmap','heat','map','performance']             },
  // Psychology & Advanced
  { label: 'Psychological Tools',       path: '/psychology',        icon: '🧠', category: 'Advanced',  keywords: ['psychology','fomo','survivor','bias','emotion']           },
  { label: 'Predictions & Social',      path: '/predictions',       icon: '🔭', category: 'Advanced',  keywords: ['predict','forecast','crowd','social','leaderboard']       },
  { label: 'Achievements & Leaderboard',path: '/achievements',      icon: '🏆', category: 'Advanced',  keywords: ['achievement','badge','streak','xp','leaderboard','gamify'] },
  // News & Info
  { label: 'News & Earnings Calendar',  path: '/news',              icon: '📰', category: 'News',      keywords: ['news','earnings','results','calendar','corporate']        },
  { label: 'Performance Dashboard',     path: '/performance',       icon: '⚡', category: 'Advanced',  keywords: ['performance','speed','analytics','monitor']               },
  { label: 'Help & Documentation',      path: '/help',              icon: '❓', category: 'Info',      keywords: ['help','docs','guide','faq','how to']                      },
  { label: 'Integrations Hub',          path: '/integrations',      icon: '🔌', category: 'Advanced',  keywords: ['integration','connect','zerodha','upstox','api']          },
];

// ── Quick Actions (no search needed) ─────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Go to Home',           icon: '🏠', path: '/',                shortcut: 'G H' },
  { label: 'My Portfolio',         icon: '💼', path: '/portfolio',        shortcut: 'G P' },
  { label: 'Watchlist',            icon: '⭐', path: '/watchlist',        shortcut: 'G W' },
  { label: 'Stock Screener',       icon: '🔍', path: '/screener',         shortcut: 'G S' },
  { label: 'Regime Analysis',      icon: '🌊', path: '/regime',           shortcut: null  },
  { label: 'News & Calendar',      icon: '📰', path: '/news',             shortcut: null  },
];

// ── NSE stock list ────────────────────────────────────────────────────────────
const NSE_STOCKS = [
  { symbol: 'RELIANCE.NS',  name: 'Reliance Industries',       sector: 'Energy'       },
  { symbol: 'TCS.NS',       name: 'Tata Consultancy Services', sector: 'Technology'   },
  { symbol: 'HDFCBANK.NS',  name: 'HDFC Bank',                 sector: 'Financials'   },
  { symbol: 'INFY.NS',      name: 'Infosys',                   sector: 'Technology'   },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank',                sector: 'Financials'   },
  { symbol: 'SBIN.NS',      name: 'State Bank of India',       sector: 'Financials'   },
  { symbol: 'HINDUNILVR.NS',name: 'Hindustan Unilever',        sector: 'FMCG'         },
  { symbol: 'ITC.NS',       name: 'ITC Limited',               sector: 'FMCG'         },
  { symbol: 'BHARTIARTL.NS',name: 'Bharti Airtel',             sector: 'Telecom'      },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank',       sector: 'Financials'   },
  { symbol: 'WIPRO.NS',     name: 'Wipro',                     sector: 'Technology'   },
  { symbol: 'LT.NS',        name: 'Larsen & Toubro',           sector: 'Infrastructure'},
  { symbol: 'AXISBANK.NS',  name: 'Axis Bank',                 sector: 'Financials'   },
  { symbol: 'MARUTI.NS',    name: 'Maruti Suzuki',             sector: 'Auto'         },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma',                sector: 'Pharma'       },
  { symbol: 'TATAMOTORS.NS',name: 'Tata Motors',               sector: 'Auto'         },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel',                sector: 'Metals'       },
  { symbol: 'BAJFINANCE.NS',name: 'Bajaj Finance',             sector: 'Financials'   },
  { symbol: 'ASIANPAINT.NS',name: 'Asian Paints',              sector: 'Consumer'     },
  { symbol: 'NESTLEIND.NS', name: 'Nestlé India',              sector: 'FMCG'         },
  { symbol: 'HCLTECH.NS',   name: 'HCL Technologies',          sector: 'Technology'   },
  { symbol: 'TECHM.NS',     name: 'Tech Mahindra',             sector: 'Technology'   },
  { symbol: 'ONGC.NS',      name: 'ONGC',                      sector: 'Energy'       },
  { symbol: 'NTPC.NS',      name: 'NTPC',                      sector: 'Energy'       },
  { symbol: 'DRREDDY.NS',   name: "Dr. Reddy's Laboratories",  sector: 'Pharma'       },
  { symbol: 'TITAN.NS',     name: 'Titan Company',             sector: 'Consumer'     },
  { symbol: 'ZOMATO.NS',    name: 'Zomato',                    sector: 'Consumer'     },
  { symbol: 'BAJAJFINSV.NS',name: 'Bajaj Finserv',             sector: 'Financials'   },
  { symbol: 'ADANIPORTS.NS',name: 'Adani Ports',               sector: 'Infrastructure'},
  { symbol: 'IRCTC.NS',     name: 'IRCTC',                     sector: 'Consumer'     },
];

// ── Local storage helpers for recent items ───────────────────────────────────
const RECENT_KEY = 'sv_recent_nav';
function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function addRecent(item) {
  try {
    const prev = getRecent().filter(r => r.id !== item.id);
    localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...prev].slice(0, 6)));
  } catch {}
}

// ── Category badge colors ────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  Markets:   'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300',
  Portfolio: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300',
  Analysis:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Tools:     'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-300',
  Advanced:  'bg-pink-100   text-pink-700   dark:bg-pink-900/30   dark:text-pink-300',
  News:      'bg-cyan-100   text-cyan-700   dark:bg-cyan-900/30   dark:text-cyan-300',
  Info:      'bg-gray-100   text-gray-700   dark:bg-gray-700      dark:text-gray-300',
  Alerts:    'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-300',
};

// ── Search logic ─────────────────────────────────────────────────────────────
function searchAll(query) {
  if (!query || query.length < 1) return { stocks: [], features: [] };
  const q = query.toLowerCase().trim();

  const stocks = NSE_STOCKS.filter(s =>
    s.symbol.toLowerCase().includes(q) ||
    s.name.toLowerCase().includes(q) ||
    s.sector?.toLowerCase().includes(q)
  ).slice(0, 5);

  const features = FEATURE_PAGES.filter(f =>
    f.label.toLowerCase().includes(q) ||
    f.category.toLowerCase().includes(q) ||
    f.keywords.some(k => k.includes(q))
  ).slice(0, 6);

  return { stocks, features };
}

// ── Kbd badge component ───────────────────────────────────────────────────────
function Kbd({ children, darkMode }) {
  return (
    <kbd className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-mono ${
      darkMode ? 'border-gray-600 bg-gray-700 text-gray-300' : 'border-gray-300 bg-gray-100 text-gray-600'
    }`}>
      {children}
    </kbd>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GlobalSearch({ darkMode, onClose }) {
  const navigate  = useNavigate();
  const inputRef  = useRef(null);
  const listRef   = useRef(null);

  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState({ stocks: [], features: [] });
  const [focused, setFocused] = useState(0);
  const [recent,  setRecent]  = useState([]);

  // Load recent on mount, focus input
  useEffect(() => {
    setRecent(getRecent());
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Update results on query change
  useEffect(() => {
    setResults(searchAll(query));
    setFocused(0);
  }, [query]);

  // ── Build flat item list for keyboard nav ──────────────────────────────────
  const flatItems = query
    ? [
        ...results.stocks.map(s  => ({ type: 'stock',   id: s.symbol,   ...s })),
        ...results.features.map(f => ({ type: 'feature', id: f.path,     ...f })),
      ]
    : [
        ...QUICK_ACTIONS.map(a    => ({ type: 'action',  id: a.path,     ...a })),
        ...recent.map(r           => ({ type: r.type,    ...r })),
      ];

  // ── Navigate to item ───────────────────────────────────────────────────────
  const goTo = useCallback((item) => {
    const path = item.type === 'stock' ? `/stock/${item.symbol}` : item.path;
    addRecent({
      id:     item.id || item.symbol || item.path,
      type:   item.type,
      label:  item.name || item.label,
      icon:   item.icon || '📈',
      path,
      symbol: item.symbol,
      sector: item.sector,
      category: item.category,
    });
    navigate(path);
    onClose?.();
  }, [navigate, onClose]);

  // ── Keyboard handler ───────────────────────────────────────────────────────
  const handleKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused(f => {
        const next = Math.min(f + 1, flatItems.length - 1);
        scrollToItem(next);
        return next;
      });
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused(f => {
        const next = Math.max(f - 1, 0);
        scrollToItem(next);
        return next;
      });
    }
    if (e.key === 'Enter' && flatItems[focused]) goTo(flatItems[focused]);
    if (e.key === 'Escape') onClose?.();
  };

  const scrollToItem = (idx) => {
    const el = listRef.current?.children?.[idx];
    el?.scrollIntoView({ block: 'nearest' });
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const bg      = darkMode ? 'bg-gray-900 border-gray-700'  : 'bg-white border-gray-200';
  const inp     = darkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400';
  const muted   = darkMode ? 'text-gray-400' : 'text-gray-500';
  const divider = darkMode ? 'border-gray-800' : 'border-gray-100';
  const secHdr  = darkMode ? 'bg-gray-800/60 text-gray-500' : 'bg-gray-50 text-gray-400';
  const hoverBg = darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50';
  const focusBg = darkMode ? 'bg-blue-900/30'    : 'bg-blue-50';

  // ── Render helpers ──────────────────────────────────────────────────────────
  const SectionHeader = ({ children }) => (
    <div className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider border-b ${secHdr} ${divider}`}>
      {children}
    </div>
  );

  const renderStock = (s, idx) => (
    <button
      key={s.symbol}
      onClick={() => goTo({ type: 'stock', id: s.symbol, ...s })}
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left border-b ${divider} ${
        focused === idx ? focusBg : hoverBg
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {s.symbol.replace('.NS','').slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.name}</div>
        <div className={`text-xs ${muted}`}>{s.symbol} · {s.sector}</div>
      </div>
      <span className={`text-xs ${muted}`}>stock →</span>
    </button>
  );

  const renderFeature = (f, idx) => (
    <button
      key={f.path}
      onClick={() => goTo({ type: 'feature', id: f.path, ...f })}
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left border-b ${divider} ${
        focused === idx ? focusBg : hoverBg
      }`}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
        {f.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{f.label}</div>
        <div className={`text-xs ${muted}`}>{f.path}</div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[f.category] || ''}`}>
        {f.category}
      </span>
    </button>
  );

  const renderAction = (a, idx) => (
    <button
      key={a.path + '-action'}
      onClick={() => goTo({ type: 'action', id: a.path, ...a })}
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left border-b ${divider} ${
        focused === idx ? focusBg : hoverBg
      }`}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
        {a.icon}
      </div>
      <div className={`flex-1 font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {a.label}
      </div>
      {a.shortcut && (
        <div className="flex gap-1">
          {a.shortcut.split(' ').map((k, i) => <Kbd key={i} darkMode={darkMode}>{k}</Kbd>)}
        </div>
      )}
    </button>
  );

  const renderRecentItem = (r, idx) => (
    <button
      key={r.id + '-recent'}
      onClick={() => goTo(r)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left border-b ${divider} ${
        focused === idx ? focusBg : hoverBg
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
        darkMode ? 'bg-gray-700' : 'bg-gray-100'
      }`}>
        {r.type === 'stock' ? (
          <span className="font-bold text-blue-500 text-xs">
            {r.symbol?.replace('.NS','').slice(0,2)}
          </span>
        ) : r.icon || '📄'}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {r.label}
        </div>
        <div className={`text-xs ${muted}`}>
          {r.type === 'stock' ? `${r.symbol} · ${r.sector || 'Stock'}` : r.path}
        </div>
      </div>
      <span className={`text-xs ${muted}`}>recent</span>
    </button>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  let itemIdx = 0; // running index for keyboard focus tracking

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[8vh] px-4"
      style={{ backgroundColor: darkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden ${bg}`}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Search input ──────────────────────────────────────────────────── */}
        <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${divider}`}>
          <svg className={`w-5 h-5 flex-shrink-0 ${muted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search stocks, features, pages… (e.g. RELIANCE, screener, regime)"
            className={`flex-1 outline-none text-base bg-transparent ${inp}`}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className={`text-lg leading-none ${muted} hover:text-gray-900 dark:hover:text-white transition-colors`}
            >
              ×
            </button>
          )}
          <Kbd darkMode={darkMode}>ESC</Kbd>
        </div>

        {/* ── Results list ──────────────────────────────────────────────────── */}
        <div className="max-h-[65vh] overflow-y-auto" ref={listRef}>

          {/* ── Empty state ───────────────────────────────────────────────── */}
          {!query && (
            <>
              {/* Quick actions */}
              <SectionHeader>Quick jump</SectionHeader>
              {QUICK_ACTIONS.map(a => {
                const el = renderAction(a, itemIdx);
                itemIdx++;
                return el;
              })}

              {/* Recent items */}
              {recent.length > 0 && (
                <>
                  <SectionHeader>Recently visited</SectionHeader>
                  {recent.map(r => {
                    const el = renderRecentItem(r, itemIdx);
                    itemIdx++;
                    return el;
                  })}
                </>
              )}

              {/* Hint when no recent */}
              {recent.length === 0 && (
                <div className={`px-4 py-5 text-center text-sm ${muted}`}>
                  Start typing to search stocks and features
                </div>
              )}
            </>
          )}

          {/* ── Search results ─────────────────────────────────────────────── */}
          {query && flatItems.length === 0 && (
            <div className={`px-4 py-10 text-center ${muted}`}>
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm">No results for &ldquo;{query}&rdquo;</div>
              <div className="text-xs mt-1 opacity-70">Try a stock ticker like RELIANCE or feature like "screener"</div>
            </div>
          )}

          {query && results.stocks.length > 0 && (
            <>
              <SectionHeader>Stocks</SectionHeader>
              {results.stocks.map(s => {
                const el = renderStock(s, itemIdx);
                itemIdx++;
                return el;
              })}
            </>
          )}

          {query && results.features.length > 0 && (
            <>
              <SectionHeader>Features & Tools</SectionHeader>
              {results.features.map(f => {
                const el = renderFeature(f, itemIdx);
                itemIdx++;
                return el;
              })}
            </>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className={`flex items-center justify-between px-4 py-2 border-t text-xs ${muted} ${
          darkMode ? 'border-gray-800 bg-gray-800/40' : 'border-gray-100 bg-gray-50'
        }`}>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Kbd darkMode={darkMode}>↑</Kbd><Kbd darkMode={darkMode}>↓</Kbd>
              <span className="ml-1">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd darkMode={darkMode}>↵</Kbd>
              <span className="ml-1">open</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd darkMode={darkMode}>⌘K</Kbd>
              <span className="ml-1">toggle</span>
            </span>
          </span>
          <span>
            {query
              ? `${flatItems.length} result${flatItems.length !== 1 ? 's' : ''}`
              : `${FEATURE_PAGES.length} features · ${NSE_STOCKS.length} stocks`
            }
          </span>
        </div>
      </div>
    </div>
  );
}
