// MultiAIChatPage.jsx — Phase 6: Multi-AI Chat (Claude + ChatGPT + Gemini)
// Compare responses from 3 AI models side by side
import { useState, useRef, useEffect } from 'react';

const MODELS = [
  {
    id: 'claude',
    name: 'Claude',
    subtitle: 'Sonnet 4',
    icon: '◈',
    color: 'orange',
    headerBg: 'bg-orange-900/30',
    border: 'border-orange-500/30',
    dot: 'bg-orange-400',
    dotGlow: 'shadow-orange-400/50',
    bubble: 'bg-orange-900/20 border-orange-500/20',
    userBubble: 'bg-orange-950/40 border-orange-500/30',
    accent: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    enabled: true,
    apiKeyNeeded: false,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    subtitle: 'GPT-4o',
    icon: '⬡',
    color: 'emerald',
    headerBg: 'bg-emerald-900/30',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    dotGlow: 'shadow-emerald-400/50',
    bubble: 'bg-emerald-900/20 border-emerald-500/20',
    userBubble: 'bg-emerald-950/40 border-emerald-500/30',
    accent: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    enabled: false,
    apiKeyNeeded: true,
    placeholder: 'sk-proj-...',
    envKey: 'OPENAI_KEY',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    subtitle: '1.5 Pro',
    icon: '✦',
    color: 'blue',
    headerBg: 'bg-blue-900/30',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400',
    dotGlow: 'shadow-blue-400/50',
    bubble: 'bg-blue-900/20 border-blue-500/20',
    userBubble: 'bg-blue-950/40 border-blue-500/30',
    accent: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    enabled: false,
    apiKeyNeeded: true,
    placeholder: 'AIza...',
    envKey: 'GEMINI_KEY',
  },
];

// ── API callers ────────────────────────────────────────────────────────────────

async function callClaude(messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Claude API error');
  return data.content?.[0]?.text || 'No response.';
}

async function callChatGPT(messages, apiKey) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'ChatGPT API error');
  return data.choices?.[0]?.message?.content || 'No response.';
}

async function callGemini(messages, apiKey) {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API error');
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
}

// ── TypingDots ────────────────────────────────────────────────────────────────

