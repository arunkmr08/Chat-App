# ZoAI Multi-Agent Chat - API Guide

Complete API reference for the multi-agent RAG chat system.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently uses a default demo user (id=1). Authentication will be added in Stage 3.

---

## Endpoints

### 1. Health Check

Check API and database status.

```http
GET /healthz
```

**Response:**
```json
{
  "ok": true,
  "timestamp": "2025-11-01T08:00:00.000Z",
  "database": "connected"
}
```

---

### 2. List Available Agents

Get all AI agents available for chats.

```http
GET /api/agents
```

**Response:**
```json
{
  "agents": [
    {
      "id": 1,
      "key": "openai-gpt4o",
      "label": "ChatGPT-4o",
      "provider": "openai",
      "model": "gpt-4o",
      "enabled": true
    },
    {
      "id": 2,
      "key": "openai-gpt4o-mini",
      "label": "ChatGPT-4o-mini",
      "provider": "openai",
      "model": "gpt-4o-mini",
      "enabled": true
    },
    {
      "id": 3,
      "key": "anthropic-claude-3.5-sonnet",
      "label": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "enabled": true
    },
    {
      "id": 4,
      "key": "google-gemini-pro",
      "label": "Gemini Pro",
      "provider": "google",
      "model": "gemini-1.5-pro",
      "enabled": true
    }
  ]
}
```

---

### 3. Create Chat

Create a new chat with selected AI agents.

```http
POST /api/chats
```

**Request Body:**
```json
{
  "title": "React Documentation Chat",
  "group": "Content",
  "agentIds": [1, 3, 4]
}
```

- `title`: Chat name
- `group`: One of: "Content", "Code", or "Generative"
- `agentIds`: Array of agent IDs (1-5 agents)

**Response:**
```json
{
  "id": 1,
  "title": "React Documentation Chat",
  "group": "Content",
  "created_at": "2025-11-01T08:00:00.000Z"
}
```

---

### 4. List Chats

Get all chats for the current user.

```http
GET /api/chats
```

**Response:**
```json
{
  "chats": [
    {
      "id": 1,
      "title": "React Documentation Chat",
      "group": "Content",
      "created_at": "2025-11-01T08:00:00.000Z"
    }
  ]
}
```

---

### 5. Get Chat Details

Get a specific chat.

```http
GET /api/chats/:id
```

**Response:**
```json
{
  "id": 1,
  "title": "React Documentation Chat",
  "group": "Content",
  "created_at": "2025-11-01T08:00:00.000Z"
}
```

---

### 6. Add Sources to Chat

Add URLs to a chat's knowledge base.

```http
POST /api/chats/:id/sources
```

**Request Body:**
```json
{
  "urls": [
    "https://react.dev/learn",
    "https://react.dev/reference/react/hooks"
  ]
}
```

**Response:**
```json
{
  "source_ids": [1, 2]
}
```

**What happens next:**
1. Sources are queued for processing (status: "queued")
2. Ingest worker fetches content (status: "parsing")
3. Text is chunked into 800-token pieces
4. Embed worker generates embeddings (status: "embedding")
5. Sources become ready for queries (status: "ready")

---

### 7. Check Source Status

Monitor source processing progress.

```http
GET /api/chats/:id/sources
```

**Response:**
```json
{
  "sources": [
    {
      "id": 1,
      "type": "url",
      "url": "https://react.dev/learn",
      "file_name": null,
      "status": "ready",
      "error": null,
      "created_at": "2025-11-01T08:00:00.000Z"
    },
    {
      "id": 2,
      "type": "url",
      "url": "https://react.dev/reference/react/hooks",
      "status": "embedding",
      "error": null,
      "created_at": "2025-11-01T08:01:00.000Z"
    }
  ]
}
```

**Status values:**
- `queued` - Waiting to be processed
- `parsing` - Fetching and extracting content
- `embedding` - Generating vector embeddings
- `ready` - Available for queries ✓
- `error` - Processing failed

---

### 8. Send Message (Ask Question)

Ask a question and get multi-agent response.

```http
POST /api/chats/:id/messages
```

**Request Body:**
```json
{
  "text": "What is React and what are its main features?"
}
```

