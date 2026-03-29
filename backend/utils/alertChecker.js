const cron = require('node-cron');
const Alert = require('../models/Alert');
const Stock = require('../models/Stock');

/**
 * Alert Checker
 * Runs every minute to check if any price alerts are triggered
 */

async function checkAlerts() {
  try {
    // Get all active alerts
    const activeAlerts = await Alert.find({ isActive: true, triggered: false });

    if (activeAlerts.length === 0) return;

    for (const alert of activeAlerts) {
      // Get current price from DB
      const stock = await Stock.findOne({ symbol: alert.symbol }).select('liveData.price');

      if (!stock || !stock.liveData?.price) continue;

      const currentPrice = stock.liveData.price;
      let shouldTrigger = false;

      if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
        shouldTrigger = true;
      } else if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        alert.triggered = true;
        alert.isActive = false;
        alert.triggeredAt = new Date();
        alert.triggeredPrice = currentPrice;
        await alert.save();

        console.log(`🔔 Alert triggered: ${alert.symbol} is ${alert.condition} ₹${alert.targetPrice} (current: ₹${currentPrice})`);
      }
    }
  } catch (err) {
    console.error('Alert check error:', err);
  }
}

function startAlertChecker() {
  console.log('🔔 Alert checker started (every minute)');

  // Run every minute
  cron.schedule('* * * * *', () => {
    checkAlerts();
  });
}

module.exports = { startAlertChecker, checkAlerts };
