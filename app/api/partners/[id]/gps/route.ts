import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongo';
import { rateLimit, RATE_LIMIT_KEYS } from '@/lib/rateLimit';
import { publishPartnerGPSUpdate } from '@/lib/pubsub';
import { type Partner, type ApiResponse, type GPSHistory } from '@/lib/types';

/**
 * POST /api/partners/[id]/gps
 * Update partner GPS location with rate limiting (max 6 updates per minute)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await context.params;
    const body = await request.json();
    const { coordinates, speed, accuracy } = body;

    // Validation
    if (!partnerId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Partner ID is required',
        },
        { status: 400 }
      );
    }

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid coordinates. Must be an array of [longitude, latitude]',
        },
        { status: 400 }
      );
    }

    const [longitude, latitude] = coordinates;

    if (
      typeof longitude !== 'number' ||
      typeof latitude !== 'number' ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90',
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!ObjectId.isValid(partnerId)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid partner ID format',
        },
        { status: 400 }
      );
    }

    // Apply rate limiting - max 6 GPS updates per minute
    const rateLimitConfig = {
      limit: parseInt(process.env.GPS_RATE_LIMIT || '6'),
      windowSeconds: parseInt(process.env.GPS_RATE_LIMIT_WINDOW || '60'),
    };

    const rateLimitResult = await rateLimit(
      RATE_LIMIT_KEYS.GPS_UPDATE(partnerId),
      rateLimitConfig.limit,
      rateLimitConfig.windowSeconds
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Rate limit exceeded. Maximum ${rateLimitConfig.limit} GPS updates per minute allowed.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfig.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetIn.toString(),
          },
        }
      );
    }

    const partnersCollection = await getCollection<Partner>('partners');

    // Check if partner exists
    const partner = await partnersCollection.findOne({
      _id: new ObjectId(partnerId),
    });

    if (!partner) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Partner not found',
        },
        { status: 404 }
      );
    }

    // Create GPS history entry
    const gpsEntry: GPSHistory = {
      coordinates: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      timestamp: new Date(),
      ...(speed !== undefined && { speed }),
      ...(accuracy !== undefined && { accuracy }),
    };

    // Update partner location and add to GPS history
    await partnersCollection.updateOne(
      { _id: new ObjectId(partnerId) },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          updatedAt: new Date(),
        },
        $push: {
          gpsHistory: {
            $each: [gpsEntry],
            $slice: -100, // Keep only last 100 GPS points
          },
        },
      }
    );

    // Publish GPS update event for real-time tracking
    await publishPartnerGPSUpdate({
      partnerId,
      bookingId: partner.currentBookingId,
      coordinates: gpsEntry.coordinates,
      timestamp: gpsEntry.timestamp,
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          partnerId,
          coordinates: [longitude, latitude],
          timestamp: gpsEntry.timestamp,
        },
        message: 'GPS location updated successfully',
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitConfig.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetIn.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('Error updating GPS location:', error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error.message || 'Failed to update GPS location',
      },
      { status: 500 }
    );
  }
}

