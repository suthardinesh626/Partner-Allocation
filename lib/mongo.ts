import { MongoClient, Db, Collection, Document } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

if (!process.env.MONGODB_DB) {
  throw new Error('Please define the MONGODB_DB environment variable');
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

interface MongoClientCached {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<MongoClient> | null;
}

// Use global variable to preserve connection across hot reloads in development
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: MongoClientCached | undefined;
}

let cached: MongoClientCached = global._mongoClientPromise || {
  client: null,
  db: null,
  promise: null,
};

if (!global._mongoClientPromise) {
  global._mongoClientPromise = cached;
}

/**
 * Connect to MongoDB and return the database instance
 */
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cached.client && cached.db) {
    return { client: cached.client, db: cached.db };
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      // SSL/TLS options for MongoDB Atlas (required for Vercel)
      tls: true,
      tlsAllowInvalidCertificates: false,
      retryWrites: true,
      w: 'majority' as const,
    };

    cached.promise = MongoClient.connect(uri, opts);
  }

  try {
    cached.client = await cached.promise;
    cached.db = cached.client.db(dbName);

    return { client: cached.client, db: cached.db };
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

/**
 * Get a specific collection from the database
 */
export async function getCollection<T extends Document = Document>(collectionName: string): Promise<Collection<T>> {
  const { db } = await connectToDatabase();
  return db.collection<T>(collectionName);
}

/**
 * Initialize database indexes and collections
 */
export async function initializeDatabase() {
  const { db } = await connectToDatabase();

  try {
    // Create 2dsphere index for partners collection for geospatial queries
    const partnersCollection = db.collection('partners');
    await partnersCollection.createIndex({ location: '2dsphere' });
    
    // Create index for partner status and city
    await partnersCollection.createIndex({ status: 1, city: 1 });
    
    // Create indexes for bookings collection
    const bookingsCollection = db.collection('bookings');
    await bookingsCollection.createIndex({ status: 1 });
    await bookingsCollection.createIndex({ partnerId: 1 });
    await bookingsCollection.createIndex({ 'address.coordinates': '2dsphere' });
    
    console.log('✅ Database indexes initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database indexes:', error);
    throw error;
  }
}

// Export collection names as constants
export const COLLECTIONS = {
  BOOKINGS: 'bookings',
  PARTNERS: 'partners',
} as const;

