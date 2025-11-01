# Missing Stages Analysis

This document provides a comprehensive analysis of the missing stages from the original 16-stage plan.

## Overview

**Completed Stages:** 9 out of 16 (56%)
**Missing Stages:** 7 out of 16 (44%)

---

## ❌ Stage 3: Authentication

**Status:** Database tables exist, but no implementation

### What Exists:
- ✅ `users` table with email and name
- ✅ `auth_sessions` table for session management
- ✅ `magic_links` table for passwordless authentication
- ✅ `JWT_SECRET` environment variable placeholder
- ✅ All chats have `user_id` foreign key

### What's Missing:
- ❌ Authentication routes (`/auth/login`, `/auth/logout`, `/auth/verify`)
- ❌ Magic link email sending service
- ❌ JWT token generation and validation
- ❌ Authentication middleware for protected routes
- ❌ Session management logic
- ❌ User registration/profile endpoints
- ❌ Frontend login UI
- ❌ Protected route handling in React

### Implementation Requirements:

**Backend:**
```
apps/server/src/routes/auth.ts
- POST /auth/send-magic-link (send email with token)
- GET /auth/verify/:token (verify token, create session)
- POST /auth/logout (invalidate session)
- GET /auth/me (get current user)

apps/server/src/lib/auth.ts
- generateMagicLink()
- verifyMagicLink()
- createSession()
- validateSession()
- generateJWT()
- verifyJWT()

apps/server/src/middleware/auth.ts
- authMiddleware() - protect routes
- optionalAuth() - attach user if logged in
```

**Frontend:**
```
apps/web/src/pages/Login.tsx
apps/web/src/pages/VerifyEmail.tsx
apps/web/src/contexts/AuthContext.tsx
apps/web/src/hooks/useAuth.ts
```

**Dependencies Needed:**
- `@fastify/jwt` - JWT handling
- `nodemailer` - Email sending
- Email service (SendGrid, Mailgun, or AWS SES)

---

## ❌ Stage 8: Clarifying Questions

**Status:** Not implemented

### What Exists:
- ❌ Nothing related to clarifying questions

### What's Missing:
- ❌ Detection of ambiguous or unclear user questions
- ❌ AI-powered question analysis to identify missing context
- ❌ Generation of clarifying questions before answering
- ❌ Multi-turn conversation handling
- ❌ Context accumulation across conversation turns
- ❌ UI for presenting clarifying questions
- ❌ UI for user responses to clarifying questions

### Implementation Requirements:

**Backend:**
```
apps/server/src/services/clarification.ts
- analyzeQuestion() - detect ambiguity
- generateClarifyingQuestions() - create follow-up questions
- assessClarityScore() - rate question clarity
- accumulateContext() - build context from multi-turn conversation

API Endpoints:
- POST /api/chats/:id/messages/clarify
  - Input: user question
  - Output: { needs_clarification: boolean, questions: string[], clarity_score: number }
```

**Example Flow:**
```
User: "Tell me about the pricing"
AI: "I need more information to answer accurately. Could you clarify:
     1. Are you asking about our product pricing or competitor pricing?
     2. Which product tier are you interested in?
     3. Are you looking for monthly or annual pricing?"

User: "Your product, annual pricing"
AI: [Now provides accurate answer based on clarified context]
```

**Frontend:**
```
apps/web/src/components/ClarificationDialog.tsx
- Display clarifying questions
- Allow user to select or type answers
- Send clarified question back to API
```

---

## ❌ Stage 10: API Surface

**Status:** Partially complete, needs formalization

### What Exists:
- ✅ Chat CRUD endpoints
- ✅ Message endpoints
- ✅ Source management endpoints
- ✅ Agent listing endpoint
- ✅ File upload endpoint
- ✅ Streaming endpoint
- ✅ API documentation (API_GUIDE.md)

### What's Missing:
- ❌ Versioned API (e.g., `/api/v1/`)
- ❌ Rate limiting
- ❌ API key authentication for external access
- ❌ Webhooks for async notifications
- ❌ Batch operations
- ❌ OpenAPI/Swagger specification
- ❌ SDK/client library generation
- ❌ API usage analytics
- ❌ GraphQL endpoint (optional alternative to REST)

### Implementation Requirements:

**API Versioning:**
```typescript
// Version 1 endpoints
await server.register(chatRoutes, { prefix: '/api/v1' })
await server.register(messageRoutes, { prefix: '/api/v1' })

// Future: Version 2 with breaking changes
await server.register(chatRoutesV2, { prefix: '/api/v2' })
```

