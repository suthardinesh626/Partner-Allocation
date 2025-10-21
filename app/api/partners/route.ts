import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';
import { type Partner, type ApiResponse } from '@/lib/types';

/**
 * GET /api/partners
 * Fetch all partners with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const city = searchParams.get('city');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const partnersCollection = await getCollection<Partner>('partners');

    // Build query filter
    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    if (city) {
      filter.city = city;
    }

    // Fetch partners
    const partners = await partnersCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count
    const total = await partnersCollection.countDocuments(filter);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        partners,
        total,
        limit,
        skip,
      },
    });
  } catch (error: any) {
    console.error('Error fetching partners:', error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error.message || 'Failed to fetch partners',
      },
      { status: 500 }
    );
  }
}

