// background.js — StockVision Chrome Extension Service Worker
// Handles: price alert checking, alarm scheduling, badge updates

const DEFAULT_API = 'http://localhost:5000/api';

// ── Alarm handler: check price alerts ─────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkAlerts') {
    await checkAlerts();
  }
});

// ── On install: create recurring alarm ────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('checkAlerts', { periodInMinutes: 1 });
  console.log('[StockVision] Extension installed. Alert checker running every 1 min.');
});

// ── Check alerts ──────────────────────────────────────────────────────────────
async function checkAlerts() {
  const { sessionId, apiBase } = await chrome.storage.local.get(['sessionId', 'apiBase']);
  if (!sessionId) return;

  const API = (apiBase || DEFAULT_API);

  try {
    const res  = await fetch(`${API}/alerts/${sessionId}`);
    const data = await res.json();
    const alerts = data.alerts || data.data || [];

    for (const alert of alerts) {
      if (alert.triggered || alert.status === 'triggered') continue;

      // Fetch current price
      const priceRes = await fetch(`${API}/stocks/${alert.symbol}`);
      const priceData = await priceRes.json();
      const price = (priceData.data || priceData)?.currentPrice;

      if (!price) continue;

      const triggered =
        (alert.condition === 'above' && price >= alert.targetPrice) ||
        (alert.condition === 'below' && price <= alert.targetPrice);

      if (triggered) {
        // Show browser notification
        chrome.notifications.create(`alert_${alert._id}`, {
          type:    'basic',
          iconUrl: 'icons/icon48.png',
          title:   `🔔 StockVision Alert: ${alert.symbol.replace('.NS','')}`,
          message: `${alert.symbol.replace('.NS','')} is ${alert.condition} ₹${alert.targetPrice.toLocaleString('en-IN')}\nCurrent price: ₹${price.toLocaleString('en-IN')}`,
          priority: 2,
        });

        // Update badge
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });

        // Mark as triggered via API
        fetch(`${API}/alerts/${alert._id}/trigger`, { method: 'POST' }).catch(() => {});
      }
    }
  } catch (err) {
    // Silently ignore (API might be offline)
  }
}

// ── Clear badge when popup opens ──────────────────────────────────────────────
chrome.action.onClicked.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});

// ── Handle notification click: open stock page ────────────────────────────────
chrome.notifications.onClicked.addListener(async (notifId) => {
  const { apiBase } = await chrome.storage.local.get('apiBase');
  const base = (apiBase || DEFAULT_API).replace('/api', '').replace(':5000', ':5173');
  chrome.tabs.create({ url: base + '/' });
});
