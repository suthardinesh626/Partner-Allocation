// MongoDB initialization script for Docker
// This script runs when the MongoDB container is first created

db = db.getSiblingDB('rentkar');

// Create collections
db.createCollection('bookings');
db.createCollection('partners');

// Create indexes for bookings
db.bookings.createIndex({ status: 1 });
db.bookings.createIndex({ partnerId: 1 });
db.bookings.createIndex({ 'address.coordinates': '2dsphere' });

// Create indexes for partners
db.partners.createIndex({ location: '2dsphere' });
db.partners.createIndex({ status: 1, city: 1 });

print('MongoDB initialized successfully!');

