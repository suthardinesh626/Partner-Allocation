import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/warmup';

/**
 * GET /api/health
 * Health check endpoint to test if API routes are working
 */
export async function GET() {
  try {
    const { redis, mongo } = await healthCheck();
    
    const isHealthy = redis && mongo;
    
    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        redis,
        mongo,
      },
      env: {
        hasMongoUri: !!process.env.MONGODB_URI,
        hasRedisUrl: !!process.env.REDIS_URL,
        nodeEnv: process.env.NODE_ENV,
      },
    }, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 }
    );
  }
}

