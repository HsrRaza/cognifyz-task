const Redis = require('ioredis');

let redisClient = null;
let redisAvailable = false;

const initRedis = () => {
  return new Promise((resolve) => {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    
    console.log(`[Redis] Connecting to Redis at ${redisUrl}...`);
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1, // Fail fast so server can startup without blocking
      connectTimeout: 2000,    // 2 seconds timeout
      lazyConnect: true        // Don't connect instantly during instantiation
    });

    redisClient.connect()
      .then(() => {
        redisAvailable = true;
        console.log('[Redis] Redis connected successfully.');
        resolve({ redisClient, redisAvailable: true });
      })
      .catch((err) => {
        redisAvailable = false;
        redisClient = null;
        console.warn(`[Redis] Connection failed: ${err.message}. Falling back to in-memory cache/queues.`);
        resolve({ redisClient: null, redisAvailable: false });
      });

    // Make sure 'error' events are caught so the process doesn't crash
    redisClient.on('error', (err) => {
      if (redisAvailable) {
        console.warn(`[Redis] Connection error: ${err.message}. Switching to in-memory mode.`);
        redisAvailable = false;
        redisClient = null;
      }
    });
  });
};

const getRedisClient = () => redisClient;
const isRedisAvailable = () => redisAvailable;

module.exports = {
  initRedis,
  getRedisClient,
  isRedisAvailable
};
