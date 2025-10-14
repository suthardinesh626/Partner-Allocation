# Vercel Deployment Guide

This guide walks you through deploying the Rentkar app to Vercel.

## Prerequisites

Before deploying to Vercel, you need to set up cloud services because Vercel is serverless (no local Redis/MongoDB):

### 1. MongoDB Atlas (Required)
You need a MongoDB Atlas account with a cluster set up.

If you don't have one:
1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free tier
3. Create a cluster
4. Create a database user
5. Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net`

### 2. Redis Cloud Setup (REQUIRED ⚠️)
Vercel cannot use `localhost:6379`. You need a cloud Redis instance.

**Option A: Upstash (Recommended - Free Tier Available)**

1. Go to [https://upstash.com](https://upstash.com)
2. Sign up/login with GitHub
3. Click "Create Database"
4. Choose a region close to your users (e.g., `us-east-1` or `ap-south-1` for India)
5. Select "Regional" (free tier)
6. Click "Create"
7. Copy the `UPSTASH_REDIS_REST_URL` - it will look like:
   ```
   redis://default:YOUR_PASSWORD@YOUR_REGION.upstash.io:6379
   ```

**Option B: Redis Cloud**

1. Go to [https://redis.com/try-free/](https://redis.com/try-free/)
2. Sign up for free tier
3. Create a database
4. Get connection URL

**Option C: Vercel KV (Upstash-powered)**

1. In Vercel dashboard, go to Storage tab
2. Create a KV database
3. It will auto-configure environment variables

---

## Deployment Steps

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Deploy to Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Click "Deploy"
5. **IMPORTANT:** The build will succeed, but the app won't work yet!

### Step 3: Configure Environment Variables

In Vercel dashboard:

1. Go to your project → Settings → Environment Variables
2. Add the following variables:

#### Required Environment Variables:

| Variable Name | Value | Example |
|--------------|-------|---------|
| `MONGODB_URI` | Your MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net` |
| `MONGODB_DB` | Your database name | `partnerBooking` |
| `REDIS_URL` | Your Redis cloud URL | `redis://default:pass@region.upstash.io:6379` |
| `REDIS_HOST` | Redis host (extract from URL) | `region.upstash.io` |
| `REDIS_PORT` | Redis port | `6379` |
| `GPS_RATE_LIMIT` | GPS updates per minute | `6` |
| `GPS_RATE_LIMIT_WINDOW` | Rate limit window in seconds | `60` |
| `LOCK_EXPIRY_SECONDS` | Lock expiry time | `10` |
| `NEXT_PUBLIC_API_URL` | Your Vercel deployment URL | `https://your-app.vercel.app` |

#### How to Add Variables:

```
Name: MONGODB_URI
Value: mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
Environment: Production, Preview, Development

Name: MONGODB_DB
Value: your-database-name
Environment: Production, Preview, Development

Name: REDIS_URL
Value: redis://default:YOUR_PASSWORD@YOUR_REGION.upstash.io:6379
Environment: Production, Preview, Development

... (repeat for all variables)
```

**⚠️ IMPORTANT:** Replace the placeholder values with your actual credentials.

### Step 4: Redeploy

After adding environment variables:

1. Go to Deployments tab
2. Click the three dots (...) on the latest deployment
3. Click "Redeploy"
4. Or push a new commit to trigger automatic deployment

### Step 5: Initialize Database

After successful deployment, you need to seed the database:

**Option A: Run locally with production database**
```bash
# Temporarily update your .env to use production REDIS_URL
npm run db:init
```

