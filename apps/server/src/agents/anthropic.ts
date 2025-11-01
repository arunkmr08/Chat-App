import Anthropic from '@anthropic-ai/sdk'
import { config } from 'dotenv'
import { AgentAdapter, AgentConfig, AgentResponse, Message } from './base.js'

config()

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export class AnthropicAgent extends AgentAdapter {
  id: string
  label: string
  provider = 'anthropic'
  model: string

  constructor(model: string = 'claude-3-5-sonnet-20241022', label?: string) {
    super()
    this.model = model
    this.id = `anthropic:${model}`
    this.label = label || `Claude (${model})`
  }

  async generate(
    messages: Message[],
    config?: AgentConfig
  ): Promise<AgentResponse> {
    const startTime = Date.now()

    // Claude requires system message separate from messages array
    const systemMessage = messages.find((m) => m.role === 'system')
    const userMessages = messages.filter((m) => m.role !== 'system')

    const response = await this.withRetry(async () => {
      return await anthropic.messages.create({
        model: this.model,
        max_tokens: config?.maxTokens ?? 1500,
        temperature: config?.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: userMessages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      })
    })

    const latencyMs = Date.now() - startTime

    const textBlock = response.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    return {
      text: textBlock.text,
      tokens: {
        prompt: response.usage.input_tokens,
        completion: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      },
      latencyMs,
      model: response.model,
    }
  }
}

// Pre-configured agents
export const claude35SonnetAgent = new AnthropicAgent(
  'claude-3-5-sonnet-20241022',
  'Claude 3.5 Sonnet'
)
