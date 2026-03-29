// routes/subscription.js - Subscription & Payment Management
// NOTE: This route is commented out in server.js until you set up Razorpay.
// To enable: uncomment the subscription lines in server.js and add RAZORPAY keys to .env
const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');

// Safe razorpay import (won't crash if package not installed)
let Razorpay;
try { Razorpay = require('razorpay'); } catch(e) { Razorpay = null; }

const crypto = require('crypto');

// Initialize Razorpay (you'll add keys in .env)
const razorpay = Razorpay ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxx',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_secret_key'
}) : null;

// Pricing configuration
const PRICING = {
  'PRO': {
    MONTHLY: { amount: 49900, currency: 'INR', display: '₹499/month' }, // in paise
    YEARLY: { amount: 499900, currency: 'INR', display: '₹4,999/year' }
  },
  'PREMIUM': {
    MONTHLY: { amount: 99900, currency: 'INR', display: '₹999/month' },
    YEARLY: { amount: 999900, currency: 'INR', display: '₹9,999/year' }
  }
};

// GET /api/subscription/:sessionId - Get user subscription
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    let subscription = await Subscription.findOne({ sessionId });
    
    if (!subscription) {
      // Create FREE tier subscription for new user
      subscription = new Subscription({
        sessionId,
        email: 'guest@stockvision.app',
        tier: 'FREE',
        status: 'ACTIVE'
      });
      await subscription.save();
    }
    
    // Get tier limits and remaining usage
    const limits = Subscription.getTierLimits(subscription.tier);
    const remaining = {
      scannerRuns: subscription.getRemainingUsage('scannerRuns'),
      regimeChecks: subscription.getRemainingUsage('regimeChecks'),
      portfolioAnalyses: subscription.getRemainingUsage('portfolioAnalyses')
    };
    
    res.json({
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        isActive: subscription.isActive(),
        isAdmin: subscription.isAdmin || subscription.tier === 'ADMIN',
        expiryDate: subscription.expiryDate,
        createdAt: subscription.createdAt
      },
      limits,
      usage: subscription.monthlyUsage,
      remaining
    });
    
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// POST /api/subscription/create-order - Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { sessionId, tier, billingCycle, email, name } = req.body;
    
    if (!sessionId || !tier || !billingCycle || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!['PRO', 'PREMIUM'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    
    const pricing = PRICING[tier][billingCycle];
    
    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: pricing.amount,
      currency: pricing.currency,
      receipt: `${sessionId}_${Date.now()}`,
      notes: {
        sessionId,
        tier,
        billingCycle,
        email
      }
    });
    
    // Update or create subscription (pending)
    let subscription = await Subscription.findOne({ sessionId });
    if (!subscription) {
      subscription = new Subscription({ sessionId, email, name });
    }
    
    subscription.email = email;
    subscription.name = name;
    subscription.razorpayOrderId = order.id;
    await subscription.save();
    
    res.json({
      orderId: order.id,
      amount: pricing.amount,
      currency: pricing.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
    
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// POST /api/subscription/verify-payment - Verify Razorpay payment
router.post('/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      sessionId,
      tier,
      billingCycle
    } = req.body;
    
    // Verify signature
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_secret_key')
      .update(text)
      .digest('hex');
    
    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }
    
    // Update subscription
    const subscription = await Subscription.findOne({ sessionId });
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    subscription.tier = tier;
    subscription.status = 'ACTIVE';
    subscription.razorpayPaymentId = razorpay_payment_id;
    subscription.billingCycle = billingCycle;
    subscription.amount = PRICING[tier][billingCycle].amount / 100; // Convert to rupees
    subscription.lastPaymentDate = new Date();
    subscription.startDate = new Date();
    
    // Set expiry date
    const expiryDate = new Date();
    if (billingCycle === 'MONTHLY') {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (billingCycle === 'YEARLY') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }
    subscription.expiryDate = expiryDate;
    
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Payment verified successfully',
      subscription: {
        tier: subscription.tier,
        expiryDate: subscription.expiryDate
      }
    });
    
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// POST /api/subscription/upgrade - Direct tier upgrade (admin only)
router.post('/upgrade', async (req, res) => {
  try {
    const { sessionId, tier, adminKey } = req.body;
    
    // Admin key check (set this in .env for your personal use)
    if (adminKey !== process.env.ADMIN_UPGRADE_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    let subscription = await Subscription.findOne({ sessionId });
    if (!subscription) {
      subscription = new Subscription({ sessionId, email: 'admin@stockvision.app' });
    }
    
    subscription.tier = tier;
    subscription.status = 'ACTIVE';
    subscription.isAdmin = (tier === 'ADMIN');
    
    if (tier === 'ADMIN') {
      subscription.expiryDate = null; // Never expires
    }
    
    await subscription.save();
    
    res.json({
      success: true,
      message: `Upgraded to ${tier}`,
      subscription: {
        tier: subscription.tier,
        isAdmin: subscription.isAdmin
      }
    });
    
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ error: 'Failed to upgrade' });
  }
});

// GET /api/subscription/pricing - Get pricing information
router.get('/pricing/info', (req, res) => {
  res.json({
    tiers: {
      FREE: {
        name: 'Free',
        price: '₹0',
        limits: Subscription.getTierLimits('FREE'),
        features: [
          '5 scanner runs/month',
          '10 regime checks/month',
          '1 watchlist',
          '5 price alerts',
          'Basic search & news',
          'Live stock prices'
        ]
      },
      PRO: {
        name: 'Pro',
        monthlyPrice: '₹499/month',
        yearlyPrice: '₹4,999/year',
        limits: Subscription.getTierLimits('PRO'),
        features: [
          '50 scanner runs/month',
          '100 regime checks/month',
          '10 portfolio analyses/month',
          '5 watchlists',
          '25 price alerts',
          'Full financial data',
          'Technical indicators',
          'Sentiment analysis',
          'Corporate events'
        ]
      },
      PREMIUM: {
        name: 'Premium',
        monthlyPrice: '₹999/month',
        yearlyPrice: '₹9,999/year',
        limits: Subscription.getTierLimits('PREMIUM'),
        features: [
          'UNLIMITED scanner runs',
          'UNLIMITED regime checks',
          'UNLIMITED portfolio analyses',
          'UNLIMITED watchlists & alerts',
          'Priority support',
          'API access (coming soon)',
          'Advanced analytics',
          'Export to Excel/CSV'
        ]
      }
    },
    pricing: PRICING
  });
});

// POST /api/subscription/cancel - Cancel subscription
router.post('/cancel', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const subscription = await Subscription.findOne({ sessionId });
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    subscription.status = 'CANCELLED';
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Subscription cancelled. Access continues until expiry date.',
      expiryDate: subscription.expiryDate
    });
    
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

module.exports = router;
