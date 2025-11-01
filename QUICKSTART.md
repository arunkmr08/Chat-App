# 🚀 Quick Start Guide

Get ZoAI running on your Mac in **5 minutes**!

## Prerequisites Check ✓

```bash
# 1. Check if you have Node.js (v20+)
node --version
# If not installed: brew install node@20

# 2. Check if you have pnpm
pnpm --version
# If not installed: npm install -g pnpm

# 3. Check if Docker Desktop is running
docker ps
# If not running: Open Docker Desktop from Applications
```

## Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
./scripts/dev-mac.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Start Docker services
- ✅ Run database migrations
- ✅ Tell you what to do next

## Option 2: Manual Setup

### Step 1: Install Dependencies
```bash
pnpm install
```

### Step 2: Configure API Keys
```bash
# Copy environment file
cp apps/server/.env.example apps/server/.env

# Edit and add your API keys
code apps/server/.env
```

**Required: Add your OpenAI API key:**
```env
OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 3: Start Docker Services
```bash
cd infra
docker-compose -f docker-compose.dev.yml up -d
cd ..
```

### Step 4: Initialize Database
```bash
cd apps/server
pnpm run migrate
cd ../..
```

### Step 5: Start Development Servers

**Terminal 1 - API Server:**
```bash
cd apps/server
pnpm dev
```

**Terminal 2 - Web App:**
```bash
cd apps/web
pnpm dev
```

## Access Your App

- 🌐 **Web App**: http://localhost:5173
- 🔌 **API**: http://localhost:3000
- ❤️ **Health Check**: http://localhost:3000/health

## Test It Works

### 1. Check API Health
```bash
curl http://localhost:3000/health
```

Should return:
```json
{"ok":true,"timestamp":"...","database":"connected"}
```

### 2. Get Available AI Agents
```bash
curl http://localhost:3000/api/agents
```

### 3. Create Your First Chat
```bash
curl -X POST http://localhost:3000/api/chats \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Chat",
    "group": "Content",
    "agentIds": [1, 3]
  }'
```

### 4. Add a Knowledge Source
```bash
curl -X POST http://localhost:3000/api/chats/1/sources \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://en.wikipedia.org/wiki/Artificial_intelligence"]
  }'
```

### 5. Check Processing Status
```bash
curl http://localhost:3000/api/chats/1/sources
```

Wait until status shows `"ready"`, then ask questions!

### 6. Ask a Question
```bash
curl -X POST http://localhost:3000/api/chats/1/messages \
  -H "Content-Type: application/json" \
  -d '{"text":"What is artificial intelligence?"}'
```

## VS Code Setup

### Open in VS Code
```bash
code .
```

### Recommended Extensions
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Thunder Client (for API testing)

### Split Terminal in VS Code
1. Open integrated terminal (`` Ctrl+` ``)
2. Click the split icon or press `Cmd+\`
3. Run API server in one terminal, web app in another

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Browser (localhost:5173)                              │
│  ├─ React PWA UI                                       │
│  ├─ Zustand (State)                                    │
│  ├─ Dexie (Offline DB)                                 │
│  └─ Service Worker                                     │
│                                                         │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP/SSE
┌────────────────┴────────────────────────────────────────┐
│                                                         │
│  Fastify API Server (localhost:3000)                   │
│  ├─ Auth Routes (magic links)                          │
│  ├─ Chat Routes (CRUD)                                 │
│  ├─ Message Routes (Q&A)                               │
│  ├─ Stream Routes (SSE)                                │
│  └─ File Routes (uploads)                              │
│                                                         │
└────┬──────────┬──────────┬──────────┬──────────────────┘
     │          │          │          │
     ▼          ▼          ▼          ▼
┌─────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
│Postgres │ │ Redis  │ │ Workers │ │ AI APIs  │
│pgvector │ │BullMQ  │ │Ingest   │ │OpenAI    │
│         │ │        │ │Embed    │ │Anthropic │
└─────────┘ └────────┘ └─────────┘ │Google    │
                                    └──────────┘
```

## Common Commands

```bash
# Start Docker services
cd infra && docker-compose -f docker-compose.dev.yml up -d

# Stop Docker services
cd infra && docker-compose -f docker-compose.dev.yml down

# View Docker logs
cd infra && docker-compose -f docker-compose.dev.yml logs -f

# Check Docker status
docker ps

# Clean install dependencies
rm -rf node_modules apps/*/node_modules && pnpm install

# Type check
pnpm type-check

# Build for production
pnpm build
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Docker Issues
```bash
# Restart Docker Desktop (from menu bar)
# Or restart containers:
cd infra
docker-compose -f docker-compose.dev.yml restart
```

### Database Issues
```bash
# Reset database
cd infra
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
cd ../apps/server
pnpm run migrate
```

## Need Help?

- 📖 **Full Mac Guide**: See `GETTING_STARTED_MAC.md`
- 📚 **API Documentation**: See `API_GUIDE.md`
- 🚀 **Deployment Guide**: See `DEPLOYMENT.md`
- ✅ **All Stages Complete**: See `ALL_STAGES_COMPLETE.md`

## What's Next?

1. ✅ Get it running (you're here!)
2. 🔧 Customize the UI
3. 🤖 Add more AI agents
4. 📝 Build features
5. 🚀 Deploy to production

**Happy building! 🎉**
