import Redis from 'ioredis';

if (!process.env.REDIS_URL) {
  console.warn('⚠️ REDIS_URL not defined. Redis features (locking, rate limiting, pub/sub) will be disabled.');
}

interface RedisClientCached {
  client: Redis | null;
  promise: Promise<Redis> | null;
}

// Use global variable to preserve connection across hot reloads in development
declare global {
  // eslint-disable-next-line no-var
  var _redisClientPromise: RedisClientCached | undefined;
}

let cached: RedisClientCached = global._redisClientPromise || {
  client: null,
  promise: null,
};

if (!global._redisClientPromise) {
  global._redisClientPromise = cached;
}

/**
 * Get Redis client instance (singleton pattern)
 */
export async function getRedisClient(): Promise<Redis> {
  if (!process.env.REDIS_URL) {
    throw new Error('Redis URL not configured');
  }

  if (cached.client) {
    return cached.client;
  }

  if (!cached.promise) {
    cached.promise = new Promise((resolve, reject) => {
      const client = new Redis(process.env.REDIS_URL as string, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          // Retry up to 3 times, then give up
          if (times > 3) {
            console.warn('⚠️ Redis connection failed after 3 retries. Some features may not work.');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err) => {
          const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
          if (targetErrors.some((targetError) => err.message.includes(targetError))) {
            return true;
          }
          return false;
        },
      });

      client.on('connect', () => {
        console.log('✅ Connected to Redis');
      });

      client.on('error', (err) => {
        console.error('❌ Redis error:', err);
        // Don't reject immediately on error - let retry logic handle it
      });

      client.on('ready', () => {
        resolve(client);
      });

      // Timeout for initial connection
      setTimeout(() => {
        if (!cached.client) {
          reject(new Error('Redis connection timeout after 10 seconds'));
        }
      }, 10000);
    });
  }

  try {
    cached.client = await cached.promise;
    return cached.client;
  } catch (error) {
    cached.promise = null;
    console.warn('⚠️ Redis unavailable. Continuing without Redis (rate limiting & pub/sub disabled)');
    throw error;
  }
}

/**
 * Create a Redis pub/sub subscriber
 */
export async function createRedisSubscriber(): Promise<Redis> {
  const subscriber = new Redis(process.env.REDIS_URL as string);
  
  subscriber.on('error', (err) => {
    console.error('❌ Redis subscriber error:', err);
  });

  return subscriber;
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection() {
  if (cached.client) {
    await cached.client.quit();
    cached.client = null;
    cached.promise = null;
  }
}

// Redis event channels
export const REDIS_CHANNELS = {
  BOOKING_CONFIRMED: 'booking:confirmed',
  PARTNER_GPS_UPDATE: 'partner:gps:update',
  BOOKING_ASSIGNED: 'booking:assigned',
  DOCUMENT_REVIEWED: 'document:reviewed',
} as const;

