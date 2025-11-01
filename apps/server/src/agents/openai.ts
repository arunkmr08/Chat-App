import OpenAI from 'openai'
import { config } from 'dotenv'
import { AgentAdapter, AgentConfig, AgentResponse, Message } from './base.js'

config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export class OpenAIAgent extends AgentAdapter {
  id: string
  label: string
  provider = 'openai'
  model: string

  constructor(model: string = 'gpt-4o', label?: string) {
    super()
    this.model = model
    this.id = `openai:${model}`
    this.label = label || `ChatGPT (${model})`
  }

  async generate(
    messages: Message[],
    config?: AgentConfig
  ): Promise<AgentResponse> {
    const startTime = Date.now()

    const response = await this.withRetry(async () => {
      return await openai.chat.completions.create({
        model: this.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens ?? 1500,
        top_p: config?.topP ?? 1,
      })
    })

    const latencyMs = Date.now() - startTime

    const choice = response.choices[0]
    if (!choice || !choice.message.content) {
      throw new Error('No response from OpenAI')
    }

    return {
      text: choice.message.content,
      tokens: {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
      latencyMs,
      model: response.model,
    }
  }
}

// Pre-configured agents
export const gpt4oAgent = new OpenAIAgent('gpt-4o', 'ChatGPT-4o')
export const gpt4oMiniAgent = new OpenAIAgent('gpt-4o-mini', 'ChatGPT-4o-mini')
