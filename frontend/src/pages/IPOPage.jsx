// IPOPage.jsx — Month 26: IPO Tracker
import { useState } from 'react';

const UPCOMING_IPOS = [
  { name: 'Hexaware Technologies', date: '12-14 Feb 2025', size: '8,750', price: '674-708', lot: 21, gmp: 85, subscription: null, status: 'upcoming', sector: 'Technology' },
  { name: 'Capitol Health Network', date: '10-12 Feb 2025', size: '180', price: '95-100', lot: 150, gmp: 12, subscription: null, status: 'upcoming', sector: 'Healthcare' },
  { name: 'Divine Hira Jewellers', date: '8-10 Feb 2025', size: '35', price: '50-54', lot: 2000, gmp: 6, subscription: null, status: 'upcoming', sector: 'Consumer' },
];

const OPEN_IPOS = [
  { name: 'Ajax Engineering', date: '10-12 Feb 2025', size: '1,269', price: '599-629', lot: 23, gmp: 142, subscription: 5.8, status: 'open', sector: 'Industrials' },
  { name: 'Venture Global LNG', date: '9-13 Feb 2025', size: '2,450', price: '80-84', lot: 178, gmp: 18, subscription: 12.4, status: 'open', sector: 'Energy' },
];

const RECENT_LISTINGS = [
  { name: 'Stallion India', issuePrice: 85, listingPrice: 142, currentPrice: 138, gain: 62.4, date: '5 Feb 2025', sector: 'Industrials' },
  { name: 'Denta Water & Infra', issuePrice: 294, listingPrice: 310, currentPrice: 298, gain: 1.4, date: '4 Feb 2025', sector: 'Utilities' },
  { name: 'Capital Infra Trust', issuePrice: 99, listingPrice: 96, currentPrice: 91, gain: -8.1, date: '31 Jan 2025', sector: 'Infrastructure' },
  { name: 'Kabra Jewels', issuePrice: 107, listingPrice: 195, currentPrice: 182, gain: 70.1, date: '30 Jan 2025', sector: 'Consumer' },
  { name: 'Laxmi Dental', issuePrice: 428, listingPrice: 542, currentPrice: 558, gain: 30.4, date: '27 Jan 2025', sector: 'Healthcare' },
  { name: 'Sat Kartar Shopping', issuePrice: 108, listingPrice: 99, currentPrice: 94, gain: -13.0, date: '24 Jan 2025', sector: 'Retail' },
];

function GMPBadge({ gmp, issueHigh }) {
  if (!gmp) return null;
  const pct = issueHigh ? ((gmp / issueHigh) * 100).toFixed(1) : null;
  return (
    <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${gmp > 0 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'}`}>
      GMP: {gmp > 0 ? '+' : ''}₹{gmp} {pct ? `(${pct}%)` : ''}
    </div>
  );
}

export default function IPOPage() {
  const [tab, setTab] = useState('open');

  const issuePriceHigh = (priceStr) => parseFloat(priceStr?.split('-')[1] || 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">IPO Tracker</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Upcoming, open, and recently listed IPOs on NSE/BSE · GMP tracker</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[['open', '🟢 Open IPOs', OPEN_IPOS.length], ['upcoming', '📅 Upcoming', UPCOMING_IPOS.length], ['listings', '📈 Recent Listings', RECENT_LISTINGS.length]].map(([v, l, count]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${tab === v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'}`}
          >
            {l}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === v ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>{count}</span>
          </button>
        ))}
      </div>

      {tab === 'open' && (
        <div className="space-y-4">
          {OPEN_IPOS.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500">No IPOs currently open for subscription</p>
            </div>
          )}
          {OPEN_IPOS.map((ipo, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">{ipo.name}</h3>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 animate-pulse">🟢 OPEN</span>
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{ipo.sector}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Subscription: {ipo.date}</p>
                </div>
                <GMPBadge gmp={ipo.gmp} issueHigh={issuePriceHigh(ipo.price)} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Issue Price</div>
                  <div className="font-bold text-gray-900 dark:text-white">₹{ipo.price}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Issue Size</div>
                  <div className="font-bold text-gray-900 dark:text-white">₹{ipo.size} Cr</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Lot Size</div>
                  <div className="font-bold text-gray-900 dark:text-white">{ipo.lot} shares</div>
                </div>
                <div className={`rounded-xl p-3 ${ipo.subscription >= 10 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-blue-50 dark:bg-blue-950/30'}`}>
                  <div className="text-xs text-gray-500 mb-1">Subscription</div>
                  <div className={`font-bold ${ipo.subscription >= 10 ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'}`}>{ipo.subscription}x</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(100, (ipo.subscription / 20) * 100)}%` }} />
                </div>
                <span className="text-sm font-bold text-green-600">{ipo.subscription}x subscribed</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'upcoming' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {UPCOMING_IPOS.map((ipo, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">{ipo.name}</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{ipo.sector}</span>
                </div>
                <GMPBadge gmp={ipo.gmp} issueHigh={issuePriceHigh(ipo.price)} />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Open Date</span><span className="font-semibold text-gray-900 dark:text-white">{ipo.date}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Price Band</span><span className="font-semibold text-gray-900 dark:text-white">₹{ipo.price}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Issue Size</span><span className="font-semibold text-gray-900 dark:text-white">₹{ipo.size} Cr</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Lot Size</span><span className="font-semibold text-gray-900 dark:text-white">{ipo.lot} shares</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Min Investment</span><span className="font-semibold text-gray-900 dark:text-white">₹{(ipo.lot * issuePriceHigh(ipo.price)).toLocaleString('en-IN')}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'listings' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Company</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Issue ₹</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Listing ₹</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Current ₹</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Return from Issue</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Listed</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_LISTINGS.map((l, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900 dark:text-white">{l.name}</div>
                      <div className="text-xs text-gray-500">{l.sector}</div>
                    </td>
                    <td className="px-4 py-4 text-right text-gray-700 dark:text-gray-300">₹{l.issuePrice}</td>
                    <td className={`px-4 py-4 text-right font-semibold ${l.listingPrice >= l.issuePrice ? 'text-green-600' : 'text-red-600'}`}>₹{l.listingPrice}</td>
                    <td className="px-4 py-4 text-right font-bold text-gray-900 dark:text-white">₹{l.currentPrice}</td>
                    <td className={`px-4 py-4 text-right font-black text-lg ${l.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {l.gain >= 0 ? '+' : ''}{l.gain}%
                    </td>
                    <td className="px-4 py-4 text-right text-gray-500 text-xs">{l.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6 text-center">⚠️ GMP data is indicative and from grey market sources. Not financial advice. Always read the DRHP before applying.</p>
    </div>
  );
}
