# API Examples & Testing

This document provides ready-to-use API examples for testing the Rentkar system.

## Prerequisites

Make sure the application is running:
```bash
# Option 1: Docker
docker-compose up

# Option 2: Local
npm run dev
```

## Environment Setup

```bash
# Base URL
export API_URL="http://localhost:3000"

# Get a booking ID for testing
export BOOKING_ID=$(curl -s $API_URL/api/bookings | jq -r '.data.bookings[0]._id')

# Get a partner ID for testing
export PARTNER_ID=$(curl -s $API_URL/api/partners | jq -r '.data.partners[0]._id')

echo "Booking ID: $BOOKING_ID"
echo "Partner ID: $PARTNER_ID"
```

## 📋 Bookings APIs

### 1. Get All Bookings

```bash
curl -X GET "$API_URL/api/bookings" | jq '.'
```

**Response:**
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

### 2. Get Bookings by Status

```bash
# Get pending bookings
curl -X GET "$API_URL/api/bookings?status=pending" | jq '.'

# Get confirmed bookings
curl -X GET "$API_URL/api/bookings?status=confirmed" | jq '.'
```

### 3. Get Bookings with Pagination

```bash
# Get first 10 bookings
curl -X GET "$API_URL/api/bookings?limit=10&skip=0" | jq '.'

# Get next 10 bookings
curl -X GET "$API_URL/api/bookings?limit=10&skip=10" | jq '.'
```

### 4. Assign Partner to Booking

```bash
curl -X POST "$API_URL/api/bookings/assign" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"$BOOKING_ID\",
    \"adminId\": \"admin_001\"
  }" | jq '.'
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "...",
    "partnerId": "...",
    "partnerName": "Mumbai Partner 1",
    "distance": 1250
  },
  "message": "Partner assigned successfully"
}
```

**Conflict Response (409):**
```json
{
  "success": false,
  "error": "Another admin is currently assigning this booking. Please try again."
}
```

### 5. Review Document (Approve)

```bash
curl -X POST "$API_URL/api/bookings/review" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"$BOOKING_ID\",
    \"documentType\": \"selfie\",
    \"status\": \"approved\",
    \"reviewerId\": \"admin_001\"
  }" | jq '.'
```

### 6. Review Document (Reject)

```bash
curl -X POST "$API_URL/api/bookings/review" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"$BOOKING_ID\",
    \"documentType\": \"signature\",
    \"status\": \"rejected\",
    \"reviewerId\": \"admin_001\",
    \"rejectionReason\": \"Signature not clear\"
  }" | jq '.'
```

### 7. Confirm Booking

```bash
curl -X POST "$API_URL/api/bookings/confirm" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"$BOOKING_ID\",
    \"adminId\": \"admin_001\"
  }" | jq '.'
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "...",
    "partnerId": "...",
    "confirmedAt": "2025-10-14T10:30:00.000Z",
    "confirmedBy": "admin_001"
  },
  "message": "Booking confirmed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Cannot confirm booking. Following documents are not approved: selfie, id_proof"
}
```

## 👥 Partners APIs

### 1. Get All Partners

```bash
curl -X GET "$API_URL/api/partners" | jq '.'
```

### 2. Get Partners by Status

```bash
# Get online partners
curl -X GET "$API_URL/api/partners?status=online" | jq '.'

# Get offline partners
curl -X GET "$API_URL/api/partners?status=offline" | jq '.'
```

### 3. Get Partners by City

```bash
# Get Mumbai partners
curl -X GET "$API_URL/api/partners?city=Mumbai" | jq '.'

# Get online partners in Bangalore
curl -X GET "$API_URL/api/partners?status=online&city=Bangalore" | jq '.'
```

### 4. Update Partner GPS Location

```bash
curl -X POST "$API_URL/api/partners/$PARTNER_ID/gps" \
  -H "Content-Type: application/json" \
  -d '{
    "coordinates": [77.5946, 12.9716],
    "speed": 45.5,
    "accuracy": 10
  }' | jq '.'
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "partnerId": "...",
    "coordinates": [77.5946, 12.9716],
    "timestamp": "2025-10-14T10:30:00.000Z"
  },
  "message": "GPS location updated successfully"
}
```

**Rate Limit Response Headers:**
```
X-RateLimit-Limit: 6
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 45
```

**Rate Limited Response (429):**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Maximum 6 GPS updates per minute allowed."
}
```

## 🧪 Concurrency Testing

### Test 1: Concurrent Partner Assignment

Run these in **two separate terminals** simultaneously:

**Terminal 1:**
```bash
curl -X POST "$API_URL/api/bookings/assign" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"$BOOKING_ID\",
    \"adminId\": \"admin_001\"
  }"
```

**Terminal 2:**
```bash
curl -X POST "$API_URL/api/bookings/assign" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"$BOOKING_ID\",
    \"adminId\": \"admin_002\"
  }"
```

**Expected Result:** One succeeds, the other gets 409 Conflict.

### Test 2: Rate Limiting

```bash
# Send 7 GPS updates rapidly
for i in {1..7}; do
  echo "Request $i:"
  curl -i -X POST "$API_URL/api/partners/$PARTNER_ID/gps" \
    -H "Content-Type: application/json" \
    -d "{\"coordinates\":[77.$i, 12.$i]}" 2>/dev/null | head -n 20
  echo ""
done
```

**Expected Result:** First 6 succeed, 7th returns 429.

### Test 3: Complete Booking Flow

```bash
# Step 1: Get a pending booking
BOOKING_ID=$(curl -s "$API_URL/api/bookings?status=pending" | jq -r '.data.bookings[0]._id')
echo "Testing with Booking ID: $BOOKING_ID"

