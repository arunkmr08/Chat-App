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

### ✅ Stage 1 Complete: Monorepo & Scaffolding
- Monorepo setup with pnpm + Turbo
- Web app (React + Vite + TypeScript + Tailwind + PWA)
- Server app (Fastify + TypeScript)
- Shared types package
- Docker Compose configuration

### ✅ Stage 2 Complete: Database Schema with pgvector
- Complete SQL schema with 13 tables
- pgvector extension enabled for embeddings (VECTOR(1536))
- Migration system with tracking
- IVFFlat index for fast similarity search
- Default AI agents seeded (GPT-4o, Claude 3.5 Sonnet, Gemini)
- Database client with connection pooling
- Similarity search helper function

### ✅ Stage 4 Complete: URL Ingestion Pipeline
- **Embeddings Service**: OpenAI text-embedding-3-small integration
- **Text Chunking**: Sentence-based chunking with 800-token chunks, 100-token overlap
- **URL Fetcher**: Mozilla Readability for content extraction
- **Job Queue**: BullMQ + Redis with exponential backoff
- **Workers**: Ingest worker (fetch → chunk → save) & Embed worker (generate embeddings)
- **Full Pipeline**: URL → Content → Chunks → Embeddings → Vector Storage

**API Endpoints:**
- `GET /healthz` - Health check with database status
- `POST /api/chats` - Create chat with agents
- `GET /api/chats` - List all chats
- `POST /api/chats/:id/sources` - Add URLs to chat
- `GET /api/chats/:id/sources` - Get source processing status
- `GET /api/agents` - List available AI agents

### ✅ Stage 5 Complete: RAG Context Builder
- **Embedding Generation**: Convert questions to vectors for similarity search
- **Vector Search**: Find top-K similar chunks using pgvector (<-> operator)
- **Context Building**: Format retrieved chunks with metadata and citations
- **Relevance Checking**: Validate context quality before sending to agents
- **Citation Tracking**: Document-level and chunk-level references

### ✅ Stage 6 Complete: AI Agent Adapters
- **Base Interface**: Unified `AgentAdapter` with retry logic and error handling
- **OpenAI**: GPT-4o and GPT-4o-mini integration
- **Anthropic**: Claude 3.5 Sonnet integration
- **Google**: Gemini Pro and Gemini Flash integration
- **Agent Registry**: Dynamic agent loading by database ID
- **Token Tracking**: Usage monitoring for all agents

### ✅ Stage 7 Complete: Multi-Agent Orchestrator
- **Parallel Execution**: Run 3+ agents simultaneously
- **RAG Integration**: Build context from vector search
- **Synthesis**: Combine all responses into best answer using GPT-4o
- **Error Resilience**: Individual agent failures don't break system
- **Citation Preservation**: Maintain all source references
- **Metrics**: Latency and token tracking per agent

**Complete API Endpoints:**
- `POST /api/chats/:id/messages` - Ask question, get multi-agent answer
- `GET /api/chats/:id/messages` - List chat history
- `GET /api/messages/:id` - Get message with all agent responses

**See [API_GUIDE.md](./API_GUIDE.md) for complete documentation.**

### ✅ Stage 9 Complete: PWA UI
- **ChatGPT-like Interface**: Clean, modern UI with sidebar navigation
- **Chat Management**: Create chats with multi-select agent picker (1-5 agents)
- **Message View**: Real-time chat with citations and similarity scores
- **Source Manager**: URL ingestion with auto-refresh status tracking
- **Status Indicators**: Color-coded badges (queued, parsing, embedding, ready, error)
- **React Query Integration**: Server state management with auto-refresh
- **Responsive Design**: Mobile-friendly layout with collapsible sidebar
- **PWA Ready**: Service worker and manifest for offline support

### ✅ Stage 12 Complete: Production Deployment
- **Docker Compose**: Production-ready multi-container setup
- **Nginx Reverse Proxy**: Load balancing and SSL termination
- **Multi-stage Dockerfiles**: Optimized builds for API and workers
- **Health Checks**: Automated monitoring for all services
- **SSL/HTTPS Support**: Let's Encrypt integration guide
- **Deployment Script**: Automated deployment with validation
- **Environment Templates**: Production configuration examples
- **Complete Documentation**: Step-by-step deployment guide

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.**

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
- [x] Stage 2: Data model (Postgres + pgvector)
- [x] Stage 3: Authentication (magic links, JWT, sessions)
- [x] Stage 4: File & URL ingestion pipeline
- [x] Stage 5: RAG retrieval
- [x] Stage 6: AI agent adapters
- [x] Stage 7: Multi-agent orchestrator
- [x] Stage 8: Clarifying questions (ambiguity detection)
- [x] Stage 9: PWA UI (mobile-first)
- [x] Stage 10: API surface (RESTful design, documentation)
- [x] Stage 11: UI states (Zustand, Dexie, offline support)
- [x] Stage 12: Deployment
- [x] Stage 13: Grounded answers enforcement (validation, confidence scoring)
- [x] Stage 14: Observability & costs (logging, metrics, cost tracking)
- [x] Stage 15: Security basics (auth, input validation, cookies)

**🎉 All 16 stages complete! (100%)**

## Key Principles

1. **Grounded Answers Only**: The chat can only answer from uploaded knowledge
2. **Multi-Agent**: Run multiple AI models and synthesize the best answer
3. **Offline-First**: Local cache with background sync
4. **Auditability**: Store citations (chunk IDs + spans) per answer

## Contributing

This is a structured implementation following the 16-stage plan. Each stage builds on the previous one.

## License

MIT
