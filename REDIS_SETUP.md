# Redis Setup Guide (REQUIRED)

## ⚠️ Redis is MANDATORY for this Assignment

Per the assignment requirements, Redis is **required** for:
1. **Distributed Locks** - Concurrency safety (prevent double assignment/confirmation)
2. **Rate Limiting** - GPS updates (max 6/min per partner)
3. **Pub/Sub Events** - Real-time updates (booking:confirmed, etc.)

**The app will NOT work without Redis!**

---

## 🚀 Setup Options

### Option 1: Local Development (Docker Compose) ⭐ RECOMMENDED

The project already includes Redis in `docker-compose.yml`:

```bash
# Start everything (MongoDB + Redis + App)
docker-compose up -d

# Your .env should have:
MONGODB_URI=mongodb://localhost:27017/rentkar
REDIS_URL=redis://localhost:6379
```

**That's it!** Redis is now running.

---

### Option 2: Vercel Deployment (Upstash Redis - Free)

For Vercel, you need **cloud Redis** (Upstash has free tier):

#### Step 1: Create Upstash Redis (2 minutes)

1. **Sign up:** https://console.upstash.com
2. **Create Database:**
   - Click "Create Database"
   - Name: `rentkar-redis`
   - Type: **Global** (free tier)
   - Click "Create"

3. **Copy Connection URL:**
   - Click your database
   - Scroll down to "REST API" section
   - Copy **"UPSTASH_REDIS_REST_URL"**
   
   OR use the standard Redis URL:
   - Find "Redis Connect" section
   - Copy the connection string (starts with `redis://` or `rediss://`)

#### Step 2: Add to Vercel

1. **Go to Vercel Dashboard**
2. **Your Project → Settings → Environment Variables**
3. **Add Variable:**
   ```
   REDIS_URL = your_upstash_connection_url_here
   ```
4. **Apply to all environments** (Production, Preview, Development)
5. **Save**

#### Step 3: Redeploy

```bash
git push  # Automatic deployment
```

OR manually redeploy in Vercel dashboard.

---

### Option 3: Local Redis (Homebrew - Mac)

If you don't want Docker:

```bash
# Install Redis
brew install redis

# Start Redis
brew services start redis

# Or run manually
redis-server

# Your .env should have:
REDIS_URL=redis://localhost:6379
```

---

### Option 4: Local Redis (Standalone - Linux/Windows)

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Windows:**
Download from: https://github.com/microsoftarchive/redis/releases

---

## ✅ Verify Redis is Working

### Test Connection:

```bash
# Using redis-cli (if installed locally)
redis-cli ping
# Should return: PONG

# Or test via Node.js
node -e "const Redis = require('ioredis'); const client = new Redis(process.env.REDIS_URL); client.ping().then(console.log);"
# Should return: PONG
```

### Test in App:

1. Start your app: `npm run dev`
2. Open browser console (F12)
3. Look for: `✅ Connected to Redis`
4. Click any button (Assign Partner, Approve, etc.)
5. Should be **instant** with no errors!

---

## 🎯 Redis Features in This App

### 1. Distributed Locks (`lib/lock.ts`)
```typescript
// Prevents concurrent assignment
withLock('booking:assign:123', async () => {
  // Only one admin can execute this at a time
});
```

### 2. Rate Limiting (`lib/rateLimit.ts`)
```typescript
// Max 6 GPS updates per minute
const { allowed } = await rateLimit('gps:partner123', 6, 60);
```

### 3. Pub/Sub Events (`lib/pubsub.ts`)
```typescript
// Real-time notifications
await publishBookingConfirmed({
  bookingId: '123',
  partnerId: 'partner123'
});
```

---

## 🐛 Troubleshooting

### Error: "REDIS_URL is required!"

**Cause:** Missing `REDIS_URL` in environment

**Fix:**
```bash
# Local: Add to .env
REDIS_URL=redis://localhost:6379

# Vercel: Add to Environment Variables
```

### Error: "Redis connection timeout"

**Cause:** Redis server not running or wrong URL

**Fix:**
1. **Local:** Start Redis (`docker-compose up` or `redis-server`)
2. **Vercel:** Check Upstash URL is correct
3. **Check firewall:** Ensure port 6379 is open

### Error: "ECONNREFUSED"

**Cause:** Redis server not running

**Fix:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis (Docker)
docker-compose up -d redis

# Or start manually
redis-server
```

### Vercel: Still slow or errors

**Cause:** Using wrong Redis URL format

**Fix:** Upstash provides multiple URLs:
- Use the **standard Redis URL** (not REST API URL)
- Should start with `redis://` or `rediss://`
- Include password if shown

---

## 📊 Performance Expectations

With **Redis properly configured**:

| Operation | Expected Speed |
|-----------|---------------|
| Assign Partner | < 300ms |
| Approve Document | < 200ms |
| Confirm Booking | < 250ms |
| GPS Update | < 150ms |

Without Redis (or with delays):
- ❌ Won't work at all
- ❌ Errors on every request
- ❌ Fails assignment requirements

---

## 🔍 How to Check Redis is Working

### 1. Check Environment Variable:
```bash
# Should NOT be empty
echo $REDIS_URL
```

### 2. Check App Logs:
```bash
npm run dev

# Should see:
✅ Connected to Redis
```

### 3. Check Redis Keys (Optional):
```bash
redis-cli

# List all keys
KEYS *

# Check lock keys
KEYS lock:*

# Check rate limit keys
KEYS ratelimit:*
```

---

## 🎓 Assignment Requirements Met

✅ **Concurrency Safety**
- Redis locks prevent double assignment
- Redis locks prevent double confirmation

✅ **Rate Limiting**
- GPS updates limited to 6/min using Redis

✅ **Pub/Sub Events**
- `booking:confirmed` published via Redis
- Real-time updates possible

---

## 🚀 Quick Start Commands

**Local (Docker):**
```bash
docker-compose up -d
npm run dev
```

**Vercel:**
```bash
# 1. Add REDIS_URL to Vercel env vars
# 2. Push code
git push
```

**That's it!** Redis is now properly configured! 🎉

---

## 📚 Resources

- **Upstash Redis:** https://upstash.com (Free tier)
- **Redis Documentation:** https://redis.io/docs
- **ioredis (Client):** https://github.com/redis/ioredis
- **Assignment:** See `PROJECT_SUMMARY.md`

---

**Remember:** Redis is not optional - it's a core requirement! ✅

