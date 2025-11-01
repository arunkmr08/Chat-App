# Database Migrations

This directory contains SQL migration files for the ZoAI Multi-Agent Chat application.

## Running Migrations

From the server directory:

```bash
cd apps/server
pnpm migrate
```

## Database Schema

### Core Tables

#### `users`
User accounts and authentication.

#### `chats`
Chat sessions. Each chat belongs to a user and has:
- `group`: 'Content', 'Code', or 'Generative'
- `title`: Chat title
- Multiple agents attached via `chat_agents`

#### `agents`
AI model configurations (GPT-4, Claude, Gemini, etc.)

**Default agents:**
- openai-gpt4o
- openai-gpt4o-mini
- anthropic-claude-3.5-sonnet
- google-gemini-pro
- google-gemini-flash

#### `chat_agents`
Many-to-many relationship between chats and agents.

#### `sources`
Uploaded knowledge sources:
- `type`: 'url', 'file', or 'image'
- `status`: queued → parsing → embedding → ready

#### `documents`
Parsed documents from sources.

#### `doc_chunks`
**Vector embeddings table with pgvector:**
- `text`: Chunk content
- `embedding`: Vector(1536) - OpenAI embedding
- `chunk_index`: Position in document

**Similarity search:**
```sql
SELECT id, text, 1 - (embedding <=> $1::vector) AS similarity
FROM doc_chunks
ORDER BY embedding <-> $1::vector
LIMIT 20;
```

#### `messages`
User and assistant messages in a chat.
- `final_answer`: Synthesized answer from all agents

#### `message_parts`
Individual agent responses for a message.

#### `jobs`
Background job queue for:
- `ingest`: Fetch and parse sources
- `embed`: Generate embeddings
- `answer`: Run agent queries

#### `auth_sessions` & `magic_links`
Passwordless authentication tables.

## Indexes

- **B-tree indexes**: On foreign keys, status fields
- **IVFFlat index**: On `doc_chunks.embedding` for fast similarity search

## pgvector Operations

### Distance operators:
- `<->`: L2 distance (Euclidean)
- `<#>`: Inner product
- `<=>`: Cosine distance

### Example queries:

```sql
-- Find similar chunks
SELECT c.*, 1 - (c.embedding <=> $1::vector) AS similarity
FROM doc_chunks c
JOIN documents d ON d.id = c.document_id
WHERE d.chat_id = $2
ORDER BY c.embedding <-> $1::vector
LIMIT 20;

-- Count chunks by document
SELECT document_id, COUNT(*) as chunks
FROM doc_chunks
GROUP BY document_id;
```

## Development

### Reset database:
```bash
# Drop and recreate
dropdb zoai_chat
createdb zoai_chat
pnpm migrate
```

### Check migrations:
```sql
SELECT * FROM migrations;
```
