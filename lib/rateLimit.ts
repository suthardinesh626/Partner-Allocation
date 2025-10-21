import { getRedisClient } from './redis';

/**
 * Rate limiter using Redis sliding window algorithm
 * @param key - The rate limit key (e.g., "gps:partnerId")
 * @param limit - Maximum number of requests allowed
 * @param windowSeconds - Time window in seconds
 * @returns Object with allowed status and remaining count
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const redis = await getRedisClient();
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // Use a Redis pipeline for atomic operations
  const pipeline = redis.pipeline();
  
  // Remove old entries outside the time window
  pipeline.zremrangebyscore(key, 0, windowStart);
  
  // Count current requests in the window
  pipeline.zcard(key);
  
  // Add current request
  pipeline.zadd(key, now, `${now}`);
  
  // Set expiry on the key
  pipeline.expire(key, windowSeconds);
  
  const results = await pipeline.exec();
  
  if (!results) {
    throw new Error('Redis pipeline execution failed');
  }

  // Get the count after removing old entries
  const count = results[1][1] as number;
  
  const allowed = count < limit;
  const remaining = Math.max(0, limit - count - 1);
  const resetIn = windowSeconds;

  return {
    allowed,
    remaining,
    resetIn,
  };
}

/**
 * Get rate limit status without incrementing
 * @param key - The rate limit key
 * @param limit - Maximum number of requests allowed
 * @param windowSeconds - Time window in seconds
 * @returns Current rate limit status
 */
export async function getRateLimitStatus(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ count: number; remaining: number; resetIn: number }> {
  const redis = await getRedisClient();
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  
  const count = await redis.zcount(key, windowStart, now);
  const remaining = Math.max(0, limit - count);
  const ttl = await redis.ttl(key);
  const resetIn = ttl > 0 ? ttl : windowSeconds;

  return {
    count,
    remaining,
    resetIn,
  };
}

// Rate limit key prefixes
export const RATE_LIMIT_KEYS = {
  GPS_UPDATE: (partnerId: string) => `ratelimit:gps:${partnerId}`,
} as const;