**Rate Limiting:**
```typescript
// Install: @fastify/rate-limit
await server.register(rateLimit, {
  max: 100, // 100 requests
  timeWindow: '1 minute',
  errorResponseBuilder: (req, context) => ({
    error: 'Rate limit exceeded',
    retryAfter: context.after
  })
})
```

**API Keys:**
```
apps/server/src/routes/api-keys.ts
- POST /api/v1/api-keys (create API key)
- GET /api/v1/api-keys (list API keys)
- DELETE /api/v1/api-keys/:id (revoke API key)

Database:
- api_keys table (key_hash, user_id, name, scopes, expires_at)
```

**OpenAPI Specification:**
```
apps/server/src/openapi.yaml
- Generate with @fastify/swagger
- Serve at /api/docs
```

---

## ❌ Stage 11: UI States

**Status:** Dependencies installed but not used

### What Exists:
- ✅ `zustand` installed (v5.0.8)
- ✅ `dexie` installed (v4.2.1)
- ✅ `vite-plugin-pwa` installed
- ✅ Service worker generated
- ✅ Basic PWA manifest
- ✅ React Query for server state

### What's Missing:
- ❌ Zustand stores for client state
- ❌ Dexie database schema for offline data
- ❌ Offline data sync logic
- ❌ Background sync for queued actions
- ❌ Optimistic UI updates
- ❌ Loading states for all operations
- ❌ Error boundaries
- ❌ Retry logic for failed operations
- ❌ Network status detection
- ❌ Offline indicator in UI

### Implementation Requirements:

**Zustand Stores:**
```typescript
apps/web/src/stores/chatStore.ts
- Current chat ID
- Draft messages
- UI state (sidebar open, source panel open)

apps/web/src/stores/offlineStore.ts
- Queue of pending actions (messages, uploads)
- Network status
- Sync status
```

**Dexie Database:**
```typescript
apps/web/src/lib/db.ts
- Chats table (mirror of server data)
- Messages table (with offline flag)
- Sources table
- PendingActions table (queued operations)

Operations:
- Sync local DB with server on connect
- Store new data locally first (optimistic)
- Background sync when online
```

**UI State Management:**
```typescript
apps/web/src/components/MessageInput.tsx
- Show "Sending..." while message in flight
- Show "Queued" when offline
- Show "Failed - Retry?" on error

apps/web/src/components/OfflineIndicator.tsx
- Banner when offline
- Auto-hide when back online
- Show sync status
```

**Service Worker Enhancements:**
```typescript
apps/web/public/sw.js
- Cache API responses
- Cache static assets
- Background sync for queued messages
- Push notifications for new messages
```

---

## ❌ Stage 13: Grounded Answers Enforcement

**Status:** Partially implemented, needs stricter enforcement

### What Exists:
- ✅ `hasRelevantContext()` function with similarity threshold
- ✅ System prompts instructing agents to use only context
- ✅ Citations tracked for all responses
- ✅ Web search fallback (optional)

### What's Missing:
- ❌ Post-processing to verify AI didn't hallucinate
- ❌ Citation validation (ensure cited content exists)
- ❌ Hallucination detection
- ❌ Confidence scoring for answers
- ❌ Refusal to answer when context insufficient
- ❌ Answer quality metrics
- ❌ Fact-checking against source documents
- ❌ User feedback on answer quality

### Implementation Requirements:

**Answer Validation:**
```typescript
apps/server/src/services/answer-validator.ts

validateAnswer(answer: string, context: RAGContext): ValidationResult
- Check all claims in answer are in context
- Verify citations are accurate
- Detect potential hallucinations
- Return confidence score

detectHallucination(answer: string, context: RAGContext): boolean
- Use NLI (Natural Language Inference) model
- Check if answer entailed by context
- Flag suspicious claims
```

**Stricter Enforcement:**
```typescript
// In orchestrator/stream routes:
const validation = validateAnswer(synthesizedAnswer, ragContext)

if (validation.confidence < 0.7) {
  return "I cannot provide a confident answer based on the available
          knowledge. Please provide more sources or rephrase your question."
}

if (validation.hallucination_detected) {
  // Re-run with stricter prompt
  // Or reject answer entirely
}
```

**Citation Verification:**
```typescript
verifyCitations(answer: string, citations: Citation[]): CitationCheck[]
- Extract all citation markers [Document 1], [Source 2], etc.
- Verify each citation exists in context
- Check cited content supports the claim
- Flag incorrect citations
```

