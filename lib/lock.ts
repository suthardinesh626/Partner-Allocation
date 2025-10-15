import { getRedisClient } from './redis';

/**
 * Acquire a distributed lock using Redis
 * @param key - The lock key
 * @param expirySeconds - Lock expiry time in seconds (default: 10)
 * @returns true if lock acquired, false otherwise
 */
export async function acquireLock(key: string, expirySeconds: number = 10): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    
    // SET key value NX EX seconds
    // NX: Only set if key doesn't exist
    // EX: Set expiry time in seconds
    const result = await redis.set(key, 'locked', 'EX', expirySeconds, 'NX');
    
    return result === 'OK';
  } catch (error) {
    console.warn('⚠️ Redis unavailable for locking. Proceeding without distributed lock.');
    return true; // Allow operation to proceed
  }
}

/**
 * Release a distributed lock
 * @param key - The lock key
 */
export async function releaseLock(key: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    await redis.del(key);
  } catch (error) {
    // Silently fail if Redis is unavailable
    console.warn('⚠️ Redis unavailable for releasing lock. Skipping.');
  }
}

/**
 * Execute a function with a distributed lock
 * @param key - The lock key
 * @param fn - The function to execute
 * @param expirySeconds - Lock expiry time in seconds
 * @returns The result of the function
 * @throws Error if lock cannot be acquired
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  expirySeconds: number = 10
): Promise<T> {
  const lockAcquired = await acquireLock(key, expirySeconds);
  
  if (!lockAcquired) {
    throw new Error(`Unable to acquire lock for key: ${key}. Another operation is in progress.`);
  }

  try {
    return await fn();
  } finally {
    await releaseLock(key);
  }
}

/**
 * Check if a lock exists
 * @param key - The lock key
 * @returns true if lock exists, false otherwise
 */
export async function isLocked(key: string): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.warn('⚠️ Redis unavailable for checking lock. Assuming unlocked.');
    return false; // Assume unlocked if Redis unavailable
  }
}

// Lock key prefixes
export const LOCK_KEYS = {
  BOOKING_ASSIGNMENT: (bookingId: string) => `lock:booking:assign:${bookingId}`,
  BOOKING_CONFIRMATION: (bookingId: string) => `lock:booking:confirm:${bookingId}`,
  DOCUMENT_REVIEW: (bookingId: string, docType: string) => `lock:booking:review:${bookingId}:${docType}`,
} as const;