# Step 2: Assign partner
echo -e "\n1. Assigning partner..."
curl -s -X POST "$API_URL/api/bookings/assign" \
  -H "Content-Type: application/json" \
  -d "{\"bookingId\":\"$BOOKING_ID\",\"adminId\":\"admin_001\"}" | jq '.message'

# Step 3: Approve all documents
echo -e "\n2. Approving documents..."
for doc in "selfie" "signature" "id_proof"; do
  echo "  - Approving $doc"
  curl -s -X POST "$API_URL/api/bookings/review" \
    -H "Content-Type: application/json" \
    -d "{\"bookingId\":\"$BOOKING_ID\",\"documentType\":\"$doc\",\"status\":\"approved\",\"reviewerId\":\"admin_001\"}" | jq '.message'
done

# Step 4: Confirm booking
echo -e "\n3. Confirming booking..."
curl -s -X POST "$API_URL/api/bookings/confirm" \
  -H "Content-Type: application/json" \
  -d "{\"bookingId\":\"$BOOKING_ID\",\"adminId\":\"admin_001\"}" | jq '.message'

echo -e "\n✅ Complete flow tested!"
```

## 📊 Advanced Queries

### Get Booking Statistics

```bash
# Count by status
curl -s "$API_URL/api/bookings" | jq '
  .data.bookings | group_by(.status) | 
  map({status: .[0].status, count: length})'
```

### Get Partner Statistics

```bash
# Count by city and status
curl -s "$API_URL/api/partners" | jq '
  .data.partners | group_by(.city) | 
  map({city: .[0].city, total: length, 
       online: ([.[] | select(.status == "online")] | length)})'
```

### Find Partners Near a Location

```bash
# This would require a custom endpoint, but here's how geospatial query works:
# The /api/bookings/assign endpoint uses this logic internally:

# MongoDB Query (for reference):
# db.partners.aggregate([
#   {
#     $geoNear: {
#       near: { type: "Point", coordinates: [77.5946, 12.9716] },
#       distanceField: "distance",
#       maxDistance: 50000,
#       query: { status: "online", city: "Bangalore" },
#       spherical: true
#     }
#   },
#   { $limit: 5 }
# ])
```

## 🔍 Monitoring & Debugging

### Check Rate Limit Status

```bash
# In Redis CLI
redis-cli

# View rate limit data for a partner
ZRANGE ratelimit:gps:$PARTNER_ID 0 -1 WITHSCORES
```

### Check Active Locks

```bash
# In Redis CLI
redis-cli

# View all locks
KEYS lock:*

# Check specific lock
GET lock:booking:assign:$BOOKING_ID
TTL lock:booking:assign:$BOOKING_ID
```

### View MongoDB Data

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/rentkar

# View bookings
db.bookings.find().pretty()

# Count bookings by status
db.bookings.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

# View partners with GPS history
db.partners.find({ "gpsHistory.0": { $exists: true } }).pretty()
```

## 🎯 Error Scenarios

### 1. Invalid Booking ID

```bash
curl -X POST "$API_URL/api/bookings/assign" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"invalid","adminId":"admin_001"}' | jq '.'
```

**Response:**
```json
{
  "success": false,
  "error": "Invalid booking ID format"
}
```

### 2. Missing Required Fields

```bash
curl -X POST "$API_URL/api/bookings/assign" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"123"}' | jq '.'
```

**Response:**
```json
{
  "success": false,
  "error": "Missing required fields: bookingId and adminId"
}
```

### 3. Invalid Coordinates

```bash
curl -X POST "$API_URL/api/partners/$PARTNER_ID/gps" \
  -H "Content-Type: application/json" \
  -d '{"coordinates":[200, 100]}' | jq '.'
```

**Response:**
```json
{
  "success": false,
  "error": "Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90"
}
```

### 4. Document Already Reviewed

```bash
# Try to review the same document twice
curl -X POST "$API_URL/api/bookings/review" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"$BOOKING_ID\",
    \"documentType\": \"selfie\",
    \"status\": \"approved\",
    \"reviewerId\": \"admin_001\"
  }" | jq '.'

# Second attempt
curl -X POST "$API_URL/api/bookings/review" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"$BOOKING_ID\",
    \"documentType\": \"selfie\",
    \"status\": \"approved\",
    \"reviewerId\": \"admin_002\"
  }" | jq '.'
```

**Response:**
```json
{
  "success": false,
  "error": "Document 'selfie' is already approved"
}
```

## 📝 Quick Reference

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (lock acquisition failed)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Unable to acquire lock" | Another admin is processing | Wait and retry |
| "Rate limit exceeded" | Too many GPS updates | Wait 1 minute |
| "No available partners found" | No online partners nearby | Check partner status |
| "Following documents are not approved" | Not all docs approved | Review all documents first |
| "Invalid booking ID format" | Invalid ObjectId | Use valid MongoDB ObjectId |

## 🚀 Performance Testing

### Benchmark Partner Assignment

```bash
# Install Apache Bench (if needed)
# brew install httpd

# Test 100 requests with 10 concurrent
ab -n 100 -c 10 -T 'application/json' \
  -p <(echo "{\"bookingId\":\"$BOOKING_ID\",\"adminId\":\"admin_001\"}") \
  "$API_URL/api/bookings/assign"
```

### Load Test GPS Updates

```bash
# Test 1000 requests with 50 concurrent
ab -n 1000 -c 50 -T 'application/json' \
  -p <(echo '{"coordinates":[77.5946,12.9716]}') \
  "$API_URL/api/partners/$PARTNER_ID/gps"
```

---

**Happy Testing! 🎉**

For more information, see:
- [README.md](README.md) - Complete documentation
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Quick setup guide
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Project overview

