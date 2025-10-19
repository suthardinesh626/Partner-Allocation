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
    cached.promise = new Promise((resolve, reject) => {
      const client = new Redis(process.env.REDIS_URL as string, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        enableOfflineQueue: false,
        lazyConnect: false, // ✅ Connect immediately!
        // TLS configuration for Upstash
        tls: process.env.REDIS_URL?.startsWith('rediss://') ? {
          rejectUnauthorized: false, // Upstash uses self-signed certs
        } : undefined,
        // Keep connection alive
        keepAlive: 30000,
        connectTimeout: 5000, // ✅ Reduce to 5 seconds
        family: 4, // Force IPv4
        retryDelayOnClusterDown: 100,
      });

      client.on('connect', () => {
        console.log('✅ Connected to Redis');
      });

      client.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
        // Don't reject on every error, let ioredis handle reconnection
      });

      client.on('ready', () => {
        resolve(client);
      });

      client.on('close', () => {
        console.warn('⚠️ Redis connection closed');
      });

      // Manually connect
      client.connect().catch(reject);
    });
  }

  cached.client = await cached.promise;
  return cached.client;
}

// Redis subscriber cache
let subscriberCache: Redis | null = null;

/**
 * Create a Redis pub/sub subscriber (cached)
 */
export async function createRedisSubscriber(): Promise<Redis> {
  if (subscriberCache) {
    return subscriberCache;
  }
  
  subscriberCache = new Redis(process.env.REDIS_URL as string, {
    lazyConnect: false,
    connectTimeout: 3000,
    maxRetriesPerRequest: 2,
  });
  
  subscriberCache.on('error', (err) => {
    console.error('❌ Redis subscriber error:', err);
    subscriberCache = null; // Reset cache on error
  });

  return subscriberCache;
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

