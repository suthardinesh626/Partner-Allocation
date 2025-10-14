# Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### Option 1: Local Development (Recommended for Development)

1. **Start MongoDB and Redis using Docker**:
   ```bash
   docker run -d -p 27017:27017 --name rentkar-mongo mongo:7
   docker run -d -p 6379:6379 --name rentkar-redis redis:7-alpine
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Seed the database**:
   ```bash
   npm run seed
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**: http://localhost:3000

### Option 2: Full Docker Setup (Recommended for Production)

1. **Build and start all services**:
   ```bash
   docker-compose up --build
   ```

2. **In a new terminal, seed the database**:
   ```bash
   docker-compose exec app npm run seed
   ```

3. **Open your browser**: http://localhost:3000

4. **Stop services**:
   ```bash
   docker-compose down
   ```

## 📋 What's Included

After seeding, you'll have:

- **35 Partners** across 7 cities (Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune)
  - 3 online partners per city
  - 2 offline partners per city

- **21 Bookings** (3 per city)
  - All in "pending" status
  - 3 documents per booking (selfie, signature, id_proof)

## 🎯 Testing the Features

### 1. Assign a Partner

1. Go to the Bookings tab
2. Find a booking with "PENDING" status
3. Click "Assign Partner"
4. The nearest online partner will be assigned automatically

### 2. Review Documents

1. Find a booking with "PARTNER_ASSIGNED" status
2. Each document has "Approve" and "Reject" buttons
3. Click "Approve" on each document
4. Status changes to "DOCUMENTS_UNDER_REVIEW"

### 3. Confirm Booking

1. After all documents are approved
2. Click "Confirm Booking"
3. Status changes to "CONFIRMED"

### 4. GPS Tracking

1. Go to the Partners tab
2. Find an "ONLINE" partner
3. Click "Simulate GPS Update"
4. The partner's location will be updated (max 6 times per minute)

## 🧪 Testing Concurrency

### Test 1: Concurrent Partner Assignment

Open two terminals and run these commands simultaneously:

**Terminal 1**:
```bash
curl -X POST http://localhost:3000/api/bookings/assign \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"BOOKING_ID_HERE","adminId":"admin_001"}'
```

**Terminal 2**:
```bash
curl -X POST http://localhost:3000/api/bookings/assign \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"BOOKING_ID_HERE","adminId":"admin_002"}'
```

**Expected Result**: One succeeds, the other gets a 409 Conflict error.

### Test 2: Rate Limiting

Run this command to send 7 GPS updates rapidly:

```bash
PARTNER_ID="YOUR_PARTNER_ID"
for i in {1..7}; do
  curl -X POST http://localhost:3000/api/partners/$PARTNER_ID/gps \
    -H "Content-Type: application/json" \
    -d "{\"coordinates\":[77.$i, 12.$i]}"
  echo ""
done
```

**Expected Result**: First 6 succeed, 7th returns 429 Too Many Requests.

## 🔍 Monitoring

### Check MongoDB Data

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/rentkar

# View bookings
db.bookings.find().pretty()

# View partners
db.partners.find().pretty()

# Check indexes
db.bookings.getIndexes()
db.partners.getIndexes()
```

### Check Redis Data

```bash
# Connect to Redis
redis-cli

# View all keys
KEYS *

# View a specific lock
GET lock:booking:assign:BOOKING_ID

# View rate limit data
ZRANGE ratelimit:gps:PARTNER_ID 0 -1 WITHSCORES
```

## 📊 Sample API Requests

### Get All Bookings

```bash
curl http://localhost:3000/api/bookings
```

### Get Bookings by Status

```bash
curl "http://localhost:3000/api/bookings?status=pending"
```

### Get All Partners

```bash
curl http://localhost:3000/api/partners
```

### Get Online Partners in Mumbai

```bash
curl "http://localhost:3000/api/partners?status=online&city=Mumbai"
```

### Assign Partner

```bash
curl -X POST http://localhost:3000/api/bookings/assign \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "507f1f77bcf86cd799439011",
    "adminId": "admin_001"
  }'
```

### Review Document

```bash
curl -X POST http://localhost:3000/api/bookings/review \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "507f1f77bcf86cd799439011",
    "documentType": "selfie",
    "status": "approved",
    "reviewerId": "admin_001"
  }'
```

### Confirm Booking

```bash
curl -X POST http://localhost:3000/api/bookings/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "507f1f77bcf86cd799439011",
    "adminId": "admin_001"
  }'
```

### Update GPS

```bash
curl -X POST http://localhost:3000/api/partners/507f1f77bcf86cd799439012/gps \
  -H "Content-Type: application/json" \
  -d '{
    "coordinates": [77.5946, 12.9716],
    "speed": 45.5,
    "accuracy": 10
  }'
```

## 🛠️ Troubleshooting

### Port Already in Use

```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### MongoDB Connection Error

```bash
# Check if MongoDB is running
docker ps | grep mongo

# Restart MongoDB
docker restart rentkar-mongo
```

### Redis Connection Error

```bash
# Check if Redis is running
docker ps | grep redis

# Restart Redis
docker restart rentkar-redis
```

### Clear All Data and Start Fresh

```bash
# Stop and remove containers with volumes
docker-compose down -v

# Start fresh
docker-compose up --build
docker-compose exec app npm run seed
```

## 📝 Next Steps

1. Explore the codebase in `lib/` directory
2. Check API implementations in `app/api/`
3. Customize the UI in `app/components/`
4. Add authentication and authorization
5. Implement WebSocket for real-time updates
6. Add comprehensive tests

## 🎓 Learning Resources

- **Redis Locks**: `lib/lock.ts` - Distributed locking implementation
- **Rate Limiting**: `lib/rateLimit.ts` - Sliding window rate limiter
- **Geospatial Queries**: `app/api/bookings/assign/route.ts` - $geoNear usage
- **Pub/Sub**: `lib/pubsub.ts` - Real-time event broadcasting

Happy coding! 🚀

