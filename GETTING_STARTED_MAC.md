# Running ZoAI on Mac - Complete Setup Guide

This guide will walk you through running the ZoAI Multi-Agent RAG Chat application on your Mac.

## Prerequisites

### 1. Install Required Software

#### Install Homebrew (if not already installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Install Node.js (v20+)
```bash
brew install node@20
```

#### Install pnpm (Package Manager)
```bash
npm install -g pnpm
```

#### Install Docker Desktop for Mac
1. Download from: https://www.docker.com/products/docker-desktop/
2. Install the .dmg file
3. Open Docker Desktop and wait for it to start
4. Verify installation:
```bash
docker --version
docker-compose --version
```

#### Install Visual Studio Code (Recommended)
1. Download from: https://code.visualstudio.com/
2. Install and open VS Code

### 2. Install Recommended VS Code Extensions

Open VS Code and install these extensions:
- **ESLint** - Code quality
- **Prettier** - Code formatting
- **TypeScript and JavaScript Language Features** - Better TS support
- **Thunder Client** - API testing (like Postman)
- **Docker** - Docker integration

---

## Step-by-Step Setup

### Step 1: Open Project in VS Code

```bash
# Navigate to your project directory
cd /path/to/Chat-App

# Open in VS Code
code .
```

### Step 2: Install Dependencies

Open the **integrated terminal** in VS Code (`Terminal > New Terminal` or `` Ctrl+` ``):

```bash
# Install all dependencies
pnpm install
```

**Expected output:**
```
Progress: resolved 854, reused 0, downloaded 0, added 0, done
Done in 30s using pnpm v10.20.0
```

### Step 3: Set Up Environment Variables

#### For the Server (Backend):

```bash
# Copy the example file
cp apps/server/.env.example apps/server/.env

# Open in VS Code
code apps/server/.env
```

**Edit the file with your API keys:**

```bash
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database (Docker will handle this)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/zoai_chat

# Redis (Docker will handle this)
REDIS_URL=redis://localhost:6379

# S3 / Object Storage (Docker will handle this)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=admin
S3_SECRET_KEY=adminadmin
S3_BUCKET=zoai-uploads
S3_REGION=us-east-1

# AI Provider Keys (REQUIRED - Add your actual keys)
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
GOOGLE_AI_API_KEY=your-google-ai-key-here

# Web Search (Optional)
TAVILY_API_KEY=

# Authentication
COOKIE_SECRET=change-this-to-a-random-secret-12345

# Email (Development mode - leave blank)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=noreply@zoai.app
APP_URL=http://localhost:5173
```

**Important:** Replace the API keys with your actual keys!

#### For the Web App (Frontend):

```bash
# The .env file already exists
# Verify it has the correct API URL
cat apps/web/.env
```

Should show:
```
VITE_API_URL=http://localhost:3000/api
```

### Step 4: Start Docker Services

Make sure Docker Desktop is running (you should see the Docker icon in your Mac menu bar).

```bash
# Navigate to infrastructure directory
cd infra

# Start PostgreSQL, Redis, and MinIO
docker-compose -f docker-compose.dev.yml up -d
```

**Expected output:**
```
[+] Running 3/3
 ✔ Container zoai-postgres  Started
 ✔ Container zoai-redis     Started
 ✔ Container zoai-minio     Started
```

**Verify services are running:**
```bash
docker ps
```

You should see 3 containers running:
- `zoai-postgres` (PostgreSQL database)
- `zoai-redis` (Redis for job queues)
- `zoai-minio` (S3-compatible storage)

### Step 5: Run Database Migrations

```bash
# Go back to project root
cd ..

# Run migrations to create tables
cd apps/server
pnpm run migrate
```

**Expected output:**
```
Running migration: 001_initial_schema.sql
✅ Migrations complete
```

### Step 6: Start the Application

Now you'll need **3 terminals** in VS Code. Here's how:

#### Terminal 1: API Server

```bash
# In VS Code terminal
cd apps/server
pnpm dev
```

**Expected output:**
```
✅ Database connected: 2025-11-01T...
✅ Workers started
🚀 Server running at http://0.0.0.0:3000
```

#### Terminal 2: Web App

Open a **new terminal** in VS Code (`Terminal > New Terminal`):

```bash
cd apps/web
pnpm dev
```

**Expected output:**
```
  VITE v7.1.12  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

#### Terminal 3: Monitor Docker Logs (Optional)

Open another terminal:

```bash
cd infra
docker-compose -f docker-compose.dev.yml logs -f
```

---

## Step 7: Access the Application

### Open Your Browser

Navigate to: **http://localhost:5173**

You should see the ZoAI chat interface!

### Access Points:

- **Web App**: http://localhost:5173
- **API Server**: http://localhost:3000
- **API Health Check**: http://localhost:3000/health
- **MinIO Console**: http://localhost:9001 (login: admin/adminadmin)

---

## Step 8: Test the Application

### 1. Test Authentication

Since the frontend auth UI isn't fully integrated yet, you can test auth via API:

**Using Thunder Client in VS Code or curl:**

```bash
# Send magic link
curl -X POST http://localhost:3000/api/auth/send-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Check the server terminal** - you'll see the magic link printed:

```
================================================================================
📧 MAGIC LINK EMAIL (Development Mode)
================================================================================
To: test@example.com
Link: http://localhost:5173/auth/verify?token=abc123...
================================================================================
```

**Copy the token and verify:**

```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"paste-the-token-here"}'
```

### 2. Test API Endpoints

**Get available AI agents:**

```bash
curl http://localhost:3000/api/agents
```

**Create a chat:**

```bash
curl -X POST http://localhost:3000/api/chats \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Chat",
    "group": "Content",
    "agentIds": [1, 3]
  }'
