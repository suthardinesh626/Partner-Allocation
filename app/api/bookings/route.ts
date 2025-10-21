import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';
import { type Booking, type ApiResponse } from '@/lib/types';

/**
 * GET /api/bookings
 * Fetch all bookings with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const partnerId = searchParams.get('partnerId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const bookingsCollection = await getCollection<Booking>('bookings');

    // Build query filter
    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    if (partnerId) {
      filter.partnerId = partnerId;
    }

    // Fetch bookings
    const bookings = await bookingsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count
    const total = await bookingsCollection.countDocuments(filter);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        bookings,
        total,
        limit,
        skip,
      },
    });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error.message || 'Failed to fetch bookings',
      },
      { status: 500 }
    );
  }
}

