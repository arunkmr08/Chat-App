-- Migration 001: Initial Schema with pgvector
-- Creates all core tables for the ZoAI Multi-Agent Chat system

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Workspaces table (optional - for team features later)
CREATE TABLE workspaces (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chats table
CREATE TABLE chats (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id BIGINT REFERENCES workspaces(id) ON DELETE CASCADE,
  "group" VARCHAR(50) NOT NULL CHECK ("group" IN ('Content', 'Code', 'Generative')),
  title VARCHAR(500) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chats_user ON chats(user_id);
CREATE INDEX idx_chats_group ON chats("group");

-- Agents table (AI models configuration)
CREATE TABLE agents (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agents_enabled ON agents(enabled);

-- Insert default agents
INSERT INTO agents (key, label, provider, model, enabled) VALUES
  ('openai-gpt4o', 'ChatGPT-4o', 'openai', 'gpt-4o', true),
  ('openai-gpt4o-mini', 'ChatGPT-4o-mini', 'openai', 'gpt-4o-mini', true),
  ('anthropic-claude-3.5-sonnet', 'Claude 3.5 Sonnet', 'anthropic', 'claude-3-5-sonnet-20241022', true),
  ('google-gemini-pro', 'Gemini Pro', 'google', 'gemini-1.5-pro', true),
  ('google-gemini-flash', 'Gemini Flash', 'google', 'gemini-1.5-flash', true);

-- Chat-Agents junction table (many-to-many)
CREATE TABLE chat_agents (
  chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  agent_id BIGINT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, agent_id)
);

-- Sources table (URLs, files, images)
CREATE TABLE sources (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('url', 'file', 'image')),
  url TEXT,
  file_key VARCHAR(500),
  file_name VARCHAR(500),
  mime_type VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'parsing', 'embedding', 'ready', 'error')),
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sources_chat ON sources(chat_id);
CREATE INDEX idx_sources_status ON sources(status);

-- Documents table (parsed from sources)
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  source_id BIGINT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  token_count INT DEFAULT 0,
  chunk_count INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_chat ON documents(chat_id);
CREATE INDEX idx_documents_source ON documents(source_id);
CREATE INDEX idx_documents_status ON documents(status);

-- Document chunks with embeddings (pgvector)
CREATE TABLE doc_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  text TEXT NOT NULL,
  token_count INT DEFAULT 0,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small/large dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chunks_document ON doc_chunks(document_id);
CREATE INDEX idx_chunks_index ON doc_chunks(document_id, chunk_index);

-- Create IVFFlat index for fast similarity search (after data is inserted)
-- Lists parameter: sqrt(row_count) is a good starting point
CREATE INDEX idx_chunks_embedding ON doc_chunks
USING ivfflat (embedding vector_l2_ops)
WITH (lists = 100);

-- Messages table
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  final_answer TEXT, -- Synthesized answer from all agents
  citations JSONB DEFAULT '[]', -- Array of citation objects
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Message parts (per-agent responses)
CREATE TABLE message_parts (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  agent_id BIGINT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]',
  token_count INT DEFAULT 0,
  latency_ms INT,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_message_parts_message ON message_parts(message_id);
CREATE INDEX idx_message_parts_agent ON message_parts(agent_id);

-- Jobs table (for background processing)
CREATE TABLE jobs (
  id BIGSERIAL PRIMARY KEY,
  kind VARCHAR(50) NOT NULL CHECK (kind IN ('ingest', 'embed', 'answer', 'parse')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload JSONB NOT NULL,
  result JSONB,
  error TEXT,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_kind ON jobs(kind);
CREATE INDEX idx_jobs_created ON jobs(created_at);

-- Auth sessions table (for passwordless auth)
CREATE TABLE auth_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_token ON auth_sessions(token);
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);

-- Magic links table (for passwordless auth)
CREATE TABLE magic_links (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_magic_links_token ON magic_links(token);
CREATE INDEX idx_magic_links_email ON magic_links(email);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
