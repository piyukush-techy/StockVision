// AdvancedAlertsPage.jsx — Month 27: Advanced Alert System
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ALERT_TYPES = [
  { id: 'price_above',    icon: '📈', label: 'Price Above',       desc: 'Triggers when price crosses above your target' },
  { id: 'price_below',    icon: '📉', label: 'Price Below',       desc: 'Triggers when price falls below your target' },
  { id: 'pct_change',     icon: '⚡', label: '% Change (Day)',    desc: 'Triggers when daily change exceeds threshold' },
  { id: 'volume_spike',   icon: '📊', label: 'Volume Spike',      desc: 'Triggers when volume is N× the 20-day average' },
  { id: 'week52_high',    icon: '🏆', label: '52-Week High',      desc: 'Triggers when stock hits a new 52-week high' },
  { id: 'week52_low',     icon: '🕳️', label: '52-Week Low',       desc: 'Triggers when stock hits a new 52-week low' },
  { id: 'rsi_overbought', icon: '🔥', label: 'RSI Overbought',    desc: 'Triggers when RSI crosses above 70' },
  { id: 'rsi_oversold',   icon: '❄️', label: 'RSI Oversold',      desc: 'Triggers when RSI crosses below 30' },
  { id: 'earnings',       icon: '📋', label: 'Earnings Due',      desc: 'Reminder before earnings announcement' },
  { id: 'news_mention',   icon: '📰', label: 'News Mention',      desc: 'Triggers when stock appears in major news' },
];

const DELIVERY_CHANNELS = [
  { id: 'browser', icon: '🌐', label: 'Browser Notification', desc: 'Push notification in this browser' },
  { id: 'telegram', icon: '✈️', label: 'Telegram Bot', desc: 'Message to your connected Telegram' },
  { id: 'email', icon: '📧', label: 'Email', desc: 'Send to your account email' },
];

const DEMO_ALERTS = [
  { id: 1, symbol: 'RELIANCE', name: 'Reliance Industries', type: 'price_above', target: 3000, current: 2847, unit: '₹', channels: ['browser', 'telegram'], active: true, triggered: false, createdAt: '2025-01-15', note: 'Buy signal above resistance' },
  { id: 2, symbol: 'TCS', name: 'Tata Consultancy', type: 'price_below', target: 3500, current: 3840, unit: '₹', channels: ['browser'], active: true, triggered: false, createdAt: '2025-01-20', note: '' },
  { id: 3, symbol: 'HDFCBANK', name: 'HDFC Bank', type: 'pct_change', target: 3, current: 1554, unit: '%', channels: ['browser', 'telegram'], active: true, triggered: false, createdAt: '2025-01-18', note: 'Big move alert' },
  { id: 4, symbol: 'INFY', name: 'Infosys', type: 'week52_high', target: null, current: 1487, unit: null, channels: ['telegram'], active: true, triggered: false, createdAt: '2025-01-22', note: '' },
  { id: 5, symbol: 'ITC', name: 'ITC Ltd', type: 'rsi_oversold', target: null, current: 456, unit: null, channels: ['browser'], active: false, triggered: true, createdAt: '2025-01-10', triggeredAt: '2025-01-28', note: 'Dip buying opportunity' },
  { id: 6, symbol: 'BAJFINANCE', name: 'Bajaj Finance', type: 'earnings', target: 7, current: 7123, unit: 'days', channels: ['browser', 'telegram', 'email'], active: true, triggered: false, createdAt: '2025-01-25', note: 'Q3 results due' },
];

const NSE_POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'WIPRO', 'SUNPHARMA', 'BAJFINANCE', 'MARUTI', 'ITC', 'SBIN', 'KOTAKBANK', 'BHARTIARTL', 'TATASTEEL', 'DRREDDY'];

function AlertTypeBadge({ type }) {
  const t = ALERT_TYPES.find(a => a.id === type);
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
      {t?.icon} {t?.label}
    </span>
  );
}

function ChannelPills({ channels }) {
  return (
    <div className="flex gap-1">
      {channels.map(c => {
        const ch = DELIVERY_CHANNELS.find(d => d.id === c);
        return <span key={c} className="text-sm" title={ch?.label}>{ch?.icon}</span>;
      })}
    </div>
  );
}

