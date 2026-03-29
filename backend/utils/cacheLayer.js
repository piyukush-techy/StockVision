// cacheLayer.js — Phase 5 Month 23
// Smart cache: Uses Redis if available, falls back to in-memory Map
// Zero config required — just works either way

const EventEmitter = require('events');

// ─── In-Memory Cache (always available) ───────────────────────────────────────
class MemoryCache {
  constructor() {
    this.store   = new Map();
    this.hits    = 0;
    this.misses  = 0;
    this.sets    = 0;
    this.deletes = 0;
    // Cleanup expired keys every 5 minutes
    setInterval(() => this._evict(), 5 * 60 * 1000).unref();
  }

  async get(key) {
    const entry = this.store.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() > entry.exp) { this.store.delete(key); this.misses++; return null; }
    this.hits++;
    return entry.value;
  }

  async set(key, value, ttlSeconds = 300) {
    this.store.set(key, { value, exp: Date.now() + ttlSeconds * 1000 });
    this.sets++;
    return true;
  }

  async del(key) {
    this.store.delete(key);
    this.deletes++;
  }

  async keys(pattern = '*') {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...this.store.keys()].filter(k => regex.test(k));
  }

  async flushPattern(pattern) {
    const keys = await this.keys(pattern);
    keys.forEach(k => this.store.delete(k));
    return keys.length;
  }

  _evict() {
    const now = Date.now();
    let evicted = 0;
    for (const [k, v] of this.store) {
      if (now > v.exp) { this.store.delete(k); evicted++; }
    }
    if (evicted > 0) console.log(`🧹 Cache: evicted ${evicted} expired keys`);
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      type:     'memory',
      size:     this.store.size,
      hits:     this.hits,
      misses:   this.misses,
      sets:     this.sets,
      deletes:  this.deletes,
      hitRate:  total > 0 ? +((this.hits / total) * 100).toFixed(1) : 0,
      status:   'connected',
    };
  }
}

// ─── Redis Cache Wrapper ───────────────────────────────────────────────────────
class RedisCache {
  constructor(client) {
    this.client  = client;
    this.hits    = 0;
    this.misses  = 0;
    this.sets    = 0;
    this.deletes = 0;
  }

  async get(key) {
    try {
      const val = await this.client.get(key);
      if (!val) { this.misses++; return null; }
      this.hits++;
      return JSON.parse(val);
    } catch { this.misses++; return null; }
  }

  async set(key, value, ttlSeconds = 300) {
    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      this.sets++;
      return true;
    } catch { return false; }
  }

  async del(key) {
    try { await this.client.del(key); this.deletes++; } catch {}
  }

  async keys(pattern = '*') {
    try { return await this.client.keys(pattern); } catch { return []; }
  }

  async flushPattern(pattern) {
    const keys = await this.keys(pattern);
    if (keys.length > 0) await Promise.all(keys.map(k => this.client.del(k)));
    return keys.length;
  }

  async stats() {
    try {
      const info   = await this.client.info('stats');
      const memory = await this.client.info('memory');
      const total  = this.hits + this.misses;
      const dbSize = await this.client.dbSize();
      return {
        type:       'redis',
        size:       dbSize,
        hits:       this.hits,
        misses:     this.misses,
        sets:       this.sets,
        deletes:    this.deletes,
        hitRate:    total > 0 ? +((this.hits / total) * 100).toFixed(1) : 0,
        status:     'connected',
        memoryUsed: memory.match(/used_memory_human:(.+)/)?.[1]?.trim() || 'N/A',
      };
    } catch {
      const total = this.hits + this.misses;
      return { type: 'redis', status: 'connected', hitRate: total > 0 ? +((this.hits / total) * 100).toFixed(1) : 0 };
    }
  }
}

// ─── Smart Cache Factory ───────────────────────────────────────────────────────
// Tries Redis, silently falls back to memory
class SmartCache extends EventEmitter {
  constructor() {
    super();
    this.backend   = null;
    this.usingRedis = false;
    this._init();
  }

  async _init() {
    try {
      const redis  = require('redis');
      const client = redis.createClient({
        socket: {
          host:           process.env.REDIS_HOST || '127.0.0.1',
          port:           parseInt(process.env.REDIS_PORT || '6379'),
          connectTimeout: 3000,
          reconnectStrategy: (retries) => {
            if (retries > 2) return false; // Give up after 2 retries
            return 500;
          },
        },
        password: process.env.REDIS_PASSWORD || undefined,
      });

      client.on('error', () => {}); // suppress reconnect noise

      await Promise.race([
        client.connect(),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 3000)),
      ]);

