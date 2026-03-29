// content.js — StockVision content script
// Injects a floating "View in StockVision" button when stock symbols are detected on supported sites

(function () {
  'use strict';

  const SUPPORTED = {
    'screener.in':         { selector: 'h1.h2', extract: (el) => el.textContent.trim().split('\n')[0].trim() },
    'moneycontrol.com':    { selector: '.pcstname, .yfnc_tablehead1', extract: (el) => el.textContent.trim() },
    'finance.yahoo.com':   { selector: '[data-symbol]', extract: (el) => el.dataset.symbol },
    'economictimes.indiatimes.com': { selector: '.company-name, .stockName', extract: (el) => el.textContent.trim() },
  };

  const hostname = location.hostname.replace('www.', '');
  const config   = Object.entries(SUPPORTED).find(([k]) => hostname.includes(k))?.[1];
  if (!config) return;

  let badge = null;

  function injectBadge(symbol) {
    if (badge) badge.remove();

    badge = document.createElement('div');
    badge.id = 'stockvision-badge';
    badge.innerHTML = `
      <div style="
        position:fixed; bottom:20px; right:20px; z-index:99999;
        background:linear-gradient(135deg,#1e3a8a,#1e40af);
        color:#fff; border-radius:12px; padding:10px 16px;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        font-size:13px; font-weight:600; cursor:pointer;
        box-shadow:0 4px 20px rgba(37,99,235,.5);
        display:flex; align-items:center; gap:8px;
        border:1px solid rgba(255,255,255,.1);
        transition:transform .2s;
      " id="sv-badge-inner">
        <span style="font-size:16px">📈</span>
        <div>
          <div style="font-size:11px;opacity:.7;line-height:1.2">View in</div>
          <div style="line-height:1.2">StockVision</div>
        </div>
      </div>
    `;
    document.body.appendChild(badge);

    badge.querySelector('#sv-badge-inner').addEventListener('click', () => {
      const appBase = 'http://localhost:5173'; // TODO: replace with production URL
      const nseSym  = symbol.includes('.NS') ? symbol : `${symbol.toUpperCase()}.NS`;
      window.open(`${appBase}/stock/${nseSym}`, '_blank');
    });

    badge.querySelector('#sv-badge-inner').addEventListener('mouseenter', (e) => {
      e.target.style.transform = 'scale(1.05)';
    });
    badge.querySelector('#sv-badge-inner').addEventListener('mouseleave', (e) => {
      e.target.style.transform = 'scale(1)';
    });
  }

  // Check for stock symbol on page
  function detectSymbol() {
    const el = document.querySelector(config.selector);
    if (!el) return;
    const name = config.extract(el);
    if (name && name.length > 1) {
      injectBadge(name.replace(/\s+/g, '').toUpperCase());
    }
  }

  // Run on load + after 2 seconds (for dynamic pages)
  detectSymbol();
  setTimeout(detectSymbol, 2000);

  // Watch for URL changes (SPAs)
  const observer = new MutationObserver(() => detectSymbol());
  observer.observe(document.body, { childList: true, subtree: true });

})();
