// IntegrationsPage.jsx — Phase 5 Month 25: Integrations Hub
// Zerodha Kite + Telegram Bot + Google Sheets + Chrome Extension + Mobile App
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getIntegrationStatus,
  connectZerodha, zerodhaCallback, getZerodhaHoldings,
  registerTelegram, testTelegram, updateTelegramSettings,
  exportToSheets,
  getMyApiKeys,
} from '../api';

const useSessionId = () => {
  const [id] = useState(() => localStorage.getItem('sessionId') || 'anonymous');
  return id;
};

/* ─── Status Dot ────────────────────────────────────────────────────────────── */
function StatusDot({ connected }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-600'}`} />
  );
}

/* ─── Integration Card Shell ─────────────────────────────────────────────────── */
function IntegCard({ icon, title, badge, status, badgeColor = 'bg-blue-900 text-blue-300', children, comingSoon }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <button
        onClick={() => !comingSoon && setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{title}</span>
            {badge && <span className={`text-xs font-bold px-2 py-0.5 rounded ${badgeColor}`}>{badge}</span>}
            {comingSoon && <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded">Coming Soon</span>}
          </div>
        </div>
        <StatusDot connected={status} />
        {!comingSoon && (
          <span className={`text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        )}
      </button>
      {open && !comingSoon && (
        <div className="border-t border-gray-800 px-5 py-5">{children}</div>
      )}
    </div>
  );
}

/* ─── Code block ─────────────────────────────────────────────────────────────── */
function Code({ children }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group mt-3">
      <button
        onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute right-3 top-2 text-xs text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? '✓' : 'Copy'}
      </button>
      <pre className="bg-gray-950 text-gray-300 text-xs font-mono rounded-xl p-4 overflow-x-auto border border-gray-800 leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────────── */
export default function IntegrationsPage() {
  const { user } = useAuth();
  const sessionId = useSessionId();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState({});
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [holdings, setHoldings] = useState(null);
  const [exportData, setExportData] = useState(null);

  // Zerodha form
  const [kiteApiKey, setKiteApiKey]     = useState('');
  const [kiteApiSecret, setKiteApiSecret] = useState('');
  const [kiteReqToken, setKiteReqToken]   = useState('');

  // Telegram form
  const [tgChatId, setTgChatId] = useState('');
  const [tgAlerts, setTgAlerts] = useState({ priceAlerts: true, marketSummary: true, regimeChange: false, scannerHits: false });

  const setLoad = (k, v) => setLoading(p => ({ ...p, [k]: v }));
  const flash   = (msg, err = false) => {
    if (err) { setError(msg); setTimeout(() => setError(''), 4000); }
    else     { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

  useEffect(() => {
    loadStatus();
  }, [sessionId]);

  async function loadStatus() {
    try {
      const r = await getIntegrationStatus(sessionId);
      setStatus(r.data?.integrations || null);
    } catch {}
  }

  // ── Zerodha ──
  async function handleKiteAuth() {
    setLoad('kite', true);
    try {
      const r = await connectZerodha({ sessionId, apiKey: kiteApiKey });
      window.open(r.data?.loginUrl, '_blank');
      flash('Kite login page opened. Complete login, then paste the request_token below.');
    } catch (err) {
      flash(err.response?.data?.error || 'Zerodha auth failed', true);
    } finally { setLoad('kite', false); }
  }

  async function handleKiteCallback() {
    if (!kiteReqToken) return flash('Paste the request_token from the Kite redirect URL', true);
    setLoad('kiteCallback', true);
    try {
      const r = await zerodhaCallback({ sessionId, requestToken: kiteReqToken, apiKey: kiteApiKey, apiSecret: kiteApiSecret });
      flash(`Connected to Zerodha as ${r.data?.userName}!`);
      loadStatus();
    } catch (err) {
      flash(err.response?.data?.error || 'Callback failed', true);
    } finally { setLoad('kiteCallback', false); }
  }

  async function handleLoadHoldings() {
    setLoad('holdings', true);
    try {
      const r = await getZerodhaHoldings(sessionId);
      setHoldings(r.data?.data || []);
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to load holdings', true);
    } finally { setLoad('holdings', false); }
  }

  // ── Telegram ──
  async function handleTelegramRegister() {
    if (!tgChatId) return flash('Enter your Telegram Chat ID', true);
    setLoad('tg', true);
    try {
      await registerTelegram({ sessionId, chatId: tgChatId });
      flash('Telegram connected! Check your Telegram for confirmation message.');
      loadStatus();
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to connect Telegram', true);
    } finally { setLoad('tg', false); }
  }

  async function handleTelegramTest() {
    setLoad('tgTest', true);
    try {
      await testTelegram(sessionId);
      flash('Test message sent! Check your Telegram.');
    } catch (err) {
      flash(err.response?.data?.error || 'Test failed', true);
    } finally { setLoad('tgTest', false); }
  }

  async function handleTelegramSettings() {
    setLoad('tgSettings', true);
    try {
      await updateTelegramSettings({ sessionId, ...tgAlerts });
      flash('Alert settings updated!');
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to update settings', true);
    } finally { setLoad('tgSettings', false); }
  }

  // ── Google Sheets ──
  async function handleSheetsExport(format = 'json') {
    setLoad('sheets', true);
    try {
      if (format === 'csv') {
        const r = await exportToSheets(sessionId, 'csv');
        const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
        const a   = document.createElement('a');
        a.href = url; a.download = `stockvision-watchlist-${Date.now()}.csv`; a.click();
        flash('CSV downloaded!');
      } else {
        const r = await exportToSheets(sessionId, 'json');
        setExportData(r.data);
        flash(`${r.data?.rowCount || 0} rows ready to import`);
      }
    } catch (err) {
      flash(err.response?.data?.error || 'Export failed', true);
    } finally { setLoad('sheets', false); }
  }

  const INR = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const PCT = (n) => (n >= 0 ? '+' : '') + Number(n).toFixed(2) + '%';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-violet-950 border-b border-gray-800">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(ellipse at 70% 30%, #7c3aed 0%, transparent 60%)' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-3xl">🔌</span>
            <div>
              <h1 className="text-3xl font-black text-white">Integrations</h1>
              <p className="text-gray-400 mt-0.5">Connect StockVision to your broker, messaging apps, and tools</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { icon: '🟢', label: 'Zerodha Kite', status: status?.zerodha?.connected },
              { icon: '✈️', label: 'Telegram Bot', status: status?.telegram?.connected },
              { icon: '📊', label: 'Google Sheets', status: status?.sheets?.connected },
              { icon: '🌐', label: 'Chrome Extension', status: false },
              { icon: '📱', label: 'Mobile App', status: false },
            ].map(i => (
              <div key={i.label} className="flex items-center gap-2 bg-gray-800/60 px-3 py-1.5 rounded-full border border-gray-700 text-sm">
                <StatusDot connected={i.status} />
                <span className="text-gray-300">{i.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* Alerts */}
        {error   && <div className="px-4 py-3 bg-red-950 text-red-400 border border-red-800 rounded-xl text-sm">{error}</div>}
        {success && <div className="px-4 py-3 bg-green-950 text-green-400 border border-green-800 rounded-xl text-sm">✓ {success}</div>}

        {/* ══ ZERODHA KITE ══ */}
        <IntegCard
          icon="🟢"
          title="Zerodha Kite"
          badge="Broker"
          badgeColor="bg-green-900 text-green-300"
          status={status?.zerodha?.connected}
        >
          <p className="text-gray-400 text-sm mb-4">
            Sync your Kite portfolio with StockVision. Auto-import holdings, view P&L, and get alerts for your actual positions.
          </p>

          {status?.zerodha?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-green-950/40 border border-green-800/40 rounded-xl px-4 py-3">
                <span className="text-green-400 text-lg">✓</span>
                <div>
                  <div className="text-green-400 font-semibold text-sm">Connected as {status.zerodha.userName}</div>
                  <div className="text-gray-500 text-xs">Since {new Date(status.zerodha.connectedAt).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
              <button
                onClick={handleLoadHoldings}
                disabled={loading.holdings}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {loading.holdings ? 'Loading...' : '📂 Load Holdings'}
              </button>

              {holdings && (
                <div className="mt-4">
                  <div className="text-white font-semibold mb-2 text-sm">{holdings.length} Holdings from Kite</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-800">
                          <th className="pb-2 pr-4">Symbol</th>
                          <th className="pb-2 pr-4">Qty</th>
                          <th className="pb-2 pr-4">Avg Price</th>
                          <th className="pb-2 pr-4">LTP</th>
                          <th className="pb-2">P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-900">
                        {holdings.map(h => (
                          <tr key={h.tradingsymbol}>
                            <td className="py-2 pr-4 font-bold text-blue-400">{h.tradingsymbol}</td>
                            <td className="py-2 pr-4 text-gray-300">{h.quantity}</td>
                            <td className="py-2 pr-4 text-gray-300">{INR(h.avgPrice)}</td>
                            <td className="py-2 pr-4 text-gray-300">{INR(h.lastPrice)}</td>
                            <td className={`py-2 font-semibold ${parseFloat(h.pnlPercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {INR(h.pnl)} ({PCT(h.pnlPercent)})
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                <div className="text-white font-semibold text-sm mb-2">Setup Instructions</div>
                <ol className="text-gray-400 text-xs space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://developers.kite.trade" target="_blank" rel="noreferrer" className="text-blue-400 underline">developers.kite.trade</a> → Create App</li>
                  <li>Set Redirect URL to: <code className="bg-gray-900 px-1 rounded">http://localhost:5000/api/integrations/zerodha/callback</code></li>
                  <li>Add <code className="bg-gray-900 px-1 rounded">ZERODHA_API_KEY</code> and <code className="bg-gray-900 px-1 rounded">ZERODHA_API_SECRET</code> to backend .env</li>
                  <li>Enter your API Key below and click Connect</li>
                </ol>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">API Key</label>
                  <input type="text" value={kiteApiKey} onChange={e => setKiteApiKey(e.target.value)}
                    placeholder="your_kite_api_key"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500 placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">API Secret</label>
                  <input type="password" value={kiteApiSecret} onChange={e => setKiteApiSecret(e.target.value)}
                    placeholder="your_kite_api_secret"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500 placeholder-gray-600"
                  />
                </div>
              </div>
              <button
                onClick={handleKiteAuth}
                disabled={loading.kite}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {loading.kite ? 'Opening...' : '🔐 Connect to Kite'}
              </button>

              <div className="border-t border-gray-800 pt-4">
                <div className="text-white font-semibold text-sm mb-2">Step 2: After Kite login — paste request_token</div>
                <p className="text-gray-500 text-xs mb-3">After logging in, Kite redirects to your URL with <code className="bg-gray-900 px-1 rounded">?request_token=XXXXX</code> in the URL. Copy that value:</p>
                <div className="flex gap-2">
                  <input type="text" value={kiteReqToken} onChange={e => setKiteReqToken(e.target.value)}
                    placeholder="Paste request_token here"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500 placeholder-gray-600"
                  />
                  <button
                    onClick={handleKiteCallback}
                    disabled={loading.kiteCallback}
                    className="px-4 py-2.5 bg-green-700 hover:bg-green-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
                  >
                    {loading.kiteCallback ? '...' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </IntegCard>

        {/* ══ TELEGRAM BOT ══ */}
        <IntegCard
          icon="✈️"
          title="Telegram Bot"
          badge="Alerts"
          badgeColor="bg-blue-900 text-blue-300"
          status={status?.telegram?.connected}
        >
          <p className="text-gray-400 text-sm mb-4">
            Get price alerts, market summaries, and regime change notifications directly on Telegram.
          </p>

          {status?.telegram?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-blue-950/40 border border-blue-800/40 rounded-xl px-4 py-3">
                <span className="text-blue-400 text-lg">✓</span>
                <div>
                  <div className="text-blue-400 font-semibold text-sm">Telegram Connected</div>
                  <div className="text-gray-500 text-xs">Chat ID: {status.telegram.chatId}</div>
                </div>
                <button
                  onClick={handleTelegramTest}
                  disabled={loading.tgTest}
                  className="ml-auto text-xs px-3 py-1.5 bg-blue-800 text-blue-300 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {loading.tgTest ? '...' : 'Send Test'}
                </button>
              </div>

              <div>
                <div className="text-white font-semibold text-sm mb-3">Alert Settings</div>
                {[
                  { key: 'priceAlerts',   label: 'Price alerts (from your Alerts page)' },
                  { key: 'marketSummary', label: 'Market open/close summary' },
                  { key: 'regimeChange',  label: 'Market regime change notifications' },
                  { key: 'scannerHits',   label: 'Historical scanner matches' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-2.5 border-b border-gray-800">
                    <span className="text-gray-300 text-sm">{label}</span>
                    <button
                      onClick={() => setTgAlerts(p => ({ ...p, [key]: !p[key] }))}
                      className={`w-10 h-5 rounded-full transition-colors relative ${tgAlerts[key] ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${tgAlerts[key] ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleTelegramSettings}
                  disabled={loading.tgSettings}
                  className="mt-3 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
                >
                  {loading.tgSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                <div className="text-white font-semibold text-sm mb-2">Setup Instructions</div>
                <ol className="text-gray-400 text-xs space-y-1.5 list-decimal list-inside">
                  <li>Open Telegram → search for <strong className="text-white">@BotFather</strong></li>
                  <li>Send <code className="bg-gray-900 px-1 rounded">/newbot</code> → follow steps → copy your bot token</li>
                  <li>Add <code className="bg-gray-900 px-1 rounded">TELEGRAM_BOT_TOKEN=your_token</code> to backend .env, restart server</li>
                  <li>Message your bot once, then search <strong className="text-white">@userinfobot</strong> to get your Chat ID</li>
                  <li>Enter your Chat ID below and click Connect</li>
                </ol>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Your Telegram Chat ID</label>
                <div className="flex gap-2">
                  <input type="text" value={tgChatId} onChange={e => setTgChatId(e.target.value)}
                    placeholder="e.g. 123456789"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                  <button
                    onClick={handleTelegramRegister}
                    disabled={loading.tg}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
                  >
                    {loading.tg ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </IntegCard>

        {/* ══ GOOGLE SHEETS ══ */}
        <IntegCard
          icon="📊"
          title="Google Sheets"
          badge="Export"
          badgeColor="bg-emerald-900 text-emerald-300"
          status={status?.sheets?.connected}
        >
          <p className="text-gray-400 text-sm mb-4">
            Export your watchlists and portfolio data to Google Sheets for custom analysis.
          </p>
          <div className="flex gap-3 flex-wrap mb-5">
            <button
              onClick={() => handleSheetsExport('csv')}
              disabled={loading.sheets}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
            >
              {loading.sheets ? 'Exporting...' : '⬇️ Download as CSV'}
            </button>
            <button
              onClick={() => handleSheetsExport('json')}
              disabled={loading.sheets}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
            >
              {loading.sheets ? '...' : '📋 Preview Data'}
            </button>
          </div>

          {exportData && (
            <div className="mt-4 bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-white font-semibold text-sm mb-2">Export Preview — {exportData.rowCount} rows</div>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-700">
                      {(exportData.headers || []).slice(0, 7).map((h, i) => <th key={i} className="pb-2 pr-4 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(exportData.rows || []).slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        {row.slice(0, 7).map((cell, j) => <td key={j} className="py-1.5 pr-4 text-gray-300">{cell || '--'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-gray-500 text-xs">
                To import into Google Sheets: File → Import → Upload the CSV file
              </div>
            </div>
          )}

          <div className="mt-4 bg-gray-800/40 rounded-xl p-4 border border-gray-700">
            <div className="text-white font-semibold text-sm mb-2">Google Sheets Formula (Live Data)</div>
            <p className="text-gray-400 text-xs mb-2">Use this formula in Sheets to pull live prices directly:</p>
            <Code>{`=IMPORTDATA("http://localhost:5000/api/enterprise/bulk-export?symbols=TCS.NS,INFY.NS,RELIANCE.NS&format=csv&apiKey=YOUR_KEY")`}</Code>
          </div>
        </IntegCard>

        {/* ══ CHROME EXTENSION ══ */}
        <IntegCard
          icon="🌐"
          title="Chrome Extension"
          badge="v1.0.0"
          badgeColor="bg-purple-900 text-purple-300"
          status={false}
        >
          <p className="text-gray-400 text-sm mb-4">
            Quick stock lookup, live prices, and alerts right from your Chrome toolbar. Also injects a "View in StockVision" button on Screener.in, Moneycontrol, and Yahoo Finance.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {[
              { icon: '🔍', title: 'Instant Search', desc: 'Look up any NSE stock without opening the app' },
              { icon: '📈', title: 'Live Prices', desc: 'See prices, OHLC, and 52-week range in the popup' },
              { icon: '🔔', title: 'Browser Alerts', desc: 'Desktop notifications when price alerts trigger' },
              { icon: '🌐', title: 'Site Injection', desc: 'Floating button on Screener.in & Moneycontrol' },
            ].map(f => (
              <div key={f.title} className="bg-gray-800 rounded-xl p-3">
                <div className="text-lg mb-1">{f.icon}</div>
                <div className="text-white font-semibold text-xs mb-0.5">{f.title}</div>
                <div className="text-gray-400 text-xs">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700 mb-4">
            <div className="text-white font-semibold text-sm mb-2">Install Instructions</div>
            <ol className="text-gray-400 text-xs space-y-1.5 list-decimal list-inside">
              <li>Download the extension ZIP from the link below</li>
              <li>Unzip it to a folder on your computer</li>
              <li>Open Chrome → <code className="bg-gray-900 px-1 rounded">chrome://extensions</code></li>
              <li>Enable "Developer mode" (top right toggle)</li>
              <li>Click "Load unpacked" → select the unzipped folder</li>
              <li>Pin the StockVision icon in your Chrome toolbar</li>
            </ol>
          </div>

          <a
            href="/chrome-extension/stockvision-extension.zip"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-sm"
          >
            ⬇️ Download Extension ZIP
          </a>
        </IntegCard>

        {/* ══ MOBILE APP ══ */}
        <IntegCard
          icon="📱"
          title="Mobile App (React Native)"
          badge="Foundation"
          badgeColor="bg-orange-900 text-orange-300"
          status={false}
        >
          <p className="text-gray-400 text-sm mb-4">
            StockVision mobile app foundation — same features as web, optimized for iOS and Android.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: '📱', title: 'React Native', desc: 'iOS & Android from single codebase' },
                { icon: '🔔', title: 'Push Notifications', desc: 'Price alerts via Firebase Cloud Messaging' },
                { icon: '📶', title: 'Offline Mode', desc: 'View cached watchlist without internet' },
              ].map(f => (
                <div key={f.title} className="bg-gray-800 rounded-xl p-3">
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <div className="text-white font-semibold text-xs">{f.title}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{f.desc}</div>
                </div>
              ))}
            </div>

            <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
              <div className="text-white font-semibold text-sm mb-2">Quick Start — React Native</div>
              <Code>{`# Install Expo CLI
npm install -g @expo/cli

# Create project
npx create-expo-app StockVisionMobile --template blank-typescript

# Install dependencies
cd StockVisionMobile
npx expo install expo-notifications expo-secure-store
npm install axios @react-navigation/native @react-navigation/bottom-tabs

# Point to your API
# In app.config.js add: extra: { apiUrl: 'http://localhost:5000/api' }

# Run
npx expo start`}
              </Code>
            </div>

            <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
              <div className="text-white font-semibold text-sm mb-2">Recommended App Structure</div>
              <Code>{`StockVisionMobile/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx         # Home / Markets
│   │   ├── watchlist.tsx     # Watchlist
│   │   ├── scanner.tsx       # Historical Scanner
│   │   └── portfolio.tsx     # Portfolio
│   └── stock/[symbol].tsx    # Stock detail page
├── components/
│   ├── MarketRibbon.tsx
│   ├── StockCard.tsx
│   └── PriceHeader.tsx
└── api.ts                    # Re-use same API calls`}
              </Code>
            </div>

            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3 text-amber-300 text-sm">
              📅 Full React Native app coming in <strong>Month 26 (Launch 2.0)</strong>. The foundation is ready — start building with Expo!
            </div>
          </div>
        </IntegCard>

        {/* ══ WHATSAPP / FUTURE ══ */}
        <IntegCard
          icon="💬"
          title="WhatsApp Alerts"
          badge="Planned"
          badgeColor="bg-gray-800 text-gray-400"
          status={false}
          comingSoon
        />
        <IntegCard
          icon="📋"
          title="Google Sheets Add-on"
          badge="Planned"
          badgeColor="bg-gray-800 text-gray-400"
          status={false}
          comingSoon
        />
      </div>
    </div>
  );
}
