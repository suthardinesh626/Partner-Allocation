/**
 * Database seeding script
 * Run with: npx tsx scripts/seed.ts
 */

import 'dotenv/config';
import { connectToDatabase, initializeDatabase, COLLECTIONS } from '../lib/mongo';
import {
  BookingStatus,
  DocumentStatus,
  PartnerStatus,
  type Booking,
  type Partner,
} from '../lib/types';

// Sample cities in India with coordinates
const cities = [
  { name: 'Mumbai', coordinates: [72.8777, 19.0760] as [number, number] },
  { name: 'Delhi', coordinates: [77.1025, 28.7041] as [number, number] },
  { name: 'Bangalore', coordinates: [77.5946, 12.9716] as [number, number] },
  { name: 'Hyderabad', coordinates: [78.4867, 17.3850] as [number, number] },
  { name: 'Chennai', coordinates: [80.2707, 13.0827] as [number, number] },
  { name: 'Kolkata', coordinates: [88.3639, 22.5726] as [number, number] },
  { name: 'Pune', coordinates: [73.8567, 18.5204] as [number, number] },
];

// Generate random partners
function generatePartners(): Partner[] {
  const partners: Partner[] = [];
  
  cities.forEach((city, cityIndex) => {
    // Create 5 partners per city
    for (let i = 0; i < 5; i++) {
      const partner: Partner = {
        name: `${city.name} Partner ${i + 1}`,
        email: `partner${cityIndex * 5 + i + 1}@partner-allocation.com`,
        phone: `+91${9000000000 + cityIndex * 5 + i}`,
        city: city.name,
        location: {
          type: 'Point',
          coordinates: [
            city.coordinates[0] + (Math.random() - 0.5) * 0.1,
            city.coordinates[1] + (Math.random() - 0.5) * 0.1,
          ],
        },
        status: i < 3 ? PartnerStatus.ONLINE : PartnerStatus.OFFLINE,
        gpsHistory: [],
        rating: 4 + Math.random(),
        totalDeliveries: Math.floor(Math.random() * 100),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      partners.push(partner);
    }
  });

  return partners;
}

// Generate random bookings
function generateBookings(): Booking[] {
  const bookings: Booking[] = [];
  
  cities.forEach((city, cityIndex) => {
    // Create 3 bookings per city
    for (let i = 0; i < 3; i++) {
      const booking: Booking = {
        userId: `user${cityIndex * 3 + i + 1}`,
        userInfo: {
          name: `User ${cityIndex * 3 + i + 1}`,
          email: `user${cityIndex * 3 + i + 1}@example.com`,
          phone: `+91${8000000000 + cityIndex * 3 + i}`,
        },
        address: {
          street: `${i + 1} Main Street`,
          city: city.name,
          state: 'State',
          pincode: `${400000 + cityIndex * 1000 + i}`,
          coordinates: {
            type: 'Point',
            coordinates: [
              city.coordinates[0] + (Math.random() - 0.5) * 0.1,
              city.coordinates[1] + (Math.random() - 0.5) * 0.1,
            ],
          },
        },
        documents: [
          {
            type: 'selfie',
            url: `https://example.com/documents/selfie_${cityIndex * 3 + i + 1}.jpg`,
            status: DocumentStatus.PENDING,
          },
          {
            type: 'signature',
            url: `https://example.com/documents/signature_${cityIndex * 3 + i + 1}.jpg`,
            status: DocumentStatus.PENDING,
          },
          {
            type: 'id_proof',
            url: `https://example.com/documents/id_${cityIndex * 3 + i + 1}.jpg`,
            status: DocumentStatus.PENDING,
          },
        ],
        status: BookingStatus.PENDING,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      };
      bookings.push(booking);
    }
  });

  return bookings;
}

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    const { db } = await connectToDatabase();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await db.collection(COLLECTIONS.PARTNERS).deleteMany({});
    await db.collection(COLLECTIONS.BOOKINGS).deleteMany({});

    // Initialize indexes
    console.log('📊 Initializing database indexes...');
    await initializeDatabase();

    // Generate and insert partners
    console.log('👥 Generating partners...');
    const partners = generatePartners();
    await db.collection(COLLECTIONS.PARTNERS).insertMany(partners);
    console.log(`✅ Inserted ${partners.length} partners`);

    // Generate and insert bookings
    console.log('📦 Generating bookings...');
    const bookings = generateBookings();
    await db.collection(COLLECTIONS.BOOKINGS).insertMany(bookings);
    console.log(`✅ Inserted ${bookings.length} bookings`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Partners: ${partners.length} (${partners.filter(p => p.status === PartnerStatus.ONLINE).length} online)`);
    console.log(`   Bookings: ${bookings.length}`);
    console.log(`   Cities: ${cities.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();