      await client.ping();
      this.backend    = new RedisCache(client);
      this.usingRedis  = true;
      console.log('✅ Cache: Redis connected at', process.env.REDIS_HOST || '127.0.0.1');
      this.emit('ready', 'redis');
    } catch (err) {
      this.backend    = new MemoryCache();
      this.usingRedis  = false;
      console.log('ℹ️  Cache: Redis not available — using in-memory cache (perfectly fine for development)');
      this.emit('ready', 'memory');
    }
  }

  async get(key)                   { return this.backend?.get(key) ?? null; }
  async set(key, val, ttl = 300)   { return this.backend?.set(key, val, ttl) ?? false; }
  async del(key)                   { return this.backend?.del(key); }
  async keys(pattern)              { return this.backend?.keys(pattern) ?? []; }
  async flushPattern(pattern)      { return this.backend?.flushPattern(pattern) ?? 0; }
  async stats()                    { return this.backend?.stats() ?? { type: 'none', status: 'initialising' }; }

  // Convenience: get-or-set with auto-population
  async getOrSet(key, fetchFn, ttlSeconds = 300) {
    const cached = await this.get(key);
    if (cached !== null) return { data: cached, fromCache: true };
    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds);
    return { data: fresh, fromCache: false };
  }

  isReady() { return this.backend !== null; }
  getType()  { return this.usingRedis ? 'redis' : 'memory'; }
}

// ─── TTL constants (seconds) ──────────────────────────────────────────────────
const TTL = {
  PRICE_LIVE:     30,          // live prices — 30 seconds
  PRICE_EOD:      6 * 3600,   // end-of-day prices — 6 hours
  FINANCIALS:     12 * 3600,  // financial statements — 12 hours
  OWNERSHIP:      6 * 3600,   // shareholding patterns — 6 hours
  NEWS:           15 * 60,    // news feed — 15 minutes
  SCANNER:        60 * 60,    // scanner results — 1 hour
  REGIME:         2 * 3600,   // regime analysis — 2 hours
  SENTIMENT:      5 * 60,     // sentiment gauges — 5 minutes
  EVENTS:         3 * 3600,   // corporate events — 3 hours
  PREDICTION:     2 * 3600,   // predictions — 2 hours
  CAPITAL_WIZARD: 4 * 3600,   // capital wizard — 4 hours
  PORTFOLIO:      30 * 60,    // portfolio analysis — 30 minutes
  STATIC:         24 * 3600,  // presets/meta — 24 hours
};

// ─── Cache key builders ────────────────────────────────────────────────────────
const KEY = {
  stock:         (sym)          => `stock:${sym}`,
  price:         (sym)          => `price:${sym}`,
  financials:    (sym, type)    => `fin:${sym}:${type}`,
  ownership:     (sym)          => `own:${sym}`,
  peers:         (sym)          => `peers:${sym}`,
  news:          (sym)          => `news:${sym}`,
  scanner:       (sym, params)  => `scan:${sym}:${JSON.stringify(params)}`,
  regime:        (sym)          => `regime:${sym}`,
  sentiment:     (type)         => `sent:${type}`,
  events:        (sym)          => `evts:${sym}`,
  capital:       (sym, cap)     => `cap:${sym}:${cap}`,
  portfolio:     (hash)         => `port:${hash}`,
  prediction:    (sym)          => `pred:${sym}`,
  capitalWizard: (sym, params)  => `cw:${sym}:${JSON.stringify(params)}`,
};

// ─── Express cache middleware factory ─────────────────────────────────────────
function cacheMiddleware(cache, keyFn, ttl = 300) {
  return async (req, res, next) => {
    if (!cache.isReady()) return next();
    const key = typeof keyFn === 'function' ? keyFn(req) : keyFn;
    try {
      const cached = await cache.get(key);
      if (cached !== null) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', key);
        return res.json(cached);
      }
      res.setHeader('X-Cache', 'MISS');
      // Intercept res.json to store in cache
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode === 200) {
          cache.set(key, body, ttl).catch(() => {});
        }
        return originalJson(body);
      };
      next();
    } catch {
      next();
    }
  };
}

// ─── Singleton export ─────────────────────────────────────────────────────────
const cache = new SmartCache();

module.exports = { cache, TTL, KEY, cacheMiddleware, MemoryCache, RedisCache };
