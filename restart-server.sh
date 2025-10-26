#!/bin/bash

# Script to restart Next.js dev server with cache clearing

echo "🛑 Stopping any running dev servers..."
# Kill any running next dev processes
pkill -f "next dev" 2>/dev/null || true

echo "🧹 Cleaning Next.js cache..."
# Remove .next folder
rm -rf .next

echo "🗑️  Cleaning node_modules cache..."
# Clear npm cache (optional)
npm cache clean --force 2>/dev/null || true

echo "✨ Starting fresh dev server..."
# Start dev server
npm run dev

echo "✅ Done! Server should be running on http://localhost:3000"

