// InstitutionalPage.jsx — Phase 5 Month 24: Enterprise Features
// API Key Management + Team Accounts + Institutional Tier
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getEnterpriseTiers,
  getMyApiKeys,
  generateApiKey,
  revokeApiKey,
  getApiKeyUsage,
  updateCustomFriction,
  getMyTeam,
  createTeam,
  inviteTeamMember,
  getApiDocs,
} from '../api';

/* ─── Utilities ─────────────────────────────────────────────────────────────── */
const INR = (n) => '₹' + Number(n).toLocaleString('en-IN');
const PCT = (n) => (n || 0).toFixed(1) + '%';

const TIER_COLORS = {
  DEVELOPER:     { bg: 'bg-slate-800',  ring: 'ring-slate-600',  text: 'text-slate-300',  accent: '#64748b', badge: 'bg-slate-700' },
  PRO_API:       { bg: 'bg-blue-950',   ring: 'ring-blue-700',   text: 'text-blue-300',   accent: '#3b82f6', badge: 'bg-blue-800'  },
  INSTITUTIONAL: { bg: 'bg-amber-950',  ring: 'ring-amber-600',  text: 'text-amber-300',  accent: '#f59e0b', badge: 'bg-amber-800' },
};

const TIER_ICONS = { DEVELOPER: '⚙️', PRO_API: '🚀', INSTITUTIONAL: '🏛️' };

/* ─── Sub-components ─────────────────────────────────────────────────────────── */

