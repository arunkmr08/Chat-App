import { FastifyInstance } from 'fastify'
import { query } from '../lib/db.js'
import { z } from 'zod'
import { getAgentsByIds } from '../agents/index.js'
import { orchestrator } from '../services/orchestrator.js'

// Request schemas
const SendMessageSchema = z.object({
  text: z.string().min(1).max(5000),
})

export default async function messageRoutes(fastify: FastifyInstance) {
  /**
   * Send a message and get AI response
   * POST /api/chats/:id/messages
   */
  fastify.post('/chats/:id/messages', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = SendMessageSchema.parse(request.body)
      const chatId = parseInt(id, 10)

      console.log(`[Messages API] Received message for chat ${chatId}:`, body.text.substring(0, 100))

      // Verify chat exists
      const chatResult = await query<{ id: number; user_id: number }>(
        'SELECT id, user_id FROM chats WHERE id = $1',
        [chatId]
      )

      if (chatResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Chat not found' })
      }

      // Get agents for this chat
      const agentResult = await query<{ agent_id: number }>(
        'SELECT agent_id FROM chat_agents WHERE chat_id = $1',
        [chatId]
      )

      if (agentResult.rows.length === 0) {
        return reply.status(400).send({ error: 'No agents configured for this chat' })
      }

      const agentIds = agentResult.rows.map((r) => r.agent_id)
      const agents = await getAgentsByIds(agentIds)

      if (agents.length === 0) {
        return reply.status(400).send({ error: 'No valid agents found' })
      }

      console.log(`[Messages API] Using ${agents.length} agents:`, agents.map(a => a.label))

      // Save user message
      const userMessageResult = await query<{ id: number }>(
        `INSERT INTO messages (chat_id, role, content)
         VALUES ($1, 'user', $2)
         RETURNING id`,
        [chatId, body.text]
      )

      const userMessageId = userMessageResult.rows[0].id

      // Run multi-agent orchestrator
      const result = await orchestrator.orchestrate(chatId, body.text, agents)

      console.log(`[Messages API] Orchestrator complete:`, {
        successfulAgents: result.agentResults.filter(r => r.success).length,
        totalTokens: result.totalTokens,
        latencyMs: result.totalLatencyMs,
      })

      // Save assistant message with synthesized answer
      const assistantMessageResult = await query<{ id: number; created_at: Date }>(
        `INSERT INTO messages (chat_id, role, content, final_answer, citations)
         VALUES ($1, 'assistant', $2, $3, $4)
         RETURNING id, created_at`,
        [
          chatId,
          result.synthesizedAnswer,
          result.synthesizedAnswer,
          JSON.stringify(result.citations),
        ]
      )

      const assistantMessageId = assistantMessageResult.rows[0].id

      // Save individual agent responses as message_parts
      for (const agentResult of result.agentResults) {
        if (agentResult.success && agentResult.response) {
          // Get agent_id from database
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

      // Return response
      return reply.status(201).send({
        message_id: assistantMessageId,
        user_message_id: userMessageId,
        answer: result.synthesizedAnswer,
        citations: result.citations,
        agent_results: result.agentResults.map((r) => ({
          agent: r.agentLabel,
          success: r.success,
          latency_ms: r.response?.latencyMs,
          tokens: r.response?.tokens.total,
        })),
        total_tokens: result.totalTokens,
        total_latency_ms: result.totalLatencyMs,
      })
    } catch (error) {
      console.error('[Messages API] Error:', error)
      return reply.status(500).send({ error: String(error) })
    }
  })

  /**
   * Get messages for a chat
   * GET /api/chats/:id/messages
   */
  fastify.get('/chats/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string }
    const chatId = parseInt(id, 10)

    const result = await query<{
      id: number
      role: string
      content: string
      final_answer: string | null
      citations: any
      created_at: Date
    }>(
      `SELECT id, role, content, final_answer, citations, created_at
       FROM messages
       WHERE chat_id = $1
       ORDER BY created_at ASC`,
      [chatId]
    )

    return reply.send({
      messages: result.rows.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        final_answer: msg.final_answer,
        citations: msg.citations,
        created_at: msg.created_at.toISOString(),
      })),
    })
  })

  /**
   * Get a single message with all agent responses
   * GET /api/messages/:id
   */
  fastify.get('/messages/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    // Get message
    const messageResult = await query<{
      id: number
      chat_id: number
      role: string
      content: string
      final_answer: string | null
      citations: any
      created_at: Date
    }>(
      'SELECT * FROM messages WHERE id = $1',
      [id]
    )

    if (messageResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Message not found' })
    }

    const message = messageResult.rows[0]

    // Get agent responses
    const partsResult = await query<{
      id: number
      agent_id: number
      content: string
      token_count: number
      latency_ms: number
      created_at: Date
    }>(
      `SELECT mp.*, a.label as agent_label
       FROM message_parts mp
       JOIN agents a ON a.id = mp.agent_id
       WHERE mp.message_id = $1`,
      [id]
    )

    return reply.send({
      ...message,
      created_at: message.created_at.toISOString(),
      agent_responses: partsResult.rows,
    })
  })
}
