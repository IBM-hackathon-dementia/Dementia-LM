#!/bin/bash

echo "============================================"
echo "  E-umm Cloudflare Deployment Script"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

# Step 1: Build Frontend
echo "[1/4] Building Frontend..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Frontend build failed"
    exit 1
fi
print_status "Frontend built successfully"
echo ""

# Step 2: Deploy Backend
echo "[2/4] Deploying Backend (Cloudflare Worker)..."
cd eume-api
wrangler deploy
if [ $? -ne 0 ]; then
    print_error "Backend deployment failed"
    cd ..
    exit 1
fi
print_status "Backend deployed successfully"
cd ..
echo ""

# Step 3: Initialize D1 Database
echo "[3/4] Initializing D1 Database..."
cd eume-api
wrangler d1 execute eume-database --file=schema.sql --remote
if [ $? -ne 0 ]; then
    print_warning "Database initialization failed or already exists"
else
    print_status "Database initialized successfully"
fi
cd ..
echo ""

# Step 4: Deploy Frontend
echo "[4/4] Deploying Frontend (Cloudflare Pages)..."
wrangler pages deploy dist --project-name=e-umm-frontend --compatibility-date=2024-09-01
if [ $? -ne 0 ]; then
    print_error "Frontend deployment failed"
    exit 1
fi
print_status "Frontend deployed successfully"
echo ""

echo "============================================"
echo "  Deployment Complete! 🎉"
echo "============================================"
echo ""
echo "🌐 Frontend: https://e-umm-frontend.pages.dev"
echo "🔧 Backend:  https://eume-api.hwjinfo.workers.dev"
echo "💾 Database: Cloudflare D1 (eume-database)"
echo ""
echo "Test your deployment:"
echo "curl https://eume-api.hwjinfo.workers.dev/health"
echo ""