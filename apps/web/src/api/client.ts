const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface CreateChatRequest {
  title: string
  group: 'Content' | 'Code' | 'Generative'
  agentIds: number[]
}

interface Chat {
  id: number
  title: string
  group: string
  created_at: string
}

interface Agent {
  id: number
  key: string
  label: string
  provider: string
  model: string
  enabled: boolean
}

interface Source {
  id: number
  type: string
  url: string | null
  file_name: string | null
  status: 'queued' | 'parsing' | 'embedding' | 'ready' | 'error'
  error: string | null
  created_at: string
}

interface Message {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  final_answer?: string
  citations?: any[]
  created_at: string
}

interface SendMessageResponse {
  message_id: number
  user_message_id: number
  answer: string
  citations: any[]
  agent_results: Array<{
    agent: string
    success: boolean
    latency_ms?: number
    tokens?: number
  }>
  total_tokens: number
  total_latency_ms: number
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Chats
  async getChats(): Promise<{ chats: Chat[] }> {
    return this.fetch('/chats')
  }

  async getChat(id: number): Promise<Chat> {
    return this.fetch(`/chats/${id}`)
  }

  async createChat(data: CreateChatRequest): Promise<Chat> {
    return this.fetch('/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Agents
  async getAgents(): Promise<{ agents: Agent[] }> {
    return this.fetch('/agents')
  }

  // Sources
  async addSources(chatId: number, urls: string[]): Promise<{ source_ids: number[] }> {
    return this.fetch(`/chats/${chatId}/sources`, {
      method: 'POST',
      body: JSON.stringify({ urls }),
    })
  }

  async getSources(chatId: number): Promise<{ sources: Source[] }> {
    return this.fetch(`/chats/${chatId}/sources`)
  }

  // Messages
  async sendMessage(chatId: number, text: string): Promise<SendMessageResponse> {
    return this.fetch(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  }

  async getMessages(chatId: number): Promise<{ messages: Message[] }> {
    return this.fetch(`/chats/${chatId}/messages`)
  }

  async getMessage(messageId: number): Promise<Message & { agent_responses: any[] }> {
    return this.fetch(`/messages/${messageId}`)
  }
}

export const api = new ApiClient()

export type {
  Chat,
  Agent,
  Source,
  Message,
  SendMessageResponse,
  CreateChatRequest,
}