function TierCard({ tier, onSelect, selected }) {
  const c = TIER_COLORS[tier.id] || TIER_COLORS.DEVELOPER;
  return (
    <div
      onClick={() => onSelect(tier.id)}
      className={`relative cursor-pointer rounded-2xl border p-6 transition-all duration-300 ${c.bg} ${selected ? `ring-2 ${c.ring} scale-[1.02]` : 'hover:scale-[1.01]'}`}
    >
      {tier.id === 'INSTITUTIONAL' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow">MOST POPULAR</span>
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-2xl">{TIER_ICONS[tier.id]}</span>
          <h3 className={`text-xl font-bold mt-1 ${c.text}`}>{tier.name}</h3>
          <p className="text-gray-400 text-sm mt-0.5">{tier.ideal}</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${c.text}`}>
            {tier.priceINR === 0 ? 'Free' : INR(tier.priceINR)}
          </div>
          {tier.priceINR > 0 && <div className="text-gray-500 text-xs">/month</div>}
        </div>
      </div>

      <div className="space-y-2 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">API calls/month</span>
          <span className={`ml-auto font-mono text-sm font-bold ${c.text}`}>
            {Number(tier.monthlyLimit).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">Rate limit</span>
          <span className={`ml-auto font-mono text-sm font-bold ${c.text}`}>{tier.rateLimit}</span>
        </div>
      </div>

      <ul className="space-y-1.5">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
            <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button className={`mt-5 w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
        selected
          ? 'bg-white text-gray-900'
          : `${c.badge} ${c.text} hover:opacity-90`
      }`}>
        {tier.priceINR === 0 ? 'Get Free Key' : `Get ${tier.name} Key`}
      </button>
    </div>
  );
}

function UsageBar({ used, limit, tier }) {
  const pct  = Math.min(100, Math.round((used / limit) * 100));
  const col  = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : TIER_COLORS[tier]?.accent || '#3b82f6';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{Number(used).toLocaleString('en-IN')} used</span>
        <span>{Number(limit).toLocaleString('en-IN')} limit</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: col }} />
      </div>
      <div className="text-right text-xs mt-1" style={{ color: col }}>{pct}% used</div>
    </div>
  );
}

function ApiKeyCard({ k, onRevoke, onSelect }) {
  const c = TIER_COLORS[k.tier] || TIER_COLORS.DEVELOPER;
  return (
    <div className={`rounded-xl border border-gray-800 p-4 bg-gray-900 hover:border-gray-700 transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.badge} ${c.text}`}>{k.tier}</span>
            {k.isTestKey && <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">TEST</span>}
            <span className={`text-xs font-bold ${k.status === 'ACTIVE' ? 'text-green-400' : 'text-red-400'}`}>
              {k.status}
            </span>
          </div>
          <div className="text-white font-semibold mt-1">{k.name}</div>
          <div className="font-mono text-gray-500 text-xs mt-0.5">{k.keyPrefix}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(k)}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Usage
          </button>
          <button
            onClick={() => onRevoke(k.id)}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-950 text-red-400 hover:bg-red-900 transition-colors"
          >
            Revoke
          </button>
        </div>
      </div>
      <UsageBar used={k.monthlyCalls} limit={k.monthlyLimit} tier={k.tier} />
      {k.lastUsedAt && (
        <div className="text-xs text-gray-600 mt-2">
          Last used: {new Date(k.lastUsedAt).toLocaleString('en-IN')}
        </div>
      )}
    </div>
  );
}

function CodeSnippet({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <div className="flex items-center justify-between bg-gray-800 rounded-t-xl px-4 py-2 border border-gray-700 border-b-0">
        <span className="text-xs text-gray-400 font-mono">{lang}</span>
        <button
          onClick={copy}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-gray-950 text-gray-300 text-xs font-mono rounded-b-xl p-4 overflow-x-auto border border-gray-700 leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────────── */
export default function InstitutionalPage() {
  const { user } = useAuth();
  const userId = user?.uid || localStorage.getItem('sessionId') || 'anonymous';
  const userEmail = user?.email || '';

  const [activeTab, setActiveTab]     = useState('tiers');
  const [tiers, setTiers]             = useState([]);
  const [myKeys, setMyKeys]           = useState([]);
  const [team, setTeam]               = useState(null);
  const [docs, setDocs]               = useState(null);
  const [selectedTier, setSelectedTier] = useState('DEVELOPER');
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedKeyUsage, setSelectedKeyUsage] = useState(null);

  // New key form
  const [newKeyName, setNewKeyName]   = useState('');
  const [newKeyEmail, setNewKeyEmail] = useState(userEmail);
  const [isTestKey, setIsTestKey]     = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);

  // Team form
  const [teamOrgName, setTeamOrgName] = useState('');
  const [teamOrgType, setTeamOrgType] = useState('OTHER');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState('ANALYST');
  const [inviteResult, setInviteResult] = useState(null);

  // Friction form
  const [frictionModel, setFrictionModel] = useState({
    brokeragePercent: 0.03, sttPercent: 0.001, gstPercent: 18,
    exchangeTxnPercent: 0.00345, dpCharges: 13.5, stampDutyPercent: 0.003,
  });

  const [loading, setLoading]   = useState({});
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const setLoad = (k, v) => setLoading(prev => ({ ...prev, [k]: v }));
  const flash   = (msg, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 4000); }
    else        { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

  // Load tiers on mount
  useEffect(() => {
    getEnterpriseTiers().then(r => setTiers(r.data?.tiers || [])).catch(() => {});
    if (userId && userId !== 'anonymous') {
      loadMyKeys();
      loadTeam();
    }
    getApiDocs().then(r => setDocs(r.data)).catch(() => {});
  }, [userId]);

  async function loadMyKeys() {
    setLoad('keys', true);
    try {
      const r = await getMyApiKeys(userId);
      setMyKeys(r.data?.keys || []);
    } catch {} finally { setLoad('keys', false); }
  }

  async function loadTeam() {
    try {
      const r = await getMyTeam(userId);
      setTeam(r.data?.team || null);
    } catch {}
  }

  async function handleGenerateKey() {
    if (!newKeyEmail) return flash('Email required', true);
    setLoad('generate', true);
    try {
      const r = await generateApiKey({ userId, email: newKeyEmail, name: newKeyName || undefined, tier: selectedTier, isTestKey });
      setGeneratedKey(r.data?.apiKey);
      flash('API key generated! Copy it now — it won\'t be shown again.');
      loadMyKeys();
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to generate key', true);
    } finally { setLoad('generate', false); }
  }

  async function handleRevoke(keyId) {
    if (!window.confirm('Are you sure? Revoked keys cannot be reactivated.')) return;
    setLoad('revoke_' + keyId, true);
    try {
      await revokeApiKey(keyId, userId);
      flash('API key revoked');
      loadMyKeys();
      if (selectedKey?.id === keyId) setSelectedKey(null);
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to revoke', true);
    } finally { setLoad('revoke_' + keyId, false); }
  }

  async function handleViewUsage(k) {
    setSelectedKey(k);
    setLoad('usage', true);
    try {
      const r = await getApiKeyUsage(k.id, userId);
      setSelectedKeyUsage(r.data?.usage || null);
    } catch {} finally { setLoad('usage', false); }
  }

  async function handleCreateTeam() {
    if (!teamOrgName) return flash('Organization name required', true);
    setLoad('team', true);
    try {
      const r = await createTeam({ userId, orgName: teamOrgName, orgType: teamOrgType, ownerEmail: userEmail });
      setTeam(r.data?.team || null);
      flash('Team account created!');
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to create team', true);
    } finally { setLoad('team', false); }
  }

  async function handleInvite() {
    if (!inviteEmail) return flash('Email required', true);
    setLoad('invite', true);
    try {
      const r = await inviteTeamMember({ userId, email: inviteEmail, role: inviteRole });
      setInviteResult(r.data);
      setInviteEmail('');
      flash(`Invitation sent to ${inviteEmail}`);
      loadTeam();
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to invite', true);
    } finally { setLoad('invite', false); }
  }

  async function handleUpdateFriction() {
    if (!selectedKey) return flash('Select a key first', true);
    setLoad('friction', true);
    try {
      await updateCustomFriction(selectedKey.id, userId, frictionModel);
      flash('Custom friction model saved!');
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to save friction model', true);
    } finally { setLoad('friction', false); }
  }

  const TABS = [
    { id: 'tiers',   label: '💎 Plans',    show: true },
    { id: 'keys',    label: '🔑 My Keys',  show: !!userId && userId !== 'anonymous' },
    { id: 'team',    label: '👥 Team',     show: !!userId && userId !== 'anonymous' },
    { id: 'docs',    label: '📚 API Docs', show: true },
    { id: 'export',  label: '📦 Bulk Export', show: true },
  ];

  const ROLE_OPTIONS = ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'];
  const ORG_TYPES    = ['HEDGE_FUND', 'FAMILY_OFFICE', 'BROKERAGE', 'RESEARCH', 'FINTECH', 'CORPORATE', 'OTHER'];

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-amber-950 border-b border-gray-800">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(ellipse at 60% 40%, #f59e0b 0%, transparent 60%)' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🏛️</span>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                StockVision <span className="text-amber-400">Enterprise</span>
              </h1>
              <p className="text-gray-400 mt-1">API Access · Team Accounts · Institutional Grade Analytics</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {[
              { icon: '⚡', label: '99.5% Uptime SLA' },
              { icon: '🔒', label: 'Secure API Keys' },
              { icon: '📊', label: '1M+ calls/month' },
              { icon: '👥', label: 'Team Accounts' },
              { icon: '🎨', label: 'White-Label Option' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-1.5 bg-gray-800/60 px-3 py-1.5 rounded-full border border-gray-700">
                <span>{b.icon}</span>
                <span className="text-gray-300">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Alerts */}
        {error   && <div className="mb-4 px-4 py-3 bg-red-950 text-red-400 border border-red-800 rounded-xl text-sm">{error}</div>}
        {success && <div className="mb-4 px-4 py-3 bg-green-950 text-green-400 border border-green-800 rounded-xl text-sm">✓ {success}</div>}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 overflow-x-auto pb-1">
          {TABS.filter(t => t.show).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-amber-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: TIERS ── */}
        {activeTab === 'tiers' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Choose Your Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {tiers.length > 0
                ? tiers.map(t => <TierCard key={t.id} tier={t} onSelect={setSelectedTier} selected={selectedTier === t.id} />)
                : [
                    { id: 'DEVELOPER',     name: 'Developer',     priceINR: 0,      monthlyLimit: 1000,    rateLimit: '60 req/min',   ideal: 'Side projects, learning', features: ['Stock prices & OHLC', 'Search API', 'Financial ratios', 'News feed'] },
                    { id: 'PRO_API',       name: 'Pro API',        priceINR: 2999,   monthlyLimit: 50000,   rateLimit: '300 req/min',  ideal: 'Quant researchers, algo traders', features: ['Everything in Developer', 'Historical Scanner API', 'Regime Analysis', 'Portfolio optimizer', 'Bulk export (50 symbols)'] },
                    { id: 'INSTITUTIONAL', name: 'Institutional',  priceINR: 9999,   monthlyLimit: 1000000, rateLimit: '1,000 req/min', ideal: 'Hedge funds, brokerages', features: ['Everything in Pro', 'Team accounts (10 members)', 'Custom friction model', 'White-label option', 'Bulk export (500 symbols)', 'Dedicated account manager'] },
                  ].map(t => <TierCard key={t.id} tier={t} onSelect={setSelectedTier} selected={selectedTier === t.id} />)
              }
            </div>

            {/* Get Key CTA */}
            {user ? (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Generate API Key — {selectedTier}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Key Name (optional)</label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={e => setNewKeyName(e.target.value)}
                      placeholder="e.g. My Algo Bot"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Email *</label>
                    <input
                      type="email"
                      value={newKeyEmail}
                      onChange={e => setNewKeyEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <input id="testKey" type="checkbox" checked={isTestKey} onChange={e => setIsTestKey(e.target.checked)} className="w-4 h-4 rounded" />
                  <label htmlFor="testKey" className="text-gray-400 text-sm">Create as test key (calls don't count toward quota)</label>
                </div>
                <button
                  onClick={handleGenerateKey}
                  disabled={loading.generate}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading.generate ? 'Generating...' : `Generate ${selectedTier} Key`}
                </button>

                {/* Generated key display */}
                {generatedKey && (
                  <div className="mt-5 bg-green-950 border border-green-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-400 font-bold">✓ Key Generated!</span>
                      <span className="text-red-400 text-xs bg-red-950 px-2 py-0.5 rounded">COPY NOW — Won't show again</span>
                    </div>
                    <div className="font-mono text-green-300 text-sm bg-gray-950 rounded-lg px-4 py-3 break-all select-all">
                      {generatedKey.key}
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(generatedKey.key); flash('Key copied!'); }}
                      className="mt-3 text-xs px-4 py-2 bg-green-800 text-green-200 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center">
                <p className="text-gray-400 mb-3">Login to generate API keys</p>
                <a href="/login" className="px-6 py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors">
                  Login / Sign Up
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: MY KEYS ── */}
        {activeTab === 'keys' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">My API Keys</h2>
              <button
                onClick={() => { setActiveTab('tiers'); }}
                className="text-sm px-4 py-2 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors"
              >
                + Generate Key
              </button>
            </div>

            {loading.keys ? (
              <div className="space-y-4">
                {[1,2].map(i => <div key={i} className="h-28 bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : myKeys.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <div className="text-5xl mb-3">🔑</div>
                <p>No API keys yet. Generate one from the Plans tab.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myKeys.map(k => (
                  <ApiKeyCard key={k.id} k={k} onRevoke={handleRevoke} onSelect={handleViewUsage} />
                ))}
              </div>
            )}

            {/* Usage details panel */}
            {selectedKey && (
              <div className="mt-8 bg-gray-900 rounded-2xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-white">{selectedKey.name} — Usage Details</h3>
                  <button onClick={() => { setSelectedKey(null); setSelectedKeyUsage(null); }} className="text-gray-500 hover:text-white text-xl">×</button>
                </div>

                {loading.usage ? (
                  <div className="h-24 bg-gray-800 rounded-xl animate-pulse" />
                ) : selectedKeyUsage ? (
                  <div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                      {[
                        { label: 'Total Calls', value: Number(selectedKeyUsage.totalCalls).toLocaleString('en-IN') },
                        { label: 'This Month',  value: Number(selectedKeyUsage.monthlyCalls).toLocaleString('en-IN') },
                        { label: 'Remaining',   value: Number(selectedKeyUsage.remaining).toLocaleString('en-IN') },
                        { label: 'Days to Reset', value: selectedKeyUsage.daysToReset },
                      ].map(m => (
                        <div key={m.label} className="bg-gray-800 rounded-xl p-3 text-center">
                          <div className="text-2xl font-bold text-white">{m.value}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{m.label}</div>
                        </div>
                      ))}
                    </div>
                    <UsageBar used={selectedKeyUsage.monthlyCalls} limit={selectedKeyUsage.monthlyLimit} tier={selectedKey.tier} />

                    {/* Custom Friction Model (INSTITUTIONAL only) */}
                    {selectedKey.tier === 'INSTITUTIONAL' && (
                      <div className="mt-6 border-t border-gray-800 pt-6">
                        <h4 className="text-white font-semibold mb-4">Custom Friction Model</h4>
                        <p className="text-gray-400 text-sm mb-4">Override default brokerage costs for your firm's specific rate card.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                          {[
                            { key: 'brokeragePercent',   label: 'Brokerage %',   step: 0.001 },
                            { key: 'sttPercent',         label: 'STT %',         step: 0.0001 },
                            { key: 'gstPercent',         label: 'GST %',         step: 1 },
                            { key: 'exchangeTxnPercent', label: 'Exchange Txn %', step: 0.001 },
                            { key: 'dpCharges',          label: 'DP Charges ₹',  step: 0.5 },
                            { key: 'stampDutyPercent',   label: 'Stamp Duty %',  step: 0.001 },
                          ].map(f => (
                            <div key={f.key}>
                              <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
                              <input
                                type="number"
                                step={f.step}
                                value={frictionModel[f.key]}
                                onChange={e => setFrictionModel(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={handleUpdateFriction}
                          disabled={loading.friction}
                          className="px-5 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 text-sm"
                        >
                          {loading.friction ? 'Saving...' : 'Save Friction Model'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: TEAM ── */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Team Account</h2>
            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3 text-amber-300 text-sm">
              🏛️ Team accounts require an active <strong>Institutional</strong> API key. Upgrade your plan first.
            </div>

            {!team ? (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Create Your Team</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Organization Name *</label>
                    <input
                      type="text"
                      value={teamOrgName}
                      onChange={e => setTeamOrgName(e.target.value)}
                      placeholder="Acme Capital Management"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Organization Type</label>
                    <select
                      value={teamOrgType}
                      onChange={e => setTeamOrgType(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                    >
                      {ORG_TYPES.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleCreateTeam}
                  disabled={loading.team}
                  className="px-6 py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50"
                >
                  {loading.team ? 'Creating...' : 'Create Team Account'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Team overview */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{team.orgName}</h3>
                      <p className="text-gray-500 text-sm">{team.orgType?.replace('_', ' ')} · ID: {team.teamId}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${team.status === 'ACTIVE' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                      {team.status}
                    </span>
                  </div>

                  {/* Members */}
                  <h4 className="text-white font-semibold mb-3">Team Members ({team.members?.length || 0}/{team.maxMembers})</h4>
                  <div className="space-y-2 mb-5">
                    {(team.members || []).map((m, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white">
                          {(m.name || m.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">{m.name || m.email}</div>
                          <div className="text-gray-500 text-xs">{m.email}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                          m.role === 'OWNER' ? 'bg-amber-900 text-amber-400' :
                          m.role === 'ADMIN' ? 'bg-blue-900 text-blue-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>{m.role}</span>
                        <span className={`text-xs ${m.status === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400'}`}>{m.status}</span>
                      </div>
                    ))}
                  </div>

                  {/* Invite */}
                  <h4 className="text-white font-semibold mb-3">Invite New Member</h4>
                  <div className="flex gap-3 flex-wrap">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="colleague@firm.com"
                      className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 text-sm"
                    />
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                    >
                      {ROLE_OPTIONS.filter(r => r !== 'OWNER').map(r => <option key={r}>{r}</option>)}
                    </select>
                    <button
                      onClick={handleInvite}
                      disabled={loading.invite}
                      className="px-5 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 text-sm"
                    >
                      {loading.invite ? 'Inviting...' : 'Send Invite'}
                    </button>
                  </div>

                  {inviteResult && (
                    <div className="mt-3 bg-green-950 border border-green-800 rounded-xl p-3 text-sm">
                      <div className="text-green-400 font-semibold">✓ Invite sent!</div>
                      <div className="text-gray-400 text-xs mt-1 font-mono break-all">{inviteResult.inviteLink}</div>
                    </div>
                  )}
                </div>

                {/* White-label section */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <h3 className="text-lg font-bold text-white mb-2">White-Label Configuration</h3>
                  <p className="text-gray-400 text-sm mb-4">Customize StockVision with your organization's branding.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Logo URL', key: 'orgLogoUrl',  placeholder: 'https://your-firm.com/logo.png', type: 'url' },
                      { label: 'Brand Color', key: 'orgColorHex', placeholder: '#1e40af', type: 'color' },
                      { label: 'Custom Domain', key: 'customDomain', placeholder: 'analytics.your-firm.com', type: 'text' },
                      { label: 'Tagline', key: 'orgTagline', placeholder: 'Powered by Your Firm Analytics', type: 'text' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
                        <input
                          type={f.type}
                          placeholder={f.placeholder}
                          defaultValue={team.whiteLabel?.[f.key] || ''}
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <button className="mt-4 px-5 py-2.5 bg-gray-700 text-gray-300 font-semibold rounded-xl hover:bg-gray-600 transition-colors text-sm">
                    Save Branding (contact us to activate)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: API DOCS ── */}
        {activeTab === 'docs' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">API Documentation</h2>

            {/* Auth explanation */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
              <h3 className="text-white font-bold mb-3">Authentication</h3>
              <p className="text-gray-400 text-sm mb-4">Include your API key in every request using one of two methods:</p>
              <div className="space-y-4">
                <CodeSnippet lang="HTTP Header (recommended)" code={`GET /api/stocks/RELIANCE.NS
X-API-Key: sv_dev_your_key_here`} />
                <CodeSnippet lang="Query Parameter" code={`GET /api/stocks/RELIANCE.NS?apiKey=sv_dev_your_key_here`} />
              </div>
            </div>

            {/* Quick start */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
              <h3 className="text-white font-bold mb-3">Quick Start</h3>
              <div className="space-y-4">
                <CodeSnippet lang="JavaScript / Node.js" code={`const API_KEY = 'sv_dev_your_key_here';
const BASE    = 'http://localhost:5000/api';

// Get live stock price
const res  = await fetch(\`\${BASE}/stocks/RELIANCE.NS\`, {
  headers: { 'X-API-Key': API_KEY },
});
const data = await res.json();
console.log(data.currentPrice); // ₹2,847.50`} />
                <CodeSnippet lang="Python" code={`import requests

API_KEY = 'sv_dev_your_key_here'
BASE    = 'http://localhost:5000/api'

# Get live stock price
r    = requests.get(f'{BASE}/stocks/TCS.NS',
         headers={'X-API-Key': API_KEY})
data = r.json()
print(data['currentPrice'])  # 4123.75`} />
                <CodeSnippet lang="Bulk Export (Pro API)" code={`# Export multiple stocks as CSV
GET /api/enterprise/bulk-export
    ?symbols=TCS.NS,INFY.NS,RELIANCE.NS,HDFC.NS
    &format=csv
X-API-Key: sv_pro_your_key_here`} />
              </div>
            </div>

            {/* Endpoints table */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              <h3 className="text-white font-bold mb-4">Available Endpoints</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-800">
                      <th className="pb-3 text-gray-400 font-medium pr-4">Endpoint</th>
                      <th className="pb-3 text-gray-400 font-medium pr-4">Method</th>
                      <th className="pb-3 text-gray-400 font-medium pr-4">Description</th>
                      <th className="pb-3 text-gray-400 font-medium">Min Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {(docs?.endpoints || [
                      { path: '/stocks/:symbol',        method: 'GET',  desc: 'Live price, OHLC, volume',          tier: 'DEVELOPER'     },
                      { path: '/search',                method: 'GET',  desc: 'Autocomplete search',                tier: 'DEVELOPER'     },
                      { path: '/financials/:symbol',    method: 'GET',  desc: 'P&L, Balance Sheet, ratios',        tier: 'DEVELOPER'     },
                      { path: '/news/:symbol',          method: 'GET',  desc: 'Latest stock news',                  tier: 'DEVELOPER'     },
                      { path: '/indices',               method: 'GET',  desc: 'Nifty, Sensex, Bank Nifty',         tier: 'DEVELOPER'     },
                      { path: '/scanner/analyze',       method: 'POST', desc: 'Historical success rate scanner',    tier: 'PRO_API'       },
                      { path: '/regime/current',        method: 'GET',  desc: 'Current market regime',              tier: 'PRO_API'       },
                      { path: '/portfolio/analyze',     method: 'POST', desc: 'Portfolio optimizer',                tier: 'PRO_API'       },
                      { path: '/capital/analyze',       method: 'POST', desc: 'Capital scalability by tier',        tier: 'PRO_API'       },
                      { path: '/enterprise/bulk-export', method: 'GET', desc: 'Bulk stock data (up to 500 syms)', tier: 'PRO_API'       },
                    ]).map((e, i) => (
                      <tr key={i}>
                        <td className="py-3 pr-4 font-mono text-blue-400 text-xs">{e.path}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${e.method === 'POST' ? 'bg-green-900 text-green-400' : 'bg-blue-900 text-blue-400'}`}>
                            {e.method}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-400">{e.desc}</td>
                        <td className="py-3">
                          <span className={`text-xs font-bold ${
                            e.tier === 'INSTITUTIONAL' ? 'text-amber-400' :
                            e.tier === 'PRO_API' ? 'text-blue-400' :
                            'text-gray-400'
                          }`}>{e.tier}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: BULK EXPORT ── */}
        {activeTab === 'export' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Bulk Data Export</h2>
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
              <p className="text-gray-400 text-sm mb-4">
                Export data for multiple stocks at once — perfect for quant research, portfolio backtesting, or data pipelines.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {[
                  { tier: 'Developer',     symbols: 10,  color: 'border-gray-700 bg-gray-800' },
                  { tier: 'Pro API',       symbols: 50,  color: 'border-blue-800 bg-blue-950' },
                  { tier: 'Institutional', symbols: 500, color: 'border-amber-700 bg-amber-950' },
                ].map(t => (
                  <div key={t.tier} className={`rounded-xl border p-4 ${t.color}`}>
                    <div className="text-white font-bold">{t.tier}</div>
                    <div className="text-3xl font-black text-white mt-1">{t.symbols}</div>
                    <div className="text-gray-400 text-xs">symbols per export</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              <h3 className="text-white font-semibold mb-4">Try the Export API</h3>
              <CodeSnippet lang="GET /api/enterprise/bulk-export" code={`# JSON format
GET /api/enterprise/bulk-export
    ?symbols=RELIANCE.NS,TCS.NS,HDFCBANK.NS,INFY.NS,ICICIBANK.NS
X-API-Key: sv_pro_your_key_here

# CSV format (auto-download)
GET /api/enterprise/bulk-export
    ?symbols=RELIANCE.NS,TCS.NS,HDFCBANK.NS
    &format=csv
X-API-Key: sv_pro_your_key_here`} />

              <div className="mt-5 text-gray-400 text-sm">
                <strong className="text-white">Response includes:</strong> symbol, name, price, OHLC, change %, volume, 52-week H/L, market cap, timestamp
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-12 bg-gradient-to-r from-amber-950 to-gray-900 rounded-2xl border border-amber-800/40 p-8 text-center">
          <div className="text-3xl mb-3">🏛️</div>
          <h3 className="text-2xl font-black text-white mb-2">Need a custom plan?</h3>
          <p className="text-gray-400 mb-5">For large institutions requiring custom rate limits, SLA agreements, or dedicated infrastructure.</p>
          <a
            href="mailto:enterprise@stockvision.in"
            className="inline-block px-8 py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors"
          >
            Contact Enterprise Sales
          </a>
        </div>
      </div>
    </div>
  );
}
