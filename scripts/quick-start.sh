#!/bin/bash

# Quick start script for Partner-Allocation application

echo "🚀 Partner-Allocation Quick Start Script"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose is available${NC}"
echo ""

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null

echo ""
echo "🏗️  Building and starting services..."
echo "This may take a few minutes on first run..."
echo ""

# Start services
if docker compose version &> /dev/null; then
    docker compose up -d
else
    docker-compose up -d
fi

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."

# Wait for MongoDB
echo -n "  MongoDB: "
for i in {1..30}; do
    if docker exec partner-allocation-mongo mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        echo -e "${GREEN}✓ Ready${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        exit 1
    fi
done

# Wait for Redis
echo -n "  Redis: "
for i in {1..30}; do
    if docker exec partner-allocation-redis redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓ Ready${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        exit 1
    fi
done

# Wait for App
echo -n "  Next.js App: "
for i in {1..60}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Ready${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 60 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        exit 1
    fi
done

echo ""
echo "📊 Seeding database with sample data..."

# Seed the database
if docker compose version &> /dev/null; then
    docker compose exec app npm run seed
else
    docker-compose exec app npm run seed
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Partner-Allocation is now running!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Application:  http://localhost:3000"
echo "📍 MongoDB:      mongodb://localhost:27017/partner-allocation"
echo "📍 Redis:        redis://localhost:6379"
echo ""
echo "📊 Sample Data:"
echo "   • 35 Partners (7 cities × 5 partners each)"
echo "   • 21 Bookings (7 cities × 3 bookings each)"
echo ""
echo "🎯 Quick Actions:"
echo "   • View Logs:     docker-compose logs -f app"
echo "   • Stop Services: docker-compose down"
echo "   • Restart:       docker-compose restart"
echo ""
echo "📚 Documentation:"
echo "   • README.md       - Complete documentation"
echo "   • SETUP_GUIDE.md  - Quick setup guide"
echo "   • PROJECT_SUMMARY.md - Project overview"
echo ""
echo "🧪 Test Concurrency:"
echo "   • bash scripts/test-concurrency.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

