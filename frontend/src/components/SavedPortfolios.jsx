// SavedPortfolios.jsx — Month 18: Load & Manage Saved Portfolios
import { useState, useEffect } from 'react';
import { getSavedPortfolios, deletePortfolio } from '../api';

const fmtC = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function SavedPortfolios({ sessionId, onLoad }) {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [err, setErr]               = useState(null);
  const [deleting, setDeleting]     = useState(null);

  async function fetchSaved() {
    if (!sessionId) { setLoading(false); return; }
    setLoading(true); setErr(null);
    try {
      const r = await getSavedPortfolios(sessionId);
      setPortfolios(r.data.data || []);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load saved portfolios');
    }
    setLoading(false);
  }

  useEffect(() => { fetchSaved(); }, [sessionId]);

  async function handleDelete(shareId) {
    if (!window.confirm('Delete this saved portfolio?')) return;
    setDeleting(shareId);
    try {
      await deletePortfolio(sessionId, shareId);
      setPortfolios(prev => prev.filter(p => p.shareId !== shareId));
    } catch {
      alert('Failed to delete — try again');
    }
    setDeleting(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-3">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading saved portfolios…</span>
      </div>
    );
  }

  if (err) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
        ⚠️ {err}
        <button onClick={fetchSaved} className="ml-3 underline">Retry</button>
      </div>
    );
  }

  if (!portfolios.length) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center space-y-3">
        <span className="text-5xl">💼</span>
        <p className="font-bold text-gray-700 dark:text-gray-300">No saved portfolios yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          After analyzing a portfolio, click the 🚀 Launch tab → 💾 Save to save it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{portfolios.length} Saved Portfolio{portfolios.length > 1 ? 's' : ''}</p>
        <button onClick={fetchSaved} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">↻ Refresh</button>
      </div>

      {portfolios.map((p) => (
        <div key={p.shareId} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-all group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{p.name}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(p.symbols || []).map(s => (
                  <span key={s} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-mono">
                    {s.replace('.NS','').replace('.BO','')}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
                {fmtC(p.totalCapital)} · {p.range} · Saved {new Date(p.createdAt).toLocaleDateString('en-IN')}
                {p.viewCount > 0 && ` · ${p.viewCount} view${p.viewCount > 1 ? 's' : ''}`}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Share link button */}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/portfolio/share/${p.shareId}`;
                  navigator.clipboard.writeText(url).then(() => {
                    alert('Share link copied!');
                  }).catch(() => {
                    prompt('Copy this link:', url);
                  });
                }}
                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Copy share link"
              >
                🔗
              </button>

              {/* Load button */}
              <button
                onClick={() => onLoad(p)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-all"
              >
                Load
              </button>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(p.shareId)}
                disabled={deleting === p.shareId}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete"
              >
                {deleting === p.shareId ? '⏳' : '🗑️'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
