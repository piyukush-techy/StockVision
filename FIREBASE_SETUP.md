# 🔥 Firebase Setup Guide — StockVision Login

## Step 1: Create Firebase Project (5 minutes)

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Name it: `stockvision` → Continue
4. Disable Google Analytics (not needed) → **Create project**

---

## Step 2: Enable Authentication

1. In Firebase Console → click **Authentication** (left sidebar)
2. Click **"Get started"**
3. Under **Sign-in method** tab, enable:
   - **Email/Password** → Enable → Save
   - **Google** → Enable → add your support email → Save

---

## Step 3: Enable Firestore Database

1. Click **Firestore Database** (left sidebar)
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Choose region: `asia-south1` (Mumbai) → Enable

### Firestore Security Rules (paste this in Rules tab):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Step 4: Get Your Web App Config

1. Click the **⚙️ gear icon** → **Project Settings**
2. Scroll down to **"Your apps"** section
3. Click **"</>  Web"** icon to add a web app
4. Register app name: `StockVision Web` → Register
5. Copy the `firebaseConfig` object shown

---

## Step 5: Add Config to Your .env

In your `frontend/` folder, create a `.env` file:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=stockvision-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=stockvision-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=stockvision-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_API_URL=http://localhost:5000
```

---

## Step 6: Install & Run

```bash
cd frontend
npm install        # installs firebase + other packages
npm run dev        # start frontend
```

---

## What was built

### Files added / changed:

| File | What it does |
|------|-------------|
| `frontend/src/firebase.js` | Firebase app initialization |
| `frontend/src/context/AuthContext.jsx` | Global auth state (user, profile, login, logout) |
| `frontend/src/pages/LoginPage.jsx` | Login/Signup page (Google + Email/Password) |
| `frontend/src/components/ProfileSetupModal.jsx` | 3-step profile form shown after first login |
| `frontend/src/pages/UserDashboard.jsx` | Full profile dashboard with edit support |
| `frontend/src/components/Navbar.jsx` | Updated with Login button / user avatar dropdown |
| `frontend/src/App.jsx` | Wrapped with AuthProvider, added /login & /dashboard routes |
| `frontend/package.json` | Added `firebase` dependency |

### User flow:

```
First visit → /login page → Google or Email signup
    ↓
Profile Setup Modal (3 steps):
  Step 1: Name, Phone, City, Occupation, Bio
  Step 2: Investment Style, Experience, Risk Tolerance
  Step 3: Summary + Go to Dashboard
    ↓
/dashboard — Full profile card with editable fields
    ↓
Navbar shows user avatar + name + dropdown
  → My Dashboard
  → My Watchlist
  → My Alerts
  → Sign Out
```

### Firestore data structure:

```
/users/{uid}
  email:           "user@gmail.com"
  displayName:     "Arjun Sharma"
  phone:           "+91 98765 43210"
  location:        "Mumbai"
  occupation:      "Salaried Employee"
  bio:             "Long-term investor focused on..."
  investmentStyle: "Value Investing"
  experience:      "Intermediate (1–3 years)"
  riskTolerance:   "Moderate"
  profileComplete: true
  createdAt:       Timestamp
  lastLogin:       Timestamp
```

---

## 🙏 JAI SHREE GANESH!
