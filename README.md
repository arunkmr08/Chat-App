# ZoAI Multi-Agent Chat PWA

A production-ready multi-agent chat application with RAG (Retrieval-Augmented Generation) capabilities, built as a Progressive Web App (PWA).

## Project Overview

This application allows users to:
- Upload documents (PDFs, URLs, images) as knowledge sources
- Ask questions that are answered using **only** the uploaded knowledge (grounded answers)
- Get responses from **multiple AI agents** (OpenAI, Anthropic, Google, DeepSeek)
- Receive a **synthesized best answer** from all agent responses
- Work **offline-first** with automatic sync when back online
- Access from web, iOS, and Android (via Capacitor)

## Architecture

### Monorepo Structure
```
/apps
  /web       - PWA (React + Vite + TypeScript + Tailwind)
  /server    - API + Workers (Fastify + TypeScript)
/packages
  /types     - Shared TypeScript types
  /ui        - Shared UI components (future)
/infra
  docker-compose.dev.yml - Local development services
```

### Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- TanStack Query (server state)
- Zustand (client state)
- Dexie (IndexedDB for offline)
- Vite PWA (service worker)

**Backend:**
- Fastify (API server)
- TypeScript
- Postgres + pgvector (database + embeddings)
- Redis + BullMQ (job queues)
- S3-compatible storage (MinIO/R2)

**AI Integrations:**
- OpenAI (GPT-4, etc.)
- Anthropic (Claude)
- Google (Gemini)
- DeepSeek

## Current Status

### ✓ Stage 1 Complete: Monorepo & Scaffolding

**What's working:**
- ✓ Monorepo setup with pnpm + Turbo
- ✓ Web app scaffolded with PWA support
- ✓ Server app with healthcheck endpoint
- ✓ Shared types package
- ✓ Docker Compose for local services
- ✓ `/healthz` endpoint returns `{ok: true}`
- ✓ Web app displays "Hello ZoAI Multi-Agent PWA"

**Endpoints:**
- `GET /healthz` - Health check
- `GET /` - API info

### Next: Stage 2 - Database Schema

**What's next:**
- Create Postgres tables with pgvector extension
- Set up database migrations
- Design schema for users, chats, messages, documents, chunks, agents

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker (for local services)

### Installation

```bash
# Install dependencies
pnpm install

# Start local services (Postgres, Redis, MinIO)
cd infra
docker-compose -f docker-compose.dev.yml up -d

# Start server (terminal 1)
cd apps/server
cp .env.example .env
pnpm dev

# Start web app (terminal 2)
cd apps/web
pnpm dev
```

### Access Points
- Web App: http://localhost:5173
- API Server: http://localhost:3000
- MinIO Console: http://localhost:9001 (admin/adminadmin)

## Development Workflow

```bash
# Run all apps in dev mode
pnpm dev

# Build all apps
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint

# Clean
pnpm clean
```

## Environment Variables

See `apps/server/.env.example` for required environment variables.

**Required for AI features (Stage 6+):**
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `DEEPSEEK_API_KEY`

## Project Roadmap

- [x] Stage 0: Big-picture decisions
- [x] Stage 1: Monorepo & scaffolding
- [ ] Stage 2: Data model (Postgres + pgvector)
- [ ] Stage 3: Authentication
- [ ] Stage 4: File & URL ingestion pipeline
- [ ] Stage 5: RAG retrieval
- [ ] Stage 6: AI agent adapters
- [ ] Stage 7: Multi-agent orchestrator
- [ ] Stage 8: Clarifying questions
- [ ] Stage 9: PWA UI (mobile-first)
- [ ] Stage 10: API surface
- [ ] Stage 11: UI states
- [ ] Stage 12: Deployment
- [ ] Stage 13: Grounded answers enforcement
- [ ] Stage 14: Observability & costs
- [ ] Stage 15: Security basics

## Key Principles

1. **Grounded Answers Only**: The chat can only answer from uploaded knowledge
2. **Multi-Agent**: Run multiple AI models and synthesize the best answer
3. **Offline-First**: Local cache with background sync
4. **Auditability**: Store citations (chunk IDs + spans) per answer

## Contributing

This is a structured implementation following the 16-stage plan. Each stage builds on the previous one.

## License

MIT
