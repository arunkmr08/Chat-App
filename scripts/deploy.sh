#!/bin/bash

# ZoAI Production Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

echo "======================================"
echo "ZoAI Production Deployment"
echo "======================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "⚠️  Please do not run this script as root"
  exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
  echo "❌ .env.production not found!"
  echo ""
  echo "Please create .env.production from the template:"
  echo "  cp .env.production.example .env.production"
  echo "  nano .env.production"
  echo ""
  exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed"
  echo "Please install Docker first: https://docs.docker.com/get-docker/"
  exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo "📦 Installing pnpm..."
  npm install -g pnpm@10
fi

# Load environment variables
echo "📋 Loading environment variables..."
export $(cat .env.production | grep -v '^#' | xargs)

# Validate required environment variables
REQUIRED_VARS=("POSTGRES_PASSWORD" "REDIS_PASSWORD" "OPENAI_API_KEY")
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Required environment variable $var is not set in .env.production"
    exit 1
  fi
done

echo "✅ Environment variables loaded"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile
echo "✅ Dependencies installed"
echo ""

# Build web application
echo "🏗️  Building web application..."
pnpm --filter web build
echo "✅ Web app built"
echo ""

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml down
echo "✅ Containers stopped"
echo ""

# Build Docker images
echo "🐳 Building Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache
echo "✅ Docker images built"
echo ""

# Start services
echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d
echo "✅ Services started"
echo ""

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.prod.yml ps
echo ""

# Test health endpoints
echo "🔍 Testing health endpoints..."
sleep 5

if curl -f http://localhost:3000/health &> /dev/null; then
  echo "✅ API health check passed"
else
  echo "⚠️  API health check failed - check logs with: docker compose -f docker-compose.prod.yml logs api"
fi

if curl -f http://localhost/health &> /dev/null; then
  echo "✅ Nginx health check passed"
else
  echo "⚠️  Nginx health check failed - check logs with: docker compose -f docker-compose.prod.yml logs nginx"
fi

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "Your application is now running at:"
echo "  - HTTP: http://localhost"
if [ ! -z "$CORS_ORIGIN" ]; then
  echo "  - Domain: $CORS_ORIGIN"
fi
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  - Stop: docker compose -f docker-compose.prod.yml down"
echo "  - Restart: docker compose -f docker-compose.prod.yml restart"
echo ""
echo "For SSL/HTTPS setup, see DEPLOYMENT.md"
echo ""
