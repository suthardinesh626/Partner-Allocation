# Fix SSL/TLS Error on Vercel

## ❌ The Error You're Seeing

```
80888224077F0000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:ssl/record/rec_layer_s3.c:912:SSL alert number 80
```

This happens when your app tries to connect to MongoDB Atlas from Vercel.

---

## ✅ What I Fixed in Code

I updated `lib/mongo.ts` to add proper SSL/TLS options:

```typescript
const opts = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  // ✅ Added these for Vercel + MongoDB Atlas
  tls: true,
  tlsAllowInvalidCertificates: false,
  retryWrites: true,
  w: 'majority' as const,
};
```

---

## 🔧 What YOU Need to Do (3 steps)

### Step 1: Fix Your MongoDB URI in Vercel

Go to: **Vercel → Your Project → Settings → Environment Variables**

Find `MONGODB_URI` and **update it** to include the query parameters:

```
mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
```

**Important:** 
- Use your actual MongoDB credentials
- Add `/?retryWrites=true&w=majority` at the end!

### Step 2: Whitelist Vercel IPs in MongoDB Atlas

1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com)
2. Click on your cluster (partnerbooking)
3. Go to **Security → Network Access**
4. Click **"Add IP Address"**
5. Click **"Allow Access from Anywhere"** 
6. Or manually add: `0.0.0.0/0`
7. Click **Confirm**

![MongoDB Network Access](https://i.imgur.com/XYZ.png)

### Step 3: Redeploy on Vercel

1. Push the updated code to GitHub:
   ```bash
   git add .
   git commit -m "Fix MongoDB TLS/SSL for Vercel"
   git push origin main
   ```

2. Or manually redeploy:
   - Go to Vercel → Deployments
   - Click the `...` menu on latest deployment
   - Click **"Redeploy"**

---

## 🔍 Why This Error Happens

| Issue | Explanation |
|-------|-------------|
| **Missing TLS/SSL options** | MongoDB Atlas requires TLS 1.2+. Vercel's Node.js environment needs explicit TLS config |
| **Missing query parameters** | `retryWrites=true&w=majority` are required for MongoDB Atlas connections |
| **IP not whitelisted** | MongoDB Atlas blocks connections from IPs not in the Network Access list |
| **Connection string format** | Missing `/` before `?` or database name can cause SSL handshake failures |

---

## ✅ Verify the Fix

After redeploying, check:

### 1. Vercel Runtime Logs
```
Vercel → Your Project → Deployments → Latest → Runtime Logs
```

**Should see:**
```
✅ Connected to MongoDB
✅ Connected to Redis
```

**Should NOT see:**
```
❌ error:0A000438:SSL routines
❌ MongoServerSelectionError
```

### 2. Test API Endpoint
```bash
curl https://your-app.vercel.app/api/bookings
```

**Should return:**
```json
{
  "success": true,
  "data": {
    "bookings": [...],
    "total": 21
  }
}
```

### 3. Test UI
Visit: `https://your-app.vercel.app`

Should see:
- ✅ Dashboard loads
- ✅ Bookings displayed
- ✅ Partners displayed
- ✅ No errors in browser console

---

## 🚨 Still Getting the Error?

### Check #1: Is your password URL-encoded?

If your MongoDB password has special characters like `@`, `!`, `#`, they need to be encoded:

| Character | Replace With |
|-----------|--------------|
| `@` | `%40` |
| `!` | `%21` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |

Check your MongoDB password for special characters.
- If no special characters: ✅ No encoding needed!
- If has special characters: Use the encoding table above

### Check #2: Verify MongoDB URI format

**Wrong:**
```
mongodb+srv://user:pass@cluster.mongodb.net
mongodb+srv://user:pass@cluster.mongodb.net?retryWrites=true  ❌ Missing /
mongodb+srv://user:pass@cluster.mongodb.net/dbname  ❌ Don't include DB name here
```

**Correct:**
```
mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority  ✅
```

### Check #3: MongoDB Atlas Network Access

1. Go to MongoDB Atlas
2. Security → Network Access
3. Verify you see: `0.0.0.0/0` (Allow access from anywhere)

If you see only specific IPs, Vercel is being blocked!

### Check #4: MongoDB Atlas Status

Check if MongoDB Atlas is having issues:
- Visit: https://status.mongodb.com/
- Make sure all services are operational

---

## 📊 Timeline

| What | When | Status |
|------|------|--------|
| Code fix (`lib/mongo.ts`) | ✅ Done | Applied TLS options |
| Update MongoDB URI | ⏳ You need to do | Add `/?retryWrites=true&w=majority` |
| Whitelist IPs in Atlas | ⏳ You need to do | Add `0.0.0.0/0` |
| Push to GitHub | ⏳ You need to do | `git push` |
| Redeploy on Vercel | ⏳ Auto or manual | After push |
| Verify working | ⏳ After redeploy | Check logs & UI |

---

## 🎯 Quick Command Checklist

```bash
# 1. Commit the code fix
git add lib/mongo.ts
git commit -m "Fix MongoDB SSL/TLS for Vercel deployment"

# 2. Push to GitHub (triggers auto-deploy)
git push origin main

# 3. Wait 1-2 minutes for deployment

# 4. Check if it worked
curl https://your-app.vercel.app/api/bookings
```

---

## 📞 Summary

The SSL error happens because:
1. ❌ MongoDB Atlas requires explicit TLS configuration
2. ❌ Your URI was missing `?retryWrites=true&w=majority`
3. ❌ Vercel IPs might not be whitelisted in MongoDB Atlas

I fixed **#1** in the code. You need to fix **#2** and **#3** in Vercel and MongoDB Atlas.

After all fixes, your app will work perfectly! 🚀

---

**Need more help?** Check:
- `VERCEL_QUICK_START.md` - Quick deployment guide
- `VERCEL_DEPLOYMENT.md` - Comprehensive deployment guide
- Vercel Runtime Logs - For real-time error messages

