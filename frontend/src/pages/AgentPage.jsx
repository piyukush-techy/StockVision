// AgentPage.jsx — AI Analyst Agent (Coming Soon)
export default function AgentPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
        <span className="text-4xl">🤖</span>
      </div>
      <h1 className="text-white font-bold text-3xl mb-3">AI Analyst Agent</h1>
      <p className="text-gray-400 text-lg mb-6">
        The full AI chat agent is built and ready — it just needs an AI API key to run.
      </p>
      <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 text-left mb-6">
        <p className="text-gray-300 font-semibold mb-4">When you're ready, add ONE of these to <code className="bg-gray-700 px-1.5 py-0.5 rounded text-blue-300 text-sm">backend/.env</code>:</p>
        <div className="space-y-3">
          {[
            { key: 'OPENAI_API_KEY', label: 'OpenAI GPT-4o-mini', note: '~₹0.01 per conversation · No quotas · Recommended', url: 'platform.openai.com', color: 'text-green-400' },
            { key: 'GEMINI_API_KEY', label: 'Google Gemini',       note: 'Free tier limited · Paid plan for production',        url: 'aistudio.google.com',  color: 'text-blue-400'  },
          ].map(({ key, label, note, url, color }) => (
            <div key={key} className="bg-gray-900/60 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-bold text-sm ${color}`}>{label}</span>
                <span className="text-gray-600 text-xs">·</span>
                <a href={`https://${url}`} target="_blank" rel="noreferrer" className="text-xs text-gray-500 underline hover:text-gray-300">{url}</a>
              </div>
              <code className="text-gray-300 text-xs block mb-1">{key}=your_key_here</code>
              <p className="text-gray-600 text-xs">{note}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-4 text-left">
        <p className="text-blue-300 font-semibold text-sm mb-2">🚀 What you'll get when activated:</p>
        <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
          {['Live watchlist Q&A', 'Historical scanner via chat', 'Market regime analysis', 'Stock news & sentiment', 'Financial ratios on demand', 'Hindi language support'].map(f => (
            <div key={f} className="flex items-center gap-1.5"><span className="text-blue-400">•</span>{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
