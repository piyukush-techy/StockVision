// App.jsx — Month 32: 52W Breakout Probability
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import MarketRibbon from './components/MarketRibbon';
import ProfileSetupModal from './components/ProfileSetupModal';
import OnboardingFlow, { useOnboarding } from './components/OnboardingFlow';
import PWAInstallBanner from './components/PWAInstallBanner';

import LandingPage                  from './pages/LandingPage';
import HomePage                     from './pages/HomePage';
import StockPage                    from './pages/StockPage';
import WatchlistPage                from './pages/WatchlistPage';
import AlertsPage                   from './pages/AlertsPage';
import SentimentPage                from './pages/SentimentPage';
import ScannerPage                  from './pages/ScannerPage';
import RegimeAnalysisPage           from './pages/RegimeAnalysisPage';
import CapitalRealityPage           from './pages/CapitalRealityPage';
import ComparePage                  from './pages/ComparePage';
import ComparativeIntelligencePage  from './pages/ComparativeIntelligencePage';
import DataQualityDashboard         from './pages/DataQualityDashboard';
import ExecutionRealityPage         from './pages/ExecutionRealityPage';
import ComparativeAnalysisPage      from './pages/ComparativeAnalysisPage';
import DeepComparativePage          from './pages/DeepComparativePage';
import PortfolioPage                from './pages/PortfolioPage';
import PortfolioSharePage           from './pages/PortfolioSharePage';
import SurvivorPage                 from './pages/SurvivorPage';
import DiversificationPage          from './pages/DiversificationPage';
import PredictionsPage              from './pages/PredictionsPage';
import CapitalWizardPage            from './pages/CapitalWizardPage';
import PerformanceDashboard         from './pages/PerformanceDashboard';
import InstitutionalPage            from './pages/InstitutionalPage';
import IntegrationsPage             from './pages/IntegrationsPage';
import LoginPage                    from './pages/LoginPage';
import UserDashboard                from './pages/UserDashboard';
import HelpPage                     from './pages/HelpPage';
import OptionsPage                  from './pages/OptionsPage';
import ScreenerPage                 from './pages/ScreenerPage';
import PatternPage                  from './pages/PatternPage';
import PortfolioTrackerPage         from './pages/PortfolioTrackerPage';
import IPOPage                      from './pages/IPOPage';
// Month 27
import NewsCalendarPage             from './pages/NewsCalendarPage';
import AdvancedAlertsPage           from './pages/AdvancedAlertsPage';
// Month 28
import SIPCalculatorPage            from './pages/SIPCalculatorPage';
import GamificationPage             from './pages/GamificationPage';
import GlobalSearch                 from './components/GlobalSearch';
// Month 30
import CrisisStressPage             from './pages/CrisisStressPage';
import SectorHeatmapPage            from './pages/SectorHeatmapPage';
// Month 31
import MFOverlapPage                from './pages/MFOverlapPage';
import DeliveryVolumePage           from './pages/DeliveryVolumePage';
import AssetComparatorPage          from './pages/AssetComparatorPage';
// ✅ FIX: PricingPage was missing — file existed but had no import/route
import PricingPage                  from './pages/PricingPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-96"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
}

const SIDEBAR_W = 272;

