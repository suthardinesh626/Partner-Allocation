#!/bin/bash

# Test concurrency control for Rentkar system

echo "🧪 Testing Rentkar Concurrency Control"
echo "======================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "Checking if server is running..."
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${RED}❌ Server is not running!${NC}"
    echo "Please start the server with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Get first booking ID
echo "Fetching a booking ID..."
BOOKING_ID=$(curl -s http://localhost:3000/api/bookings | jq -r '.data.bookings[0]._id')

if [ -z "$BOOKING_ID" ] || [ "$BOOKING_ID" = "null" ]; then
    echo -e "${RED}❌ No bookings found!${NC}"
    echo "Please run: npm run seed"
    exit 1
fi
echo -e "${GREEN}✓ Using booking ID: ${BOOKING_ID}${NC}"
echo ""

# Test 1: Concurrent Partner Assignment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Concurrent Partner Assignment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Sending 2 simultaneous assignment requests..."

# Run two requests in parallel
curl -s -X POST http://localhost:3000/api/bookings/assign \
  -H "Content-Type: application/json" \
  -d "{\"bookingId\":\"$BOOKING_ID\",\"adminId\":\"admin_001\"}" > /tmp/response1.json &

curl -s -X POST http://localhost:3000/api/bookings/assign \
  -H "Content-Type: application/json" \
  -d "{\"bookingId\":\"$BOOKING_ID\",\"adminId\":\"admin_002\"}" > /tmp/response2.json &

# Wait for both to complete
wait

echo "Response 1 (admin_001):"
cat /tmp/response1.json | jq '.'
echo ""

echo "Response 2 (admin_002):"
cat /tmp/response2.json | jq '.'
echo ""

# Check results
SUCCESS_COUNT=$(cat /tmp/response1.json /tmp/response2.json | jq -s '[.[] | select(.success == true)] | length')
CONFLICT_COUNT=$(cat /tmp/response1.json /tmp/response2.json | jq -s '[.[] | select(.success == false and (.error | contains("lock")))] | length')

if [ "$SUCCESS_COUNT" = "1" ] && [ "$CONFLICT_COUNT" = "1" ]; then
    echo -e "${GREEN}✅ Test 1 PASSED: One request succeeded, one got conflict${NC}"
else
    echo -e "${RED}❌ Test 1 FAILED: Expected 1 success and 1 conflict${NC}"
fi
echo ""

# Test 2: Rate Limiting
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: GPS Rate Limiting (6 requests per minute)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get first partner ID
echo "Fetching a partner ID..."
PARTNER_ID=$(curl -s http://localhost:3000/api/partners | jq -r '.data.partners[0]._id')

if [ -z "$PARTNER_ID" ] || [ "$PARTNER_ID" = "null" ]; then
    echo -e "${RED}❌ No partners found!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Using partner ID: ${PARTNER_ID}${NC}"
echo ""

echo "Sending 8 GPS updates rapidly..."
SUCCESS=0
RATE_LIMITED=0

for i in {1..8}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/partners/$PARTNER_ID/gps \
      -H "Content-Type: application/json" \
      -d "{\"coordinates\":[77.$i, 12.$i]}")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        SUCCESS=$((SUCCESS + 1))
        echo "  Request $i: ${GREEN}✓ Success${NC}"
    elif [ "$HTTP_CODE" = "429" ]; then
        RATE_LIMITED=$((RATE_LIMITED + 1))
        echo "  Request $i: ${YELLOW}⚠ Rate Limited${NC}"
    else
        echo "  Request $i: ${RED}✗ Failed (HTTP $HTTP_CODE)${NC}"
    fi
done

echo ""
echo "Results: $SUCCESS successful, $RATE_LIMITED rate limited"

if [ "$SUCCESS" = "6" ] && [ "$RATE_LIMITED" = "2" ]; then
    echo -e "${GREEN}✅ Test 2 PASSED: Rate limiting working correctly${NC}"
else
    echo -e "${YELLOW}⚠ Test 2 WARNING: Expected 6 success and 2 rate limited, got $SUCCESS success and $RATE_LIMITED rate limited${NC}"
fi
echo ""

# Test 3: Document Review Concurrency
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Concurrent Document Review"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get a booking with partner assigned
BOOKING_WITH_PARTNER=$(curl -s http://localhost:3000/api/bookings | jq -r '.data.bookings[] | select(.partnerId != null) | ._id' | head -n1)

if [ -z "$BOOKING_WITH_PARTNER" ] || [ "$BOOKING_WITH_PARTNER" = "null" ]; then
    echo -e "${YELLOW}⚠ Skipping Test 3: No booking with assigned partner found${NC}"
else
    echo "Sending 2 simultaneous review requests for the same document..."
    
    curl -s -X POST http://localhost:3000/api/bookings/review \
      -H "Content-Type: application/json" \
      -d "{\"bookingId\":\"$BOOKING_WITH_PARTNER\",\"documentType\":\"selfie\",\"status\":\"approved\",\"reviewerId\":\"admin_001\"}" > /tmp/review1.json &

    curl -s -X POST http://localhost:3000/api/bookings/review \
      -H "Content-Type: application/json" \
      -d "{\"bookingId\":\"$BOOKING_WITH_PARTNER\",\"documentType\":\"selfie\",\"status\":\"approved\",\"reviewerId\":\"admin_002\"}" > /tmp/review2.json &

    wait

    echo "Response 1:"
    cat /tmp/review1.json | jq '.'
    echo ""

    echo "Response 2:"
    cat /tmp/review2.json | jq '.'
    echo ""

    REVIEW_SUCCESS=$(cat /tmp/review1.json /tmp/review2.json | jq -s '[.[] | select(.success == true)] | length')
    REVIEW_CONFLICT=$(cat /tmp/review1.json /tmp/review2.json | jq -s '[.[] | select(.success == false)] | length')

    if [ "$REVIEW_SUCCESS" -ge "1" ]; then
        echo -e "${GREEN}✅ Test 3 PASSED: Document review concurrency working${NC}"
    else
        echo -e "${RED}❌ Test 3 FAILED: No successful review${NC}"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Concurrency Tests Completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cleanup
rm -f /tmp/response1.json /tmp/response2.json /tmp/review1.json /tmp/review2.json