**Response:**
```json
{
  "message_id": 2,
  "user_message_id": 1,
  "answer": "Based on the React documentation, React is a JavaScript library for building user interfaces. Its main features include:\n\n1. **Component-Based Architecture** [Document 1]: React lets you build encapsulated components that manage their own state...\n\n2. **Declarative Syntax** [Document 2]: React makes it painless to create interactive UIs...\n\n3. **Virtual DOM** [Document 1]: React creates an in-memory data structure cache...\n\nSources:\n- React Documentation: Learn React\n- React Documentation: Hooks Reference",
  "citations": [
    {
      "document_id": 1,
      "document_title": "Learn React – React",
      "chunk_index": 0,
      "text": "React is a JavaScript library for building user interfaces...",
      "source_url": "https://react.dev/learn",
      "similarity": 0.87
    }
  ],
  "agent_results": [
    {
      "agent": "ChatGPT-4o",
      "success": true,
      "latency_ms": 1234,
      "tokens": 456
    },
    {
      "agent": "Claude 3.5 Sonnet",
      "success": true,
      "latency_ms": 1456,
      "tokens": 512
    },
    {
      "agent": "Gemini Pro",
      "success": true,
      "latency_ms": 987,
      "tokens": 398
    }
  ],
  "total_tokens": 1366,
  "total_latency_ms": 2100
}
```

**How it works:**
1. Generate embedding for question
2. Find top 12 similar chunks (vector search)
3. Build RAG context with citations
4. Run all 3 agents in parallel
5. Synthesize responses into best answer
6. Return with citations and metrics

---

### 9. List Messages

Get all messages in a chat.

```http
GET /api/chats/:id/messages
```

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "What is React?",
      "final_answer": null,
      "citations": null,
      "created_at": "2025-11-01T08:05:00.000Z"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "Based on the React documentation...",
      "final_answer": "Based on the React documentation...",
      "citations": [...],
      "created_at": "2025-11-01T08:05:02.000Z"
    }
  ]
}
```

---

### 10. Get Message with Agent Responses

Get a single message with all individual agent responses.

```http
GET /api/messages/:id
```

**Response:**
```json
{
  "id": 2,
  "chat_id": 1,
  "role": "assistant",
  "content": "Based on the React documentation...",
  "final_answer": "Based on the React documentation...",
  "citations": [...],
  "created_at": "2025-11-01T08:05:02.000Z",
  "agent_responses": [
    {
      "id": 1,
      "agent_id": 1,
      "agent_label": "ChatGPT-4o",
      "content": "React is a JavaScript library...",
      "token_count": 456,
      "latency_ms": 1234,
      "created_at": "2025-11-01T08:05:02.000Z"
    },
    {
      "id": 2,
      "agent_id": 3,
      "agent_label": "Claude 3.5 Sonnet",
      "content": "According to the documentation...",
      "token_count": 512,
      "latency_ms": 1456,
      "created_at": "2025-11-01T08:05:02.000Z"
    }
  ]
}
```

---

## Complete Workflow Example

```bash
# 1. List available agents
curl http://localhost:3000/api/agents

# 2. Create a chat with 3 agents
curl -X POST http://localhost:3000/api/chats \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Documentation Chat",
    "group": "Content",
    "agentIds": [1, 3, 4]
  }'
# Response: {"id": 1, ...}

# 3. Add URLs to knowledge base
curl -X POST http://localhost:3000/api/chats/1/sources \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://react.dev/learn",
      "https://react.dev/reference/react/hooks"
    ]
  }'
# Response: {"source_ids": [1, 2]}

# 4. Check processing status
curl http://localhost:3000/api/chats/1/sources
# Wait until status: "ready"

# 5. Ask a question
curl -X POST http://localhost:3000/api/chats/1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What are React hooks and when should I use them?"
  }'
# Response: Multi-agent answer with citations!

# 6. View chat history
curl http://localhost:3000/api/chats/1/messages
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 404 Not Found
```json
{
  "error": "Chat not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Error message"
}
```

---

## Rate Limits

Currently no rate limits. Will be added in Stage 14.

---

## Features

✅ **Grounded Answers**: Only uses uploaded knowledge
✅ **Multi-Agent**: 3+ AI models respond to each question
✅ **Intelligent Synthesis**: Best answer from all responses
✅ **Citations**: Document-level and chunk-level references
✅ **Parallel Processing**: Fast responses via concurrent execution
✅ **Error Resilience**: Individual agent failures don't break system
✅ **Metrics**: Token usage and latency tracking
✅ **Background Processing**: URL ingestion runs async

---

## Next Features

- [ ] Streaming responses (SSE)
- [ ] File upload (PDF, DOCX)
- [ ] Image upload with OCR
- [ ] Web search fallback
- [ ] Authentication
- [ ] Rate limiting
- [ ] WebSocket support
