// components/GMPIndicator.jsx — Grey Market Premium Visual Indicator
// Phase 6 Month 33 — IPO Tracker
// JAI SHREE GANESH 🙏

import React from 'react';

const GMP_CONFIG = {
  'Exceptional': { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', bar: 'bg-emerald-500', icon: '🚀' },
  'Strong':      { bg: 'bg-green-100 dark:bg-green-900/40',     text: 'text-green-700 dark:text-green-300',    bar: 'bg-green-500',   icon: '🟢' },
  'Positive':    { bg: 'bg-lime-100 dark:bg-lime-900/40',        text: 'text-lime-700 dark:text-lime-300',      bar: 'bg-lime-500',    icon: '🟡' },
  'Flat':        { bg: 'bg-gray-100 dark:bg-gray-800',           text: 'text-gray-600 dark:text-gray-400',     bar: 'bg-gray-400',    icon: '⚪' },
  'Weak':        { bg: 'bg-orange-100 dark:bg-orange-900/40',    text: 'text-orange-700 dark:text-orange-300', bar: 'bg-orange-500',  icon: '🟠' },
  'Negative':    { bg: 'bg-red-100 dark:bg-red-900/40',          text: 'text-red-700 dark:text-red-400',       bar: 'bg-red-500',     icon: '🔴' },
};

function getConfig(sentiment) {
  if (!sentiment) return GMP_CONFIG['Flat'];
  const key = Object.keys(GMP_CONFIG).find(k => sentiment.includes(k));
  return GMP_CONFIG[key] || GMP_CONFIG['Flat'];
}

// ─── Compact badge used in IPO cards / tables ─────────────────────────────────
export function GMPBadge({ gmpAnalysis, issuePrice }) {
  if (!gmpAnalysis) return <span className="text-gray-400 text-xs">N/A</span>;
  const cfg = getConfig(gmpAnalysis.sentiment);
  const sign = gmpAnalysis.gmp >= 0 ? '+' : '';
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span>{cfg.icon}</span>
      <span>GMP: {sign}₹{gmpAnalysis.gmp}</span>
      {gmpAnalysis.gmpPercent != null && (
        <span className="opacity-75">({sign}{gmpAnalysis.gmpPercent}%)</span>
      )}
    </div>
  );
}

// ─── Full indicator with meter bar, shown in detail view ─────────────────────
export default function GMPIndicator({ gmpAnalysis, issuePrice, expectedListingPrice }) {
  if (!gmpAnalysis) {
    return (
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">GMP data not available for this IPO.</p>
      </div>
    );
  }

  const cfg = getConfig(gmpAnalysis.sentiment);
  const { gmp, gmpPercent, sentiment, confidence, interpretation } = gmpAnalysis;
  const sign = gmp >= 0 ? '+' : '';

  // Bar fill: clamp between -50% and +100%
  const barFill = Math.max(0, Math.min(100, 50 + (gmpPercent || 0)));

  return (
    <div className={`rounded-xl border p-4 ${cfg.bg} border-opacity-30`} style={{ borderColor: 'currentColor' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cfg.icon}</span>
          <div>
            <p className={`text-sm font-bold ${cfg.text}`}>{sentiment}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{confidence}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-xl font-black ${cfg.text}`}>{sign}₹{gmp}</p>
          {gmpPercent != null && (
            <p className={`text-sm font-semibold ${cfg.text}`}>{sign}{gmpPercent}%</p>
          )}
        </div>
      </div>

      {/* Meter bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Negative</span>
          <span>Flat</span>
          <span>Exceptional</span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
            style={{ width: `${barFill}%` }}
          />
        </div>
        {/* Center marker */}
        <div className="relative h-0">
          <div className="absolute left-1/2 -top-3 w-0.5 h-3 bg-gray-400 dark:bg-gray-500" />
        </div>
      </div>

      {/* Expected listing price */}
      {expectedListingPrice && issuePrice && (
        <div className="flex items-center justify-between mt-3 p-2 bg-white/60 dark:bg-gray-900/40 rounded-lg">
          <span className="text-xs text-gray-500 dark:text-gray-400">Issue Price</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">₹{issuePrice.toLocaleString('en-IN')}</span>
          <span className="text-xs text-gray-400">→</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Expected Listing</span>
          <span className={`text-sm font-bold ${cfg.text}`}>₹{expectedListingPrice.toLocaleString('en-IN')}</span>
        </div>
      )}

      {/* Interpretation */}
      <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{interpretation}</p>

      <p className="mt-2 text-xs text-gray-400 dark:text-gray-600 italic">
        ⚠️ GMP is an unofficial grey market indicator. Not guaranteed or SEBI-regulated.
      </p>
    </div>
  );
}
