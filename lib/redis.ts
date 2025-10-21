import Redis from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error(
    '❌ REDIS_URL is required! Please set it in your environment.\n' +
    'For local: Use docker-compose up (Redis included)\n' +
    'For Vercel: Add Upstash Redis URL to environment variables'
  );
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
  if (cached.client) {
    return cached.client;
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      const client = new Redis(process.env.REDIS_URL as string, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        enableOfflineQueue: true,
        // TLS configuration for Upstash
        tls: process.env.REDIS_URL?.startsWith('rediss://') ? {
          rejectUnauthorized: false, // Upstash uses self-signed certs
        } : undefined,
        // Keep connection alive
        keepAlive: 30000,
        connectTimeout: 10000,
        retryStrategy: (times: number) => {
          if (times > 3) {
            return null; // Stop retrying after 3 attempts
          }
          return Math.min(times * 200, 2000); // Exponential backoff
        },
        family: 4, // Force IPv4
      });

      client.on('connect', () => {
        console.log('✅ Connected to Redis');
      });

      client.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
      });

      client.on('close', () => {
        console.warn('⚠️ Redis connection closed');
        // Reset cached values on connection close
        cached.client = null;
        cached.promise = null;
      });

      client.on('end', () => {
        console.warn('⚠️ Redis connection ended');
        cached.client = null;
        cached.promise = null;
      });

      // Wait for connection to be ready
      await new Promise<void>((resolve, reject) => {
        client.once('ready', () => resolve());
        client.once('error', (err) => {
          cached.promise = null; // Reset on error
          reject(err);
        });
      });

      return client;
    })();
  }

  cached.client = await cached.promise;
  return cached.client;
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

