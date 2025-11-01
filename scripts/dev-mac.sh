#!/bin/bash

# ZoAI Development Startup Script for Mac
# This script helps you start all services easily

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║   🚀 ZoAI Multi-Agent RAG Chat - Development Setup           ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running"
  echo ""
  echo "Please start Docker Desktop and try again."
  echo "You can start it from Applications or using Spotlight (Cmd+Space, type 'Docker')"
  exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo "❌ Error: pnpm is not installed"
  echo ""
  echo "Install it with: npm install -g pnpm"
  exit 1
fi

echo "✅ pnpm is installed"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies (this may take a few minutes)..."
  pnpm install
  echo "✅ Dependencies installed"
  echo ""
fi

# Check if .env file exists
if [ ! -f "apps/server/.env" ]; then
  echo "⚠️  Warning: apps/server/.env not found"
  echo ""
  echo "Creating from example..."
  cp apps/server/.env.example apps/server/.env
  echo "✅ Created apps/server/.env"
  echo ""
  echo "⚠️  IMPORTANT: Edit apps/server/.env and add your API keys:"
  echo "   - OPENAI_API_KEY"
  echo "   - ANTHROPIC_API_KEY (optional)"
  echo "   - GOOGLE_AI_API_KEY (optional)"
  echo ""
  echo "Press Enter after you've added your API keys..."
  read
fi

# Start Docker services
echo "🐳 Starting Docker services (PostgreSQL, Redis, MinIO)..."
cd infra
docker-compose -f docker-compose.dev.yml up -d
cd ..

echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if migrations have been run
echo "🗄️  Checking database..."
if docker exec zoai-postgres psql -U postgres -d zoai_chat -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
  echo "✅ Database already initialized"
else
  echo "📊 Running database migrations..."
  cd apps/server
  pnpm run migrate
  cd ../..
  echo "✅ Database initialized"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║   ✅ Setup Complete! Ready to start development servers       ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "To start the application, you need to run these in separate terminals:"
echo ""
echo "Terminal 1 (API Server):"
echo "  cd apps/server && pnpm dev"
echo ""
echo "Terminal 2 (Web App):"
echo "  cd apps/web && pnpm dev"
echo ""
echo "Or open VS Code and use the integrated terminal:"
echo "  code ."
echo ""
echo "Access points:"
echo "  • Web App: http://localhost:5173"
echo "  • API: http://localhost:3000"
echo "  • API Health: http://localhost:3000/health"
echo ""
echo "See GETTING_STARTED_MAC.md for detailed instructions."
echo ""
echo "Happy coding! 🚀"
echo ""
