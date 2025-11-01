# ZoAI Multi-Agent RAG Chat - Architecture Documentation

This document provides comprehensive architecture diagrams and explanations for the entire system.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Detailed Component Architecture](#detailed-component-architecture)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Technology Stack](#technology-stack)
5. [Database Schema](#database-schema)
6. [API Architecture](#api-architecture)
7. [Deployment Architecture](#deployment-architecture)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                              CLIENT LAYER                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Browser (localhost:5173 / https://yourdomain.com)                  │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐│  │
│  │  │   React     │  │   Zustand    │  │    Dexie     │  │ Service  ││  │
│  │  │   PWA UI    │  │ (UI State)   │  │  (Offline    │  │ Worker   ││  │
│  │  │             │  │              │  │   IndexedDB) │  │          ││  │
│  │  └─────────────┘  └──────────────┘  └──────────────┘  └──────────┘│  │
│  │                                                                       │  │
│  │  ┌──────────────────────────────────────────────────────────────┐   │  │
│  │  │  React Query (Server State Management)                      │   │  │
│  │  └──────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  └───────────────────────────────┬───────────────────────────────────────┘  │
│                                  │                                           │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                   │
                          HTTP/REST + SSE (Streaming)
                                   │
┌──────────────────────────────────┼───────────────────────────────────────────┐
│                                  │                                           │
│                            APPLICATION LAYER                                 │
│                                  │                                           │
│  ┌───────────────────────────────▼───────────────────────────────────────┐  │
│  │                                                                         │  │
│  │           Fastify API Server (localhost:3000)                          │  │
│  │                                                                         │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │  │                         ROUTES                                    │ │  │
│  │  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐  │ │  │
│  │  │  │  Auth   │ │  Chats  │ │ Messages │ │ Stream │ │  Files   │  │ │  │
│  │  │  │         │ │         │ │          │ │  (SSE) │ │          │  │ │  │
│  │  │  └─────────┘ └─────────┘ └──────────┘ └────────┘ └──────────┘  │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                         │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │  │                       MIDDLEWARE                                  │ │  │
│  │  │  ┌─────────────────────┐  ┌─────────────────────────────────┐   │ │  │
│  │  │  │  Auth Middleware    │  │  Cookie Parser                  │   │ │  │
│  │  │  │  (requireAuth,      │  │  (@fastify/cookie)              │   │ │  │
│  │  │  │   optionalAuth)     │  │                                 │   │ │  │
│  │  │  └─────────────────────┘  └─────────────────────────────────┘   │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                         │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │  │                        SERVICES                                   │ │  │
│  │  │  ┌───────────┐ ┌──────────┐ ┌─────────────┐ ┌──────────────┐   │ │  │
│  │  │  │    RAG    │ │  Email   │ │ Embeddings  │ │ Cost Tracker │   │ │  │
│  │  │  │  Context  │ │ (SMTP)   │ │  (OpenAI)   │ │              │   │ │  │
│  │  │  └───────────┘ └──────────┘ └─────────────┘ └──────────────┘   │ │  │
│  │  │  ┌──────────────┐ ┌──────────────┐ ┌───────────┐ ┌──────────┐ │ │  │
│  │  │  │   Answer     │ │Clarification │ │ Web Search│ │   File   │ │ │  │
│  │  │  │  Validator   │ │   Analysis   │ │  (Tavily) │ │  Parser  │ │ │  │
│  │  │  └──────────────┘ └──────────────┘ └───────────┘ └──────────┘ │ │  │
│  │  │  ┌───────────┐ ┌──────────┐ ┌─────────────┐                   │ │  │
│  │  │  │   URL     │ │   Text   │ │   Chunker   │                   │ │  │
│  │  │  │  Fetcher  │ │ Extractor│ │   (800tok)  │                   │ │  │
│  │  │  └───────────┘ └──────────┘ └─────────────┘                   │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                         │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │  │                      AI AGENTS                                    │ │  │
│  │  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │ │  │
│  │  │  │   OpenAI     │ │  Anthropic   │ │      Google          │    │ │  │
│  │  │  │   Adapter    │ │   Adapter    │ │      Adapter         │    │ │  │
│  │  │  │  - GPT-4o    │ │  - Claude    │ │  - Gemini Pro        │    │ │  │
│  │  │  │  - GPT-4o-   │ │    3.5       │ │  - Gemini Flash      │    │ │  │
│  │  │  │    mini      │ │    Sonnet    │ │                      │    │ │  │
│  │  │  └──────────────┘ └──────────────┘ └──────────────────────┘    │ │  │
│  │  │                                                                   │ │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐   │ │  │
│  │  │  │         Multi-Agent Orchestrator                         │   │ │  │
│  │  │  │  - Parallel execution                                    │   │ │  │
│  │  │  │  - Response synthesis                                    │   │ │  │
│  │  │  │  - Error handling                                        │   │ │  │
│  │  │  └──────────────────────────────────────────────────────────┘   │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                         │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     BACKGROUND WORKERS                               │  │
│  │                                                                       │  │
│  │  ┌──────────────────────┐         ┌──────────────────────┐          │  │
│  │  │   Ingest Worker      │         │   Embed Worker       │          │  │
│  │  │                      │         │                      │          │  │
│  │  │  - Fetch URL content│         │  - Generate          │          │  │
│  │  │  - Parse HTML        │         │    embeddings        │          │  │
│  │  │  - Extract text      │         │  - Update chunks     │          │  │
│  │  │  - Chunk text        │         │  - Mark ready        │          │  │
│  │  │  - Save to DB        │         │                      │          │  │
│  │  │  - Queue embed job   │         │                      │          │  │
│  │  └──────────────────────┘         └──────────────────────┘          │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │
┌──────────────────────────────────┼───────────────────────────────────────────┐
│                                  │                                           │
│                             DATA LAYER                                       │
│                                  │                                           │
│  ┌───────────────────┐  ┌───────▼────────┐  ┌─────────────────────────┐   │
│  │                   │  │                 │  │                         │   │
│  │   PostgreSQL      │  │     Redis       │  │      MinIO (S3)         │   │
│  │   + pgvector      │  │                 │  │                         │   │
│  │                   │  │  ┌───────────┐  │  │  ┌──────────────────┐  │   │
│  │  ┌─────────────┐  │  │  │  BullMQ   │  │  │  │  File Storage    │  │   │
│  │  │ 13 Tables:  │  │  │  │  Queues:  │  │  │  │  - PDF files     │  │   │
│  │  │  - users    │  │  │  │           │  │  │  │  - Uploaded      │  │   │
│  │  │  - chats    │  │  │  │  • ingest │  │  │  │    documents     │  │   │
│  │  │  - agents   │  │  │  │  • embed  │  │  │  │  - Images        │  │   │
│  │  │  - sources  │  │  │  │  • answer │  │  │  │                  │  │   │
│  │  │  - documents│  │  │  └───────────┘  │  │  └──────────────────┘  │   │
│  │  │  - doc_     │  │  │                 │  │                         │   │
│  │  │    chunks   │  │  │  Job Queue      │  │  Port: 9000             │   │
│  │  │  - messages │  │  │  Management     │  │  Console: 9001          │   │
│  │  │  - auth_    │  │  │                 │  │                         │   │
│  │  │    sessions │  │  │  Port: 6379     │  │                         │   │
│  │  │  - magic_   │  │  │                 │  │                         │   │
│  │  │    links    │  │  └─────────────────┘  └─────────────────────────┘   │
│  │  │  - ...      │  │                                                      │
│  │  └─────────────┘  │                                                      │
│  │                   │                                                      │
│  │  Vector Storage   │                                                      │
│  │  VECTOR(1536)     │                                                      │
│  │  IVFFlat Index    │                                                      │
│  │                   │                                                      │
│  │  Port: 5432       │                                                      │
│  │                   │                                                      │
│  └───────────────────┘                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │
┌──────────────────────────────────┼───────────────────────────────────────────┐
│                                  │                                           │
│                        EXTERNAL SERVICES                                     │
│                                  │                                           │
│  ┌────────────────┐  ┌───────────▼──────┐  ┌────────────────┐             │
│  │                │  │                   │  │                │             │
│  │   OpenAI API   │  │  Anthropic API    │  │  Google AI API │             │
│  │                │  │                   │  │                │             │
│  │  • GPT-4o      │  │  • Claude 3.5     │  │  • Gemini Pro  │             │
│  │  • GPT-4o-mini │  │    Sonnet         │  │  • Gemini Flash│             │
│  │  • text-       │  │  • Claude 3.5     │  │                │             │
│  │    embedding-  │  │    Haiku          │  │                │             │
│  │    3-small     │  │                   │  │                │             │
│  │                │  │                   │  │                │             │
│  └────────────────┘  └───────────────────┘  └────────────────┘             │
│                                                                             │
│  ┌────────────────┐  ┌───────────────────┐                                │
│  │                │  │                   │                                │
│  │  Tavily API    │  │   SMTP Server     │                                │
│  │                │  │                   │                                │
│  │  • Web Search  │  │  • Magic link     │                                │
│  │  • Fallback    │  │    emails         │                                │
│  │    when no     │  │  • Welcome emails │                                │
│  │    context     │  │  • Notifications  │                                │
│  │                │  │                   │                                │
│  └────────────────┘  └───────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Component Architecture

### Frontend Components (React PWA)

```
apps/web/src/
│
├── components/
│   ├── App.tsx                    # Main application component
│   ├── ChatList.tsx               # Sidebar chat list (grouped by category)
│   ├── ChatView.tsx               # Main chat interface
│   ├── MessageBubble.tsx          # Individual message component
│   ├── NewChatDialog.tsx          # Create new chat modal
│   └── SourceManager.tsx          # URL/file source management
│
├── api/
│   └── client.ts                  # API client with all endpoints
│
├── stores/
│   └── uiStore.ts                 # Zustand state management
│       ├── Sidebar state
│       ├── Panel state
│       ├── Network status
│       └── Active chat tracking
│
├── lib/
│   └── db.ts                      # Dexie (IndexedDB) database
│       ├── LocalChat table
│       ├── LocalMessage table
│       ├── LocalSource table
│       └── PendingActions queue
│
└── main.tsx                       # Entry point with React Query setup
```

### Backend Components (Fastify API)

```
apps/server/src/
│
├── index.ts                       # Server entry point
│
├── routes/                        # API endpoints
│   ├── auth.ts                    # Authentication endpoints
│   │   ├── POST /auth/send-magic-link
│   │   ├── POST /auth/verify
│   │   ├── GET  /auth/me
│   │   ├── POST /auth/logout
│   │   └── POST /auth/logout-all
│   │
│   ├── chats.ts                   # Chat management
│   │   ├── POST /chats
│   │   ├── GET  /chats
│   │   ├── GET  /chats/:id
│   │   ├── POST /chats/:id/sources
│   │   ├── GET  /chats/:id/sources
│   │   └── GET  /agents
│   │
│   ├── messages.ts                # Message endpoints
│   │   ├── POST /chats/:id/messages
│   │   ├── GET  /chats/:id/messages
│   │   └── GET  /messages/:id
│   │
│   ├── stream.ts                  # Server-Sent Events streaming
│   │   └── POST /chats/:id/messages/stream
│   │
│   └── files.ts                   # File upload
│       ├── POST /chats/:id/files
│       └── GET  /files/supported-types
│
├── services/                      # Business logic
│   ├── rag.ts                     # RAG context building
│   ├── embeddings.ts              # OpenAI embedding generation
│   ├── email.ts                   # Email sending (SMTP)
│   ├── cost-tracker.ts            # AI cost calculation
│   ├── answer-validator.ts        # Answer quality validation
│   ├── clarification.ts           # Question clarity analysis
│   ├── web-search.ts              # Tavily web search
│   ├── file-parser.ts             # PDF/text file parsing
│   ├── chunker.ts                 # Text chunking (800 tokens)
│   ├── url-fetcher.ts             # URL content extraction
│   └── orchestrator.ts            # Multi-agent orchestration
│
├── agents/                        # AI model adapters
│   ├── base.ts                    # Base agent interface
│   ├── openai.ts                  # OpenAI adapter (GPT-4o)
│   ├── anthropic.ts               # Anthropic adapter (Claude)
│   ├── google.ts                  # Google adapter (Gemini)
│   └── index.ts                   # Agent registry
│
├── workers/                       # Background job processors
│   ├── ingest-worker.ts           # URL ingestion worker
│   └── embed-worker.ts            # Embedding generation worker
│
├── lib/                           # Core utilities
│   ├── db.ts                      # PostgreSQL client
│   ├── queue.ts                   # BullMQ job queue setup
│   ├── auth.ts                    # Authentication library
│   └── migrate.ts                 # Database migration runner
│
└── middleware/                    # Request middleware
    └── auth.ts                    # Auth middleware (requireAuth, optionalAuth)
```

---

## Data Flow Diagrams

### 1. User Question Flow (Multi-Agent RAG)

```
User enters question in UI
         │
         ▼
┌────────────────────┐
│  POST /messages    │
│  or /stream        │
└─────────┬──────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  1. Build RAG Context                       │
│     ├─ Generate question embedding          │
│     ├─ Search similar chunks (pgvector)     │
│     ├─ Fetch document metadata              │
│     └─ Build formatted context with         │
│        citations                             │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  2. Check Context Relevance                 │
│     ├─ Calculate similarity scores          │
│     ├─ If < 0.3 threshold:                  │
│     │  └─ Try web search fallback (Tavily) │
│     └─ If still no context: refuse answer   │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  3. Run Multiple AI Agents in Parallel      │
│     ├─ GPT-4o (OpenAI)                      │
│     ├─ Claude 3.5 Sonnet (Anthropic)        │
│     └─ Gemini Pro (Google)                  │
│                                              │
│     Each agent receives:                    │
│     • System prompt with context            │
│     • User question                         │
│     • Instructions to use only context      │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  4. Collect Agent Responses                 │
│     ├─ Track tokens used                    │
│     ├─ Track latency                        │
│     ├─ Handle individual agent failures     │
│     └─ Calculate costs                      │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  5. Synthesize Final Answer                 │
│     ├─ Use GPT-4o as synthesizer            │
│     ├─ Combine best parts of each response  │
│     ├─ Resolve contradictions               │
│     └─ Maintain citations                   │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  6. Validate Answer Quality                 │
│     ├─ Check for hallucinations             │
│     ├─ Verify citation accuracy             │
│     ├─ Calculate confidence score           │
│     └─ Reject if confidence < 0.7           │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  7. Save to Database                        │
│     ├─ User message                         │
│     ├─ Assistant message                    │
│     ├─ Individual agent responses           │
│     └─ Citations                            │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  8. Return Response to User                 │
│     ├─ Synthesized answer                   │
│     ├─ Citations with similarity scores     │
│     ├─ Agent metrics (tokens, latency)      │
│     └─ Total cost                           │
└─────────────────────────────────────────────┘
```

### 2. Document Ingestion Flow (URL or File)

```
User adds URL or uploads file
         │
         ▼
┌────────────────────┐
│ POST /sources      │
│ or POST /files     │
└─────────┬──────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  1. Create Source Record                    │
│     ├─ Type: 'url' or 'file'                │
│     ├─ Status: 'queued'                     │
│     └─ Save to 'sources' table              │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  2. Queue Ingest Job (BullMQ)               │
│     └─ Add to 'ingest' queue                │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  3. Ingest Worker Processes Job             │
│     │                                        │
│     ├─ For URL:                             │
│     │  ├─ Fetch HTML content                │
│     │  ├─ Parse with Mozilla Readability    │
│     │  └─ Extract clean text                │
│     │                                        │
│     └─ For File:                            │
│        ├─ Parse PDF with pdf-parse          │
│        └─ Extract text                      │
│                                              │
│     Update status: 'parsing'                │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  4. Create Document Record                  │
│     ├─ Title, metadata                      │
│     ├─ Save to 'documents' table            │
│     └─ Link to source                       │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  5. Chunk Text                              │
│     ├─ Split into 800-token chunks          │
│     ├─ 100-token overlap between chunks     │
│     ├─ Sentence-based splitting             │
│     └─ Save chunks to 'doc_chunks' table    │
│                                              │
│     Update status: 'embedding'              │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  6. Queue Embed Job                         │
│     └─ Add to 'embed' queue                 │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  7. Embed Worker Processes Job              │
│     ├─ Fetch all chunks for document        │
│     ├─ Generate embeddings (OpenAI API)     │
│     │  └─ text-embedding-3-small model      │
│     │     (1536 dimensions)                 │
│     ├─ Update chunks with embeddings        │
│     │  └─ VECTOR(1536) column               │
│     └─ Track token usage & cost             │
│                                              │
│     Update status: 'ready'                  │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  8. Document Ready                          │
│     └─ Can now be used for RAG queries      │
└─────────────────────────────────────────────┘
```

### 3. Authentication Flow (Magic Link)

```
User enters email
         │
         ▼
┌────────────────────────┐
│ POST /auth/send-       │
│      magic-link        │
└─────────┬──────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  1. Generate Magic Link Token               │
│     ├─ Create random 64-char token          │
│     ├─ Set 15-minute expiration             │
│     └─ Save to 'magic_links' table          │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  2. Send Email                              │
│     ├─ Development: Log to console          │
│     └─ Production: Send via SMTP            │
│                                              │
│     Email contains:                         │
│     http://localhost:5173/auth/verify?      │
│     token=abc123...                         │
└─────────┬───────────────────────────────────┘
          │
          ▼
User clicks link in email
         │
         ▼
┌────────────────────────┐
│ POST /auth/verify      │
│ { token: "abc123..." } │
└─────────┬──────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  3. Verify Token                            │
│     ├─ Check token exists                   │
│     ├─ Check not expired (< 15 min)         │
│     ├─ Check not already used               │
│     └─ Mark token as used                   │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  4. Get or Create User                      │
│     ├─ Check if user exists by email        │
│     ├─ If not, create new user              │
│     └─ Return user record                   │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  5. Create Session                          │
│     ├─ Generate session token               │
│     ├─ Set 30-day expiration                │
│     ├─ Save to 'auth_sessions' table        │
│     └─ Set httpOnly cookie                  │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  6. Return User + Token                     │
│     ├─ User info (id, email, name)          │
│     ├─ Session token                        │
│     └─ Set-Cookie header                    │
└─────────────────────────────────────────────┘
          │
          ▼
User is logged in (cookie stored)
```

---

## Technology Stack

### Frontend Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **UI Framework** | React 19 | Component-based UI |
| **Build Tool** | Vite 7 | Fast dev server & bundling |
| **Styling** | Tailwind CSS 4 | Utility-first styling |
| **Language** | TypeScript 5.9 | Type safety |
| **Server State** | React Query (TanStack) | API data caching & sync |
| **Client State** | Zustand | UI state management |
| **Offline DB** | Dexie | IndexedDB wrapper |
| **PWA** | Vite PWA Plugin | Service worker & manifest |
| **HTTP Client** | Fetch API | API communication |

### Backend Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **API Framework** | Fastify 5 | High-performance HTTP server |
| **Language** | TypeScript 5.7 | Type safety |
| **Validation** | Zod | Schema validation |
| **Database** | PostgreSQL 16 + pgvector | Relational + vector DB |
| **Job Queue** | BullMQ + Redis | Background job processing |
| **File Storage** | MinIO (S3-compatible) | Object storage |
| **Logging** | Pino | Structured logging |
| **Authentication** | Custom (JWT-like sessions) | Session management |
| **Email** | Nodemailer | SMTP email sending |

### AI & ML Stack

| Service | Provider | Purpose |
|---------|----------|---------|
| **LLM (Primary)** | OpenAI GPT-4o | Question answering |
| **LLM (Secondary)** | Anthropic Claude 3.5 Sonnet | Question answering |
| **LLM (Tertiary)** | Google Gemini Pro/Flash | Question answering |
| **Embeddings** | OpenAI text-embedding-3-small | Vector generation (1536-dim) |
| **Web Search** | Tavily API | Fallback search |
| **Synthesis** | OpenAI GPT-4o | Multi-agent response synthesis |

### Infrastructure Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Container Runtime** | Docker | Containerization |
| **Orchestration** | Docker Compose | Multi-container management |
| **Reverse Proxy** | Nginx | Load balancing, SSL |
| **Package Manager** | pnpm | Fast, efficient packages |
| **Build System** | Turbo | Monorepo task runner |
| **Version Control** | Git | Source control |

---

## Database Schema

### Core Tables

```sql
users
├─ id (BIGSERIAL PRIMARY KEY)
├─ email (VARCHAR(255) UNIQUE)
├─ name (VARCHAR(255))
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

chats
├─ id (BIGSERIAL PRIMARY KEY)
├─ user_id (→ users.id)
├─ workspace_id (→ workspaces.id)
├─ group ('Content' | 'Code' | 'Generative')
├─ title (VARCHAR(500))
├─ metadata (JSONB)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

agents
├─ id (BIGSERIAL PRIMARY KEY)
├─ key (VARCHAR(100) UNIQUE)
├─ label (VARCHAR(255))
├─ provider ('openai' | 'anthropic' | 'google')
├─ model (VARCHAR(100))
├─ enabled (BOOLEAN)
├─ config (JSONB)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

sources
├─ id (BIGSERIAL PRIMARY KEY)
├─ chat_id (→ chats.id)
├─ type ('url' | 'file' | 'image')
├─ url (TEXT)
├─ file_key (VARCHAR(500))
├─ file_name (VARCHAR(500))
├─ status ('queued' | 'parsing' | 'embedding' | 'ready' | 'error')
├─ error (TEXT)
├─ metadata (JSONB)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

documents
├─ id (BIGSERIAL PRIMARY KEY)
├─ chat_id (→ chats.id)
├─ source_id (→ sources.id)
├─ title (VARCHAR(500))
├─ url (TEXT)
├─ author (VARCHAR(255))
├─ published_at (TIMESTAMP)
├─ token_count (INT)
├─ chunk_count (INT)
├─ metadata (JSONB)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

doc_chunks                    ← Vector storage
├─ id (BIGSERIAL PRIMARY KEY)
├─ document_id (→ documents.id)
├─ chunk_index (INT)
├─ text (TEXT)
├─ token_count (INT)
├─ embedding (VECTOR(1536))  ← pgvector column
├─ created_at (TIMESTAMP)
└─ IVFFlat Index on embedding

messages
├─ id (BIGSERIAL PRIMARY KEY)
├─ chat_id (→ chats.id)
├─ role ('user' | 'assistant' | 'system')
├─ content (TEXT)
├─ final_answer (TEXT)
├─ citations (JSONB)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

message_parts                 ← Individual agent responses
├─ id (BIGSERIAL PRIMARY KEY)
├─ message_id (→ messages.id)
├─ agent_id (→ agents.id)
├─ role ('assistant')
├─ content (TEXT)
├─ token_count (INT)
├─ latency_ms (INT)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

auth_sessions
├─ id (BIGSERIAL PRIMARY KEY)
├─ user_id (→ users.id)
├─ token (VARCHAR(255) UNIQUE)
├─ expires_at (TIMESTAMP)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

magic_links
├─ id (BIGSERIAL PRIMARY KEY)
├─ email (VARCHAR(255))
├─ token (VARCHAR(255) UNIQUE)
├─ expires_at (TIMESTAMP)
├─ used (BOOLEAN)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
```

### Relationships

```
users ──1:N──> chats ──1:N──> messages
                │              │
                │              └──1:N──> message_parts
                │
                └──1:N──> sources ──1:N──> documents ──1:N──> doc_chunks

agents ──N:M──> chats (via chat_agents junction table)
       └──1:N──> message_parts
```

---

## API Architecture

### API Endpoints Summary

```
Authentication (5 endpoints)
├─ POST   /api/auth/send-magic-link  # Send login email
├─ POST   /api/auth/verify           # Verify token, create session
├─ GET    /api/auth/me               # Get current user (protected)
├─ POST   /api/auth/logout           # Logout (protected)
└─ POST   /api/auth/logout-all       # Logout all devices (protected)

Chats (4 endpoints)
├─ POST   /api/chats                 # Create chat
├─ GET    /api/chats                 # List user's chats
├─ GET    /api/chats/:id             # Get chat details
└─ GET    /api/agents                # List available AI agents

Sources (2 endpoints)
├─ POST   /api/chats/:id/sources     # Add URLs to chat
└─ GET    /api/chats/:id/sources     # Get source processing status

Files (2 endpoints)
├─ POST   /api/chats/:id/files       # Upload file to chat
└─ GET    /api/files/supported-types # Get supported file types

Messages (4 endpoints)
├─ POST   /api/chats/:id/messages    # Send message (multi-agent RAG)
├─ GET    /api/chats/:id/messages    # Get chat message history
├─ GET    /api/messages/:id          # Get message with agent responses
└─ POST   /api/chats/:id/messages/stream  # Streaming (SSE)

System (2 endpoints)
├─ GET    /health                    # Health check
└─ GET    /healthz                   # Health check (alias)
```

### Request/Response Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────────────────────┐
│    Fastify Server           │
│                             │
│  ┌───────────────────────┐ │
│  │  CORS Middleware      │ │
│  └──────────┬────────────┘ │
│             ▼               │
│  ┌───────────────────────┐ │
│  │  Cookie Parser        │ │
│  └──────────┬────────────┘ │
│             ▼               │
│  ┌───────────────────────┐ │
│  │  Auth Middleware      │ │
│  │  (if protected route) │ │
│  └──────────┬────────────┘ │
│             ▼               │
│  ┌───────────────────────┐ │
│  │  Route Handler        │ │
│  │  ├─ Validate (Zod)    │ │
│  │  ├─ Call service      │ │
│  │  └─ Format response   │ │
│  └──────────┬────────────┘ │
└─────────────┼───────────────┘
              │ HTTP Response
              ▼
       ┌─────────────┐
       │   Client    │
       └─────────────┘
```

---

## Deployment Architecture

### Development Environment

```
┌────────────────────────────────────────────────┐
│  localhost                                     │
│                                                │
│  ┌──────────────┐  ┌──────────────┐          │
│  │  Browser     │  │  VS Code     │          │
│  │  :5173       │  │  Editor      │          │
│  └──────┬───────┘  └──────────────┘          │
│         │                                     │
│         │ HTTP                                │
│         ▼                                     │
│  ┌──────────────┐                            │
│  │  Vite Dev    │                            │
│  │  Server      │                            │
│  │  :5173       │                            │
│  └──────┬───────┘                            │
│         │                                     │
│         │ Proxy /api → :3000                 │
│         ▼                                     │
│  ┌──────────────┐                            │
│  │  Fastify     │                            │
│  │  Server      │                            │
│  │  :3000       │                            │
│  └──────┬───────┘                            │
│         │                                     │
│         ├─────────────┬──────────────┐       │
│         │             │              │       │
│  ┌──────▼──────┐ ┌───▼───────┐ ┌────▼────┐ │
│  │  Docker     │ │  Docker   │ │ Docker  │ │
│  │  PostgreSQL │ │  Redis    │ │ MinIO   │ │
│  │  :5432      │ │  :6379    │ │ :9000   │ │
│  └─────────────┘ └───────────┘ └─────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

### Production Environment

```
Internet
    │
    ▼
┌───────────────────────────────────────────────────────────┐
│  Server (Ubuntu 22.04 LTS)                                │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Nginx (Reverse Proxy)                              │ │
│  │  :80, :443 (SSL/TLS)                                │ │
│  │                                                       │ │
│  │  ├─ Static files → /usr/share/nginx/html            │ │
│  │  └─ /api/* → http://api:3000                        │ │
│  └──────────────────┬──────────────────────────────────┘ │
│                     │                                     │
│      Docker Network │                                     │
│  ┌──────────────────▼──────────────────────────────────┐ │
│  │                                                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │ │
│  │  │  API        │  │  Worker     │  │  Worker     │ │ │
│  │  │  Container  │  │  (Ingest)   │  │  (Embed)    │ │ │
│  │  │  :3000      │  │             │  │             │ │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │ │
│  │         │                │                │         │ │
│  │         └────────────────┼────────────────┘         │ │
│  │                          │                           │ │
│  │         ┌────────────────┴────────────────┐         │ │
│  │         │                                  │         │ │
│  │  ┌──────▼──────┐  ┌──────────────┐  ┌────▼──────┐ │ │
│  │  │  PostgreSQL │  │  Redis       │  │  MinIO    │ │ │
│  │  │  (pgvector) │  │  (BullMQ)    │  │  (S3)     │ │ │
│  │  │             │  │              │  │           │ │ │
│  │  │  Volumes:   │  │  Volumes:    │  │  Volumes: │ │ │
│  │  │  - postgres_│  │  - redis_    │  │  - minio_ │ │ │
│  │  │    data     │  │    data      │  │    data   │ │ │
│  │  └─────────────┘  └──────────────┘  └───────────┘ │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                           │
│  External Services (via HTTPS):                          │
│  ├─ OpenAI API                                           │
│  ├─ Anthropic API                                        │
│  ├─ Google AI API                                        │
│  ├─ Tavily API                                           │
│  └─ SMTP Server                                          │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Container Architecture (Production)

```
docker-compose.prod.yml

services:
  postgres:
    image: pgvector/pgvector:pg16
    volumes: [postgres_data:/var/lib/postgresql/data]
    ports: ["127.0.0.1:5432:5432"]

  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]
    ports: ["127.0.0.1:6379:6379"]

  api:
    build: apps/server/Dockerfile
    depends_on: [postgres, redis]
    ports: ["127.0.0.1:3000:3000"]

  worker-ingest:
    build: apps/server/Dockerfile.worker
    depends_on: [postgres, redis]

  worker-embed:
    build: apps/server/Dockerfile.worker
    depends_on: [postgres, redis]

  nginx:
    image: nginx:alpine
    depends_on: [api]
    ports: ["80:80", "443:443"]
    volumes:
      - ./apps/web/dist:/usr/share/nginx/html
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf
```

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────┐
│  Security Layers                            │
│                                             │
│  1. Cookie-based Sessions                  │
│     ├─ httpOnly (prevents XSS)             │
│     ├─ Secure (HTTPS only in prod)         │
│     ├─ SameSite=lax (CSRF protection)      │
│     └─ 30-day expiration                   │
│                                             │
│  2. Magic Links                            │
│     ├─ Single-use tokens                   │
│     ├─ 15-minute expiration                │
│     └─ Cryptographically secure            │
│                                             │
│  3. Input Validation                       │
│     ├─ Zod schemas for all inputs          │
│     ├─ Type safety (TypeScript)            │
│     └─ SQL parameterization                │
│                                             │
│  4. Rate Limiting (ready to enable)        │
│     ├─ @fastify/rate-limit                 │
│     └─ Per-user and per-IP limits          │
│                                             │
│  5. Security Headers (ready to enable)     │
│     ├─ @fastify/helmet                     │
│     ├─ Content-Security-Policy             │
│     ├─ HSTS                                │
│     └─ X-Frame-Options                     │
│                                             │
│  6. File Upload Security                   │
│     ├─ 10MB size limit                     │
│     ├─ File type validation                │
│     └─ Virus scanning (recommended)        │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Monitoring & Observability

### Logging Architecture

```
Application Logs
       │
       ▼
┌─────────────────┐
│  Pino Logger    │
│  (Structured)   │
└────────┬────────┘
         │
         ├─ Development: pino-pretty (console)
         │
         └─ Production:
            └─ JSON logs → Log aggregation (ELK, Loki, etc.)
```

### Metrics (Ready to Enable)

```
Application Metrics
       │
       ▼
┌─────────────────┐
│  prom-client    │
│  (Prometheus)   │
└────────┬────────┘
         │
         ├─ HTTP request duration
         ├─ HTTP request count
         ├─ AI tokens used
         ├─ AI cost (USD)
         ├─ Database query latency
         ├─ Queue depth
         └─ Active sessions
         │
         ▼
  GET /metrics (Prometheus format)
         │
         ▼
  Prometheus Server
         │
         ▼
  Grafana Dashboard
```

### Cost Tracking

```
AI API Call
    │
    ▼
┌──────────────────────┐
│  Cost Tracker        │
│                      │
│  calculateCost()     │
│  - Input tokens      │
│  - Output tokens     │
│  - Model pricing     │
│  - Total USD         │
└──────────┬───────────┘
           │
           ├─ Log to Pino
           ├─ Prometheus counter
           └─ Database (optional)
```

---

## Performance Characteristics

### Latency Breakdown (Typical)

```
User Question → Final Answer
│
├─ 1. RAG Context Building: 100-300ms
│   ├─ Generate embedding: 50-100ms
│   ├─ Vector search: 20-50ms
│   └─ Fetch metadata: 30-150ms
│
├─ 2. Multi-Agent Execution: 2-5 seconds (parallel)
│   ├─ GPT-4o: 1.5-3s
│   ├─ Claude 3.5: 2-4s
│   └─ Gemini Pro: 1-2.5s
│
├─ 3. Synthesis: 1-2 seconds
│   └─ GPT-4o synthesis: 1-2s
│
├─ 4. Answer Validation: 10-50ms
│   └─ Citation check, confidence scoring
│
└─ 5. Database Save: 20-100ms
    └─ Insert messages, message_parts

Total: 3-8 seconds (average: 5 seconds)
```

### Throughput

- **Concurrent requests**: Limited by AI API rate limits
- **Database connections**: 20 (configurable pool)
- **Worker concurrency**: 5 jobs per worker (configurable)
- **File uploads**: Max 10MB per file

### Scalability

```
Horizontal Scaling:
├─ API servers: ✅ Stateless, can scale horizontally
├─ Workers: ✅ Can run multiple instances
├─ PostgreSQL: 🔄 Requires replication setup
├─ Redis: 🔄 Requires cluster setup
└─ MinIO: 🔄 Supports distributed mode

Vertical Scaling:
├─ Database: ✅ More RAM = better vector search performance
├─ API server: ✅ More CPU = more concurrent requests
└─ Workers: ✅ More CPU = faster processing
```

---

## Summary

This architecture provides:

✅ **Scalability** - Stateless API, background workers, queue-based processing
✅ **Reliability** - Error handling, retries, health checks
✅ **Performance** - Parallel AI execution, vector search, caching
✅ **Security** - Authentication, input validation, secure cookies
✅ **Observability** - Structured logging, metrics, cost tracking
✅ **Maintainability** - TypeScript, clean architecture, documentation
✅ **Extensibility** - Pluggable AI agents, modular services

**Total Components:**
- 160+ source files
- 16,000+ lines of code
- 13 database tables
- 25+ API endpoints
- 5 AI model integrations
- 3-tier architecture (client, API, data)
- 6 Docker containers (production)

---

For more details, see:
- API_GUIDE.md - API documentation
- DEPLOYMENT.md - Deployment guide
- GETTING_STARTED_MAC.md - Development setup
