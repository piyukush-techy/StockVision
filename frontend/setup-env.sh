#!/bin/bash
# setup-env.sh - Automated .env setup for StockVision

echo "🙏 JAI SHREE GANESH!"
echo "🔧 StockVision - Firebase .env Setup"
echo "======================================"
echo ""

# Check if we're in frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the frontend/ directory"
    echo "   cd frontend && bash setup-env.sh"
    exit 1
fi

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  Warning: .env file already exists!"
    read -p "   Do you want to overwrite it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Cancelled. Your existing .env file is unchanged."
        exit 0
    fi
fi

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
    echo "❌ Error: .env.example not found!"
    exit 1
fi

echo ""
echo "📝 Let's set up your Firebase credentials..."
echo ""
echo "You need to get these from Firebase Console:"
echo "1. Go to: https://console.firebase.google.com"
echo "2. Click ⚙️ (Settings) → Project Settings"
echo "3. Scroll to 'Your apps' → Click '</> Web'"
echo "4. Copy the firebaseConfig values"
echo ""
read -p "Press Enter when you have your Firebase config ready..."
echo ""

# Collect Firebase credentials
echo "Enter your Firebase credentials:"
echo ""

read -p "API Key: " firebase_api_key
read -p "Auth Domain: " firebase_auth_domain
read -p "Project ID: " firebase_project_id
read -p "Storage Bucket: " firebase_storage_bucket
read -p "Messaging Sender ID: " firebase_sender_id
read -p "App ID: " firebase_app_id

echo ""
echo "Backend API URL (default: http://localhost:5000)"
read -p "API URL [http://localhost:5000]: " api_url
api_url=${api_url:-http://localhost:5000}

# Create .env file
cat > .env << EOF
# StockVision Frontend Environment Variables
# Created: $(date)

# Firebase Configuration
VITE_FIREBASE_API_KEY=${firebase_api_key}
VITE_FIREBASE_AUTH_DOMAIN=${firebase_auth_domain}
VITE_FIREBASE_PROJECT_ID=${firebase_project_id}
VITE_FIREBASE_STORAGE_BUCKET=${firebase_storage_bucket}
VITE_FIREBASE_MESSAGING_SENDER_ID=${firebase_sender_id}
VITE_FIREBASE_APP_ID=${firebase_app_id}

# Backend API URL
VITE_API_URL=${api_url}
EOF

echo ""
echo "✅ .env file created successfully!"
echo ""
echo "📋 Your configuration:"
echo "   API Key: ${firebase_api_key:0:20}..."
echo "   Project ID: ${firebase_project_id}"
echo "   API URL: ${api_url}"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: npm install"
echo "   2. Run: npm run dev"
echo "   3. Open: http://localhost:5173"
echo "   4. Click 'Login' and test authentication!"
echo ""
echo "🙏 JAI SHREE GANESH!"
