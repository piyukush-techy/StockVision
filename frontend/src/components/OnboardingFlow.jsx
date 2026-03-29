// OnboardingFlow.jsx — Month 26: New user onboarding
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to StockVision 🎉',
    subtitle: "India's most honest stock analysis platform",
    content: (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
          You're about to access 25+ analysis tools built specifically for NSE & BSE. Let's take a 60-second tour.
        </p>
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[['🔬', 'Historical Probability'], ['💼', 'Portfolio Engine'], ['⚡', 'Real Returns']].map(([icon, label]) => (
            <div key={label} className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">{label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'search',
    title: 'Search Any NSE Stock',
    subtitle: 'Live prices from Yahoo Finance',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center text-blue-600 font-bold">1</div>
            <span className="font-semibold text-gray-900 dark:text-white">Use the top search bar</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 pl-11">Type "RELIANCE", "TCS", "HDFC", or any NSE company name.</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center text-blue-600 font-bold">2</div>
            <span className="font-semibold text-gray-900 dark:text-white">See live OHLC + fundamentals</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 pl-11">Each stock page shows live price, P&L statements, balance sheet, and peer comparison.</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-3 border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-orange-700 dark:text-orange-400">
            <span className="font-bold">⏰ Market hours:</span> Live prices update every 5 seconds during 9:15 AM – 3:30 PM IST. Outside hours = last traded price.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'scanner',
    title: 'The Historical Scanner',
    subtitle: 'Your most powerful tool',
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          Instead of hoping a stock will hit your target, the Scanner tells you: <span className="font-bold text-gray-900 dark:text-white">"In history, this actually happened X% of the time."</span>
        </p>
        <div className="space-y-2">
          {[
            { label: 'Pick a stock', desc: 'e.g. RELIANCE.NS' },
            { label: 'Set your target', desc: 'e.g. 20% gain' },
            { label: 'Set your window', desc: 'e.g. within 90 days' },
            { label: 'Get the truth', desc: 'Real historical success rate' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl px-4 py-3">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">{s.label}</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm"> — {s.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'costs',
    title: 'Real Returns, Not Paper Returns',
    subtitle: 'What you actually take home',
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400 text-sm">Most platforms show gross returns. StockVision shows what you <em>actually</em> keep after all costs:</p>
        <div className="space-y-2">
          {[
            ['Brokerage', '₹20 flat or 0.01%', 'gray'],
            ['STT', '0.1% on sell (equity delivery)', 'red'],
            ['GST', '18% on brokerage + charges', 'orange'],
            ['LTCG Tax', '12.5% above ₹1.25L', 'yellow'],
            ['STCG Tax', '20% if held < 1 year', 'yellow'],
            ['Slippage', 'Varies by stock liquidity', 'blue'],
          ].map(([label, val, color]) => (
            <div key={label} className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
              <span className={`text-xs font-semibold text-${color}-600 dark:text-${color}-400`}>{val}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400">Use the Execution Reality tool for exact calculations on any trade.</p>
      </div>
    ),
  },
  {
    id: 'done',
    title: "You're Ready! 🚀",
    subtitle: 'Start with any of these',
    content: (
      <div className="space-y-3">
        {[
          { icon: '🏠', label: 'Browse Markets', desc: 'See all NSE stocks with live prices', to: '/markets' },
          { icon: '🔬', label: 'Run the Scanner', desc: 'Find real probabilities for any stock', to: '/scanner' },
          { icon: '💼', label: 'Portfolio Optimizer', desc: 'Analyse a multi-stock portfolio', to: '/portfolio' },
          { icon: '❓', label: 'Read Help Docs', desc: 'Detailed guides for every feature', to: '/help' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <span className="text-2xl flex-shrink-0">{item.icon}</span>
            <div>
              <div className="font-semibold text-gray-900 dark:text-white text-sm">{item.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</div>
            </div>
            <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    ),
  },
];

// Hook to manage onboarding state
export function useOnboarding() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const done = localStorage.getItem('sv_onboarding_done');
    if (!done) setShow(true);
  }, []);
  const complete = () => {
    localStorage.setItem('sv_onboarding_done', '1');
    setShow(false);
  };
  return { show, complete };
}

export default function OnboardingFlow({ onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Step {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
            >
              Skip tour
            </button>
          </div>

          {/* Title */}
          <div className="mb-6">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">{current.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{current.subtitle}</p>
          </div>

          {/* Content */}
          <div className="mb-8">{current.content}</div>

          {/* Nav */}
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
              >
                Let's Go! 🚀
              </button>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
              >
                Next →
              </button>
            )}
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? 'bg-blue-600 w-4' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