**User Feedback:**
```
Database:
- answer_feedback table (message_id, rating, feedback_text, issue_type)

UI:
- Thumbs up/down on each answer
- "Report issue" button (hallucination, incorrect citation, irrelevant)
```

---

## ❌ Stage 14: Observability & Costs

**Status:** Not implemented

### What Exists:
- ✅ Basic console logging
- ✅ Token usage tracked in agent responses
- ✅ Latency tracked per agent
- ✅ Fastify logger (pino)

### What's Missing:
- ❌ Structured logging
- ❌ Log aggregation (e.g., Elasticsearch, Loki)
- ❌ Metrics collection (Prometheus)
- ❌ Metrics dashboard (Grafana)
- ❌ Distributed tracing (Jaeger, Zipkin)
- ❌ Error tracking (Sentry)
- ❌ Performance monitoring (APM)
- ❌ Cost tracking per user/chat
- ❌ Budget alerts
- ❌ Usage analytics dashboard

### Implementation Requirements:

**Structured Logging:**
```typescript
// Install: pino, pino-pretty
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  }
})

// Usage:
logger.info({ userId, chatId, agentId, tokens, latency }, 'Agent response')
logger.error({ error, userId, chatId }, 'Message processing failed')
```

**Prometheus Metrics:**
```typescript
// Install: prom-client
import promClient from 'prom-client'

const register = new promClient.Registry()

// Metrics:
const requestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
})

const aiTokensUsed = new promClient.Counter({
  name: 'ai_tokens_used_total',
  help: 'Total AI tokens used',
  labelNames: ['agent', 'user_id'],
  registers: [register]
})

const aiCostUSD = new promClient.Counter({
  name: 'ai_cost_usd_total',
  help: 'Total AI cost in USD',
  labelNames: ['agent', 'user_id'],
  registers: [register]
})

// Endpoint:
server.get('/metrics', async (req, reply) => {
  reply.type('text/plain')
  return register.metrics()
})
```

**Cost Tracking:**
```typescript
apps/server/src/services/cost-tracker.ts

interface CostConfig {
  'gpt-4o': { input: 0.0025, output: 0.01 }, // per 1K tokens
  'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
  'gemini-pro': { input: 0.000125, output: 0.000375 },
  'text-embedding-3-small': { input: 0.00002, output: 0 }
}

calculateCost(model: string, inputTokens: number, outputTokens: number): number
trackCost(userId: number, chatId: number, cost: number): void
getUserCosts(userId: number, period: 'day' | 'month'): number
```

**Database:**
```sql
CREATE TABLE usage_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  chat_id BIGINT REFERENCES chats(id),
  agent_id BIGINT REFERENCES agents(id),
  operation VARCHAR(50), -- 'message', 'embed', 'search'
  tokens_input INT,
  tokens_output INT,
  cost_usd DECIMAL(10, 6),
  latency_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_user_date ON usage_logs(user_id, created_at);
CREATE INDEX idx_usage_logs_cost ON usage_logs(cost_usd);
```

**Grafana Dashboard:**
- Total requests per minute
- Average response latency
- Error rate
- Token usage by agent
- Cost per user
- Active users
- Queue depth (BullMQ)

**Sentry Error Tracking:**
```typescript
// Install: @sentry/node
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
})

// Error handling:
server.setErrorHandler((error, request, reply) => {
  Sentry.captureException(error, {
    user: { id: request.user?.id },
    tags: { route: request.url }
  })
  reply.status(500).send({ error: 'Internal server error' })
})
```

---

## ❌ Stage 15: Security Basics

**Status:** Minimal security implemented

### What Exists:
- ✅ CORS enabled
- ✅ Helmet-style security headers in nginx
- ✅ Environment variables for secrets
- ✅ `.gitignore` for sensitive files
- ✅ HTTPS support in nginx config (commented)

### What's Missing:
- ❌ Authentication (Stage 3)
- ❌ Authorization (role-based access)
- ❌ Rate limiting
- ❌ Input validation (SQL injection, XSS)
- ❌ CSRF protection
- ❌ Content Security Policy (CSP)
- ❌ API key rotation
- ❌ Audit logging
- ❌ Secrets management (Vault, AWS Secrets Manager)
- ❌ Security headers (@fastify/helmet)
- ❌ Request size limits
- ❌ File upload validation (malware scanning)

### Implementation Requirements:

