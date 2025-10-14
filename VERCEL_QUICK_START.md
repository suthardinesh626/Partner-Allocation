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
| `MONGODB_URI` | `mongodb+srv://suthardinesh626_db_user:KFxsJSiXD9MNIIb2@partnerbooking.fm0az7r.mongodb.net` |
| `MONGODB_DB` | `partnerBooking` |
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
- ✅ Rentkar Dashboard header
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

---

## 📞 Need Help?

Check detailed guide: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

---

**Time to deploy: ~10 minutes** ⏱️

Good luck! 🚀

