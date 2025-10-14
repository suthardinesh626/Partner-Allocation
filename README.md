# Partner-Allocation Booking & Partner Verification System

A full-stack booking and partner verification system built with Next.js, MongoDB, Redis, and Docker. This system handles concurrent operations safely using distributed locks, implements rate limiting for GPS updates, and provides real-time updates using Redis pub/sub.

## 🚀 Features

### Core Functionalities

1. **Partner Assignment with Concurrency Control**
   - Automatically assigns the nearest available partner to a booking
   - Uses MongoDB geospatial queries (`$geoNear`) to find partners within 50km radius
   - Redis distributed locks prevent multiple admins from assigning the same booking
   - Lock automatically expires after 10 seconds to prevent deadlocks

2. **Document Review System**
   - Admins can review and approve/reject booking documents (selfie, signature, ID proof)
   - Redis locks ensure only one admin can review a specific document at a time
   - Supports rejection reasons for transparency
   - Real-time updates notify all admins when documents are reviewed

3. **Booking Confirmation**
   - Confirms bookings only after all documents are approved
   - Redis locks prevent double confirmation
   - Updates partner statistics (total deliveries)
   - Broadcasts confirmation events to all connected admins

4. **Partner GPS Tracking with Rate Limiting**
   - Partners can update their GPS location
   - Rate limited to 6 updates per minute using Redis sliding window algorithm
   - Stores last 100 GPS points per partner
   - Real-time GPS updates broadcast to admin dashboard

5. **Real-time Updates**
   - Redis pub/sub for real-time event broadcasting
   - Events: booking assigned, document reviewed, booking confirmed, GPS updates
   - Auto-refresh dashboard every 10 seconds

## 🛠️ Tech Stack

- **Frontend**: Next.js 15.5 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (TypeScript)
- **Database**: MongoDB 7 (with geospatial indexes)
- **Cache/Locks**: Redis 7 (with ioredis)
- **DevOps**: Docker, Docker Compose
- **Testing**: TypeScript strict mode, ESLint

## 📁 Project Structure

```
partner-allocation-app/
├── app/
│   ├── page.tsx                    # Main dashboard UI
│   ├── globals.css                 # Global styles
│   ├── components/
│   │   ├── BookingCard.tsx         # Booking card component
│   │   └── PartnerCard.tsx         # Partner card component
│   └── api/
│       ├── bookings/
│       │   ├── route.ts            # GET /api/bookings
│       │   ├── assign/route.ts     # POST /api/bookings/assign
│       │   ├── review/route.ts     # POST /api/bookings/review
│       │   └── confirm/route.ts    # POST /api/bookings/confirm
│       └── partners/
│           ├── route.ts            # GET /api/partners
│           └── [id]/gps/route.ts   # POST /api/partners/:id/gps
├── lib/
│   ├── mongo.ts                    # MongoDB connection & utilities
│   ├── redis.ts                    # Redis connection & utilities
│   ├── lock.ts                     # Distributed lock implementation
│   ├── rateLimit.ts                # Rate limiting with Redis
│   ├── pubsub.ts                   # Pub/sub event handlers
│   └── types.ts                    # TypeScript types & interfaces
├── scripts/
│   ├── seed.ts                     # Database seeding script
│   └── mongo-init.js               # MongoDB initialization for Docker
├── docker-compose.yml              # Docker orchestration
├── Dockerfile                      # Next.js Docker image
├── .env.example                    # Environment variables template
└── package.json                    # Dependencies & scripts
```

## 🔧 Setup Instructions

### Prerequisites

- Node.js 20+ installed
- Docker and Docker Compose installed
- Git installed

### Local Development (Without Docker)

1. **Clone the repository**
   ```bash
   cd partner-allocation-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/partner-allocation
   MONGODB_DB=partner-allocation
   REDIS_URL=redis://localhost:6379
   ```

4. **Start MongoDB and Redis locally** (or use Docker services):
   ```bash
   # Using Docker for just MongoDB and Redis
   docker run -d -p 27017:27017 --name mongo mongo:7
   docker run -d -p 6379:6379 --name redis redis:7-alpine
   ```

