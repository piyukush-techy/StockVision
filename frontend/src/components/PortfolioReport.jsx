// PortfolioReport.jsx — Month 18: Save · Export · Share Portfolio
import { useState } from 'react';
import { savePortfolio, exportPortfolioCSV, getPortfolioShareText } from '../api';

const fmtC = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

function Spinner({ size = 4 }) {
  return <div className={`w-${size} h-${size} border-2 border-current border-t-transparent rounded-full animate-spin`} />;
}

export default function PortfolioReport({ result, symbols, totalCapital, range, sessionId }) {
  const [name, setName]             = useState('My Portfolio');
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState(null);
  const [savedId, setSavedId]       = useState(null);
  const [copyMsg, setCopyMsg]       = useState('');
  const [exporting, setExporting]   = useState(false);
  const [exportErr, setExportErr]   = useState(null);
  const [shareText, setShareText]   = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [showShareBox, setShowShareBox] = useState(false);
  const [activeTab, setActiveTab]   = useState('save'); // save | export | share

  const shareUrl = savedId
    ? `${window.location.origin}/portfolio/share/${savedId}`
    : null;

  // ── Save portfolio ─────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true); setSaveErr(null);
    try {
      const r = await savePortfolio({
        sessionId,
        name,
        symbols,
        weights: result.allocations?.equalWeight?.map(a => a.weight) || symbols.map(() => 1),
        totalCapital,
        range,
        resultSnapshot: result,
      });
      setSavedId(r.data.data.shareId);
    } catch (e) {
      setSaveErr(e.response?.data?.error || e.message || 'Save failed');
    }
    setSaving(false);
  }

  // ── Copy share link ────────────────────────────────────────────────────────
  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMsg('Copied!');
    } catch {
      setCopyMsg('Error copying');
    }
    setTimeout(() => setCopyMsg(''), 2000);
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  async function handleExportCSV() {
    setExporting(true); setExportErr(null);
    try {
      const r = await exportPortfolioCSV({ name, resultSnapshot: result });
      // Create download
      const blob = new Blob([r.data], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `StockVision_${name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportErr(e.response?.data?.error || e.message || 'Export failed');
    }
    setExporting(false);
  }

  // ── Get share text ────────────────────────────────────────────────────────
  async function handleGetShareText() {
    setShareLoading(true); setShowShareBox(false);
    try {
      const r = await getPortfolioShareText({ name, resultSnapshot: result, shareId: savedId });
      setShareText(r.data.data.text);
      setShowShareBox(true);
    } catch (e) {
      setShareText('Failed to generate share text: ' + (e.message || ''));
      setShowShareBox(true);
    }
    setShareLoading(false);
  }

  async function copyShareText() {
    try { await navigator.clipboard.writeText(shareText); setCopyMsg('Copied!'); }
    catch { setCopyMsg('Error'); }
    setTimeout(() => setCopyMsg(''), 2000);
  }

  function whatsappShare() {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  function telegramShare() {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl||window.location.href)}&text=${encoded}`, '_blank');
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'save',   label: '💾 Save',   desc: 'Save for later' },
    { id: 'export', label: '📥 Export', desc: 'Download CSV' },
    { id: 'share',  label: '🔗 Share',  desc: 'Share link' },
  ];

  // Summary pills at top
  const best = result.strategies?.find(s => s.name === result.bestStrategy?.name) || result.strategies?.[0];
  const m = best?.metrics || {};

  return (
    <div className="space-y-5">
      {/* Portfolio summary card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">Phase 3 Complete 💎</p>
            <h2 className="text-2xl font-black">{name}</h2>
            <p className="text-blue-200 text-sm mt-1">
              {symbols.map(s => s.replace('.NS','').replace('.BO','')).join(' · ')} · {fmtC(totalCapital)} · {range}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">{Number(m.cagr || 0) >= 0 ? '+' : ''}{Number(m.cagr || 0).toFixed(1)}%</p>
            <p className="text-blue-200 text-xs mt-1">CAGR · {result.bestStrategy?.name}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Sharpe',      value: Number(m.sharpe || 0).toFixed(2) },
            { label: 'Max DD',      value: `-${Number(m.maxDrawdown || 0).toFixed(1)}%` },
            { label: 'Diversif.',   value: `${result.diversification?.score || 0}/100` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-xl px-3 py-2 text-center">
              <p className="text-lg font-black">{value}</p>
              <p className="text-blue-200 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === t.id
                ? 'bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SAVE TAB ── */}
      {activeTab === 'save' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">💾 Save Portfolio</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Save this analysis so you can load it again anytime and share it.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Portfolio Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. My FAANG Portfolio"
              className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {saveErr && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
              ⚠️ {saveErr}
            </div>
          )}

          {savedId ? (
            <div className="space-y-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-2">✅ Saved! Share this link:</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareUrl || ''}
                    className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 dark:text-gray-300"
                  />
                  <button onClick={copyLink}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap">
                    {copyMsg || 'Copy'}
                  </button>
                </div>
              </div>
              <button onClick={handleSave}
                className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-all">
                💾 Save Again (update name)
              </button>
            </div>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2">
              {saving ? <><Spinner size={4} /> Saving…</> : '💾 Save Portfolio'}
            </button>
          )}
        </div>
      )}

      {/* ── EXPORT TAB ── */}
      {activeTab === 'export' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">📥 Export Portfolio Report</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Download a complete CSV with all analysis — opens perfectly in Excel, Google Sheets.</p>
          </div>

          {/* What's included */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide">What's Included in the Export</p>
            {[
              '📊 Portfolio Classification & Best Strategy',
              '⚖️ Strategy Comparison (Equal Weight / Risk-Parity / Min Volatility)',
              '📈 Individual Stock Performance Metrics',
              '💰 Exact Allocation — How many shares to buy at what price',
              '🧩 Diversification Score & Analysis',
              '📅 Year-by-Year Portfolio Returns',
              '🔗 Full Correlation Matrix',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Portfolio Name (for filename)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {exportErr && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
              ⚠️ {exportErr}
            </div>
          )}

          <button onClick={handleExportCSV} disabled={exporting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2">
            {exporting ? <><Spinner size={4} /> Generating…</> : '📥 Download CSV Report'}
          </button>

          <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
            CSV format · Works in Excel, Google Sheets, LibreOffice
          </p>
        </div>
      )}

      {/* ── SHARE TAB ── */}
      {activeTab === 'share' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">🔗 Share Portfolio</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Share your analysis with friends, on Twitter, WhatsApp, or Telegram.</p>
          </div>

          {!savedId && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-300">
              💡 Save your portfolio first to get a shareable link. Without saving, you can still share a text summary.
            </div>
          )}

          {savedId && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Share Link</label>
              <div className="flex items-center gap-2">
                <input readOnly value={shareUrl || ''}
                  className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 dark:text-gray-300" />
                <button onClick={copyLink}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all">
                  {copyMsg || 'Copy'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Share Text Summary</p>
            <button onClick={handleGetShareText} disabled={shareLoading}
              className="w-full py-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
              {shareLoading ? <><Spinner size={4} /> Generating…</> : '✍️ Generate Share Text'}
            </button>
          </div>

          {showShareBox && (
            <div className="space-y-3">
              <textarea
                readOnly
                value={shareText}
                rows={10}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 text-xs font-mono text-gray-700 dark:text-gray-300 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={copyShareText}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-all">
                  {copyMsg || '📋 Copy Text'}
                </button>
                <button onClick={whatsappShare}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all">
                  📱 WhatsApp
                </button>
                <button onClick={telegramShare}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl text-sm transition-all">
                  ✈️ Telegram
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
