import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStock, getFinancials, getOwnership, getPeers } from '../api';
import PriceHeader from '../components/PriceHeader';
import StockActions from '../components/StockActions';
import RatiosCard from '../components/RatiosCard';
import FinancialsTable from '../components/FinancialsTable';
import ShareholdingChart from '../components/ShareholdingChart';
import PeerComparison from '../components/PeerComparison';
import SectorPerformance from '../components/SectorPerformance';
import BetaIndicator from '../components/BetaIndicator';
// Month 5 components
import TradingViewChart from '../components/TradingViewChart';
import CandlestickChart from '../components/CandlestickChart';
import TechnicalIndicators from '../components/TechnicalIndicators';
import NewsFeed from '../components/NewsFeed';
import ExportButton, { exportStockPDF } from '../components/ExportButton';
// Month 6 components
import EventsCalendar from '../components/EventsCalendar';

export default function StockPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();

  const [stock, setStock] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [ownership, setOwnership] = useState(null);
  const [peers, setPeers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [financialsLoading, setFinancialsLoading] = useState(true);
  const [ownershipLoading, setOwnershipLoading] = useState(true);
  const [peersLoading, setPeersLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const fetchStock = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getStock(symbol);
        setStock(res.data.stock);
      } catch (err) {
        setError(err.response?.status === 404
          ? `Stock "${symbol}" not found. Use format: RELIANCE.NS`
          : 'Failed to load stock. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, [symbol]);

  useEffect(() => {
    const fetchFin = async () => {
      setFinancialsLoading(true);
      try {
        const res = await getFinancials(symbol);
        setFinancials(res.data.financials);
      } catch (err) {
        console.error('Financials fetch failed:', err.message);
      } finally {
        setFinancialsLoading(false);
      }
    };
    fetchFin();
  }, [symbol]);

  useEffect(() => {
    const fetchOwn = async () => {
      setOwnershipLoading(true);
      try {
        const res = await getOwnership(symbol);
        setOwnership(res.data.ownership);
      } catch (err) {
        console.error('Ownership fetch failed:', err.message);
      } finally {
        setOwnershipLoading(false);
      }
    };
    fetchOwn();
  }, [symbol]);

  useEffect(() => {
    const fetchPeerData = async () => {
      setPeersLoading(true);
      try {
        const res = await getPeers(symbol);
        setPeers(res.data);
      } catch (err) {
        console.error('Peers fetch failed:', err.message);
      } finally {
        setPeersLoading(false);
      }
    };
    fetchPeerData();
  }, [symbol]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
          <div className="h-52 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">❌</div>
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!stock) return null;

  const cleanSymbol = stock.symbol.replace('.NS', '').replace('.BO', '');

  const SECTIONS = [
    { id: 'overview',   label: 'Overview',   icon: '📊' },
    { id: 'charts',     label: 'Charts',     icon: '📉' },
    { id: 'technicals', label: 'Technicals', icon: '📐' },
    { id: 'ownership',  label: 'Ownership',  icon: '🏢' },
    { id: 'news',       label: 'News',       icon: '📰' },
    { id: 'events',     label: 'Events',     icon: '📅' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <button onClick={() => navigate('/')} className="hover:text-blue-600">Home</button>
        <span>›</span>
        <span className="text-gray-900 dark:text-white font-medium">{cleanSymbol}</span>
      </nav>

      {/* Price Header */}
      <div className="mb-4">
        <PriceHeader symbol={symbol} initialStock={stock} />
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <StockActions stock={stock} />
        <ExportButton
          darkMode={document.documentElement.classList.contains('dark')}
          label="Export Report"
          onExportPDF={() => exportStockPDF(stock, financials?.ratios, financials?.ratios)}
          onExportCSV={() => {
            if (!stock) return;
            const rows = [
              ['Symbol', stock.symbol], ['Name', stock.name || ''],
              ['Current Price', stock.currentPrice], ['Day Change %', stock.dayChangePercent],
              ['52W High', stock.fiftyTwoWeekHigh], ['52W Low', stock.fiftyTwoWeekLow],
              ['Volume', stock.volume], ['Market Cap', financials?.ratios?.marketCap || ''],
            ];
            const csv = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = `${stock.symbol}_data.csv`; a.click();
          }}
        />
      </div>

      {/* Section Navigation */}
      <div className="flex overflow-x-auto gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {SECTIONS.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
              activeSection === sec.id
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span>{sec.icon}</span>
            <span className="hidden sm:inline">{sec.label}</span>
          </button>
        ))}
      </div>

      {/* OVERVIEW SECTION */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <FinancialsTable financials={financials} loading={financialsLoading} />
            </div>
            <div className="lg:col-span-1">
              <RatiosCard ratios={financials?.keyStats} loading={financialsLoading} symbol={symbol} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'P/E Ratio', value: financials?.keyStats?.peRatio?.toFixed(1) || '—', sub: 'Price/Earnings', color: 'blue' },
              { label: 'Beta', value: stock?.beta?.toFixed(2) || '—', sub: 'vs NIFTY 50', color: 'purple' },
              { label: 'Market Cap', value: financials?.keyStats?.marketCap ? `₹${(financials.keyStats.marketCap / 1e12).toFixed(1)}T` : '—', sub: 'Total valuation', color: 'green' },
              { label: 'Div Yield', value: financials?.keyStats?.dividendYield ? `${financials.keyStats.dividendYield.toFixed(2)}%` : '—', sub: 'Annual dividend', color: 'amber' },
            ].map(item => (
              <div key={item.label} className={`p-4 rounded-xl border ${
                item.color === 'blue'   ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' :
                item.color === 'purple' ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' :
                item.color === 'green'  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
                'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
              }`}>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                <p className={`text-xl font-bold mt-1 ${
                  item.color === 'blue'   ? 'text-blue-700 dark:text-blue-400' :
                  item.color === 'purple' ? 'text-purple-700 dark:text-purple-400' :
                  item.color === 'green'  ? 'text-green-700 dark:text-green-400' :
                  'text-amber-700 dark:text-amber-400'
                }`}>{item.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SectorPerformance sector={ownership?.companyInfo?.sector} loading={ownershipLoading} />
            <BetaIndicator beta={stock?.beta} loading={loading} />
          </div>
        </div>
      )}

      {/* CHARTS SECTION */}
      {activeSection === 'charts' && (
        <div className="space-y-6">
          <CandlestickChart symbol={symbol} darkMode={document.documentElement.classList.contains('dark')} />
          <TradingViewChart symbol={symbol} stockName={stock?.name} />
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
            💡 <strong>Pro tip:</strong> Use the candlestick chart above for SMA overlays and OHLC tooltips. TradingView below has advanced drawing tools.
          </div>
        </div>
      )}

      {/* TECHNICALS SECTION */}
      {activeSection === 'technicals' && (
        <div className="space-y-6">
          <TechnicalIndicators symbol={symbol} currentPrice={stock?.liveData?.price} />
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-sm text-yellow-700 dark:text-yellow-300">
            ⚠️ <strong>Disclaimer:</strong> Technical indicators computed from Yahoo Finance historical data. Educational use only — not SEBI-registered advice.
          </div>
        </div>
      )}

      {/* OWNERSHIP SECTION */}
      {activeSection === 'ownership' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ShareholdingChart ownership={ownership} loading={ownershipLoading} />
            <PeerComparison peers={peers?.peers} sector={peers?.sector} loading={peersLoading} currentSymbol={symbol} />
          </div>
        </div>
      )}

      {/* NEWS SECTION */}
      {activeSection === 'news' && (
        <div className="space-y-6">
          <NewsFeed symbol={symbol} />
        </div>
      )}

      {/* EVENTS SECTION */}
      {activeSection === 'events' && (
        <div className="space-y-6">
          <EventsCalendar symbol={symbol} />
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          📌 Data from Yahoo Finance · Updated regularly · Not SEBI registered · Not financial advice
        </p>
      </div>
    </div>
  );
}
