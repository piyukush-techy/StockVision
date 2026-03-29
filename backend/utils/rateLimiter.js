// rateLimiter.js — Phase 5 Month 23
// Tiered rate limiting without external dependencies
// Uses in-memory sliding window — works great for single-process Node apps

/**
 * Sliding window rate limiter (in-memory, no Redis required)
 * Each window slot stores timestamps of requests in the last windowMs
 */
class SlidingWindowLimiter {
  constructor() {
    this.windows    = new Map(); // key → [timestamps]
    this.blocked    = new Map(); // key → unblockAt timestamp
    this.stats      = { total: 0, blocked: 0, passed: 0 };
    // Cleanup every 2 minutes
    setInterval(() => this._cleanup(), 2 * 60 * 1000).unref();
  }

  check(key, maxRequests, windowMs, blockDurationMs = 0) {
    const now     = Date.now();
    this.stats.total++;

    // Check if IP is currently hard-blocked
    if (blockDurationMs > 0) {
      const unblock = this.blocked.get(key);
      if (unblock && now < unblock) {
        this.stats.blocked++;
        return {
          allowed:   false,
          remaining: 0,
          resetAt:   new Date(unblock).toISOString(),
          retryAfter: Math.ceil((unblock - now) / 1000),
        };
      }
    }

    // Sliding window: keep only timestamps within the window
    const timestamps = (this.windows.get(key) || []).filter(t => now - t < windowMs);
    timestamps.push(now);
    this.windows.set(key, timestamps);

    if (timestamps.length > maxRequests) {
      // Hard block if configured
      if (blockDurationMs > 0) {
        this.blocked.set(key, now + blockDurationMs);
      }
      this.stats.blocked++;
      return {
        allowed:   false,
        remaining: 0,
        resetAt:   new Date(timestamps[0] + windowMs).toISOString(),
        retryAfter: Math.ceil((timestamps[0] + windowMs - now) / 1000),
      };
    }

    this.stats.passed++;
    return {
      allowed:   true,
      remaining: maxRequests - timestamps.length,
      resetAt:   new Date(timestamps[0] + windowMs).toISOString(),
      retryAfter: 0,
    };
  }

  getStats() {
    return {
      ...this.stats,
      activeWindows: this.windows.size,
      blockedIPs:    this.blocked.size,
      blockRate:     this.stats.total > 0 ? +((this.stats.blocked / this.stats.total) * 100).toFixed(2) : 0,
    };
  }

  _cleanup() {
    const now = Date.now();
    // Remove old windows
    for (const [k, ts] of this.windows) {
      const fresh = ts.filter(t => now - t < 15 * 60 * 1000);
      if (fresh.length === 0) this.windows.delete(k);
      else this.windows.set(k, fresh);
    }
    // Remove expired blocks
    for (const [k, at] of this.blocked) {
      if (now > at) this.blocked.delete(k);
    }
  }
}

const limiter = new SlidingWindowLimiter();

// ─── Rate limit tiers ─────────────────────────────────────────────────────────
const TIERS = {
  // Heavy compute endpoints — scanner, regime, capital wizard
  HEAVY: {
    max:           10,
    windowMs:      60 * 1000,    // 10 req/min
    blockDurationMs: 30 * 1000,  // 30s block on violation
    message:       'Heavy analysis endpoints: 10 requests/minute. Please wait.',
  },
  // Standard API calls
  STANDARD: {
    max:           60,
    windowMs:      60 * 1000,    // 60 req/min
    blockDurationMs: 0,
    message:       'Standard API: 60 requests/minute.',
  },
  // Light endpoints — health, meta, presets
  LIGHT: {
    max:           200,
    windowMs:      60 * 1000,    // 200 req/min
    blockDurationMs: 0,
    message:       'Light endpoints: 200 requests/minute.',
  },
  // Search — slightly stricter to prevent scraping
  SEARCH: {
    max:           30,
    windowMs:      60 * 1000,    // 30 req/min
    blockDurationMs: 0,
    message:       'Search: 30 requests/minute.',
  },
};

// ─── Middleware factory ────────────────────────────────────────────────────────
function rateLimitMiddleware(tier = 'STANDARD') {
  const config = TIERS[tier] || TIERS.STANDARD;

  return (req, res, next) => {
    // Key by IP (support proxies: X-Forwarded-For, CF-Connecting-IP)
    const ip = req.headers['cf-connecting-ip']
            || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.ip
            || 'unknown';

    const key    = `rl:${tier}:${ip}`;
    const result = limiter.check(key, config.max, config.windowMs, config.blockDurationMs);

    // Rate limit headers (RFC 6585 style)
    res.setHeader('X-RateLimit-Limit',     config.max);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset',     result.resetAt);
    res.setHeader('X-RateLimit-Tier',      tier);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);
      return res.status(429).json({
        error:      'Too Many Requests',
        message:    config.message,
        retryAfter: result.retryAfter,
        resetAt:    result.resetAt,
        tier,
      });
    }

    next();
  };
}

// ─── Convenience pre-built limiters ───────────────────────────────────────────
const rateLimit = {
  heavy:    rateLimitMiddleware('HEAVY'),
  standard: rateLimitMiddleware('STANDARD'),
  light:    rateLimitMiddleware('LIGHT'),
  search:   rateLimitMiddleware('SEARCH'),
  stats:    () => limiter.getStats(),
};

module.exports = { rateLimit, rateLimitMiddleware, SlidingWindowLimiter, TIERS };
