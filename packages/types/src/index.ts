// User and Auth
export interface User {
  id: number
  email: string
  name: string
  created_at: Date
}

// Chat and Workspace
export type ChatGroup = 'Content' | 'Code' | 'Generative'

export interface Chat {
  id: number
  user_id: number
  group: ChatGroup
  title: string
  created_at: Date
}

// Agent
export interface Agent {
  id: number
  key: string
  label: string
  provider: string
  model: string
  enabled: boolean
}

// Source
export type SourceType = 'url' | 'file' | 'image'
export type SourceStatus = 'queued' | 'parsing' | 'embedding' | 'ready' | 'error'

export interface Source {
  id: number
  chat_id: number
  type: SourceType
  url?: string
  file_key?: string
  status: SourceStatus
  created_at: Date
}

// Document
export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error'

export interface Document {
  id: number
  chat_id: number
  source_id: number
  title: string
  mime?: string
  tokens: number
  status: DocumentStatus
}

// Message
export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: number
  chat_id: number
  role: MessageRole
  content: string
  final_answer?: string
  created_at: Date
}

export interface MessagePart {
  id: number
  message_id: number
  agent_id: number
  role: MessageRole
  content: string
  citations?: Citation[]
}

export interface Citation {
  document_id: number
  chunk_index: number
  text: string
  start?: number
  end?: number
}

// API DTOs
export interface HealthResponse {
  ok: boolean
  timestamp: string
}

export interface CreateChatRequest {
  title: string
  group: ChatGroup
  agent_ids: number[]
}

export interface CreateChatResponse {
  id: number
  title: string
  group: ChatGroup
  created_at: string
}

export interface AddSourcesRequest {
  urls: string[]
}

export interface AddSourcesResponse {
  source_ids: number[]
}

export interface SendMessageRequest {
  text: string
}

export interface SendMessageResponse {
  message_id: number
}
