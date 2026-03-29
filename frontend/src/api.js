import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
});

// ─── Stocks ───────────────────────────────────────────
export const searchStocks = (q) => api.get('/search', { params: { q } });

export const getStock = (symbol) => api.get(`/stocks/${symbol}`);

export const getTrending = () => api.get('/trending');

export const getIndices = () => api.get('/indices');

// ─── Search History ───────────────────────────────────
export const saveSearch = (sessionId, symbol, stockName) =>
  api.post('/search/history', { sessionId, symbol, stockName });

export const getSearchHistory = (sessionId) =>
  api.get(`/search/history/${sessionId}`);

// ─── Admin ────────────────────────────────────────────
export const seedStocks = () => api.post('/admin/seed');

export default api;

// ─── Watchlists ───────────────────────────────────────
export const getWatchlists = (sessionId) =>
  api.get(`/watchlists/${sessionId}`);

export const createWatchlist = (sessionId, name) =>
  api.post('/watchlists', { sessionId, name });

export const addToWatchlist = (watchlistId, symbol, name) =>
  api.post(`/watchlists/${watchlistId}/stocks`, { symbol, name });

export const removeFromWatchlist = (watchlistId, symbol) =>
  api.delete(`/watchlists/${watchlistId}/stocks/${symbol}`);

export const deleteWatchlist = (watchlistId) =>
  api.delete(`/watchlists/${watchlistId}`);

// ─── Alerts ───────────────────────────────────────────
export const getAlerts = (sessionId) =>
  api.get(`/alerts/${sessionId}`);

export const createAlert = (data) =>
  api.post('/alerts', data);

export const deleteAlert = (alertId) =>
  api.delete(`/alerts/${alertId}`);

export const checkTriggeredAlerts = (sessionId) =>
  api.get(`/alerts/${sessionId}/check`);

// ─── Financials ───────────────────────────────────────
export const getFinancials = (symbol) =>
  api.get(`/financials/${symbol}`);

export const getRatios = (symbol) =>
  api.get(`/financials/${symbol}/ratios`);

export const refreshFinancials = (symbol) =>
  api.delete(`/financials/${symbol}/cache`);

// Month 30: Altman Z-Score + Earnings Quality
export const getDeepScores = (symbol) =>
  api.get(`/financials/${symbol}/deep-scores`);

// ─── Ownership & Peers ────────────────────────────────
export const getOwnership = (symbol) =>
  api.get(`/ownership/${symbol}`);

export const getPeers = (symbol) =>
  api.get(`/ownership/${symbol}/peers`);

export const refreshOwnership = (symbol) =>
  api.delete(`/ownership/${symbol}/cache`);

// ─── News & Sentiment ─────────────────────────────────
export const getStockNews = (symbol, count = 10) =>
  api.get(`/news/${symbol}`, { params: { count } });

export const getMarketNews = () =>
  api.get('/news/market/india');

export const getBulkDeals = (symbol) =>
  api.get(`/news/${symbol}/bulk-deals`);

export const refreshNewsCache = (symbol) =>
  api.delete(`/news/${symbol}/cache`);

// ─── Technical Indicators ─────────────────────────────
export const getTechnicals = (symbol, period = '6mo') =>
  api.get(`/technicals/${symbol}`, { params: { period } });

export const refreshTechnicals = (symbol) =>
  api.delete(`/technicals/${symbol}/cache`);

// ─── Market Sentiment ─────────────────────────────────
export const getFearGreedIndex = () =>
  api.get('/sentiment/fear-greed');

export const getPutCallRatio = () =>
  api.get('/sentiment/put-call-ratio');

export const getFIIDIIFlow = () =>
  api.get('/sentiment/fii-dii');

export const getAdvanceDeclineRatio = () =>
  api.get('/sentiment/advance-decline');

export const refreshSentiment = () =>
  api.delete('/sentiment/cache');

// ─── Corporate Events ─────────────────────────────────
export const getStockEvents = (symbol) =>
  api.get(`/events/${symbol}`);

export const getMarketEvents = () =>
  api.get('/events/market/calendar');

export const refreshEvents = (symbol) =>
  api.delete(`/events/${symbol}/cache`);

export const refreshAllEvents = () =>
  api.delete('/events/cache/all');


