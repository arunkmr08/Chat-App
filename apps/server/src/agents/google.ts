import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { AgentAdapter, AgentConfig, AgentResponse, Message } from './base.js'

config()

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

export class GoogleAgent extends AgentAdapter {
  id: string
  label: string
  provider = 'google'
  model: string

  constructor(model: string = 'gemini-1.5-pro', label?: string) {
    super()
    this.model = model
    this.id = `google:${model}`
    this.label = label || `Gemini (${model})`
  }

  async generate(
    messages: Message[],
    config?: AgentConfig
  ): Promise<AgentResponse> {
    const startTime = Date.now()

    const model = genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: config?.temperature ?? 0.7,
        maxOutputTokens: config?.maxTokens ?? 1500,
        topP: config?.topP ?? 1,
      },
    })

    // Convert messages to Gemini format
    // System message goes into the first user message as context
    const systemMessage = messages.find((m) => m.role === 'system')
    const conversationMessages = messages.filter((m) => m.role !== 'system')

    const geminiMessages = conversationMessages.map((m, index) => {
      let content = m.content

      // Prepend system message to first user message
      if (index === 0 && m.role === 'user' && systemMessage) {
        content = `${systemMessage.content}\n\n---\n\nUser Question: ${m.content}`
      }

      return {
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: content }],
      }
    })

    const response = await this.withRetry(async () => {
      const chat = model.startChat({
        history: geminiMessages.slice(0, -1),
      })

      const lastMessage = geminiMessages[geminiMessages.length - 1]
      const result = await chat.sendMessage(lastMessage.parts[0].text)

      return result
    })

    const latencyMs = Date.now() - startTime

    const text = response.response.text()
    if (!text) {
      throw new Error('No response from Gemini')
    }

    // Gemini doesn't provide token counts in the same way
    // Estimate based on text length
    const estimatedPromptTokens = Math.ceil(
      messages.reduce((sum, m) => sum + m.content.length, 0) / 4
    )
    const estimatedCompletionTokens = Math.ceil(text.length / 4)

    return {
      text,
      tokens: {
        prompt: estimatedPromptTokens,
        completion: estimatedCompletionTokens,
        total: estimatedPromptTokens + estimatedCompletionTokens,
      },
      latencyMs,
      model: this.model,
    }
  }
}

// Pre-configured agents
export const geminiProAgent = new GoogleAgent('gemini-1.5-pro', 'Gemini Pro')
export const geminiFlashAgent = new GoogleAgent('gemini-1.5-flash', 'Gemini Flash')