function AppInner() {
  const { needsProfile, loading } = useAuth();
  const [darkMode,    setDarkMode]    = useState(false);
  // ✅ FIX: Sidebar now opens by default on desktop (≥768px), closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [globalSearch, setGlobalSearch] = useState(false);
  const { show: showOnboarding, complete: completeOnboarding } = useOnboarding();

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') { setDarkMode(true); document.documentElement.classList.add('dark'); }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setGlobalSearch(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('darkMode', next);
    document.documentElement.classList.toggle('dark', next);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading StockVision...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen overflow-hidden ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {needsProfile && <ProfileSetupModal />}
      {showOnboarding && <OnboardingFlow onClose={completeOnboarding} />}
      <PWAInstallBanner />
      {globalSearch && <GlobalSearch darkMode={darkMode} onClose={() => setGlobalSearch(false)} />}

      {/* ✅ FIX: Mobile backdrop — tap outside sidebar to close it */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-screen">
        <div style={{ width: SIDEBAR_W, minWidth: SIDEBAR_W, marginLeft: sidebarOpen ? 0 : -SIDEBAR_W }}
          className="flex-shrink-0 transition-[margin] duration-300 ease-in-out sticky top-0 h-screen z-50">
          <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} embedded />
        </div>

        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out" style={{ minWidth: 0 }}>
          <MarketRibbon />

          <header className={`sticky top-0 z-40 border-b shadow-sm flex-shrink-0 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="px-4 sm:px-6">
              <div className="flex items-center gap-3 h-16">
                <button onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu"
                  className={`flex-shrink-0 p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {sidebarOpen
                    ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
                </button>
                <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
                  <span className={`text-lg font-bold hidden sm:block ${darkMode ? 'text-white' : 'text-gray-900'}`}>StockVision</span>
                </Link>
                <div className="flex-1" />
                {/* Global Search button — always visible */}
                <button onClick={() => setGlobalSearch(true)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${darkMode ? 'border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <span className="hidden sm:inline">Search</span>
                  <kbd className={`hidden sm:inline text-xs px-1.5 py-0.5 rounded border font-mono ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-100'}`}>⌘K</kbd>
                </button>
                <Link to="/news" className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}>
                  📰 News
                </Link>
                <button onClick={toggleDarkMode} aria-label="Toggle theme"
                  className={`flex-shrink-0 p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {darkMode ? '☀️' : '🌙'}
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <Routes>
              <Route path="/"           element={<LandingPage />} />
              <Route path="/markets"    element={<HomePage />} />
              <Route path="/stock/:symbol" element={<StockPage />} />
              <Route path="/watchlist"  element={<WatchlistPage />} />
              <Route path="/alerts"     element={<AlertsPage />} />
              <Route path="/advanced-alerts" element={<AdvancedAlertsPage />} />
              <Route path="/sentiment"  element={<SentimentPage />} />
              <Route path="/scanner"    element={<ScannerPage />} />
              <Route path="/regime"     element={<RegimeAnalysisPage />} />
              <Route path="/capital"    element={<CapitalRealityPage />} />
              <Route path="/compare"    element={<ComparePage />} />
              <Route path="/intelligence" element={<ComparativeIntelligencePage />} />
              <Route path="/data-quality" element={<DataQualityDashboard />} />
              <Route path="/execution"  element={<ExecutionRealityPage />} />
              <Route path="/comparative/:symbol" element={<ComparativeAnalysisPage />} />
              <Route path="/deep-comparative/:symbol" element={<DeepComparativePage />} />
              <Route path="/portfolio"  element={<PortfolioPage />} />
              <Route path="/portfolio/share/:shareId" element={<PortfolioSharePage />} />
              <Route path="/psychology"      element={<SurvivorPage />} />
              <Route path="/diversification" element={<DiversificationPage />} />
              <Route path="/predictions"     element={<PredictionsPage />} />
              <Route path="/capital-wizard"  element={<CapitalWizardPage />} />
              <Route path="/performance"     element={<PerformanceDashboard />} />
              <Route path="/institutional"   element={<InstitutionalPage />} />
              <Route path="/integrations"    element={<IntegrationsPage />} />
              <Route path="/help"             element={<HelpPage />} />
              <Route path="/options"          element={<OptionsPage />} />
              <Route path="/screener"         element={<ScreenerPage />} />
              <Route path="/patterns"         element={<PatternPage />} />
              <Route path="/portfolio-tracker" element={<PortfolioTrackerPage />} />
              <Route path="/ipo"              element={<IPOPage />} />
              <Route path="/news"             element={<NewsCalendarPage />} />
              <Route path="/sip"              element={<SIPCalculatorPage />} />
              <Route path="/achievements"     element={<GamificationPage />} />
              {/* Month 30 */}
              <Route path="/crisis-stress"    element={<CrisisStressPage />} />
              <Route path="/sector-heatmap"   element={<SectorHeatmapPage />} />
              {/* Month 31 */}
              <Route path="/mf-overlap"       element={<MFOverlapPage />} />
              <Route path="/delivery-volume"  element={<DeliveryVolumePage />} />
              <Route path="/asset-compare"    element={<AssetComparatorPage />} />
              {/* ✅ FIX: PricingPage route was completely missing */}
              <Route path="/pricing"          element={<PricingPage />} />
              <Route path="/login"    element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          <footer className={`border-t mt-16 py-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="max-w-7xl mx-auto px-4 text-center">
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>StockVision — Indian Stock Analysis Platform</p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                Data from Yahoo Finance · Not SEBI registered · Not financial advice ·{' '}
                <Link to="/help" className="hover:text-blue-500">Help</Link>
                {' · '}
                <Link to="/pricing" className="hover:text-blue-500">Pricing</Link>
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-96 text-center px-4">
      <div className="text-6xl mb-4">📉</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Page Not Found</h2>
      <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Go Home</Link>
    </div>
  );
}