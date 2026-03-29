// NLScannerPage.jsx — Natural Language Scanner (Coming Soon)
export default function NLScannerPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
        <span className="text-4xl">✨</span>
      </div>
      <h1 className="text-white font-bold text-3xl mb-3">Natural Language Scanner</h1>
      <p className="text-gray-400 text-lg mb-4">
        Type plain English → AI parses it → scanner runs across hundreds of stocks.
      </p>
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 text-left mb-6">
        <p className="text-gray-400 text-sm mb-3 font-medium">Example queries you'll be able to run:</p>
        {[
          '"Pharma stocks that hit 25% in 60 days more than 40% of the time"',
          '"Small cap IT stocks with less than 12% average drawdown"',
          '"Banking stocks that achieve 15% in 3 months"',
        ].map((ex, i) => (
          <div key={i} className="bg-gray-900/60 rounded-xl px-4 py-2.5 mb-2 text-gray-300 text-sm italic">{ex}</div>
        ))}
      </div>
      <p className="text-gray-500 text-sm">Activate by adding <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300">OPENAI_API_KEY</code> to <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300">backend/.env</code></p>
    </div>
  );
}
