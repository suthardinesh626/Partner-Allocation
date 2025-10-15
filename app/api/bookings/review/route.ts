import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongo';
import { withLock, LOCK_KEYS } from '@/lib/lock';
import { publishDocumentReviewed } from '@/lib/pubsub';
import {
  BookingStatus,
  DocumentStatus,
  type Booking,
  type ApiResponse,
} from '@/lib/types';

/**
 * POST /api/bookings/review
 * Review a document for a booking with Redis lock
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, documentType, status, reviewerId, rejectionReason } = body;

    // Validation
    if (!bookingId || !documentType || !status || !reviewerId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Missing required fields: bookingId, documentType, status, reviewerId',
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

    // Validate status
    if (!Object.values(DocumentStatus).includes(status)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid document status. Must be: pending, approved, or rejected',
        },
        { status: 400 }
      );
    }

    // If rejected, rejection reason is required
    if (status === DocumentStatus.REJECTED && !rejectionReason) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Rejection reason is required when rejecting a document',
        },
        { status: 400 }
      );
    }

    // Execute with Redis lock to prevent concurrent review
    const result = await withLock(
      LOCK_KEYS.DOCUMENT_REVIEW(bookingId, documentType),
      async () => {
        const bookingsCollection = await getCollection<Booking>('bookings');

        // Get booking details
        const booking = await bookingsCollection.findOne({
          _id: new ObjectId(bookingId),
        });

        if (!booking) {
          throw new Error('Booking not found');
        }

        // Check if booking is not already confirmed or cancelled
        if (
          booking.status === BookingStatus.CONFIRMED ||
          booking.status === BookingStatus.CANCELLED
        ) {
          throw new Error(
            `Booking is already ${booking.status}. Cannot review documents.`
          );
        }

        // Find the document
        const documentIndex = booking.documents.findIndex(
          (doc) => doc.type === documentType
        );

        if (documentIndex === -1) {
          throw new Error(`Document type '${documentType}' not found in booking`);
        }

        // Check if document is already reviewed
        if (booking.documents[documentIndex].status !== DocumentStatus.PENDING) {
          throw new Error(
            `Document '${documentType}' is already ${booking.documents[documentIndex].status}`
          );
        }

        // Update document status
        const updateFields: any = {
          [`documents.${documentIndex}.status`]: status,
          [`documents.${documentIndex}.reviewedBy`]: reviewerId,
          [`documents.${documentIndex}.reviewedAt`]: new Date(),
          status: BookingStatus.DOCUMENTS_UNDER_REVIEW,
          updatedAt: new Date(),
        };

        if (status === DocumentStatus.REJECTED && rejectionReason) {
          updateFields[`documents.${documentIndex}.rejectionReason`] = rejectionReason;
        }

        await bookingsCollection.updateOne(
          { _id: new ObjectId(bookingId) },
          { $set: updateFields }
        );

        // Publish event for real-time updates
        await publishDocumentReviewed({
          bookingId,
          documentType,
          status,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        });

        return {
          bookingId,
          documentType,
          status,
          reviewedBy: reviewerId,
        };
      },
      10 // Lock expires in 10 seconds
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: `Document '${documentType}' ${status} successfully`,
    });
  } catch (error: any) {
    console.error('Error reviewing document:', error);

    // Handle lock acquisition error
    if (error.message.includes('Unable to acquire lock')) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Another admin is currently reviewing this document. Please try again.',
        },
        { status: 409 } // Conflict
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error.message || 'Failed to review document',
      },
      { status: 500 }
    );
  }
}

