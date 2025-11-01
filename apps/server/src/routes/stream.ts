import { FastifyInstance } from 'fastify'
import { query } from '../lib/db.js'
import { z } from 'zod'
import { getAgentsByIds } from '../agents/index.js'
import { buildRAGContext, formatContextForPrompt, hasRelevantContext } from '../services/rag.js'
import type { Message } from '../agents/index.js'

// Request schemas
const SendStreamMessageSchema = z.object({
  text: z.string().min(1).max(5000),
})

/**
 * Server-Sent Events (SSE) streaming endpoint for real-time AI responses
 */
export default async function streamRoutes(fastify: FastifyInstance) {
  /**
   * Stream a message response with real-time updates
   * POST /api/chats/:id/messages/stream
   */
  fastify.post('/chats/:id/messages/stream', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = SendStreamMessageSchema.parse(request.body)
      const chatId = parseInt(id, 10)

      console.log(`[Stream API] Received streaming request for chat ${chatId}`)

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      })

      // Helper to send SSE event
      const sendEvent = (event: string, data: any) => {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      }

      // Verify chat exists
      const chatResult = await query<{ id: number; user_id: number }>(
        'SELECT id, user_id FROM chats WHERE id = $1',
        [chatId]
      )

      if (chatResult.rows.length === 0) {
        sendEvent('error', { error: 'Chat not found' })
        reply.raw.end()
        return reply
      }

      // Get agents for this chat
      const agentResult = await query<{ agent_id: number }>(
        'SELECT agent_id FROM chat_agents WHERE chat_id = $1',
        [chatId]
      )

      if (agentResult.rows.length === 0) {
        sendEvent('error', { error: 'No agents configured for this chat' })
        reply.raw.end()
        return reply
      }

      const agentIds = agentResult.rows.map((r) => r.agent_id)
      const agents = await getAgentsByIds(agentIds)

      if (agents.length === 0) {
        sendEvent('error', { error: 'No valid agents found' })
        reply.raw.end()
        return reply
      }

      // Save user message
      const userMessageResult = await query<{ id: number }>(
        `INSERT INTO messages (chat_id, role, content)
         VALUES ($1, 'user', $2)
         RETURNING id`,
        [chatId, body.text]
      )

      const userMessageId = userMessageResult.rows[0].id

      sendEvent('user_message', {
        message_id: userMessageId,
        content: body.text,
      })

      // Step 1: Build RAG context
      sendEvent('status', { step: 'building_context', message: 'Building context from knowledge base...' })

      const ragContext = await buildRAGContext(chatId, body.text, 12)

      // Check if we have relevant context
      if (!hasRelevantContext(ragContext, 0.3)) {
        sendEvent('status', { step: 'no_context', message: 'No relevant context found' })

        const noContextAnswer = "I don't have enough information in the knowledge base to answer that question."

        const assistantMessageResult = await query<{ id: number }>(
          `INSERT INTO messages (chat_id, role, content, final_answer)
           VALUES ($1, 'assistant', $2, $2)
           RETURNING id`,
          [chatId, noContextAnswer]
        )

        sendEvent('answer', {
          message_id: assistantMessageResult.rows[0].id,
          content: noContextAnswer,
          citations: [],
        })

        sendEvent('complete', { total_tokens: 0, total_latency_ms: 0 })
        reply.raw.end()
        return reply
      }

      sendEvent('status', {
        step: 'context_ready',
        message: `Found ${ragContext.chunks.length} relevant chunks`,
        chunks: ragContext.chunks.length,
      })

      // Step 2: Format context for agents
      const contextText = formatContextForPrompt(ragContext)

      const systemPrompt = `You are a helpful AI assistant. Answer the user's question based ONLY on the provided context.

IMPORTANT RULES:
1. Use ONLY information from the context below
2. If the answer is not in the context, say: "I don't have enough information to answer that question."
3. Include citations by referring to [Document 1], [Document 2], etc.
4. Be concise and accurate
5. If sources disagree, acknowledge the disagreement

${contextText}`

      const messages: Message[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: body.text },
      ]

      // Step 3: Run agents in parallel with progress updates
      sendEvent('status', { step: 'running_agents', message: `Running ${agents.length} AI agents...` })

      const agentPromises = agents.map(async (agent) => {
        try {
          sendEvent('agent_start', { agent: agent.label })

          const response = await agent.generate(messages, {
            temperature: 0.7,
            maxTokens: 1500,
          })

          sendEvent('agent_complete', {
            agent: agent.label,
            tokens: response.tokens.total,
            latency_ms: response.latencyMs,
          })

          return {
            agentId: agent.id,
            agentLabel: agent.label,
            success: true,
            response,
          }
        } catch (error) {
          sendEvent('agent_error', {
            agent: agent.label,
            error: String(error),
          })

          return {
            agentId: agent.id,
            agentLabel: agent.label,
            success: false,
            error: String(error),
          }
        }
      })

      const agentResults = await Promise.all(agentPromises)
      const successfulResults = agentResults.filter((r) => r.success && r.response)

      // Step 4: Synthesize answers
      sendEvent('status', { step: 'synthesizing', message: 'Synthesizing best answer...' })

      let synthesizedAnswer: string

      if (successfulResults.length === 0) {
        synthesizedAnswer = 'All AI agents failed to respond. Please try again later.'
      } else if (successfulResults.length === 1) {
        synthesizedAnswer = successfulResults[0].response!.text
      } else {
        // Import synthesis logic from orchestrator
        const { gpt4oAgent } = await import('../agents/openai.js')

        const agentAnswers = successfulResults
          .map((r) => `### ${r.agentLabel} Response:\n${r.response!.text}\n`)
          .join('\n')

        const synthesisPrompt = `You are a synthesis agent. You have received ${successfulResults.length} different AI responses to the same question. Your job is to:

1. Compare all responses
2. Identify common themes and agreements
3. Note any disagreements or contradictions
4. Produce ONE unified, accurate answer that:
   - Combines the best parts of each response
   - Resolves contradictions if possible
   - Maintains all relevant citations
   - Is clear and well-structured

Original Question: ${body.text}

${agentAnswers}

Now provide a single, synthesized answer that represents the best combined response. Include citations from the original documents.`

        try {
          const synthesisResponse = await gpt4oAgent.generate(
            [
              {
                role: 'system',
                content: 'You are an expert at synthesizing multiple AI responses into one coherent answer.',
              },
              { role: 'user', content: synthesisPrompt },
            ],
            {
              temperature: 0.5,
              maxTokens: 2000,
            }
          )

          synthesizedAnswer = synthesisResponse.text
        } catch (error) {
          console.error('[Stream] Synthesis failed:', error)
          synthesizedAnswer = successfulResults[0].response!.text
        }
      }

      // Save assistant message
      const assistantMessageResult = await query<{ id: number }>(
        `INSERT INTO messages (chat_id, role, content, final_answer, citations)
         VALUES ($1, 'assistant', $2, $3, $4)
         RETURNING id`,
        [chatId, synthesizedAnswer, synthesizedAnswer, JSON.stringify(ragContext.citations)]
      )

      const assistantMessageId = assistantMessageResult.rows[0].id

      // Save individual agent responses
      for (const agentResult of agentResults) {
        if (agentResult.success && agentResult.response) {
          const agentDbResult = await query<{ id: number }>(
            'SELECT id FROM agents WHERE key = $1',
            [agentResult.agentId.replace(':', '-')]
          )

          if (agentDbResult.rows.length > 0) {
            await query(
              `INSERT INTO message_parts
               (message_id, agent_id, role, content, token_count, latency_ms)
               VALUES ($1, $2, 'assistant', $3, $4, $5)`,
              [
                assistantMessageId,
                agentDbResult.rows[0].id,
                agentResult.response.text,
                agentResult.response.tokens.total,
                agentResult.response.latencyMs,
              ]
            )
          }
        }
      }

      // Send final answer
      sendEvent('answer', {
        message_id: assistantMessageId,
        content: synthesizedAnswer,
        citations: ragContext.citations,
      })

      // Calculate totals
      const totalTokens = successfulResults.reduce((sum, r) => sum + (r.response?.tokens.total || 0), 0)

      sendEvent('complete', {
        total_tokens: totalTokens,
        agent_results: agentResults.map((r) => ({
          agent: r.agentLabel,
          success: r.success,
          latency_ms: r.response?.latencyMs,
          tokens: r.response?.tokens.total,
        })),
      })

      reply.raw.end()
      return reply
    } catch (error) {
      console.error('[Stream API] Error:', error)
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`)
      reply.raw.end()
      return reply
    }
  })
}
