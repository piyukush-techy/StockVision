// components/IPOCard.jsx — IPO Summary Card
// Phase 6 Month 33 — IPO Tracker
// JAI SHREE GANESH 🙏

import React from 'react';
import { GMPBadge } from './GMPIndicator';

const BADGE_COLORS = {
  green:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  red:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  gray:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_COLORS = {
  upcoming:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  open:       'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  allotment:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  listed:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_ICONS = { upcoming: '📅', open: '🟢', allotment: '🎯', listed: '📈' };

function fmtCr(n) {
  if (!n) return 'N/A';
  if (n >= 10000) return `₹${(n / 10000).toFixed(1)}L Cr`;
  return `₹${n.toLocaleString('en-IN')} Cr`;
}

function fmtDate(d) {
  if (!d) return 'TBA';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function IPOCard({ ipo, onClick }) {
  const {
    company, sector, status, badge, badgeColor, issuePrice, priceRange,
    listingGain, subscriptionTotal, issueSize, openDate, listingDate,
    gmpAnalysis, allotmentProbability, expectedListingPrice, cmp, currentGain,
  } = ipo;

  const isListed = status === 'listed';
  const isUpcoming = status === 'upcoming' || status === 'open';

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 group"
    >
      {/* Top row: company name + badges */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {company}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{sector}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {badge && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_COLORS[badgeColor] || BADGE_COLORS.gray}`}>
              {badge}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || STATUS_COLORS.listed}`}>
            {STATUS_ICONS[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Issue Price</p>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
            {issuePrice ? `₹${issuePrice.toLocaleString('en-IN')}` : (priceRange?.low ? `₹${priceRange.low}–${priceRange.high}` : 'TBA')}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Issue Size</p>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{fmtCr(issueSize)}</p>
        </div>
        {isListed ? (
          <>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Listing Gain</p>
              <p className={`text-sm font-bold ${listingGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {listingGain != null ? `${listingGain >= 0 ? '+' : ''}${listingGain}%` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Subscribed</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                {subscriptionTotal ? `${subscriptionTotal}×` : 'N/A'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Open Date</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{fmtDate(openDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Listing Date</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{fmtDate(listingDate)}</p>
            </div>
          </>
        )}
      </div>

      {/* GMP */}
      <div className="mb-3">
        <GMPBadge gmpAnalysis={gmpAnalysis} issuePrice={issuePrice} />
        {expectedListingPrice && issuePrice && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            Est. listing: ₹{expectedListingPrice.toLocaleString('en-IN')}
          </span>
        )}
      </div>

      {/* Allotment probability (for listed / recently closed) */}
      {isListed && allotmentProbability && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${allotmentProbability.prob}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Sub: {subscriptionTotal}×</span>
        </div>
      )}

      {/* Current performance for listed */}
      {isListed && cmp && issuePrice && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-400">CMP: ₹{cmp}</span>
          <span className={`text-xs font-semibold ${currentGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {currentGain != null ? `${currentGain >= 0 ? '+' : ''}${currentGain}% from issue` : ''}
          </span>
        </div>
      )}
    </button>
  );
}
