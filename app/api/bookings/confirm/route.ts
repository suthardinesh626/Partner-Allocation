import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongo';
import { withLock, LOCK_KEYS } from '@/lib/lock';
import { publishBookingConfirmed } from '@/lib/pubsub';
import {
  BookingStatus,
  DocumentStatus,
  PartnerStatus,
  type Booking,
  type Partner,
  type ApiResponse,
} from '@/lib/types';

/**
 * POST /api/bookings/confirm
 * Confirm a booking after all documents are approved with Redis lock
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

    // Execute with Redis lock to prevent double confirmation
    const result = await withLock(
      LOCK_KEYS.BOOKING_CONFIRMATION(bookingId),
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

        // Check if booking is already confirmed
        if (booking.status === BookingStatus.CONFIRMED) {
          throw new Error('Booking is already confirmed');
        }

        // Check if partner is assigned
        if (!booking.partnerId) {
          throw new Error('Cannot confirm booking without assigned partner');
        }

        // Check if all documents are approved
        const allDocumentsApproved = booking.documents.every(
          (doc) => doc.status === DocumentStatus.APPROVED
        );

        if (!allDocumentsApproved) {
          const pendingDocs = booking.documents
            .filter((doc) => doc.status !== DocumentStatus.APPROVED)
            .map((doc) => doc.type);

          throw new Error(
            `Cannot confirm booking. Following documents are not approved: ${pendingDocs.join(', ')}`
          );
        }

        // Update booking status to confirmed
        await bookingsCollection.updateOne(
          { _id: new ObjectId(bookingId) },
          {
            $set: {
              status: BookingStatus.CONFIRMED,
              confirmedAt: new Date(),
              confirmedBy: adminId,
              updatedAt: new Date(),
            },
          }
        );

        // Update partner status (they can now take new bookings if needed)
        // In real scenario, partner might need to complete delivery first
        await partnersCollection.updateOne(
          { _id: new ObjectId(booking.partnerId) },
          {
            $set: {
              updatedAt: new Date(),
            },
            $inc: {
              totalDeliveries: 1,
            },
          }
        );

        // Publish event for real-time updates
        await publishBookingConfirmed({
          bookingId,
          partnerId: booking.partnerId,
          confirmedAt: new Date(),
          confirmedBy: adminId,
        });

        return {
          bookingId,
          partnerId: booking.partnerId,
          confirmedAt: new Date(),
          confirmedBy: adminId,
        };
      },
      10 // Lock expires in 10 seconds
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: 'Booking confirmed successfully',
    });
  } catch (error: any) {
    console.error('Error confirming booking:', error);

    // Handle lock acquisition error
    if (error.message.includes('Unable to acquire lock')) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Another admin is currently confirming this booking. Please try again.',
        },
        { status: 409 } // Conflict
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error.message || 'Failed to confirm booking',
      },
      { status: 500 }
    );
  }
}

