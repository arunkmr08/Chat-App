/**
 * Base agent interface for all AI providers
 */

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AgentResponse {
  text: string
  tokens: {
    prompt: number
    completion: number
    total: number
  }
  latencyMs: number
  model: string
}

export interface AgentConfig {
  temperature?: number
  maxTokens?: number
  topP?: number
}

export abstract class AgentAdapter {
  abstract id: string
  abstract label: string
  abstract provider: string
  abstract model: string

  /**
   * Generate a response from the AI agent
   */
  abstract generate(
    messages: Message[],
    config?: AgentConfig
  ): Promise<AgentResponse>

  /**
   * Format system prompt with RAG context
   */
  protected formatSystemPrompt(context: string, basePrompt?: string): string {
    const defaultPrompt = `You are a helpful AI assistant. Answer questions based ONLY on the provided context.

IMPORTANT RULES:
1. Use ONLY information from the context below
2. If the answer is not in the context, say: "I don't have enough information in the knowledge base to answer that question. However, I can search the web for this information. Would you like me to do that?"
3. Include citations by referring to source numbers [Source 1], [Source 2], etc.
4. Be concise and accurate
5. If multiple sources say different things, acknowledge the disagreement

${context}`

    return basePrompt || defaultPrompt
  }

  /**
   * Handle API errors with retry logic
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 2
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        // Don't retry on client errors (400-499)
        if ('status' in error && typeof error.status === 'number') {
          if (error.status >= 400 && error.status < 500) {
            throw error
          }
        }

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  }
}
