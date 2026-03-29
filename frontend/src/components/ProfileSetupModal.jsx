// components/ProfileSetupModal.jsx
// Shown automatically after first login / Google sign-in
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const STEPS = ['Personal', 'Investing', 'Done'];

const INVESTMENT_STYLES = ['Value Investing', 'Growth Investing', 'Momentum Trading', 'Swing Trading', 'Day Trading', 'Buy & Hold', 'Dividend Investing'];
const EXPERIENCE_LEVELS = ['Beginner (< 1 year)', 'Intermediate (1–3 years)', 'Experienced (3–7 years)', 'Expert (7+ years)'];
const RISK_LEVELS       = ['Conservative', 'Moderate', 'Aggressive', 'Very Aggressive'];
const OCCUPATIONS       = ['Student', 'Salaried Employee', 'Business Owner', 'Self-Employed', 'Retired', 'Other'];

export default function ProfileSetupModal() {
  const { user, profile, saveProfile, setNeedsProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    displayName:     profile?.displayName || user?.displayName || '',
    phone:           profile?.phone       || '',
    location:        profile?.location    || '',
    occupation:      profile?.occupation  || '',
    bio:             profile?.bio         || '',
    investmentStyle: profile?.investmentStyle || '',
    experience:      profile?.experience      || '',
    riskTolerance:   profile?.riskTolerance   || '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function handleFinish() {
    setSaving(true);
    try {
      await saveProfile(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center gap-3">
            {user?.photoURL
              ? <img src={user.photoURL} className="w-12 h-12 rounded-full border-2 border-white/40" alt="avatar" />
              : <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
                  {(form.displayName || user?.email || '?')[0].toUpperCase()}
                </div>
            }
            <div>
              <h2 className="text-white font-bold text-lg">Complete Your Profile</h2>
              <p className="text-blue-200 text-sm">Help us personalise your experience</p>
            </div>
          </div>

          {/* Step progress */}
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step  ? 'bg-white text-blue-600' :
                  i === step ? 'bg-white/30 text-white border border-white/50' :
                               'bg-white/10 text-white/40'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs ${i <= step ? 'text-white' : 'text-white/40'}`}>{s}</span>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-white/20" />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-96 overflow-y-auto">

          {/* Step 0 — Personal */}
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Full Name *" required>
                <input value={form.displayName} onChange={e => set('displayName', e.target.value)}
                  placeholder="Arjun Sharma"
                  className={input} />
              </Field>
              <Field label="Phone Number">
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+91 98765 43210" type="tel"
                  className={input} />
              </Field>
              <Field label="City / Location">
                <input value={form.location} onChange={e => set('location', e.target.value)}
                  placeholder="Mumbai, Maharashtra"
                  className={input} />
              </Field>
              <Field label="Occupation">
                <select value={form.occupation} onChange={e => set('occupation', e.target.value)} className={input}>
                  <option value="">Select occupation</option>
                  {OCCUPATIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Short Bio (optional)">
                <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
                  placeholder="Tell us a bit about yourself and your financial goals..."
                  rows={3} className={input + ' resize-none'} />
              </Field>
            </div>
          )}

          {/* Step 1 — Investing */}
          {step === 1 && (
            <div className="space-y-4">
              <Field label="Investment Style *">
                <div className="grid grid-cols-2 gap-2">
                  {INVESTMENT_STYLES.map(s => (
                    <button key={s} type="button"
                      onClick={() => set('investmentStyle', s)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all text-left ${
                        form.investmentStyle === s
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Experience Level *">
                <div className="space-y-2">
                  {EXPERIENCE_LEVELS.map(e => (
                    <button key={e} type="button"
                      onClick={() => set('experience', e)}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium border transition-all text-left ${
                        form.experience === e
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                      }`}>
                      {e}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Risk Tolerance *">
                <div className="grid grid-cols-2 gap-2">
                  {RISK_LEVELS.map(r => (
                    <button key={r} type="button"
                      onClick={() => set('riskTolerance', r)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        form.riskTolerance === r
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* Step 2 — Done */}
          {step === 2 && (
            <div className="text-center py-6">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                You're all set, {form.displayName.split(' ')[0]}!
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Your profile is ready. Let's start analyzing the markets.
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-left space-y-2 text-sm">
                {form.investmentStyle && <div className="flex justify-between"><span className="text-gray-500">Style</span><span className="font-medium dark:text-white">{form.investmentStyle}</span></div>}
                {form.experience      && <div className="flex justify-between"><span className="text-gray-500">Experience</span><span className="font-medium dark:text-white">{form.experience}</span></div>}
                {form.riskTolerance   && <div className="flex justify-between"><span className="text-gray-500">Risk</span><span className="font-medium dark:text-white">{form.riskTolerance}</span></div>}
                {form.location        && <div className="flex justify-between"><span className="text-gray-500">Location</span><span className="font-medium dark:text-white">{form.location}</span></div>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          {step > 0 && step < 2 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
              Back
            </button>
          )}

          {step === 0 && (
            <button
              onClick={() => { if (!form.displayName.trim()) { alert('Please enter your name'); return; } setStep(1); }}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all">
              Next →
            </button>
          )}

          {step === 1 && (
            <button onClick={() => setStep(2)}
              disabled={!form.investmentStyle || !form.experience || !form.riskTolerance}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-40">
              Next →
            </button>
          )}

          {step === 2 && (
            <button onClick={handleFinish} disabled={saving}
              className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all">
              {saving ? 'Saving...' : '🚀 Go to Dashboard'}
            </button>
          )}

          {/* Skip for now */}
          {step < 2 && (
            <button onClick={() => setNeedsProfile(false)}
              className="text-gray-400 hover:text-gray-600 text-sm px-3">
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// helper
const input = 'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}
