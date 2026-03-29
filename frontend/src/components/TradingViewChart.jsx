/**
 * TradingViewChart.jsx - TradingView Embedded Chart Widget
 * Month 5 - Charts & News
 * Uses TradingView's FREE embeddable widget (no API key needed)
 */

import { useState, useEffect, useRef } from 'react';

// Map NSE symbol to TradingView format
function toTradingViewSymbol(symbol) {
  const clean = symbol.replace('.NS', '').replace('.BO', '');
  // TradingView uses NSE:SYMBOL format for Indian stocks
  return `NSE:${clean}`;
}

const TIMEFRAMES = [
  { label: '1D',  value: '1',   range: '1D'   },
  { label: '1W',  value: 'W',   range: '5D'   },
  { label: '1M',  value: 'M',   range: '1M'   },
  { label: '3M',  value: 'M',   range: '3M'   },
  { label: '1Y',  value: 'M',   range: '12M'  },
  { label: '5Y',  value: 'M',   range: '60M'  },
];

export default function TradingViewChart({ symbol, stockName }) {
  const [activeTimeframe, setActiveTimeframe] = useState('1M');
  const [isLoading, setIsLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const containerRef = useRef(null);
  const widgetRef = useRef(null);

  const tvSymbol = toTradingViewSymbol(symbol || 'RELIANCE.NS');

  // Detect dark mode
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const obs = new MutationObserver(checkDark);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Load TradingView widget
  useEffect(() => {
    if (!containerRef.current) return;
    setIsLoading(true);

    // Clear previous widget
    containerRef.current.innerHTML = '';

    const selectedTF = TIMEFRAMES.find(tf => tf.label === activeTimeframe) || TIMEFRAMES[2];

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        widgetRef.current = new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: selectedTF.value,
          range: selectedTF.range,
          timezone: 'Asia/Kolkata',
          theme: isDark ? 'dark' : 'light',
          style: '1', // Candlestick
          locale: 'en',
          toolbar_bg: isDark ? '#1f2937' : '#f8fafc',
          enable_publishing: false,
          allow_symbol_change: false,
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          save_image: false,
          container_id: 'tv_chart_container',
          studies: [
            'RSI@tv-basicstudies',
            'MACD@tv-basicstudies',
          ],
          height: 480,
          withdateranges: true,
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
        });
        setIsLoading(false);
      }
    };
    script.onerror = () => setIsLoading(false);

    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [tvSymbol, activeTimeframe, isDark]);

  const cleanName = stockName || symbol?.replace('.NS', '') || 'Stock';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <span className="text-lg">📉</span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Technical Chart
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{cleanName} · NSE</p>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.label}
              onClick={() => setActiveTimeframe(tf.label)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTimeframe === tf.label
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative" style={{ height: 480 }}>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 z-10">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart...</p>
          </div>
        )}
        <div
          id="tv_chart_container"
          ref={containerRef}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400">
        <span>🔗 Powered by TradingView · Free widget</span>
        <a
          href={`https://in.tradingview.com/chart/?symbol=${tvSymbol}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
        >
          Open full chart ↗
        </a>
      </div>
    </div>
  );
}
