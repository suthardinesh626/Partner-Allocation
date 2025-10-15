import Redis from 'ioredis';

const hasRedisUrl = !!process.env.REDIS_URL;

if (!hasRedisUrl) {
  console.warn('⚠️ REDIS_URL not defined. Redis features (locking, rate limiting, pub/sub) will be disabled.');
}

interface RedisClientCached {
  client: Redis | null;
  promise: Promise<Redis> | null;
  failed: boolean; // Track if connection failed
}

// Use global variable to preserve connection across hot reloads in development
declare global {
  // eslint-disable-next-line no-var
  var _redisClientPromise: RedisClientCached | undefined;
}

let cached: RedisClientCached = global._redisClientPromise || {
  client: null,
  promise: null,
  failed: !hasRedisUrl, // Mark as failed if no REDIS_URL
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

  // If previously failed, fail fast without retry
  if (cached.failed) {
    throw new Error('Redis previously failed to connect');
  }

  if (cached.client) {
    return cached.client;
  }

  if (!cached.promise) {
    cached.promise = new Promise((resolve, reject) => {
      const client = new Redis(process.env.REDIS_URL as string, {
        maxRetriesPerRequest: 1, // Reduced from 3 to 1
        connectTimeout: 2000, // 2 second connection timeout
        retryStrategy: (times) => {
          // Only retry once
          if (times > 1) {
            return null; // Stop retrying
          }
          return 100; // Quick retry
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
        console.error('❌ Redis error:', err.message);
      });

      client.on('ready', () => {
        cached.failed = false;
        resolve(client);
      });

      // Reduced timeout from 10s to 2s
      setTimeout(() => {
        if (!cached.client) {
          cached.failed = true; // Mark as failed
          reject(new Error('Redis connection timeout after 2 seconds'));
        }
      }, 2000);
    });
  }

  try {
    cached.client = await cached.promise;
    return cached.client;
  } catch (error) {
    cached.promise = null;
    cached.failed = true; // Mark as failed to prevent future attempts
    console.warn('⚠️ Redis unavailable. Continuing without Redis.');
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

