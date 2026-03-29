// HelpPage.jsx — Month 26: Help & Documentation
import { useState } from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    id: 'getting-started',
    icon: '🚀',
    title: 'Getting Started',
    items: [
      {
        q: 'How do I search for a stock?',
        a: 'Use the search bar at the top of any page. Type the company name or NSE symbol (e.g., "RELIANCE" or "TCS"). Results appear instantly with live prices. All NSE stocks use the .NS suffix internally.',
      },
      {
        q: 'Do I need to create an account?',
        a: 'No! You can use all analysis tools without signing in. An account (free) gives you saved watchlists, price alerts, portfolio saves, and a personal dashboard that persists across devices.',
      },
      {
        q: 'Why do I see "Last Traded Price" instead of live price?',
        a: 'NSE market hours are 9:15 AM – 3:30 PM IST, Monday to Friday. Outside these hours, you see the last traded price from the previous session. This is completely normal and expected.',
      },
      {
        q: 'How do I load stocks on the Markets page?',
        a: 'Click the "🚀 Load Stocks" button on the Markets/Home page. This seeds 50+ NSE blue-chip stocks into the local database and fetches live prices. Only needed once — stocks persist after that.',
      },
    ],
  },
  {
    id: 'scanner',
    icon: '🔬',
    title: 'Historical Scanner',
    items: [
      {
        q: 'What is the Historical Scanner?',
        a: 'The Scanner answers: "If I bought this stock on any date in the past, what % of the time would I have achieved my target return in my time window?" It runs a sliding window across years of data to give you real historical probabilities.',
      },
      {
        q: 'What do the probability labels mean?',
        a: '"Historically Impossible" = <5%, "Very Rare" = 5–20%, "Rare" = 20–35%, "Occasional" = 35–55%, "Common" = 55–75%, "Very Common" = >75%. These are based on actual historical outcomes, not estimates.',
      },
      {
        q: 'Why does success rate drop for longer windows?',
        a: 'Counter-intuitively, very long time windows sometimes have lower success rates because they also include many more drawdown periods. The scanner counts all entry points including those right before major crashes.',
      },
      {
        q: 'What is "Gap Risk"?',
        a: 'Gap risk is the chance a stock opens significantly different from its previous close (e.g., after earnings, news events). The scanner separates overnight vs intraday gaps so you understand the true entry risk.',
      },
    ],
  },
  {
    id: 'portfolio',
    icon: '💼',
    title: 'Portfolio Optimizer',
    items: [
      {
        q: 'How does the Portfolio Optimizer work?',
        a: 'Enter up to 10 NSE stocks and a total capital amount. The engine runs historical sliding windows across the entire portfolio, finds optimal allocation weights, and shows you regime-matched success rates.',
      },
      {
        q: 'What is a "Regime Match Score"?',
        a: 'This tells you how closely current market conditions resemble the historical conditions when this portfolio performed well. A score of 75%+ means today\'s market looks like the portfolio\'s best historical environments.',
      },
      {
        q: 'Why does correlation matter?',
        a: 'Five highly correlated stocks (e.g., 5 IT stocks) behave like 1–2 real positions. The Diversification Engine calculates "true diversification" — your ₹10L spread across 5 IT stocks gives less protection than ₹10L in 3 different sectors.',
      },
      {
        q: 'Can I save my portfolio?',
        a: 'Yes — sign in and click "Save Portfolio" after running analysis. Saved portfolios appear in your User Dashboard and can be shared via a unique link.',
      },
    ],
  },
  {
    id: 'execution',
    icon: '⚡',
    title: 'Execution Reality',
    items: [
      {
        q: 'What costs does the Execution Reality tool account for?',
        a: 'It includes: Brokerage (flat ₹20 or %, configurable), STT (Securities Transaction Tax), Exchange transaction charges, GST on brokerage, SEBI charges, and stamp duty — both entry and exit. All at current Indian regulatory rates.',
      },
      {
        q: 'What is the difference between LTCG and STCG?',
        a: 'Short-Term Capital Gains (STCG) applies when you hold equity for less than 1 year — taxed at 20% (post-2024 budget). Long-Term Capital Gains (LTCG) applies for 1+ year holdings — 12.5% above ₹1.25L exemption.',
      },
      {
        q: 'What is slippage?',
        a: 'Slippage is the difference between the price you expected to buy/sell at versus the actual executed price. For large orders or illiquid stocks, you may move the price against yourself. The friction model estimates realistic slippage per trade size.',
      },
    ],
  },
  {
    id: 'regime',
    icon: '🌊',
    title: 'Regime Analysis',
    items: [
      {
        q: 'What is a Market Regime?',
        a: 'A regime is the broad market environment: Bull (sustained uptrend), Bear (sustained downtrend), or Sideways (range-bound). Different stocks and strategies perform very differently in each regime.',
      },
      {
        q: 'How is the current regime detected?',
        a: 'The classifier uses Nifty 50\'s price trend, 200-day moving average relationship, VIX level, and breadth indicators (advance/decline ratio). It updates daily.',
      },
      {
        q: 'What is an "Event Attribution"?',
        a: 'When a stock moved unusually, the event attribution layer tries to correlate that move with known events: RBI policy dates, Union Budget, election results, earnings seasons, and global market shocks.',
      },
    ],
  },
  {
    id: 'psychology',
    icon: '🧠',
    title: 'Psychological Tools',
    items: [
      {
        q: 'What is the Survivorship Simulator?',
        a: 'It takes you through a historical trade day-by-day, showing what the actual news headlines were and tracking your "quit probability" — would you have held through that 35% drawdown in 2020, or sold in panic?',
      },
      {
        q: 'What is the FOMO Destroyer?',
        a: 'It shows how entry timing sensitivity affects outcomes. If entering 1 week earlier or later completely changes your result, that\'s timing luck — not skill. The tool gives you a Timing Luck Score.',
      },
    ],
  },
  {
    id: 'data',
    icon: '📡',
    title: 'Data & Accuracy',
    items: [
      {
        q: 'Where does the data come from?',
        a: 'Live prices and historical data come from Yahoo Finance (free, no API key needed). NSE stocks use the .NS suffix. Fundamental data (P&L, Balance Sheet) comes from Yahoo Finance\'s financial APIs.',
      },
      {
        q: 'How accurate is the historical data?',
        a: 'Yahoo Finance data is generally reliable for NSE blue-chips but may have gaps or adjusted prices (for splits/bonuses). The Data Quality module shows a confidence score for each analysis and flags potential data issues.',
      },
      {
        q: 'What is Survivorship Bias?',
        a: 'Historical data only includes stocks that still exist today. Companies that went bankrupt or were delisted are often missing. The platform discloses this prominently in the Data Quality module — most Indian platforms hide this.',
      },
      {
        q: 'What is Data Snooping?',
        a: 'When you test many strategies on the same historical data, some will appear to work by chance. StockVision counts how many parameter combinations have been tested and warns when results may be statistically unreliable.',
      },
    ],
  },
  {
    id: 'account',
    icon: '👤',
    title: 'Account & Settings',
    items: [
      {
        q: 'How do I sign in?',
        a: 'Click "Sign In" in the sidebar or top bar. You can sign in with Google (one click) or create an account with email + password. Both are free.',
      },
      {
        q: 'What does a free account include?',
        a: 'Everything! Unlimited watchlists, price alerts, portfolio saves, historical analysis, and all 25+ tools. No premium tier hides features.',
      },
      {
        q: 'How do I set up price alerts?',
        a: 'Go to the Alerts page, click "New Alert", search for a stock, set your target price and direction (above/below). Alerts are checked every minute during market hours. Connect Telegram for instant mobile notifications.',
      },
      {
        q: 'Can I connect Zerodha or Telegram?',
        a: 'Yes — visit the Integrations page (/integrations). Connect Zerodha Kite to sync your holdings, set up Telegram for mobile alerts, or export your watchlist to Google Sheets.',
      },
    ],
  },
];