// ─── Historical Scanner ────────────────────────────────────────────────────────
export const runScan = (symbol, targetPct, windowDays) =>
  api.post('/scanner/run', { symbol, targetPct, windowDays });

export const getScannerPresets = () =>
  api.get('/scanner/presets');

export const getStockHistory = (symbol) =>
  api.get(`/scanner/history/${symbol}`);

export const clearScannerCache = (symbol) =>
  api.delete(`/scanner/cache/${symbol}`);

// ─── 52-Week Breakout Probability (Month 32) ──────────────────────────────────
export const getBreakoutProbability = (symbol) =>
  api.get(`/scanner/breakout/${symbol}`);

// ─── Regime Analysis ──────────────────────────────────────────────────────────
export const classifyRegime = (symbol) =>
  api.post('/regime/classify', { symbol });

export const getRegimeHistory = (symbol) =>
  api.post('/regime/history', { symbol });

export const getSectorRegime = (sector) =>
  api.get(`/regime/sector/${sector}`);

export const clearRegimeCache = (symbol) =>
  api.delete(`/regime/cache/${symbol}`);

// ─── Subscription / Monetization ─────────────────────────────────────────────
// COMMENTED OUT FOR TESTING - UNCOMMENT TO ENABLE SUBSCRIPTIONS
/*
export const getSubscription = (sessionId) =>
  api.get(`/subscription/${sessionId}`);

export const createPaymentOrder = (sessionId, tier, billingCycle) =>
  api.post('/subscription/create-order', { sessionId, tier, billingCycle });

export const verifyPayment = (data) =>
  api.post('/subscription/verify-payment', data);

export const adminUpgrade = (sessionId, tier, adminKey) =>
  api.post('/subscription/upgrade', { sessionId, tier, adminKey });

export const getPricingInfo = () =>
  api.get('/subscription/pricing/info');

export const cancelSubscription = (sessionId) =>
  api.post('/subscription/cancel', { sessionId });
*/

// ─── Capital Reality ──────────────────────────────────────────────────────────
export const runCapitalAnalysis = (symbol, baseSuccessRate, targetPct, capitalAmount) =>
  api.post('/capital/analyze', { symbol, baseSuccessRate, targetPct, capitalAmount });

export const estimateSlippage = (symbol, capitalAmount) =>
  api.post('/capital/slippage', { symbol, capitalAmount });

export const getLiquidityHeatmap = (symbol) =>
  api.get(`/capital/heatmap/${symbol}`);

export const clearCapitalCache = (symbol) =>
  api.delete(`/capital/cache/${symbol}`);

// ─── Comparative Intelligence (Month 10) ─────────────────────────────────────
export const getVsNiftyFull   = (symbol) => api.get(`/comparative/vs-nifty-full/${symbol}`);
export const getVsSector      = (symbol) => api.get(`/comparative/vs-sector/${symbol}`);
export const getPeerStrength  = (symbol) => api.get(`/comparative/peer-strength/${symbol}`);
export const getRiskAdjusted  = (symbol) => api.get(`/comparative/risk-adjusted/${symbol}`);
export const clearCompareCache = ()      => api.delete('/comparative/cache');

// ─── Execution Reality (Month 12) ────────────────────────────────────────────
export const calculateCapitalGainsTax   = (data) => api.post('/execution-reality/capital-gains-tax', data);
export const calculateAfterTaxReturns   = (trades) => api.post('/execution-reality/after-tax-returns', { trades });
export const calculateDividendTax       = (data) => api.post('/execution-reality/dividend-tax', data);
export const calculateTurnoverCosts     = (data) => api.post('/execution-reality/turnover-costs', data);
export const calculateCompoundingReality= (data) => api.post('/execution-reality/compounding-reality', data);
export const calculateRealVsPaper       = (data) => api.post('/execution-reality/real-vs-paper', data);
export const runComprehensiveExecution  = (data) => api.post('/execution-reality/comprehensive', data);

// ─── Data Quality (Month 11) ─────────────────────────────────────────────────
export const getDataQuality         = (symbol) => api.get(`/data-quality/${symbol}`);
export const getDataCompleteness    = (symbol) => api.get(`/data-quality/${symbol}/completeness`);
export const getDataGaps            = (symbol) => api.get(`/data-quality/${symbol}/gaps`);
export const getCorporateActions    = (symbol) => api.get(`/data-quality/${symbol}/corporate-actions`);
export const getPriceAnomalies      = (symbol) => api.get(`/data-quality/${symbol}/anomalies`);
export const getVolumeSpikes        = (symbol) => api.get(`/data-quality/${symbol}/volume-spikes`);
export const getPlatformQuality     = ()       => api.get('/data-quality/platform');

