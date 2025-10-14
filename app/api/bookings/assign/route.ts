import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongo';
import { withLock, LOCK_KEYS } from '@/lib/lock';
import { publishBookingAssigned } from '@/lib/pubsub';
import {
  BookingStatus,
  PartnerStatus,
  type Booking,
  type Partner,
  type ApiResponse,
  type AssignPartnerResponse,
} from '@/lib/types';

/**
 * POST /api/bookings/assign
 * Assign a partner to a booking using geospatial query and Redis lock
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, adminId } = body;

    // Validation
    if (!bookingId || !adminId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Missing required fields: bookingId and adminId',
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!ObjectId.isValid(bookingId)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid booking ID format',
        },
        { status: 400 }
      );
    }

    // Execute with Redis lock to prevent concurrent assignment
    const result = await withLock(
      LOCK_KEYS.BOOKING_ASSIGNMENT(bookingId),
      async () => {
        const bookingsCollection = await getCollection<Booking>('bookings');
        const partnersCollection = await getCollection<Partner>('partners');

        // Get booking details
        const booking = await bookingsCollection.findOne({
          _id: new ObjectId(bookingId),
        });

        if (!booking) {
          throw new Error('Booking not found');
        }

        // Check if booking is already assigned
        if (booking.status !== BookingStatus.PENDING) {
          throw new Error(
            `Booking is already in ${booking.status} state. Cannot assign partner.`
          );
        }

        // Find nearest available partner using geospatial query
        // $geoNear must be the first stage in aggregation pipeline
        const nearestPartners = await partnersCollection
          .aggregate([
            {
              $geoNear: {
                near: booking.address.coordinates,
                distanceField: 'distance',
                maxDistance: 50000, // 50km radius
                query: {
                  status: PartnerStatus.ONLINE,
                  city: booking.address.city,
                  currentBookingId: { $exists: false },
                },
                spherical: true,
              },
            },
            { $limit: 1 },
          ])
          .toArray();

        if (nearestPartners.length === 0) {
          throw new Error(
            `No available partners found in ${booking.address.city} within 50km radius`
          );
        }

        const nearestPartner = nearestPartners[0] as Partner & { distance: number };

        // Update booking with partner assignment
        await bookingsCollection.updateOne(
          { _id: new ObjectId(bookingId) },
          {
            $set: {
              partnerId: nearestPartner._id?.toString(),
              partnerAssignedAt: new Date(),
              partnerAssignedBy: adminId,
              status: BookingStatus.PARTNER_ASSIGNED,
              updatedAt: new Date(),
            },
          }
        );

        // Update partner with current booking
        await partnersCollection.updateOne(
          { _id: nearestPartner._id },
          {
            $set: {
              currentBookingId: bookingId,
              status: PartnerStatus.BUSY,
              updatedAt: new Date(),
            },
          }
        );

        // Publish event for real-time updates
        await publishBookingAssigned({
          bookingId,
          partnerId: nearestPartner._id?.toString() || '',
          assignedAt: new Date(),
          assignedBy: adminId,
        });

        return {
          bookingId,
          partnerId: nearestPartner._id?.toString() || '',
          partnerName: nearestPartner.name,
          distance: Math.round(nearestPartner.distance), // in meters
        };
      },
      10 // Lock expires in 10 seconds
    );

    return NextResponse.json<ApiResponse<AssignPartnerResponse>>({
      success: true,
      data: result,
      message: 'Partner assigned successfully',
    });
  } catch (error: any) {
    console.error('Error assigning partner:', error);

    // Handle lock acquisition error
    if (error.message.includes('Unable to acquire lock')) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Another admin is currently assigning this booking. Please try again.',
        },
        { status: 409 } // Conflict
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error.message || 'Failed to assign partner',
      },
      { status: 500 }
    );
  }
}

