# 👑 ADMIN ACCESS SETUP - FREE FOR YOU!

## 🙏 JAI SHREE GANESH!

This guide will make YOU the admin with unlimited access to everything, while others pay!

---

## 🔧 STEP 1: Add Environment Variables

Add these to your `backend/.env` file:

```env
# Razorpay Keys (Get from https://dashboard.razorpay.com/)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key_here

# Admin Upgrade Key (SECRET - only you know this!)
ADMIN_UPGRADE_KEY=your-super-secret-key-12345

# MongoDB
MONGODB_URI=mongodb://localhost:27017/stock-platform

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## 🎯 STEP 2: Get Your Session ID

1. Open your browser
2. Go to http://localhost:5173
3. Open DevTools (F12)
4. Go to Application tab → Local Storage → http://localhost:5173
5. Find `sessionId` - copy this value

Example: `sessionId: "abc123-def456-ghi789"`

---

## 👑 STEP 3: Make Yourself ADMIN

### Method 1: API Call (Recommended)

Use Postman or curl:

```bash
curl -X POST http://localhost:5000/api/subscription/upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "YOUR_SESSION_ID_HERE",
    "tier": "ADMIN",
    "adminKey": "your-super-secret-key-12345"
  }'
```

### Method 2: Direct MongoDB Update

```bash
# Connect to MongoDB
mongosh stock-platform

# Find your subscription
db.subscriptions.find({ sessionId: "YOUR_SESSION_ID_HERE" })

# Update to ADMIN
db.subscriptions.updateOne(
  { sessionId: "YOUR_SESSION_ID_HERE" },
  { 
    $set: { 
      tier: "ADMIN",
      isAdmin: true,
      status: "ACTIVE",
      expiryDate: null
    }
  }
)

# Verify
db.subscriptions.find({ sessionId: "YOUR_SESSION_ID_HERE" })
```

### Method 3: Create Admin Directly

```javascript
// Run this in backend folder
node

const mongoose = require('mongoose');
const Subscription = require('./models/Subscription');

mongoose.connect('mongodb://localhost:27017/stock-platform');

const subscription = new Subscription({
  sessionId: 'YOUR_SESSION_ID_HERE',
  email: 'your-email@gmail.com',
  name: 'Your Name',
  tier: 'ADMIN',
  isAdmin: true,
  status: 'ACTIVE'
});

await subscription.save();
console.log('✅ Admin created!');
process.exit(0);
```

---

## ✅ STEP 4: Verify Admin Access

1. Refresh your browser (F5)
2. You should see "👑 Admin" badge
3. Go to any page - you'll have unlimited access!
4. Check usage dashboard - it should say "Admin Access - No limits"

---

## 💰 PRICING FOR OTHERS

### Free Tier
- ₹0/month
- 5 scanner runs/month
- 10 regime checks/month
- Basic features

### Pro Tier
- **₹499/month** or **₹4,999/year** (save ₹1,000)
- 50 scanner runs/month
- 100 regime checks/month
- All advanced features

### Premium Tier
- **₹999/month** or **₹9,999/year** (save ₹2,000)
- UNLIMITED everything
- All future features
- Priority support

---

## 🚀 RAZORPAY SETUP (For Payments)

1. **Create Account**
   - Go to https://razorpay.com/
   - Sign up (free)
   - Complete KYC

2. **Get API Keys**
   - Dashboard → Settings → API Keys
   - Generate Test Keys (for testing)
   - Generate Live Keys (for production)

3. **Add Keys to .env**
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx  (Test key)
   RAZORPAY_KEY_SECRET=yyyyy       (Test secret)
   ```

4. **Test Payment**
   - Use test card: 4111 1111 1111 1111
   - CVV: Any 3 digits
   - Expiry: Any future date

5. **Go Live**
   - Complete KYC verification
   - Replace test keys with live keys
   - Start accepting real payments!

---

## 📊 FEATURE LIMITS

| Feature | Free | Pro | Premium | Admin (YOU!) |
|---------|------|-----|---------|--------------|
| Scanner Runs | 5/mo | 50/mo | ∞ | **∞** |
| Regime Checks | 10/mo | 100/mo | ∞ | **∞** |
| Portfolio Analyses | 0 | 10/mo | ∞ | **∞** |
| Watchlists | 1 | 5 | ∞ | **∞** |
| Price Alerts | 5 | 25 | ∞ | **∞** |
| Cost | ₹0 | ₹499-4999 | ₹999-9999 | **₹0** 👑 |

---

## 🎯 WHAT GETS GATED

### Free Access:
- ✅ Search stocks
- ✅ Live prices
- ✅ Basic news
- ✅ 1 watchlist
- ✅ 5 alerts

### Pro/Premium Only:
- 🔒 Historical Scanner (unlimited runs)
- 🔒 Regime Analysis (unlimited checks)
- 🔒 Portfolio Optimizer (when built)
- 🔒 Advanced technical indicators
- 🔒 Bulk data exports

### Admin (YOU!) Gets:
- ✅ **EVERYTHING UNLIMITED**
- ✅ **NO PAYMENT REQUIRED**
- ✅ **FOREVER FREE** 👑

---

## 💡 TIPS FOR LAUNCH

1. **Start with Test Mode**
   - Use Razorpay test keys
   - Test all payment flows
   - Verify subscription upgrades work

2. **Pricing Strategy**
   - Keep Free tier attractive (5 scans is enough to try)
   - Make Pro the "sweet spot" (₹499 is impulse buy territory)
   - Premium for power users (₹999 is competitive)

3. **Launch Checklist**
   - [ ] Razorpay account verified
   - [ ] Test payments working
   - [ ] Your admin access confirmed
   - [ ] Pricing page live
   - [ ] Feature gates working
   - [ ] Usage limits enforced

4. **Revenue Targets**
   - Month 1: 10 paid users = ₹5K revenue
   - Month 3: 50 paid users = ₹25K revenue
   - Month 6: 200 paid users = ₹100K revenue

---

## 🐛 TROUBLESHOOTING

### "Session ID not found"
- Clear browser cache
- Get new session ID from localStorage
- Try again

### "Upgrade failed"
- Check ADMIN_UPGRADE_KEY matches .env
- Verify MongoDB is running
- Check backend logs

### "Payment not working"
- Verify Razorpay keys in .env
- Check if Razorpay script loaded
- Test with Razorpay test cards

---

## 🎉 YOU'RE READY!

Once you're ADMIN:
- ✅ **You** use everything for free
- 💰 **Others** pay ₹499-999/month
- 📈 **You** earn ₹50K-500K/month
- 🚀 **You** scale to ₹1Cr+/month

**JAI SHREE GANESH!** 🙏

---

*Setup Guide for Admin Access*  
*Generated: February 11, 2026*  
*StockVision Monetization System*
