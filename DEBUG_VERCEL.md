# Debug Vercel Deployment Issues

## 🔍 Step-by-Step Debugging Guide

Your buttons aren't responding on Vercel. Follow these steps to find the root cause:

---

## Step 1: Check Health Endpoint (NEW!)

I've created a health check endpoint to test if APIs work at all.

1. **Visit this URL in your browser:**
   ```
   https://your-app.vercel.app/api/health
   ```

2. **You should see:**
   ```json
   {
     "status": "ok",
     "timestamp": "2024-...",
     "env": {
       "hasMongoUri": true,
       "hasRedisUrl": false,
       "nodeEnv": "production"
     }
   }
   ```

3. **What to check:**
   - ✅ If you see this → API routes work!
   - ❌ If error 500 → Basic API setup is broken
   - ❌ If timeout → Vercel deployment issue

---

## Step 2: Check Browser Console

1. **Open your deployed site:**
   ```
   https://your-app.vercel.app
   ```

2. **Open Browser Console (F12)**
   - Chrome/Edge: `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - Click "Console" tab

3. **Click any button (Assign Partner, Approve, etc.)**

4. **Look for console logs:**
   ```
   🚀 Assigning partner for booking: ...
   📡 Assign response status: 500
   📦 Assign response data: { error: "..." }
   ❌ Error assigning partner: ...
   ```

5. **What the logs tell you:**
   - ✅ If you see `🚀` → Button clicked successfully
   - ✅ If you see `📡` → API request sent
   - ❌ If `status: 500` → Server error (check Step 3)
   - ❌ If `status: 404` → API route not found
   - ❌ If network error → Check Step 4

---

## Step 3: Check Vercel Function Logs

This shows what's actually failing on the server.

1. **Go to Vercel Dashboard:**
   ```
   https://vercel.com/dashboard
   ```

2. **Click your project** → **Latest Deployment**

3. **Click "Functions" tab** (or "Runtime Logs")

4. **Click any button on your app**

5. **Watch the logs appear in real-time**

6. **Common errors:**

   **Error A: Redis Connection Timeout**
   ```
   Redis connection timeout after 10 seconds
   ```
   **Fix:** Remove `REDIS_URL` from environment variables OR add Upstash Redis

   **Error B: MongoDB SSL/TLS**
   ```
   SSL routines:ssl3_read_bytes:tlsv1 alert
   ```
   **Fix:** Add to `MONGODB_URI`:
   ```
   ?retryWrites=true&w=majority&tls=true
   ```

   **Error C: MongoDB Connection Refused**
   ```
   connect ECONNREFUSED
   ```
   **Fix:** Whitelist `0.0.0.0/0` in MongoDB Atlas Network Access

---

## Step 4: Check Environment Variables

1. **Go to Vercel Dashboard** → **Settings** → **Environment Variables**

2. **Check these are set:**
   ```
   MONGODB_URI=mongodb+srv://.../?retryWrites=true&w=majority
   REDIS_URL=(optional - can be empty or removed)
   ```

3. **Common issues:**
   - ❌ `MONGODB_URI` missing → Buttons won't work
   - ❌ `MONGODB_URI` missing `?retryWrites=true&w=majority` → SSL errors
   - ⚠️ `REDIS_URL` set but invalid → Causes timeouts (remove it!)

---

## Step 5: Test Specific Endpoints

Use browser or Postman to test API directly:

### Test 1: Get Bookings
```
GET https://your-app.vercel.app/api/bookings
```
**Expected:** List of bookings
**If fails:** MongoDB connection issue

### Test 2: Get Partners
```
GET https://your-app.vercel.app/api/partners
```
**Expected:** List of partners
**If fails:** MongoDB connection issue

### Test 3: Assign Partner
```
POST https://your-app.vercel.app/api/bookings/assign
Content-Type: application/json

{
  "bookingId": "PASTE_REAL_BOOKING_ID_HERE",
  "adminId": "admin_001"
}
```
**Expected:** `{ "success": true, ... }`
**If fails:** Check error message in response

---

## Quick Fixes

### Fix 1: Remove Redis (Fastest - 2 minutes)

If you see "Redis timeout" errors:

1. **Vercel Dashboard** → **Settings** → **Environment Variables**
2. **Delete `REDIS_URL`** or set it to empty
3. **Redeploy** (automatic)
4. **Test again**

### Fix 2: Fix MongoDB URI (3 minutes)

If you see SSL or connection errors:

1. **Get your current `MONGODB_URI` from Vercel**
2. **Add query parameters:**
   ```
   mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority&tls=true
   ```
3. **Update in Vercel** → **Redeploy**
4. **Test again**

### Fix 3: Whitelist Vercel IPs (5 minutes)

If MongoDB connection refused:

1. **MongoDB Atlas Dashboard**
2. **Network Access** → **IP Access List**
3. **Add Entry:** `0.0.0.0/0` (Allow access from anywhere)
4. **Confirm**
5. **Wait 2 minutes**
6. **Test again**

---

## What I've Added for Debugging

### 1. Health Check Endpoint
```
GET /api/health
```
Shows if API routes work and environment variables are set

### 2. Console Logging
All buttons now log:
- 🚀 When clicked
- 📡 Response status
- 📦 Response data
- ❌ Any errors

### 3. Better Error Messages
Errors now say: "Network error - check browser console (F12)"

---

## Report Back

After following these steps, tell me:

1. **What does `/api/health` show?**
2. **What do browser console logs show when clicking a button?**
3. **What do Vercel function logs show?**

This will help me pinpoint the exact issue! 🎯

---

## Common Solutions Summary

| Problem | Quick Fix |
|---------|-----------|
| Redis timeout | Remove `REDIS_URL` from Vercel |
| MongoDB SSL error | Add `?retryWrites=true&w=majority&tls=true` to URI |
| Connection refused | Whitelist `0.0.0.0/0` in MongoDB Atlas |
| Buttons don't respond | Check browser console (F12) for errors |
| 500 errors | Check Vercel function logs |

---

**Next Steps:**
1. Visit `/api/health` on your deployed site
2. Open browser console (F12) and click a button
3. Check what error appears
4. Follow the fix for that specific error
5. Report back if still stuck! 🚀

