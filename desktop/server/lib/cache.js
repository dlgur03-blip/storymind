// Cache layer — in-memory with Redis-compatible API
// Replace with ioredis when scaling:
//   const Redis = require('ioredis');
//   const client = new Redis(process.env.REDIS_URL);

class MemoryCache {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
    // Cleanup expired keys every 60s
    setInterval(() => this._cleanup(), 60000);
  }

  async get(key) {
    const ttl = this.ttls.get(key);
    if (ttl && Date.now() > ttl) { this.store.delete(key); this.ttls.delete(key); return null; }
    const val = this.store.get(key);
    return val !== undefined ? val : null;
  }

  async set(key, value, ttlSeconds = 3600) {
    this.store.set(key, value);
    this.ttls.set(key, Date.now() + ttlSeconds * 1000);
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    this.ttls.delete(key);
    return 1;
  }

  async exists(key) {
    const val = await this.get(key);
    return val !== null ? 1 : 0;
  }

  async incr(key) {
    const val = await this.get(key);
    const next = (parseInt(val) || 0) + 1;
    await this.set(key, next, (this.ttls.get(key) - Date.now()) / 1000 || 3600);
    return next;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...this.store.keys()].filter(k => regex.test(k));
  }

  async flushall() {
    this.store.clear();
    this.ttls.clear();
    return 'OK';
  }

  _cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.ttls) {
      if (now > expiry) { this.store.delete(key); this.ttls.delete(key); }
    }
  }

  // Stats
  get size() { return this.store.size; }
}

// Singleton
const cache = new MemoryCache();

// Cache middleware for Express routes
function cacheMiddleware(prefix, ttlSeconds = 300) {
  return async (req, res, next) => {
    const key = `${prefix}:${req.userId || 'anon'}:${req.originalUrl}`;
    const cached = await cache.get(key);
    if (cached) { return res.json(JSON.parse(cached)); }
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cache.set(key, JSON.stringify(data), ttlSeconds).catch(() => {});
      return originalJson(data);
    };
    next();
  };
}

module.exports = { cache, cacheMiddleware };
