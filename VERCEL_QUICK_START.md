# Vercel Deployment - Quick Start Card

## ⚡ 3-Step Deployment

### Step 1: Get Upstash Redis (5 minutes)
```
1. Go to: https://upstash.com
2. Sign up with GitHub
3. Create Database → Choose region → Free tier
4. Copy the REDIS_URL (looks like: redis://default:xxx@region.upstash.io:6379)
```

### Step 2: Deploy to Vercel (2 minutes)
```
1. Push code to GitHub: git push origin main
2. Go to: https://vercel.com
3. New Project → Import your repo → Deploy
```

### Step 3: Add Environment Variables (3 minutes)
```
Go to: Vercel Project → Settings → Environment Variables

Add these 8 variables:
```

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority` ⚠️ Use your actual MongoDB URI |
| `MONGODB_DB` | `your-database-name` |
| `REDIS_URL` | `redis://default:YOUR_PASSWORD@YOUR_REGION.upstash.io:6379` ⚠️ From Upstash |
| `REDIS_HOST` | `YOUR_REGION.upstash.io` ⚠️ From Upstash |
| `REDIS_PORT` | `6379` |
| `GPS_RATE_LIMIT` | `6` |
| `GPS_RATE_LIMIT_WINDOW` | `60` |
| `LOCK_EXPIRY_SECONDS` | `10` |

**Important:** For each variable, select all three environments: Production, Preview, Development

### Step 4: Redeploy
```
Vercel → Deployments → ... menu → Redeploy
```

---

## ✅ What I've Fixed

1. ✅ **Removed `output: 'standalone'`** from `next.config.ts` (Docker-only, breaks Vercel)
2. ✅ **Added Redis error handling** so app fails gracefully
3. ✅ **Fixed BookingCard workflow** to only show document review after partner assignment
4. ✅ **Created comprehensive deployment guide** in `VERCEL_DEPLOYMENT.md`
5. ✅ **Updated README** with Vercel deployment section

---

## 🐛 Why Your Deployment Shows Blank Screen

### Root Cause:
Your app is trying to connect to `localhost:6379` (local Redis), but Vercel is serverless - there's no localhost!

### The Fix:
Use **Upstash Redis** (cloud Redis) instead of localhost.

### Other Issues That Would Occur:
1. ❌ `ECONNREFUSED 127.0.0.1:6379` - Redis not available
2. ❌ Environment variables missing - Not pushed to GitHub
3. ❌ API calls fail - No data loads = blank screen
4. ❌ Build fails with `output: 'standalone'` - Already fixed ✅

---

## 🎯 Testing Your Deployment

After redeploying with environment variables:

### 1. Check Runtime Logs
```
Vercel → Your Project → Deployments → Latest → Runtime Logs
```
Should show: `✅ Connected to Redis`

### 2. Test API
```bash
curl https://your-app.vercel.app/api/bookings
```
Should return JSON with bookings

### 3. Test UI
```
https://your-app.vercel.app
```
Should show:
- ✅ Partner-Allocation Dashboard header
- ✅ Bookings list
- ✅ Partners list
- ✅ No console errors

---

## 🚨 Emergency Checklist

If deployment still doesn't work:

- [ ] Are ALL 8 environment variables set in Vercel?
- [ ] Is `REDIS_URL` pointing to Upstash (not localhost)?
- [ ] Did you click "Redeploy" after adding variables?
- [ ] Did you check Runtime Logs for errors?
- [ ] Is MongoDB Atlas Network Access set to `0.0.0.0/0`?
- [ ] Does your `MONGODB_URI` include `?retryWrites=true&w=majority` at the end?

## 🔧 Common Error Fixes

### SSL/TLS Error (error:0A000438)
```
Error: SSL routines:ssl3_read_bytes:tlsv1 alert internal error
```

**Cause:** MongoDB Atlas TLS/SSL connection issue

**Fix:**
1. ✅ Make sure your MongoDB URI ends with: `/?retryWrites=true&w=majority`
2. ✅ In MongoDB Atlas: Network Access → Add `0.0.0.0/0` (allow all IPs)
3. ✅ The code fix is already applied in `lib/mongo.ts` (TLS options added)
4. ✅ Redeploy after updating the environment variable

**Correct MongoDB URI format:**
```
mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

### Password Special Characters Issue

If your MongoDB password has special characters (`@`, `!`, `#`, `%`, etc.), you must URL-encode them:

| Character | Encoded |
|-----------|---------|
| `@` | `%40` |
| `!` | `%21` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |

Example:
- Original: `mongodb+srv://user:P@ssw0rd!@cluster.mongodb.net`
- Fixed: `mongodb+srv://user:P%40ssw0rd%21@cluster.mongodb.net/?retryWrites=true&w=majority`

---

## 📞 Need Help?

Check detailed guide: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

---

**Time to deploy: ~10 minutes** ⏱️

Good luck! 🚀