**Input Validation:**
```typescript
// Already using Zod for validation, but needs expansion
import { z } from 'zod'

// Sanitize HTML to prevent XSS
import DOMPurify from 'isomorphic-dompurify'

const SafeTextSchema = z.string().transform(text =>
  DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
)

// Validate all user inputs
const CreateChatSchema = z.object({
  title: SafeTextSchema.min(1).max(500),
  group: z.enum(['Content', 'Code', 'Generative']),
  agentIds: z.array(z.number().int().positive()).min(1).max(5)
})
```

**Helmet Security Headers:**
```typescript
// Install: @fastify/helmet
import helmet from '@fastify/helmet'

await server.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.openai.com']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
})
```

**Rate Limiting:**
```typescript
// Install: @fastify/rate-limit
import rateLimit from '@fastify/rate-limit'

await server.register(rateLimit, {
  global: true,
  max: 100, // requests
  timeWindow: '1 minute',
  cache: 10000, // cache size
  allowList: ['127.0.0.1'], // whitelist
  redis: redisClient, // distributed rate limiting
  keyGenerator: (request) => {
    return request.user?.id || request.ip
  }
})

// Per-route limits:
server.post('/api/chats/:id/messages', {
  config: {
    rateLimit: {
      max: 20,
      timeWindow: '1 minute'
    }
  }
}, async (request, reply) => {
  // Handler
})
```

**CSRF Protection:**
```typescript
// Install: @fastify/csrf-protection
import csrf from '@fastify/csrf-protection'

await server.register(csrf, {
  cookieOpts: {
    signed: true,
    httpOnly: true,
    sameSite: 'strict'
  }
})
```

**Audit Logging:**
```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id BIGINT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

**File Upload Security:**
```typescript
import fileType from 'file-type'
import { scanFile } from './virus-scanner.js' // ClamAV or similar

async function validateUpload(buffer: Buffer, fileName: string) {
  // Check file type matches extension
  const type = await fileType.fromBuffer(buffer)
  if (!type || !ALLOWED_TYPES.includes(type.mime)) {
    throw new Error('Invalid file type')
  }

  // Scan for malware
  const isSafe = await scanFile(buffer)
  if (!isSafe) {
    throw new Error('File failed security scan')
  }

  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('File too large')
  }
}
```

**Secrets Management:**
```typescript
// Production: Use AWS Secrets Manager or HashiCorp Vault
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

async function getSecret(secretName: string): Promise<string> {
  const client = new SecretsManagerClient({ region: 'us-east-1' })
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  )
  return response.SecretString!
}

// Load secrets on startup
const OPENAI_API_KEY = await getSecret('prod/zoai/openai-api-key')
```

---

## Priority Recommendations

Based on criticality and user impact, here's the recommended implementation order:

### High Priority (Critical for production):

1. **Stage 3: Authentication** - Required for multi-user app
2. **Stage 15: Security Basics** - Required for production safety
3. **Stage 14: Observability** - Required for monitoring production

### Medium Priority (Enhances UX):

4. **Stage 11: UI States** - Better offline experience
5. **Stage 13: Grounded Answers** - Improves answer quality
6. **Stage 10: API Surface** - Better API design

### Low Priority (Nice to have):

7. **Stage 8: Clarifying Questions** - Enhanced UX but not critical

---

## Effort Estimates

| Stage | Complexity | Estimated Time | Priority |
|-------|-----------|----------------|----------|
| Stage 3: Authentication | Medium | 3-5 days | High |
| Stage 8: Clarifying Questions | Medium | 2-3 days | Low |
| Stage 10: API Surface | Low | 1-2 days | Medium |
| Stage 11: UI States | High | 4-6 days | Medium |
| Stage 13: Grounded Answers | Medium | 2-4 days | Medium |
| Stage 14: Observability | High | 5-7 days | High |
| Stage 15: Security | High | 4-6 days | High |

**Total:** ~21-33 days (4-7 weeks)

---

## Summary

The application has completed 9 out of 16 stages (56%) and has a **functional MVP** with:
- ✅ Multi-agent RAG system
- ✅ URL and file ingestion
- ✅ PWA UI
- ✅ Production deployment
- ✅ Streaming responses
- ✅ Web search fallback

However, it's **not production-ready** for real users due to missing:
- ❌ Authentication (no user accounts)
- ❌ Security hardening (no rate limits, input validation)
- ❌ Observability (can't monitor/debug issues)
- ❌ Offline state management (poor offline UX)

**Recommendation:** Focus on Stages 3, 14, and 15 first to make the app secure and monitorable before launching to real users.