const QUICK_LINKS = [
  { icon: '🏠', label: 'Markets Home', to: '/markets' },
  { icon: '🔬', label: 'Historical Scanner', to: '/scanner' },
  { icon: '💼', label: 'Portfolio Optimizer', to: '/portfolio' },
  { icon: '⚡', label: 'Execution Reality', to: '/execution' },
  { icon: '🌊', label: 'Regime Analysis', to: '/regime' },
  { icon: '🔌', label: 'Integrations', to: '/integrations' },
];

export default function HelpPage() {
  const [openSection, setOpenSection] = useState('getting-started');
  const [openItem, setOpenItem] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = SECTIONS.map(s => ({
    ...s,
    items: search
      ? s.items.filter(i => i.q.toLowerCase().includes(search.toLowerCase()) || i.a.toLowerCase().includes(search.toLowerCase()))
      : s.items,
  })).filter(s => !search || s.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Help & Documentation</h1>
        <p className="text-gray-500 dark:text-gray-400">Everything you need to get the most out of StockVision</p>
        <div className="mt-6 max-w-md mx-auto">
          <input
            type="text"
            placeholder="Search help articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Quick Links */}
      {!search && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-10">
          {QUICK_LINKS.map(l => (
            <Link key={l.to} to={l.to} className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-400 transition-colors text-center">
              <span className="text-2xl">{l.icon}</span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{l.label}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar nav — hidden on mobile */}
        {!search && (
          <div className="hidden md:block w-52 flex-shrink-0">
            <div className="sticky top-24 space-y-1">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setOpenSection(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                    openSection === s.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {filtered.map(section => {
            const isOpen = search || openSection === section.id;
            return (
              <div key={section.id} className={`mb-8 ${!search && openSection !== section.id ? 'hidden md:hidden' : ''}`}
                style={{ display: search || openSection === section.id ? 'block' : 'none' }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{section.icon}</span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{section.title}</h2>
                </div>
                <div className="space-y-3">
                  {section.items.map((item, i) => {
                    const key = `${section.id}-${i}`;
                    const expanded = openItem === key;
                    return (
                      <div key={key} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setOpenItem(expanded ? null : key)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left"
                        >
                          <span className="font-semibold text-gray-900 dark:text-white text-sm pr-4">{item.q}</span>
                          <span className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-transform ${
                            expanded ? 'border-blue-500 rotate-45' : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16M4 12h16" />
                            </svg>
                          </span>
                        </button>
                        {expanded && (
                          <div className="px-5 pb-5">
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🔍</div>
              <p>No results for "{search}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Still stuck? */}
      <div className="mt-16 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-8 text-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Still have questions?</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">The best way to learn is to try it. All tools are free and no sign-up required.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/scanner" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Try the Scanner
          </Link>
          <Link to="/markets" className="px-6 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-blue-400 transition-colors">
            Browse Markets
          </Link>
        </div>
      </div>
    </div>
  );
}
