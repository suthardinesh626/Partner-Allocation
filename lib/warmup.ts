import { getRedisClient } from './redis';
import { connectToDatabase } from './mongo';

/**
 * Warm up connections for better performance
 * Call this in API routes to pre-establish connections
 */
export async function warmupConnections(): Promise<void> {
  try {
    // Warm up Redis connection
    const redis = await getRedisClient();
    await redis.ping();
    
    // Warm up MongoDB connection
    await connectToDatabase();
    
    console.log('✅ Connections warmed up successfully');
  } catch (error) {
    console.warn('⚠️ Connection warmup failed:', error);
    // Don't throw - let the app continue
  }
}

/**
 * Check if connections are healthy
 */
export async function healthCheck(): Promise<{ redis: boolean; mongo: boolean }> {
  const result = { redis: false, mongo: false };
  
  try {
    const redis = await getRedisClient();
    await redis.ping();
    result.redis = true;
  } catch (error) {
    console.warn('Redis health check failed:', error);
  }
  
  try {
    await connectToDatabase();
    result.mongo = true;
  } catch (error) {
    console.warn('MongoDB health check failed:', error);
  }
  
  return result;
}
