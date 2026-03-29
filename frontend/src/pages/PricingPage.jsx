// PricingPage.jsx - Subscription Tiers & Payment
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useSessionId from '../hooks/useSessionId';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PricingPage() {
  const sessionId = useSessionId();
  const [billingCycle, setBillingCycle] = useState('YEARLY'); // Default to yearly (better value)
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCurrentSubscription();
  }, [sessionId]);

  const fetchCurrentSubscription = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/subscription/${sessionId}`);
      setCurrentSub(res.data.subscription);
    } catch (error) {
      console.error('Failed to fetch subscription');
    }
  };

  const handleUpgrade = async (tier) => {
    if (loading) return;
    
    const email = prompt('Enter your email address:');
    if (!email) return;
    
    const name = prompt('Enter your name:');
    if (!name) return;
    
    setLoading(true);
    
    try {
      // Create Razorpay order
      const orderRes = await axios.post(`${API_URL}/api/subscription/create-order`, {
        sessionId,
        tier,
        billingCycle,
        email,
        name
      });
      
      // Load Razorpay checkout
      const options = {
        key: orderRes.data.key,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: 'StockVision',
        description: `${tier} ${billingCycle} Subscription`,
        order_id: orderRes.data.orderId,
        handler: async function (response) {
          // Verify payment
          try {
            await axios.post(`${API_URL}/api/subscription/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              sessionId,
              tier,
              billingCycle
            });
            
            alert('✅ Payment successful! Your subscription is now active.');
            fetchCurrentSubscription();
            window.location.reload();
            
          } catch (error) {
            alert('❌ Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: name,
          email: email
        },
        theme: {
          color: '#2563eb'
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tiers = [
    {
      name: 'Free',
      tier: 'FREE',
      price: { MONTHLY: '₹0', YEARLY: '₹0' },
      features: [
        '5 scanner runs/month',
        '10 regime checks/month',
        '1 watchlist',
        '5 price alerts',
        'Basic search & news',
        'Live stock prices',
        'Basic charts'
      ],
      cta: 'Current Plan',
      color: 'gray',
      popular: false
    },
    {
      name: 'Pro',
      tier: 'PRO',
      price: { MONTHLY: '₹499/mo', YEARLY: '₹4,999/yr' },
      savings: { YEARLY: 'Save ₹1,000' },
      features: [
        '50 scanner runs/month',
        '100 regime checks/month',
        '10 portfolio analyses/month',
        '5 watchlists',
        '25 price alerts',
        'Full financial data',
        'Technical indicators',
        'Sentiment analysis',
        'Corporate events',
        'Shareholding patterns'
      ],
      cta: 'Upgrade to Pro',
      color: 'blue',
      popular: true
    },
    {
      name: 'Premium',
      tier: 'PREMIUM',
      price: { MONTHLY: '₹999/mo', YEARLY: '₹9,999/yr' },
      savings: { YEARLY: 'Save ₹2,000' },
      features: [
        'UNLIMITED scanner runs',
        'UNLIMITED regime checks',
        'UNLIMITED portfolio analyses',
        'UNLIMITED watchlists & alerts',
        'Priority support',
        'Advanced analytics',
        'Export to Excel/CSV',
        'API access (coming soon)',
        'All future features included'
      ],
      cta: 'Upgrade to Premium',
      color: 'purple',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      {/* Razorpay Script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Start free. Upgrade as you grow. Cancel anytime.
          </p>

          {/* Current Subscription Badge */}
          {currentSub && (
            <div className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-full mb-6">
              <span className="text-blue-800 dark:text-blue-200 font-semibold">
                Current Plan: {currentSub.tier}
                {currentSub.isAdmin && ' 👑 (Admin - Unlimited Access)'}
              </span>
            </div>
          )}

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                billingCycle === 'MONTHLY'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                billingCycle === 'YEARLY'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">
                Save up to 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {tiers.map((tier) => (
            <div
              key={tier.tier}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 ${
                tier.popular ? 'ring-2 ring-blue-600 scale-105' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {tier.name}
                </h3>
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                  {tier.price[billingCycle]}
                </div>
                {tier.savings && billingCycle === 'YEARLY' && (
                  <div className="text-sm text-green-600 dark:text-green-400 font-semibold">
                    {tier.savings.YEARLY}
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => tier.tier !== 'FREE' && handleUpgrade(tier.tier)}
                disabled={currentSub?.tier === tier.tier || loading || tier.tier === 'FREE'}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  currentSub?.tier === tier.tier
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : tier.tier === 'FREE'
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : `bg-${tier.color}-600 hover:bg-${tier.color}-700 text-white`
                }`}
              >
                {loading ? '⏳ Processing...' : 
                 currentSub?.tier === tier.tier ? '✓ Current Plan' :
                 tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes! You can cancel your subscription at any time. You'll retain access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                We accept all major credit/debit cards, UPI, net banking, and wallets via Razorpay.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Is my data secure?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Absolutely! All payments are processed securely through Razorpay. We never store your payment information.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I upgrade or downgrade later?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes! You can change your plan at any time. Upgrades take effect immediately, downgrades at the end of your billing cycle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
