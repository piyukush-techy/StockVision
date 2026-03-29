# 🙏 StockVision — Indian Stock Analysis Platform

## Run the project

```powershell
# Check MongoDB is running
Get-Service -Name MongoDB
# If stopped: Start-Service -Name MongoDB

# Terminal 1 — Backend
cd backend
npm install
npm run dev
# Wait for: Connected to MongoDB + Port 5000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
# Open: http://localhost:5173
```

## .env (backend)
```
MONGODB_URI=mongodb://localhost:27017/stock-platform
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## What's inside
158 features across 30 months. See HANDOFF_V5.md for full feature list.
