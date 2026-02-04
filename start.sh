#!/bin/bash

# KPI Dashboard Startup Script
echo "🚀 Starting KPI Dashboard..."
echo "📊 This will start both the proxy server and React app"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "📝 Please copy .env.example to .env and fill in your Jira credentials"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start both servers
echo "🔄 Starting servers..."
echo "   - Proxy server will run on http://localhost:3001"
echo "   - React app will run on http://localhost:3000"
echo ""
echo "💡 Press Ctrl+C to stop both servers"
echo ""

# Use concurrently to run both servers
npm run start:dev