# Getting Started with Partner-Allocation

Welcome to the Partner-Allocation Booking & Partner Verification System! This guide will help you get up and running in less than 5 minutes.

## 🎯 What is Partner-Allocation?

Partner-Allocation is a full-stack booking and partner verification system that demonstrates:
- **Distributed Systems**: Redis locks for concurrency control
- **Geospatial Queries**: Find nearest partners using MongoDB
- **Rate Limiting**: Prevent API abuse with Redis
- **Real-time Updates**: Event broadcasting with pub/sub
- **Modern Stack**: Next.js, TypeScript, MongoDB, Redis, Docker

## 🚀 Quick Start (3 Steps)

### Option 1: Using Docker (Recommended)

```bash
# 1. Start all services
bash scripts/quick-start.sh

# That's it! Open http://localhost:3000
```

### Option 2: Manual Setup

```bash
# 1. Start MongoDB and Redis
docker run -d -p 27017:27017 --name mongo mongo:7
docker run -d -p 6379:6379 --name redis redis:7-alpine

# 2. Install and seed
npm install
npm run seed

# 3. Start the app
npm run dev

# Open http://localhost:3000
```

## 📊 What You Get

After setup, you'll have:

### 35 Partners
- 7 cities: Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune
- 3 online partners per city (available for assignment)
- 2 offline partners per city
- Realistic GPS coordinates

### 21 Bookings
- 3 bookings per city
- All in "pending" status
- Each with 3 documents (selfie, signature, ID proof)
- Ready for partner assignment

## 🎮 Try It Out

### 1. Assign a Partner (with Concurrency Control)

**In the UI:**
1. Go to Bookings tab
2. Find a "PENDING" booking
3. Click "Assign Partner"
4. Nearest online partner is assigned automatically

**Using API:**
```bash
curl -X POST http://localhost:3000/api/bookings/assign \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "YOUR_BOOKING_ID",
    "adminId": "admin_001"
  }'
```

### 2. Review Documents

**In the UI:**
1. Find a booking with "PARTNER_ASSIGNED" status
2. Click "Approve" or "Reject" on each document
3. Watch status change to "DOCUMENTS_UNDER_REVIEW"

**Using API:**
```bash
curl -X POST http://localhost:3000/api/bookings/review \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "YOUR_BOOKING_ID",
    "documentType": "selfie",
    "status": "approved",
    "reviewerId": "admin_001"
  }'
```

### 3. Confirm Booking

**In the UI:**
1. After all documents are approved
2. Click "Confirm Booking"
3. Status changes to "CONFIRMED"

**Using API:**
```bash
curl -X POST http://localhost:3000/api/bookings/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "YOUR_BOOKING_ID",
    "adminId": "admin_001"
  }'
```

### 4. GPS Tracking (with Rate Limiting)

**In the UI:**
1. Go to Partners tab
2. Find an "ONLINE" partner
3. Click "Simulate GPS Update"
4. Try clicking 7 times rapidly - 7th will be rate limited!

**Using API:**
```bash
curl -X POST http://localhost:3000/api/partners/PARTNER_ID/gps \
  -H "Content-Type: application/json" \
  -d '{
    "coordinates": [77.5946, 12.9716],
    "speed": 45.5,
    "accuracy": 10
  }'
```

## 🧪 Test Concurrency

Run the automated test suite:

```bash
bash scripts/test-concurrency.sh
```

This tests:
1. ✅ Concurrent partner assignment (Redis locks)
2. ✅ GPS rate limiting (6 updates/minute)
3. ✅ Concurrent document review

## 📚 Learn More

### Core Concepts

1. **Distributed Locks** ([lib/lock.ts](lib/lock.ts))
   - Prevents race conditions
   - Atomic operations with Redis NX flag
   - Auto-expiry to prevent deadlocks

2. **Geospatial Queries** ([app/api/bookings/assign/route.ts](app/api/bookings/assign/route.ts))
   - MongoDB $geoNear aggregation
   - 2dsphere indexes for Earth geometry
   - Distance calculation in meters

3. **Rate Limiting** ([lib/rateLimit.ts](lib/rateLimit.ts))
   - Sliding window algorithm
   - Redis sorted sets
   - Per-partner GPS limits

4. **Pub/Sub Events** ([lib/pubsub.ts](lib/pubsub.ts))
   - Real-time updates
   - Event broadcasting
   - Decoupled architecture

### File Structure

```
partner-allocation-app/
├── lib/              # Core utilities
│   ├── mongo.ts      # Database connection
│   ├── redis.ts      # Cache & pub/sub
│   ├── lock.ts       # Distributed locks
│   ├── rateLimit.ts  # Rate limiting
│   └── types.ts      # TypeScript types
│
├── app/
│   ├── api/          # API routes
│   │   ├── bookings/ # Booking endpoints
│   │   └── partners/ # Partner endpoints
│   ├── components/   # React components
│   └── page.tsx      # Dashboard UI
│
└── scripts/          # Utility scripts
    ├── seed.ts       # Database seeding
    └── *.sh          # Helper scripts
```

## 🔍 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### MongoDB/Redis Not Running

```bash
# Check containers
docker ps

# Restart services
docker-compose restart

# View logs
docker-compose logs -f
```

### Database is Empty

```bash
# Re-seed the database
npm run seed

# Or in Docker
docker-compose exec app npm run seed
```

### Clear Everything and Start Fresh

```bash
# Stop and remove all containers with data
docker-compose down -v

# Start fresh
bash scripts/quick-start.sh
```

## 📖 Documentation

- **[README.md](README.md)** - Complete technical documentation
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup instructions
- **[API_EXAMPLES.md](API_EXAMPLES.md)** - API usage examples
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Architecture overview

## 🎯 Next Steps

1. **Explore the Code**
   - Start with `lib/` directory to understand core utilities
   - Check `app/api/` for API implementations
   - Review `app/components/` for UI components

2. **Test Features**
   - Run concurrency tests
   - Try the complete booking flow
   - Test rate limiting

3. **Customize**
   - Modify business logic in API routes
   - Update UI components
   - Add new features

4. **Deploy**
   - Use Docker Compose for production
   - Add environment-specific configs
   - Set up monitoring and logging

## 💡 Tips

- **Auto-refresh**: Dashboard refreshes every 10 seconds
- **Concurrency**: Try assigning same booking from 2 terminals
- **Rate Limits**: GPS updates limited to 6 per minute per partner
- **Locks**: All critical operations use Redis locks
- **Events**: All state changes broadcast via pub/sub

## 🆘 Need Help?

1. Check the [README.md](README.md) for detailed docs
2. Review [API_EXAMPLES.md](API_EXAMPLES.md) for usage examples
3. Run `bash scripts/test-concurrency.sh` to verify setup
4. Check logs: `docker-compose logs -f app`

## 🎉 You're Ready!

Open http://localhost:3000 and start exploring!

**Happy Coding! 🚀**

---

Built with ❤️ using Next.js, MongoDB, Redis, and Docker