// ─── Deep Comparative (Month 10 extended) ────────────────────────────────────
export const getDeepVsNifty         = (symbol, period = '1y') => api.get(`/deep-comparative/vs-nifty/${symbol}?period=${period}`);
export const getDeepVsSector        = (symbol, sector, period = '1y') => api.get(`/deep-comparative/vs-sector/${symbol}?sector=${sector}&period=${period}`);
export const getDeepMultiBenchmark  = (data) => api.post('/deep-comparative/multi-benchmark', data);
export const getDeepSummary         = (symbol) => api.get(`/deep-comparative/summary/${symbol}`);

// ─── Portfolio Optimizer (Phase 3 Month 13) ───────────────────────────────────
export const analyzePortfolio  = (data) => api.post('/portfolio/analyze', data);
export const quickCompare      = (data) => api.post('/portfolio/quick-compare', data);
export const getPortfolioPresets = ()   => api.get('/portfolio/presets');

// ─── Portfolio Historical Scanner (Phase 3 Month 14) ─────────────────────────
export const scanPortfolio        = (data) => api.post('/portfolio/scan', data);
export const getPortfolioTimeline = (data) => api.post('/portfolio/scan/timeline', data);

// Month 15 — Event Attribution
export const getEventAttribution  = (data) => api.post('/portfolio/event-attribution', data);

// Month 16 — Regime Matching
export const getRegimeMatch       = (data) => api.post('/portfolio/regime-match', data);

// Month 17 — Portfolio Scalability
export const getScalability       = (data) => api.post('/portfolio/scalability', data);

// ─── Month 18 — Portfolio Launch ──────────────────────────────────────────────
export const savePortfolio        = (data)  => api.post('/portfolio/save', data);
export const loadSharedPortfolio  = (shareId) => api.get(`/portfolio/share/${shareId}`);
export const getSavedPortfolios   = (sessionId) => api.get(`/portfolio/saved/${sessionId}`);
export const deletePortfolio      = (sessionId, shareId) => api.delete(`/portfolio/saved/${sessionId}/${shareId}`);
export const exportPortfolioCSV   = (data)  => api.post('/portfolio/export/csv', data, { responseType: 'blob' });
export const getPortfolioShareText = (data) => api.post('/portfolio/share-text', data);
export const comparePortfolios    = (data)  => api.post('/portfolio/compare', data);


// ─── Psychology / Psychological Tools (Phase 4 Month 19) ─────────────────────
export const runSurvivorSim      = (data) => api.post('/psychology/survivor', data);
export const runFomoDestroyer    = (data) => api.post('/psychology/fomo', data);
export const getPsychologyDates  = ()     => api.get('/psychology/popular-dates');

// ─── Diversification Tools (Phase 4 Month 20) ─────────────────────────────────
export const runCorrelationKiller    = (data) => api.post('/diversification/correlation-killer', data);
export const runOpportunityCostCalc  = (data) => api.post('/diversification/opportunity-cost', data);
export const getPopularPortfolios    = ()     => api.get('/diversification/popular-portfolios');

// ─── Predictions / Social (Phase 4 Month 21) ─────────────────────────────────
export const runRegimePrediction    = (data) => api.post('/predictions/regime', data);
export const getRegimePresets       = ()     => api.get('/predictions/regime/presets');
export const submitDelusion         = (data) => api.post('/predictions/delusion/submit', data);
export const getDelusionLeaderboard = ()     => api.get('/predictions/delusion/leaderboard');
export const getMyPredictions       = (sid)  => api.get(`/predictions/delusion/my/${sid}`);
export const getPredictionSectors   = ()     => api.get('/predictions/sectors');

// ─── Capital Wizard (Phase 4 Month 22) ───────────────────────────────────────
export const runCapitalWizard       = (data) => api.post('/capital-wizard/analyze', data);
export const getQuickKelly          = (params) => api.get('/capital-wizard/quick-kelly', { params });
export const getBarbellAnalysis     = (data) => api.post('/capital-wizard/barbell', data);
export const getCapitalWizardMeta   = ()     => api.get('/capital-wizard/meta');
export const getCapitalWizardPresets = ()    => api.get('/capital-wizard/presets');

