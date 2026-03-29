// PWAInstallBanner.jsx — Month 27: PWA Install Prompt
import { useState, useEffect } from 'react';

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow]     = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS]   = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or installed
    if (localStorage.getItem('sv_pwa_dismissed')) return;

    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone;
    if (standalone) { setInstalled(true); return; }

    if (ios) {
      // Show iOS guide after a short delay
      setTimeout(() => setShow(true), 3000);
      return;
    }

    // Android / Desktop Chrome — capture the beforeinstallprompt event
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setTimeout(() => setShow(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setShow(false);
    setPrompt(null);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('sv_pwa_dismissed', '1');
  };

  if (!show || installed) return null;

  // iOS guide
  if (isIOS && showIOSGuide) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[300] bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-700 rounded-2xl shadow-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">Add to Home Screen</span>
          </div>
          <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 text-xs">1</span>
            <span>Tap the <strong className="text-gray-900 dark:text-white">Share</strong> button <span className="text-lg">⎋</span> at the bottom of Safari</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 text-xs">2</span>
            <span>Scroll down and tap <strong className="text-gray-900 dark:text-white">"Add to Home Screen"</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 text-xs">3</span>
            <span>Tap <strong className="text-gray-900 dark:text-white">Add</strong> — StockVision will appear on your home screen!</span>
          </div>
        </div>
      </div>
    );
  }

  // iOS teaser (before showing full guide)
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[300] bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-700 rounded-2xl shadow-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white text-sm">Install StockVision</p>
          <p className="text-xs text-gray-500">Add to home screen for the best experience</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setShowIOSGuide(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">How?</button>
          <button onClick={dismiss} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-semibold">Later</button>
        </div>
      </div>
    );
  }

  // Android / Chrome install banner
  return (
    <div className="fixed bottom-4 left-4 right-4 z-[300] bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-700 rounded-2xl shadow-xl p-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white">Install StockVision</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Works offline · No Play Store needed · Fast launch</p>
        </div>
        <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">✕</button>
      </div>
      <div className="flex gap-3 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors"
        >
          📲 Install App
        </button>
        <button
          onClick={dismiss}
          className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
