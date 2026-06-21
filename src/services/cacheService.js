const { getRedisClient, isRedisAvailable } = require('../config/redis');

// In-memory fallback cache
const memoryCache = new Map();

const cacheService = {
  /**
   * Set key value in cache
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlInSeconds - Time to live in seconds (default 60s)
   */
  async set(key, value, ttlInSeconds = 60) {
    const stringifiedValue = JSON.stringify(value);
    
    if (isRedisAvailable()) {
      try {
        const client = getRedisClient();
        await client.set(key, stringifiedValue, 'EX', ttlInSeconds);
        return;
      } catch (err) {
        console.error(`[Cache Service] Redis set error for key ${key}:`, err.message);
      }
    }
    
    // In-memory fallback
    const expiry = Date.now() + (ttlInSeconds * 1000);
    memoryCache.set(key, { value: stringifiedValue, expiry });
  },

  /**
   * Get value from cache
   * @param {string} key 
   * @returns {any | null}
   */
  async get(key) {
    if (isRedisAvailable()) {
      try {
        const client = getRedisClient();
        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
      } catch (err) {
        console.error(`[Cache Service] Redis get error for key ${key}:`, err.message);
      }
    }

    // In-memory fallback
    if (memoryCache.has(key)) {
      const { value, expiry } = memoryCache.get(key);
      if (Date.now() < expiry) {
        return JSON.parse(value);
      } else {
        memoryCache.delete(key); // Clean up expired
      }
    }
    return null;
  },

  /**
   * Delete key from cache
   * @param {string} key 
   */
  async del(key) {
    if (isRedisAvailable()) {
      try {
        const client = getRedisClient();
        await client.del(key);
        return;
      } catch (err) {
        console.error(`[Cache Service] Redis del error for key ${key}:`, err.message);
      }
    }

    // In-memory fallback
    memoryCache.delete(key);
  },

  /**
   * Clear all cached keys matching a pattern (simulated in-memory)
   * @param {string} patternPrefix 
   */
  async clearPattern(patternPrefix) {
    if (isRedisAvailable()) {
      try {
        const client = getRedisClient();
        const keys = await client.keys(`${patternPrefix}*`);
        if (keys.length > 0) {
          await client.del(...keys);
        }
        return;
      } catch (err) {
        console.error(`[Cache Service] Redis clearPattern error:`, err.message);
      }
    }

    // In-memory fallback
    for (const key of memoryCache.keys()) {
      if (key.startsWith(patternPrefix)) {
        memoryCache.delete(key);
      }
    }
  }
};

module.exports = cacheService;
