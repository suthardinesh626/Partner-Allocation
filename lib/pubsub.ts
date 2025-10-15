import { getRedisClient, createRedisSubscriber, REDIS_CHANNELS } from './redis';
import type {
  BookingConfirmedEvent,
  PartnerGPSUpdateEvent,
  BookingAssignedEvent,
  DocumentReviewedEvent,
} from './types';

/**
 * Publish a booking confirmed event
 */
export async function publishBookingConfirmed(event: BookingConfirmedEvent): Promise<void> {
  const redis = await getRedisClient();
  await redis.publish(REDIS_CHANNELS.BOOKING_CONFIRMED, JSON.stringify(event));
}

/**
 * Publish a partner GPS update event
 */
export async function publishPartnerGPSUpdate(event: PartnerGPSUpdateEvent): Promise<void> {
  const redis = await getRedisClient();
  await redis.publish(REDIS_CHANNELS.PARTNER_GPS_UPDATE, JSON.stringify(event));
}

/**
 * Publish a booking assigned event
 */
export async function publishBookingAssigned(event: BookingAssignedEvent): Promise<void> {
  const redis = await getRedisClient();
  await redis.publish(REDIS_CHANNELS.BOOKING_ASSIGNED, JSON.stringify(event));
}

/**
 * Publish a document reviewed event
 */
export async function publishDocumentReviewed(event: DocumentReviewedEvent): Promise<void> {
  const redis = await getRedisClient();
  await redis.publish(REDIS_CHANNELS.DOCUMENT_REVIEWED, JSON.stringify(event));
}

/**
 * Subscribe to all booking events
 */
export async function subscribeToBookingEvents(
  onBookingConfirmed: (event: BookingConfirmedEvent) => void,
  onBookingAssigned: (event: BookingAssignedEvent) => void,
  onDocumentReviewed: (event: DocumentReviewedEvent) => void
): Promise<void> {
  const subscriber = await createRedisSubscriber();

  subscriber.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case REDIS_CHANNELS.BOOKING_CONFIRMED:
          onBookingConfirmed(data);
          break;
        case REDIS_CHANNELS.BOOKING_ASSIGNED:
          onBookingAssigned(data);
          break;
        case REDIS_CHANNELS.DOCUMENT_REVIEWED:
          onDocumentReviewed(data);
          break;
      }
    } catch (error) {
      console.error('Error parsing event message:', error);
    }
  });

  await subscriber.subscribe(
    REDIS_CHANNELS.BOOKING_CONFIRMED,
    REDIS_CHANNELS.BOOKING_ASSIGNED,
    REDIS_CHANNELS.DOCUMENT_REVIEWED
  );
}

/**
 * Subscribe to partner GPS updates
 */
export async function subscribeToPartnerGPS(
  onGPSUpdate: (event: PartnerGPSUpdateEvent) => void
): Promise<void> {
  const subscriber = await createRedisSubscriber();

  subscriber.on('message', (channel, message) => {
    if (channel === REDIS_CHANNELS.PARTNER_GPS_UPDATE) {
      try {
        const data = JSON.parse(message);
        onGPSUpdate(data);
      } catch (error) {
        console.error('Error parsing GPS update message:', error);
      }
    }
  });

  await subscriber.subscribe(REDIS_CHANNELS.PARTNER_GPS_UPDATE);
}

