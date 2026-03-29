// RegimeTag.jsx - Regime Classification Badge
import React from 'react';

export default function RegimeTag({ regime, confidence, size = 'md', showConfidence = true }) {
  const getRegimeConfig = (regime) => {
    const configs = {
      'BULL': {
        label: 'Bull Market',
        icon: '📈',
        color: '#22c55e',
        bg: '#dcfce7',
        darkBg: '#14532d',
        description: 'Strong uptrend'
      },
      'VOLATILE_BULL': {
        label: 'Volatile Bull',
        icon: '⚡',
        color: '#f59e0b',
        bg: '#fef3c7',
        darkBg: '#78350f',
        description: 'Uptrend with high volatility'
      },
      'BEAR': {
        label: 'Bear Market',
        icon: '📉',
        color: '#dc2626',
        bg: '#fee2e2',
        darkBg: '#7f1d1d',
        description: 'Strong downtrend'
      },
      'VOLATILE_BEAR': {
        label: 'Volatile Bear',
        icon: '⚡',
        color: '#f59e0b',
        bg: '#fef3c7',
        darkBg: '#78350f',
        description: 'Downtrend with high volatility'
      },
      'SIDEWAYS': {
        label: 'Sideways',
        icon: '↔️',
        color: '#6b7280',
        bg: '#f3f4f6',
        darkBg: '#374151',
        description: 'Rangebound market'
      },
      'UNKNOWN': {
        label: 'Unknown',
        icon: '❓',
        color: '#6b7280',
        bg: '#f3f4f6',
        darkBg: '#374151',
        description: 'Unable to classify'
      }
    };

    return configs[regime] || configs['UNKNOWN'];
  };

  const config = getRegimeConfig(regime);

  const sizeClasses = {
    'sm': 'text-xs px-2 py-1',
    'md': 'text-sm px-3 py-1.5',
    'lg': 'text-base px-4 py-2'
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizeClasses[size]}`}
        style={{
          backgroundColor: config.bg,
          color: config.color
        }}
      >
        <span>{config.icon}</span>
        <span>{config.label}</span>
        {showConfidence && confidence > 0 && (
          <span className="text-xs opacity-75">
            ({confidence}%)
          </span>
        )}
      </div>
    </div>
  );
}

// Regime description tooltip component
export function RegimeDescription({ regime }) {
  const getFullDescription = (regime) => {
    const descriptions = {
      'BULL': 'Price is consistently above 50-day and 200-day moving averages. Strong momentum to the upside. Historical success rates for long positions are typically higher in this regime.',
      'VOLATILE_BULL': 'Uptrend is present but with elevated volatility (>25% annualized). While direction is up, expect larger price swings and potential drawdowns.',
      'BEAR': 'Price is consistently below 50-day and 200-day moving averages. Strong momentum to the downside. Historical success rates for short positions are typically higher in this regime.',
      'VOLATILE_BEAR': 'Downtrend is present but with elevated volatility (>25% annualized). While direction is down, expect sharp rallies and countertrend moves.',
      'SIDEWAYS': 'Price is oscillating around moving averages with no clear directional trend. Success rates are typically more evenly distributed. Consider range-trading strategies.',
      'UNKNOWN': 'Unable to determine market regime. Insufficient data or transitional period between regimes.'
    };

    return descriptions[regime] || descriptions['UNKNOWN'];
  };

  return (
    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
      {getFullDescription(regime)}
    </div>
  );
}
