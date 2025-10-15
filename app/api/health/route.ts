import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Health check endpoint to test if API routes are working
 */
export async function GET() {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        hasMongoUri: !!process.env.MONGODB_URI,
        hasRedisUrl: !!process.env.REDIS_URL,
        nodeEnv: process.env.NODE_ENV,
      },
    };

    return NextResponse.json(health);
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