**Option B: Create an API endpoint to seed** (if you haven't already)
```bash
# Call the seed endpoint (create this if needed)
curl -X POST https://your-app.vercel.app/api/admin/seed
```

---

## Common Issues & Solutions

### Issue 1: "Home screen is blank"

**Cause:** API calls are failing because:
- Environment variables are missing
- Redis connection failed
- MongoDB connection failed

**Solution:**
1. Check Vercel logs: Project → Deployments → Click deployment → Runtime Logs
2. Look for connection errors
3. Verify all environment variables are set correctly

### Issue 2: "Redis connection error"

**Error:** `ECONNREFUSED 127.0.0.1:6379`

**Cause:** Still trying to connect to localhost

**Solution:**
1. Verify `REDIS_URL` in Vercel environment variables points to cloud Redis
2. Redeploy after setting variables

### Issue 3: "Build succeeds but app crashes"

**Cause:** Missing environment variables at runtime

**Solution:**
1. Check if ALL environment variables are set
2. Make sure they're set for "Production" environment
3. Redeploy

### Issue 4: "Cannot read property 'split' of undefined"

**Cause:** `process.env.REDIS_URL` or `process.env.MONGODB_URI` is undefined

**Solution:**
1. Double-check variable names match exactly (case-sensitive)
2. Make sure they're set for the correct environment
3. Restart deployment

---

## Verifying Deployment

### 1. Check Build Logs
```
Vercel Dashboard → Your Project → Deployments → Latest → Build Logs
```
Should show: ✓ Compiled successfully

### 2. Check Runtime Logs
```
Vercel Dashboard → Your Project → Deployments → Latest → Runtime Logs
```
Should show:
- ✅ Connected to Redis
- No connection errors

### 3. Test API Endpoints

```bash
# Test bookings API
curl https://your-app.vercel.app/api/bookings

# Should return:
{
  "success": true,
  "data": {
    "bookings": [...],
    "total": 21
  }
}
```

### 4. Test the UI

Visit `https://your-app.vercel.app`
- Should see "Rentkar Dashboard"
- Bookings should load
- Partners should load
- No errors in browser console

---

## Performance Considerations

### Redis Connection Pooling
Vercel uses serverless functions, which can create many Redis connections. Upstash handles this automatically.

### MongoDB Connection Pooling
Your current `lib/mongo.ts` already uses connection pooling correctly with the `cached` global variable.

### Cold Starts
First request after inactivity may be slow (3-5 seconds) due to serverless cold starts. This is normal.

---

## Environment-Specific Configurations

### Local Development
```env
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb+srv://...atlas.mongodb.net
```

### Vercel Production
```env
REDIS_URL=redis://default:pass@region.upstash.io:6379
MONGODB_URI=mongodb+srv://...atlas.mongodb.net
```

---

## Security Checklist

- ✅ `.env` file is in `.gitignore` (never commit secrets!)
- ✅ MongoDB credentials are not exposed in code
- ✅ Redis URL is not exposed in code
- ✅ Use environment variables for all sensitive data
- ⚠️ Consider IP whitelisting in MongoDB Atlas (add Vercel IPs)
- ⚠️ Consider adding authentication to admin endpoints

---

## Next Steps After Deployment

1. **Custom Domain:** Add your domain in Vercel settings
2. **Authentication:** Add admin authentication (next-auth, Clerk, etc.)
3. **Monitoring:** Set up Vercel Analytics
4. **Alerts:** Configure Upstash alerts for high Redis usage
5. **Backup:** Set up MongoDB Atlas automated backups

---

## Need Help?

### Check Logs
```bash
# Install Vercel CLI
npm i -g vercel

# View logs
vercel logs your-app-url
```

### Common Commands
```bash
# Pull environment variables to local
vercel env pull

# Link local project to Vercel
vercel link

# Deploy from CLI
vercel --prod
```

---

## MongoDB Atlas IP Whitelist for Vercel

Vercel uses dynamic IPs, so you have two options:

**Option 1: Allow all IPs (Easier, less secure)**
1. MongoDB Atlas → Network Access
2. Add IP: `0.0.0.0/0`
3. Description: "Vercel Deployment"

**Option 2: Whitelist Vercel IPs (More secure)**
1. Get Vercel IP ranges from: https://vercel.com/guides/how-to-allowlist-deployment-ip-address
2. Add each IP range to MongoDB Atlas Network Access

---

## Summary

✅ **Before Deployment:**
- [ ] Set up Upstash Redis account
- [ ] Get Redis connection URL
- [ ] Ensure MongoDB Atlas is accessible

✅ **During Deployment:**
- [ ] Remove `output: 'standalone'` from next.config.ts
- [ ] Push code to GitHub
- [ ] Create Vercel project
- [ ] Add ALL environment variables
- [ ] Redeploy

✅ **After Deployment:**
- [ ] Verify API endpoints work
- [ ] Seed database (run db:init with production credentials)
- [ ] Test full booking workflow in production

---

**Ready to deploy?** Follow the steps above and your app will work perfectly on Vercel! 🚀