```

**Add a source URL:**

```bash
curl -X POST http://localhost:3000/api/chats/1/sources \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://en.wikipedia.org/wiki/Artificial_intelligence"]
  }'
```

**Check source status:**

```bash
curl http://localhost:3000/api/chats/1/sources
```

### 3. Test the UI

1. Open http://localhost:5173
2. Click "New Chat" button
3. Enter a title and select agents
4. Add sources (URLs)
5. Wait for sources to process (status will show "ready")
6. Ask a question!

---

## Useful VS Code Tips

### 1. Split Terminal

You can split the terminal to see multiple processes at once:
- Click the split terminal icon in the terminal panel
- Or use: `Cmd+\`

### 2. Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/apps/server",
      "console": "integratedTerminal"
    }
  ]
}
```

### 3. Recommended VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
```

---

## Troubleshooting

### Issue: "Port 5173 already in use"

```bash
# Find and kill the process
lsof -ti:5173 | xargs kill -9
```

### Issue: "Port 3000 already in use"

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9
```

### Issue: Docker containers won't start

```bash
# Stop all containers
docker-compose -f infra/docker-compose.dev.yml down

# Remove volumes and restart
docker-compose -f infra/docker-compose.dev.yml down -v
docker-compose -f infra/docker-compose.dev.yml up -d
```

### Issue: Database connection errors

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs zoai-postgres

# Restart if needed
docker restart zoai-postgres
```

### Issue: "pnpm: command not found"

```bash
# Install pnpm globally
npm install -g pnpm

# Or use npx
npx pnpm install
```

### Issue: Module not found errors

```bash
# Clean install
rm -rf node_modules apps/*/node_modules
pnpm install
```

---

## Stopping the Application

### Stop Development Servers

In each terminal running `pnpm dev`:
- Press `Ctrl+C`

### Stop Docker Services

```bash
cd infra
docker-compose -f docker-compose.dev.yml down
```

### Stop Docker Desktop

- Click the Docker icon in menu bar
- Select "Quit Docker Desktop"

---

## Development Workflow

### Daily Workflow:

1. **Start Docker:**
   ```bash
   cd infra && docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Start Server:**
   ```bash
   cd apps/server && pnpm dev
   ```

3. **Start Web App:**
   ```bash
   cd apps/web && pnpm dev
   ```

4. **Code and test!**

5. **When done:**
   - Stop dev servers (Ctrl+C)
   - Stop Docker: `docker-compose -f infra/docker-compose.dev.yml down`

### Running Tests:

```bash
# Type check
pnpm type-check

# Build to verify everything compiles
pnpm build

# Clean if needed
pnpm clean
```

---

## Quick Reference Commands

### Project Commands:

```bash
# Install dependencies
pnpm install

# Start all (requires tmux or multiple terminals)
pnpm dev

# Build everything
pnpm build

# Type check
pnpm type-check

# Clean build artifacts
pnpm clean
```

### Docker Commands:

```bash
# Start services
docker-compose -f infra/docker-compose.dev.yml up -d

# Stop services
docker-compose -f infra/docker-compose.dev.yml down

# View logs
docker-compose -f infra/docker-compose.dev.yml logs -f

# Check status
docker ps

# Restart a service
docker restart zoai-postgres
```

### Database Commands:

```bash
# Run migrations
cd apps/server && pnpm run migrate

# Connect to database
docker exec -it zoai-postgres psql -U postgres -d zoai_chat

# Inside PostgreSQL:
\dt              # List tables
\d+ chats        # Describe chats table
SELECT * FROM users LIMIT 5;
\q               # Quit
```

---

## Next Steps

1. ✅ Get the app running
2. ✅ Test authentication
3. ✅ Create a chat
4. ✅ Add sources
5. ✅ Ask questions
6. 🔜 Build frontend auth UI
7. 🔜 Customize and extend!

---

## Support

If you encounter issues:

1. **Check the logs** in the terminal
2. **Check Docker logs**: `docker-compose logs`
3. **Verify services**: `docker ps`
4. **Check environment variables**: Make sure API keys are set
5. **Review documentation**: API_GUIDE.md, DEPLOYMENT.md

---

**You're all set! Happy coding! 🚀**