export default function AdvancedAlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState(DEMO_ALERTS);
  const [tab, setTab] = useState('active');
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState(1); // 1=type, 2=stock+target, 3=delivery

  // Form state
  const [form, setForm] = useState({
    symbol: '', name: '', type: '', target: '', channels: ['browser'], note: '', repeat: false,
  });
  const [symbolSearch, setSymbolSearch] = useState('');
  const [notifPermission, setNotifPermission] = useState('default');

  useEffect(() => {
    if ('Notification' in window) setNotifPermission(Notification.permission);
  }, []);

  const requestNotifPermission = async () => {
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  const activeAlerts = alerts.filter(a => a.active && !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);
  const pausedAlerts = alerts.filter(a => !a.active && !a.triggered);

  const toggleActive = (id) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  const deleteAlert = (id) => setAlerts(prev => prev.filter(a => a.id !== id));

  const createAlert = () => {
    if (!form.symbol || !form.type) return;
    const newAlert = {
      id: Date.now(),
      symbol: form.symbol,
      name: form.name || form.symbol,
      type: form.type,
      target: form.target ? parseFloat(form.target) : null,
      current: 0,
      unit: form.type.includes('pct') || form.type === 'volume_spike' ? '%' : form.type === 'earnings' ? 'days' : '₹',
      channels: form.channels,
      active: true,
      triggered: false,
      createdAt: new Date().toISOString().split('T')[0],
      note: form.note,
      repeat: form.repeat,
    };
    setAlerts(prev => [newAlert, ...prev]);
    setShowCreate(false);
    setStep(1);
    setForm({ symbol: '', name: '', type: '', target: '', channels: ['browser'], note: '', repeat: false });
  };

  const typeNeedsTarget = (type) => ['price_above', 'price_below', 'pct_change', 'volume_spike', 'earnings'].includes(type);

  const filteredSymbols = NSE_POPULAR.filter(s => s.includes(symbolSearch.toUpperCase()));

  const displayAlerts = tab === 'active' ? activeAlerts : tab === 'triggered' ? triggeredAlerts : pausedAlerts;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Advanced Alerts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Price, volume, RSI, earnings and news alerts with multi-channel delivery</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setStep(1); }}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
        >
          <span>+</span> New Alert
        </button>
      </div>

      {/* Notification permission banner */}
      {notifPermission === 'default' && (
        <div className="mb-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-300 text-sm">Enable browser notifications</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">Get instant alerts even when the app is in the background</p>
            </div>
          </div>
          <button onClick={requestNotifPermission} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm flex-shrink-0">
            Enable
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-blue-600">{activeAlerts.length}</div>
          <div className="text-xs text-gray-500">Active</div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-green-600">{triggeredAlerts.length}</div>
          <div className="text-xs text-gray-500">Triggered</div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-gray-400">{pausedAlerts.length}</div>
          <div className="text-xs text-gray-500">Paused</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[['active', '🟢 Active', activeAlerts.length], ['triggered', '✅ Triggered', triggeredAlerts.length], ['paused', '⏸ Paused', pausedAlerts.length]].map(([v, l, c]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}>
            {l}
            {c > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === v ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>{c}</span>}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        {displayAlerts.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <div className="text-4xl mb-3">🔕</div>
            <p className="text-gray-500">No alerts here</p>
            {tab === 'active' && <button onClick={() => setShowCreate(true)} className="mt-3 text-blue-600 font-semibold text-sm hover:underline">Create your first alert →</button>}
          </div>
        )}
        {displayAlerts.map(alert => (
          <div key={alert.id} className={`bg-white dark:bg-gray-900 border rounded-xl p-4 transition-all ${alert.triggered ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20' : alert.active ? 'border-gray-200 dark:border-gray-800' : 'border-gray-100 dark:border-gray-800 opacity-70'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="text-2xl flex-shrink-0">{ALERT_TYPES.find(t => t.id === alert.type)?.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <a href={`/stock/${alert.symbol}.NS`} className="font-black text-gray-900 dark:text-white hover:text-blue-600">{alert.symbol}</a>
                    <AlertTypeBadge type={alert.type} />
                    {alert.target !== null && (
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                        → {alert.unit === '₹' ? '₹' : ''}{alert.target}{alert.unit !== '₹' ? alert.unit : ''}
                      </span>
                    )}
                    {alert.triggered && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">✅ Triggered {alert.triggeredAt}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <ChannelPills channels={alert.channels} />
                    {alert.note && <span className="text-xs text-gray-400 italic">"{alert.note}"</span>}
                    <span className="text-xs text-gray-400">Created {alert.createdAt}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!alert.triggered && (
                  <button
                    onClick={() => toggleActive(alert.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${alert.active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${alert.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                )}
                <button onClick={() => deleteAlert(alert.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Types Grid */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">All Alert Types</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {ALERT_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => { setForm(f => ({ ...f, type: t.id })); setShowCreate(true); setStep(2); }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-left hover:border-blue-400 hover:shadow-sm transition-all"
            >
              <div className="text-2xl mb-1">{t.icon}</div>
              <div className="text-xs font-bold text-gray-900 dark:text-white">{t.label}</div>
              <div className="text-xs text-gray-400 mt-0.5 leading-tight">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* CREATE ALERT MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Alert — Step {step}/3</h3>
              <button onClick={() => { setShowCreate(false); setStep(1); }} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
            </div>

            {/* Progress */}
            <div className="px-6 pt-3 pb-0">
              <div className="flex gap-1">
                {[1,2,3].map(s => (
                  <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Alert Type</span><span>Stock & Target</span><span>Delivery</span>
              </div>
            </div>

            <div className="p-6">
              {/* Step 1: Choose type */}
              {step === 1 && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">What kind of alert do you want?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALERT_TYPES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setForm(f => ({ ...f, type: t.id })); setStep(2); }}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:border-blue-400 ${form.type === t.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                        <span className="text-xl flex-shrink-0">{t.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-gray-900 dark:text-white">{t.label}</div>
                          <div className="text-xs text-gray-400 leading-tight">{t.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Stock + target */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Stock Symbol</label>
                    <input
                      value={symbolSearch}
                      onChange={e => { setSymbolSearch(e.target.value); setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() })); }}
                      placeholder="e.g. RELIANCE, TCS..."
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {symbolSearch && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {filteredSymbols.slice(0, 8).map(s => (
                          <button key={s} onClick={() => { setForm(f => ({ ...f, symbol: s, name: s })); setSymbolSearch(s); }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${form.symbol === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {typeNeedsTarget(form.type) && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        {form.type === 'price_above' || form.type === 'price_below' ? 'Target Price (₹)' :
                         form.type === 'pct_change' ? 'Daily Change Threshold (%)' :
                         form.type === 'volume_spike' ? 'Volume Multiplier (× average)' :
                         form.type === 'earnings' ? 'Remind N days before earnings' : 'Target Value'}
                      </label>
                      <input
                        type="number"
                        value={form.target}
                        onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                        placeholder={form.type === 'price_above' ? 'e.g. 3000' : form.type === 'pct_change' ? 'e.g. 3' : form.type === 'volume_spike' ? 'e.g. 3' : 'e.g. 7'}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Note (optional)</label>
                    <input
                      value={form.note}
                      onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                      placeholder="Your reminder note..."
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Delivery */}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">How should we notify you?</p>
                  <div className="space-y-2">
                    {DELIVERY_CHANNELS.map(ch => {
                      const selected = form.channels.includes(ch.id);
                      const needsSetup = ch.id === 'telegram' || ch.id === 'email';
                      return (
                        <button
                          key={ch.id}
                          onClick={() => setForm(f => ({
                            ...f,
                            channels: selected ? f.channels.filter(c => c !== ch.id) : [...f.channels, ch.id]
                          }))}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-200 dark:border-gray-700'}`}
                        >
                          <span className="text-2xl">{ch.icon}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">{ch.label}</div>
                            <div className="text-xs text-gray-500">{ch.desc}</div>
                            {needsSetup && !selected && <div className="text-xs text-orange-500 mt-0.5">Requires setup in Integrations</div>}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                            {selected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setForm(f => ({ ...f, repeat: !f.repeat }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${form.repeat ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.repeat ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Repeat alert (notify every time condition is met)</span>
                  </label>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-3 mt-6">
                {step > 1 && (
                  <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    Back
                  </button>
                )}
                {step < 3 ? (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    disabled={step === 1 && !form.type || step === 2 && !form.symbol}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-bold transition-colors"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={createAlert}
                    disabled={!form.symbol || !form.type || form.channels.length === 0}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl font-bold transition-colors"
                  >
                    ✅ Create Alert
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
