// UsageDashboard.jsx - Show user's subscription limits and usage
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useSessionId from '../hooks/useSessionId';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function UsageDashboard() {
  const sessionId = useSessionId();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, [sessionId]);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/subscription/${sessionId}`);
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch usage');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { subscription, usage, remaining, limits } = data;
  const isAdmin = subscription.isAdmin;

  const getTierBadgeColor = (tier) => {
    const colors = {
      'FREE': 'bg-gray-100 text-gray-700',
      'PRO': 'bg-blue-100 text-blue-700',
      'PREMIUM': 'bg-purple-100 text-purple-700',
      'ADMIN': 'bg-yellow-100 text-yellow-700'
    };
    return colors[tier] || colors['FREE'];
  };

  const UsageBar = ({ label, used, limit, icon }) => {
    const isUnlimited = limit === 'UNLIMITED';
    const percentage = isUnlimited ? 100 : Math.min(100, (used / limit) * 100);
    const isWarning = percentage > 80 && !isUnlimited;
    
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-700 dark:text-gray-300">
            {icon} {label}
          </span>
          <span className={`font-semibold ${isWarning ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
            {used} / {isUnlimited ? '∞' : limit}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              isUnlimited ? 'bg-green-500' :
              isWarning ? 'bg-red-500' :
              percentage > 50 ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        {!isUnlimited && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {remaining[label.toLowerCase().replace(' ', '')]} remaining this month
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Your Subscription
        </h2>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getTierBadgeColor(subscription.tier)}`}>
          {subscription.tier} {isAdmin && '👑'}
        </span>
      </div>

      {/* Admin Notice */}
      {isAdmin && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-2xl">👑</span>
            <div>
              <h3 className="font-bold text-yellow-800 dark:text-yellow-200">Admin Access</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                You have unlimited access to all features. No usage limits apply to you!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Usage Stats */}
      {!isAdmin && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Monthly Usage
          </h3>
          
          <UsageBar
            label="Scanner runs"
            used={usage.scannerRuns}
            limit={limits.scannerRuns}
            icon="🔍"
          />
          
          <UsageBar
            label="Regime checks"
            used={usage.regimeChecks}
            limit={limits.regimeChecks}
            icon="🌊"
          />
          
          <UsageBar
            label="Portfolio analyses"
            used={usage.portfolioAnalyses}
            limit={limits.portfolioAnalyses}
            icon="📊"
          />
        </div>
      )}

      {/* Subscription Details */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500 dark:text-gray-400">Status</div>
            <div className={`font-semibold ${subscription.isActive ? 'text-green-600' : 'text-red-600'}`}>
              {subscription.isActive ? '✓ Active' : '✗ Inactive'}
            </div>
          </div>
          
          {subscription.expiryDate && !isAdmin && (
            <div>
              <div className="text-gray-500 dark:text-gray-400">Expires</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {new Date(subscription.expiryDate).toLocaleDateString('en-IN')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      {subscription.tier === 'FREE' && !isAdmin && (
        <Link to="/pricing">
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
            🚀 Upgrade for More Features
          </button>
        </Link>
      )}

      {subscription.tier !== 'FREE' && subscription.tier !== 'ADMIN' && (
        <div className="flex gap-2">
          <Link to="/pricing" className="flex-1">
            <button className="w-full py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors">
              Change Plan
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