5. **Initialize and seed the database**
   ```bash
   npm run seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   ```
   http://localhost:3000
   ```

### Production Deployment (With Docker Compose)

1. **Build and start all services**
   ```bash
   docker-compose up --build
   ```

2. **Seed the database** (in a new terminal)
   ```bash
   docker-compose exec app npm run seed
   ```

3. **Access the application**
   ```
   http://localhost:3000
   ```

4. **Stop all services**
   ```bash
   docker-compose down
   ```

5. **Clean up volumes** (if needed)
   ```bash
   docker-compose down -v
   ```

## 📊 Database Schema

### Bookings Collection

```typescript
{
  _id: ObjectId,
  userId: string,
  userInfo: {
    name: string,
    email: string,
    phone: string
  },
  address: {
    street: string,
    city: string,
    state: string,
    pincode: string,
    coordinates: {
      type: "Point",
      coordinates: [longitude, latitude]
    }
  },
  documents: [
    {
      type: "selfie" | "signature" | "id_proof" | "address_proof",
      url: string,
      status: "pending" | "approved" | "rejected",
      reviewedBy?: string,
      reviewedAt?: Date,
      rejectionReason?: string
    }
  ],
  status: "pending" | "partner_assigned" | "documents_under_review" | "confirmed" | "cancelled",
  partnerId?: string,
  partnerAssignedAt?: Date,
  partnerAssignedBy?: string,
  confirmedAt?: Date,
  confirmedBy?: string,
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - status: 1
// - partnerId: 1
// - address.coordinates: 2dsphere
```

### Partners Collection

```typescript
{
  _id: ObjectId,
  name: string,
  email: string,
  phone: string,
  city: string,
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  status: "online" | "offline" | "busy",
  currentBookingId?: string,
  gpsHistory: [
    {
      coordinates: {
        type: "Point",
        coordinates: [longitude, latitude]
      },
      timestamp: Date,
      speed?: number,
      accuracy?: number
    }
  ],
  rating?: number,
  totalDeliveries?: number,
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - location: 2dsphere (for geospatial queries)
// - status: 1, city: 1 (compound index)
```

## 🔐 Redis Usage Patterns

### 1. Distributed Locks

**Purpose**: Prevent concurrent operations on the same resource

**Implementation**:
```typescript
// Acquire lock with automatic expiry
const lockKey = `lock:booking:assign:${bookingId}`;
const acquired = await redis.set(lockKey, "locked", "NX", "EX", 10);

if (!acquired) {
  throw new Error("Another admin is processing this booking");
}

// Perform operation
// ...

// Release lock
await redis.del(lockKey);
```

**Lock Keys**:
- `lock:booking:assign:{bookingId}` - Partner assignment lock
- `lock:booking:confirm:{bookingId}` - Booking confirmation lock
- `lock:booking:review:{bookingId}:{docType}` - Document review lock

### 2. Rate Limiting

**Purpose**: Limit GPS updates to 6 per minute per partner

**Algorithm**: Sliding Window with Sorted Sets

**Implementation**:
```typescript
const key = `ratelimit:gps:${partnerId}`;
const now = Date.now();
const windowStart = now - 60000; // 1 minute window

// Remove old entries
await redis.zremrangebyscore(key, 0, windowStart);

// Count current requests
const count = await redis.zcard(key);

if (count >= 6) {
  throw new Error("Rate limit exceeded");
}

// Add current request
await redis.zadd(key, now, now.toString());
await redis.expire(key, 60);
```

**Rate Limit Headers**:
- `X-RateLimit-Limit`: 6
- `X-RateLimit-Remaining`: 4 (example)
- `X-RateLimit-Reset`: 45 (seconds)

### 3. Pub/Sub Events

**Purpose**: Real-time updates across all admin dashboards

**Channels**:
- `booking:confirmed` - Booking confirmation events
- `booking:assigned` - Partner assignment events
- `document:reviewed` - Document review events
- `partner:gps:update` - GPS location updates

**Usage**:
```typescript
// Publish
await redis.publish('booking:confirmed', JSON.stringify({
  bookingId,
  partnerId,
  confirmedAt: new Date(),
  confirmedBy: adminId
}));

// Subscribe
const subscriber = new Redis(REDIS_URL);
subscriber.on('message', (channel, message) => {
  const event = JSON.parse(message);
  // Handle event
});
await subscriber.subscribe('booking:confirmed');
```

## 🌐 API Documentation

### Bookings APIs

#### GET /api/bookings
Fetch all bookings with optional filters

**Query Parameters**:
- `status` (optional): Filter by booking status
- `partnerId` (optional): Filter by partner ID
- `limit` (optional): Number of results (default: 50)
- `skip` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "success": true,
  "data": {
    "bookings": [...],
    "total": 21,
    "limit": 50,
    "skip": 0
  }
}
```

#### POST /api/bookings/assign
Assign nearest available partner to a booking

**Request Body**:
```json
{
  "bookingId": "507f1f77bcf86cd799439011",
  "adminId": "admin_001"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "bookingId": "507f1f77bcf86cd799439011",
    "partnerId": "507f1f77bcf86cd799439012",
    "partnerName": "Mumbai Partner 1",
    "distance": 1250
  },
  "message": "Partner assigned successfully"
}
```

**Errors**:
- `409 Conflict` - Another admin is assigning this booking
- `400 Bad Request` - Invalid booking ID
- `500 Internal Server Error` - No partners available

#### POST /api/bookings/review
Review a booking document

**Request Body**:
```json
{
  "bookingId": "507f1f77bcf86cd799439011",
  "documentType": "selfie",
  "status": "approved",
  "reviewerId": "admin_001",
  "rejectionReason": "optional - required if rejected"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "bookingId": "507f1f77bcf86cd799439011",
    "documentType": "selfie",
    "status": "approved",
    "reviewedBy": "admin_001"
  },
  "message": "Document 'selfie' approved successfully"
}
```

#### POST /api/bookings/confirm
Confirm a booking after all documents are approved

**Request Body**:
```json
{
  "bookingId": "507f1f77bcf86cd799439011",
  "adminId": "admin_001"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "bookingId": "507f1f77bcf86cd799439011",
    "partnerId": "507f1f77bcf86cd799439012",
    "confirmedAt": "2025-10-14T10:30:00.000Z",
    "confirmedBy": "admin_001"
  },
  "message": "Booking confirmed successfully"
}
```

### Partners APIs

#### GET /api/partners
Fetch all partners with optional filters

**Query Parameters**:
- `status` (optional): Filter by partner status
- `city` (optional): Filter by city
- `limit` (optional): Number of results (default: 50)
- `skip` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "success": true,
  "data": {
    "partners": [...],
    "total": 35,
    "limit": 50,
    "skip": 0
  }
}
```

#### POST /api/partners/:id/gps
Update partner GPS location (rate limited)

**Path Parameters**:
- `id` - Partner ID

**Request Body**:
```json
{
  "coordinates": [77.5946, 12.9716],
  "speed": 45.5,
  "accuracy": 10
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "partnerId": "507f1f77bcf86cd799439012",
    "coordinates": [77.5946, 12.9716],
    "timestamp": "2025-10-14T10:30:00.000Z"
  },
  "message": "GPS location updated successfully"
}
```

**Rate Limit Headers**:
```
X-RateLimit-Limit: 6
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 45
```

**Errors**:
- `429 Too Many Requests` - Rate limit exceeded (max 6 updates/minute)
- `400 Bad Request` - Invalid coordinates
- `404 Not Found` - Partner not found

## 🧪 Testing the System

### Test Concurrency Safety

1. **Partner Assignment Test**:
   ```bash
   # Terminal 1
   curl -X POST http://localhost:3000/api/bookings/assign \
     -H "Content-Type: application/json" \
     -d '{"bookingId":"YOUR_BOOKING_ID","adminId":"admin_001"}'

   # Terminal 2 (immediately)
   curl -X POST http://localhost:3000/api/bookings/assign \
     -H "Content-Type: application/json" \
     -d '{"bookingId":"YOUR_BOOKING_ID","adminId":"admin_002"}'
   
   # Expected: Second request returns 409 Conflict
   ```

2. **Rate Limit Test**:
   ```bash
   # Send 7 GPS updates rapidly
   for i in {1..7}; do
     curl -X POST http://localhost:3000/api/partners/PARTNER_ID/gps \
       -H "Content-Type: application/json" \
       -d "{\"coordinates\":[77.$i, 12.$i]}"
   done
   
   # Expected: 7th request returns 429 Too Many Requests
   ```

### Test Booking Flow

1. Create a booking → Status: `pending`
2. Assign partner → Status: `partner_assigned`
3. Review selfie → Approve → Document status: `approved`
4. Review signature → Approve → Document status: `approved`
5. Review ID proof → Approve → Document status: `approved`
6. Confirm booking → Status: `confirmed`

## 🎯 Design Decisions & Best Practices

### 1. Concurrency Control
- **Why Redis locks?** Distributed locks work across multiple server instances
- **Why 10 second expiry?** Prevents deadlocks if a process crashes
- **Why NX flag?** Ensures atomic "set if not exists" operation

### 2. Geospatial Queries
- **Why 2dsphere index?** Enables accurate distance calculations on Earth's surface
- **Why $geoNear?** Efficiently finds nearest partners with distance calculation
- **Why 50km radius?** Reasonable maximum distance for local delivery partners

### 3. Rate Limiting
- **Why sliding window?** More accurate than fixed window, prevents burst traffic
- **Why 6 updates/minute?** Balances real-time tracking with server load
- **Why sorted sets?** Efficiently track timestamped requests with O(log n) operations

### 4. Database Design
- **Why embedded documents?** Documents are always accessed with booking (no joins needed)
- **Why GPS history array?** Last 100 points provide sufficient tracking without separate collection
- **Why status enums?** Type safety and prevents invalid states

### 5. Architecture Patterns
- **Singleton connections**: Prevents connection pool exhaustion in serverless
- **Fail-open rate limiting**: Allows requests if Redis is down (availability > strict limits)
- **Idempotent operations**: Safe to retry failed requests without side effects

## 🚀 Deployment Checklist

- [ ] Set production environment variables
- [ ] Enable MongoDB authentication
- [ ] Set Redis password
- [ ] Configure HTTPS/SSL
- [ ] Set up monitoring (Sentry, DataDog, etc.)
- [ ] Configure log aggregation
- [ ] Set up automated backups
- [ ] Configure auto-scaling for app containers
- [ ] Set up health checks
- [ ] Configure rate limiting at API gateway level

## ☁️ Vercel Deployment

**⚠️ Important:** This app requires Redis and MongoDB. For Vercel deployment, you **must** use cloud services.

### Quick Vercel Setup:

1. **Set up Upstash Redis** (Required - Vercel can't use localhost)
   - Sign up at [upstash.com](https://upstash.com)
   - Create a Redis database
   - Get your `REDIS_URL`

2. **Configure Environment Variables in Vercel**
   - Add all required variables (see Environment Variables section below)
   - Use your **Upstash Redis URL** instead of `localhost:6379`
   - Use your **MongoDB Atlas URI** (already configured)

3. **Deploy**
   - Push to GitHub
   - Import project in Vercel
   - Vercel will auto-detect Next.js and deploy

📖 **For detailed step-by-step guide, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)**

### Common Vercel Issues:

- ❌ **Blank screen**: Missing environment variables
- ❌ **Redis connection error**: Still using `localhost` instead of Upstash URL
- ❌ **Build fails**: `output: 'standalone'` in next.config.ts (already fixed)

## 📝 Environment Variables

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/partner-allocation
MONGODB_DB=partner-allocation

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# Application Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
PORT=3000

# Rate Limiting Configuration
GPS_RATE_LIMIT=6
GPS_RATE_LIMIT_WINDOW=60

# Lock Configuration
LOCK_EXPIRY_SECONDS=10
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB is running
docker ps | grep mongo

# Check MongoDB logs
docker logs partner-allocation-mongo

# Test connection
mongosh mongodb://localhost:27017/partner-allocation
```

### Redis Connection Issues
```bash
# Check Redis is running
docker ps | grep redis

# Check Redis logs
docker logs partner-allocation-redis

# Test connection
redis-cli ping
```

### Application Issues
```bash
# Check application logs
docker logs partner-allocation-app-1

# Restart all services
docker-compose restart

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Geospatial Queries](https://www.mongodb.com/docs/manual/geospatial-queries/)
- [Redis Distributed Locks](https://redis.io/docs/manual/patterns/distributed-locks/)
- [Redis Rate Limiting](https://redis.io/docs/manual/patterns/rate-limiter/)

## 👨‍💻 Developer

**Dinesh Suthar**

This project demonstrates:
- Full-stack development with Next.js and TypeScript
- Distributed systems with Redis locks and pub/sub
- Geospatial queries with MongoDB
- Rate limiting and concurrency control
- Docker containerization
- Clean architecture and best practices

---

**Note**: This is a developer assignment project showcasing system design and engineering skills. For production use, additional security, monitoring, and scalability features should be implemented.