function TypingDots({ accentClass }) {
  return (
    <div className="flex gap-1 items-center py-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${accentClass.replace('text-', 'bg-')} opacity-70`}
          style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

// ── Single chat panel ─────────────────────────────────────────────────────────

function ChatPanel({ model, messages, isTyping, active, onToggle }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  return (
    <div className={`flex flex-col bg-gray-900 rounded-xl border ${model.border} overflow-hidden flex-1 min-w-0 transition-all duration-300 ${!active ? 'opacity-40 scale-95' : ''}`}>
      {/* Header */}
      <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${model.border} ${model.headerBg}`}>
        <span className={`text-xl ${model.accent}`}>{model.icon}</span>
        <div>
          <div className={`font-bold text-sm tracking-wide ${model.accent}`}>{model.name}</div>
          <div className="text-xs text-gray-500 uppercase tracking-widest">{model.subtitle}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Status dot */}
          <div className={`w-2 h-2 rounded-full ${active && model.enabled ? model.dot + ' shadow-lg ' + model.dotGlow : 'bg-gray-600'}`} />
          {/* Toggle active */}
          <button
            onClick={onToggle}
            className={`text-xs px-2 py-0.5 rounded-full border transition-all ${active ? model.badge : 'bg-gray-800 text-gray-500 border-gray-700'}`}
          >
            {active ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-[500px]">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className={`text-4xl mb-3 ${model.accent}`}>{model.icon}</div>
            {model.enabled ? (
              <>
                <p className="text-gray-400 text-sm">Ready to chat</p>
                <p className="text-gray-600 text-xs mt-1">Type a message below</p>
              </>
            ) : (
              <>
                <p className={`text-sm ${model.accent}`}>API Key Required</p>
                <p className="text-gray-600 text-xs mt-1">Add your {model.name} key in Settings ↓</p>
              </>
            )}
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] px-3.5 py-2.5 rounded-xl border text-sm leading-relaxed whitespace-pre-wrap break-words
                ${msg.role === 'user'
                  ? `${model.userBubble} text-gray-300`
                  : msg.isError
                    ? 'bg-red-900/30 border-red-500/30 text-red-300'
                    : `${model.bubble} text-gray-200`
                }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing */}
        {isTyping && (
          <div className="flex justify-start">
            <div className={`px-3.5 py-2.5 rounded-xl border ${model.bubble}`}>
              <TypingDots accentClass={model.accent} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MultiAIChatPage() {
  const [input, setInput]         = useState('');
  const [apiKeys, setApiKeys]     = useState({ chatgpt: '', gemini: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [activeIds, setActiveIds] = useState(['claude', 'chatgpt', 'gemini']);
  const [conversations, setConversations] = useState({ claude: [], chatgpt: [], gemini: [] });
  const [typing, setTyping]       = useState({ claude: false, chatgpt: false, gemini: false });
  const textareaRef = useRef(null);

  // Build live model list with enabled state
  const models = MODELS.map(m => ({
    ...m,
    enabled: m.id === 'claude' || (m.id === 'chatgpt' && apiKeys.chatgpt) || (m.id === 'gemini' && apiKeys.gemini),
  }));

  const toggleModel = (id) => {
    setActiveIds(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(x => x !== id) : prev   // keep at least 1
        : [...prev, id]
    );
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    const userMsg = { role: 'user', content: text };

    // Append user message to all active conversations
    setConversations(prev => {
      const next = { ...prev };
      activeIds.forEach(id => { next[id] = [...next[id], userMsg]; });
      return next;
    });

    // Call each active + enabled model
    for (const model of models.filter(m => activeIds.includes(m.id) && m.enabled)) {
      setTyping(prev => ({ ...prev, [model.id]: true }));

      const history = [...conversations[model.id], userMsg];

      const callFn =
        model.id === 'claude'   ? () => callClaude(history) :
        model.id === 'chatgpt'  ? () => callChatGPT(history, apiKeys.chatgpt) :
                                   () => callGemini(history, apiKeys.gemini);

      callFn()
        .then(response => {
          setConversations(prev => ({
            ...prev,
            [model.id]: [...prev[model.id], { role: 'assistant', content: response }],
          }));
        })
        .catch(err => {
          setConversations(prev => ({
            ...prev,
            [model.id]: [...prev[model.id], { role: 'assistant', content: `⚠️ Error: ${err.message}`, isError: true }],
          }));
        })
        .finally(() => {
          setTyping(prev => ({ ...prev, [model.id]: false }));
        });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearAll = () => {
    setConversations({ claude: [], chatgpt: [], gemini: [] });
  };

  const visibleModels = models.filter(m => activeIds.includes(m.id));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>

      <div className="max-w-screen-2xl mx-auto px-4 py-6">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">🤖</span>
              <h1 className="text-2xl font-bold text-white">Multi-AI Chat</h1>
              <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full font-medium">
                Phase 6 · Month 28
              </span>
            </div>
            <p className="text-gray-400 text-sm">Compare Claude, ChatGPT & Gemini side by side — ask once, see all answers</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Model toggles */}
            {models.map(m => (
              <button
                key={m.id}
                onClick={() => toggleModel(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  activeIds.includes(m.id) ? m.badge : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-600'
                }`}
              >
                <span>{m.icon}</span> {m.name}
              </button>
            ))}

            {/* Settings toggle */}
            <button
              onClick={() => setShowSettings(s => !s)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                showSettings ? 'bg-gray-700 border-gray-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              ⚙ Settings
            </button>

            {/* Clear */}
            <button
              onClick={clearAll}
              className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-400 hover:text-red-400 hover:border-red-500/40 text-xs font-medium transition-all"
            >
              🗑 Clear
            </button>
          </div>
        </div>

        {/* ── Settings Panel ── */}
        {showSettings && (
          <div className="mb-5 p-4 bg-gray-900 rounded-xl border border-gray-700 animate-in">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">🔑 API Keys</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { id: 'chatgpt', label: 'OpenAI API Key (for ChatGPT)', placeholder: 'sk-proj-...', icon: '⬡' },
                { id: 'gemini',  label: 'Google API Key (for Gemini)',   placeholder: 'AIza...',     icon: '✦' },
              ].map(k => (
                <div key={k.id}>
                  <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">
                    {k.icon} {k.label}
                  </label>
                  <input
                    type="password"
                    placeholder={k.placeholder}
                    value={apiKeys[k.id]}
                    onChange={e => setApiKeys(prev => ({ ...prev, [k.id]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 font-mono"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3">
              ◈ Claude works out of the box — no key needed. Keys for ChatGPT & Gemini are stored in memory only (never saved to server).
            </p>
          </div>
        )}

        {/* ── Chat Panels ── */}
        <div className={`flex gap-4 mb-4 items-stretch ${visibleModels.length === 1 ? 'max-w-2xl' : visibleModels.length === 2 ? 'max-w-4xl' : ''}`}>
          {visibleModels.map(model => (
            <ChatPanel
              key={model.id}
              model={model}
              messages={conversations[model.id]}
              isTyping={typing[model.id]}
              active={activeIds.includes(model.id)}
              onToggle={() => toggleModel(model.id)}
            />
          ))}
        </div>

        {/* ── Input Bar ── */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex gap-3 items-end">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask all ${activeIds.length} model${activeIds.length > 1 ? 's' : ''} at once... (Enter to send, Shift+Enter for new line)`}
              rows={2}
              className="w-full bg-transparent text-gray-200 placeholder-gray-600 resize-none outline-none text-sm leading-relaxed"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              input.trim()
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            Send →
          </button>
        </div>

        {/* Tips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            '📈 Analyse RELIANCE.NS for long-term investing',
            '🔬 Compare value vs growth investing strategies',
            '💡 Explain P/E ratio in simple terms',
            '🌊 What is the current market regime in India?',
          ].map(tip => (
            <button
              key={tip}
              onClick={() => setInput(tip.slice(3))}
              className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-lg text-gray-400 hover:text-gray-200 transition-all"
            >
              {tip}
            </button>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-700 mt-6">
          Multi-AI Chat · StockVision Phase 6 · Not financial advice
        </p>
      </div>
    </div>
  );
}
