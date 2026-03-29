// pages/UserDashboard.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const INVESTMENT_STYLES = ['Value Investing', 'Growth Investing', 'Momentum Trading', 'Swing Trading', 'Day Trading', 'Buy & Hold', 'Dividend Investing'];
const EXPERIENCE_LEVELS = ['Beginner (< 1 year)', 'Intermediate (1–3 years)', 'Experienced (3–7 years)', 'Expert (7+ years)'];
const RISK_LEVELS       = ['Conservative', 'Moderate', 'Aggressive', 'Very Aggressive'];
const OCCUPATIONS       = ['Student', 'Salaried Employee', 'Business Owner', 'Self-Employed', 'Retired', 'Other'];

const RISK_COLOR = {
  Conservative:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Moderate:        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Aggressive:      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'Very Aggressive':'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function UserDashboard() {
  const { user, profile, saveProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [form,     setForm]     = useState({
    displayName:     profile?.displayName     || '',
    phone:           profile?.phone           || '',
    location:        profile?.location        || '',
    occupation:      profile?.occupation      || '',
    bio:             profile?.bio             || '',
    investmentStyle: profile?.investmentStyle || '',
    experience:      profile?.experience      || '',
    riskTolerance:   profile?.riskTolerance   || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    try {
      await saveProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setEditing(false);
    } finally { setSaving(false); }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const avatar = user?.photoURL;
  const initials = (profile?.displayName || user?.email || 'U')[0].toUpperCase();
  const joinDate = profile?.createdAt?.toDate
    ? profile.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Recently';
  const lastLogin = profile?.lastLogin?.toDate
    ? profile.lastLogin.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : 'Today';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Top header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">My Dashboard</h1>
        <div className="flex gap-2">
          {!editing
            ? <button onClick={() => setEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all">
                ✏️ Edit Profile
              </button>
            : <>
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50">
                  {saving ? 'Saving...' : '✓ Save Changes'}
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  Cancel
                </button>
              </>
          }
          <button onClick={handleLogout}
            className="px-4 py-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
            Sign Out
          </button>
        </div>
      </div>

      {saved && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl px-4 py-3 text-sm font-medium">
          ✅ Profile updated successfully
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column: Avatar + identity ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Profile card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 text-center shadow-sm">
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              {avatar
                ? <img src={avatar} alt="avatar" className="w-24 h-24 rounded-2xl shadow-lg object-cover" />
                : <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg">
                    {initials}
                  </div>
              }
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" title="Online" />
            </div>

            {editing
              ? <input value={form.displayName} onChange={e => set('displayName', e.target.value)}
                  className={iClass + ' text-center text-lg font-bold mb-1'} placeholder="Your Name" />
              : <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                  {profile?.displayName || user?.displayName || 'User'}
                </h2>
            }

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{user?.email}</p>

            {profile?.riskTolerance && (
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${RISK_COLOR[profile.riskTolerance] || 'bg-gray-100 text-gray-700'}`}>
                {profile.riskTolerance} Risk
              </span>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-between"><span>Member since</span><span className="font-medium text-gray-700 dark:text-gray-300">{joinDate}</span></div>
              <div className="flex justify-between"><span>Last active</span><span className="font-medium text-gray-700 dark:text-gray-300">{lastLogin}</span></div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">📊 Quick Stats</h3>
            <div className="space-y-3">
              <StatRow emoji="🔍" label="Scans run" value="—" />
              <StatRow emoji="👁️" label="Stocks watched" value="—" />
              <StatRow emoji="🔔" label="Alerts active" value="—" />
              <StatRow emoji="💰" label="Capital checks" value="—" />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-3">Stats tracked as you use the app</p>
          </div>
        </div>

        {/* ── Right column: Details ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Personal Info */}
          <Section title="👤 Personal Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditField label="Phone" editing={editing}
                value={form.phone} display={profile?.phone || '—'}
                onChange={v => set('phone', v)} placeholder="+91 98765 43210" />
              <EditField label="Location" editing={editing}
                value={form.location} display={profile?.location || '—'}
                onChange={v => set('location', v)} placeholder="Mumbai, Maharashtra" />
              <div className="sm:col-span-2">
                {editing
                  ? <div>
                      <Label>Occupation</Label>
                      <select value={form.occupation} onChange={e => set('occupation', e.target.value)} className={iClass}>
                        <option value="">Select occupation</option>
                        {OCCUPATIONS.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  : <DisplayField label="Occupation" value={profile?.occupation || '—'} />
                }
              </div>
              <div className="sm:col-span-2">
                {editing
                  ? <div>
                      <Label>Bio</Label>
                      <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
                        rows={3} placeholder="Tell us about yourself and your investment goals..."
                        className={iClass + ' resize-none'} />
                    </div>
                  : <DisplayField label="Bio" value={profile?.bio || '—'} />
                }
              </div>
            </div>
          </Section>

          {/* Investment Profile */}
          <Section title="📈 Investment Profile">
            {editing ? (
              <div className="space-y-5">
                <div>
                  <Label>Investment Style</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                    {INVESTMENT_STYLES.map(s => (
                      <button key={s} type="button" onClick={() => set('investmentStyle', s)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all text-left ${
                          form.investmentStyle === s
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Experience Level</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {EXPERIENCE_LEVELS.map(e => (
                      <button key={e} type="button" onClick={() => set('experience', e)}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                          form.experience === e
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                        }`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Risk Tolerance</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {RISK_LEVELS.map(r => (
                      <button key={r} type="button" onClick={() => set('riskTolerance', r)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                          form.riskTolerance === r
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                        }`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InvestCard emoji="🎯" label="Investment Style" value={profile?.investmentStyle || '—'} />
                <InvestCard emoji="📅" label="Experience" value={profile?.experience || '—'} />
                <InvestCard emoji="⚡" label="Risk Tolerance" value={profile?.riskTolerance || '—'} />
              </div>
            )}
          </Section>

          {/* Account Info */}
          <Section title="🔐 Account Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DisplayField label="Email" value={user?.email || '—'} />
              <DisplayField label="Account Type"
                value={user?.providerData?.[0]?.providerId === 'google.com' ? 'Google Account' : 'Email & Password'} />
              <DisplayField label="Email Verified" value={user?.emailVerified ? '✅ Verified' : '⚠️ Not verified'} />
              <DisplayField label="User ID" value={user?.uid?.slice(0, 12) + '...' || '—'} />
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{children}</label>;
}

function DisplayField({ label, value }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="text-sm text-gray-900 dark:text-white font-medium">{value}</p>
    </div>
  );
}

function EditField({ label, editing, value, display, onChange, placeholder }) {
  return (
    <div>
      <Label>{label}</Label>
      {editing
        ? <input value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} className={iClass} />
        : <p className="text-sm text-gray-900 dark:text-white font-medium">{display}</p>
      }
    </div>
  );
}

function InvestCard({ emoji, label, value }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
      <div className="text-xl mb-1">{emoji}</div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
    </div>
  );
}

function StatRow({ emoji, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600 dark:text-gray-400">{emoji} {label}</span>
      <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

const iClass = 'w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