// ─── Health & Performance (Phase 5 Month 23) ─────────────────────────────────
export const getHealthBasic      = ()    => api.get('/health');
export const getHealthDetailed   = ()    => api.get('/health/detailed');
export const getHealthMetrics    = ()    => api.get('/health/metrics');
export const getHealthErrors     = (mode) => api.get('/health/errors', { params: { mode: mode || 'grouped' } });
export const getHealthCache      = ()    => api.get('/health/cache');
export const getHealthRateLimits = ()    => api.get('/health/rate-limits');
export const flushCache          = (pat) => api.delete(`/health/cache/${pat}`);

// ─── Enterprise / API Access (Phase 5 Month 24) ───────────────────────────────
export const getEnterpriseTiers    = ()         => api.get('/enterprise/tiers');
export const getApiDocs            = ()         => api.get('/enterprise/docs');
export const getMyApiKeys          = (userId)   => api.get('/enterprise/keys', { params: { userId } });
export const generateApiKey        = (data)     => api.post('/enterprise/keys', data);
export const revokeApiKey          = (keyId, userId) => api.delete(`/enterprise/keys/${keyId}`, { data: { userId } });
export const getApiKeyUsage        = (keyId, userId) => api.get(`/enterprise/keys/${keyId}/usage`, { params: { userId } });
export const updateCustomFriction  = (keyId, userId, model) =>
  api.post(`/enterprise/keys/${keyId}/friction`, { userId, ...model });
export const getMyTeam             = (userId)   => api.get('/enterprise/team', { params: { userId } });
export const createTeam            = (data)     => api.post('/enterprise/team', data);
export const inviteTeamMember      = (data)     => api.post('/enterprise/team/invite', data);
export const validateApiKey        = (apiKey)   => api.get('/enterprise/keys/validate', { headers: { 'X-API-Key': apiKey } });
export const bulkExport            = (symbols, format = 'json', apiKey) =>
  api.get('/enterprise/bulk-export', {
    params: { symbols: symbols.join(','), format },
    headers: { 'X-API-Key': apiKey },
    ...(format === 'csv' ? { responseType: 'blob' } : {}),
  });

// ─── Integrations (Phase 5 Month 25) ─────────────────────────────────────────
export const getIntegrationStatus  = (sessionId) => api.get('/integrations/status', { params: { sessionId } });

// Zerodha Kite
export const connectZerodha        = (data)      => api.post('/integrations/zerodha/auth', data);
export const zerodhaCallback       = (data)      => api.post('/integrations/zerodha/callback', data);
export const getZerodhaHoldings    = (sessionId) => api.get('/integrations/zerodha/holdings', { params: { sessionId } });
export const getZerodhaPositions   = (sessionId) => api.get('/integrations/zerodha/positions', { params: { sessionId } });
export const syncKitePortfolio     = (sessionId) => api.get('/integrations/zerodha/portfolio-sync', { params: { sessionId } });

// Telegram
export const registerTelegram      = (data)      => api.post('/integrations/telegram/register', data);
export const testTelegram          = (sessionId) => api.post('/integrations/telegram/test', { sessionId });
export const getTelegramStatus     = (sessionId) => api.get('/integrations/telegram/status', { params: { sessionId } });
export const updateTelegramSettings = (data)     => api.post('/integrations/telegram/alert-settings', data);

// Google Sheets
export const saveSheetToken        = (data)      => api.post('/integrations/sheets/token', data);
export const exportToSheets        = (sessionId, format = 'json') =>
  api.get(`/integrations/sheets/export/${sessionId}`, {
    params: { format },
    ...(format === 'csv' ? { responseType: 'blob' } : {}),
  });

// ─── Month 31 — MF Overlap, Delivery Volume, Asset Comparator ────────────────
export const getMFHoldings         = (fundId)    => api.get(`/mf-overlap/${fundId}`);
export const getDeliveryVolume     = (symbol)    => api.get(`/delivery/${symbol}`);
export const getDeliveryHistory    = (symbol, days = 90) => api.get(`/delivery/${symbol}/history`, { params: { days } });
export const getAssetCAGR          = (startYear) => api.get('/asset-compare/cagr', { params: { startYear } });
