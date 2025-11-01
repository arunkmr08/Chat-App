import { FastifyInstance } from 'fastify'
import { query } from '../lib/db.js'
import { z } from 'zod'

// Request schemas
const CreateChatSchema = z.object({
  title: z.string().min(1).max(500),
  group: z.enum(['Content', 'Code', 'Generative']),
  agentIds: z.array(z.number()).min(1).max(5),
})

const AddSourcesSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10),
})

export default async function chatRoutes(fastify: FastifyInstance) {
  // Create a new chat
  fastify.post('/chats', async (request, reply) => {
    try {
      const body = CreateChatSchema.parse(request.body)

      // For now, use a default user ID (we'll add auth later)
      const userId = 1

      // Ensure user exists
      await query(
        `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [userId, 'demo@zoai.app', 'Demo User']
      )

      // Create chat
      const chatResult = await query<{ id: number; created_at: Date }>(
        `INSERT INTO chats (user_id, "group", title)
         VALUES ($1, $2, $3)
         RETURNING id, created_at`,
        [userId, body.group, body.title]
      )

      const chat = chatResult.rows[0]

      // Associate agents with chat
      for (const agentId of body.agentIds) {
        await query(
          `INSERT INTO chat_agents (chat_id, agent_id) VALUES ($1, $2)`,
          [chat.id, agentId]
        )
      }

      return reply.status(201).send({
        id: chat.id,
        title: body.title,
        group: body.group,
        created_at: chat.created_at.toISOString(),
      })
    } catch (error) {
      console.error('Error creating chat:', error)
      return reply.status(400).send({ error: String(error) })
    }
  })

  // Get all chats
  fastify.get('/chats', async (request, reply) => {
    const userId = 1 // Default user

    const result = await query<{
      id: number
      title: string
      group: string
      created_at: Date
    }>(
      `SELECT id, title, "group", created_at
       FROM chats
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )

    return reply.send({
      chats: result.rows.map((chat) => ({
        id: chat.id,
        title: chat.title,
        group: chat.group,
        created_at: chat.created_at.toISOString(),
      })),
    })
  })

  // Get chat by ID
  fastify.get('/chats/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const result = await query<{
      id: number
      title: string
      group: string
      created_at: Date
    }>(
      `SELECT id, title, "group", created_at
       FROM chats
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Chat not found' })
    }

    return reply.send(result.rows[0])
  })

  // Add sources to a chat
  fastify.post('/chats/:id/sources', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = AddSourcesSchema.parse(request.body)

      const chatId = parseInt(id, 10)

      // Verify chat exists
      const chatResult = await query(`SELECT id FROM chats WHERE id = $1`, [chatId])

      if (chatResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Chat not found' })
      }

      // Import addIngestJob here to avoid circular dependency
      const { addIngestJob } = await import('../lib/queue.js')

      const sourceIds: number[] = []

      for (const url of body.urls) {
        // Create source record
        const sourceResult = await query<{ id: number }>(
          `INSERT INTO sources (chat_id, type, url, status)
           VALUES ($1, 'url', $2, 'queued')
           RETURNING id`,
          [chatId, url]
        )

        const sourceId = sourceResult.rows[0].id
        sourceIds.push(sourceId)

        // Queue ingestion job
        await addIngestJob({ sourceId, chatId, url })
      }

      return reply.status(201).send({ source_ids: sourceIds })
    } catch (error) {
      console.error('Error adding sources:', error)
      return reply.status(400).send({ error: String(error) })
    }
  })

  // Get sources for a chat
  fastify.get('/chats/:id/sources', async (request, reply) => {
    const { id } = request.params as { id: string }

    const result = await query<{
      id: number
      type: string
      url: string | null
      file_name: string | null
      status: string
      error: string | null
      created_at: Date
    }>(
      `SELECT id, type, url, file_name, status, error, created_at
       FROM sources
       WHERE chat_id = $1
       ORDER BY created_at DESC`,
      [id]
    )

    return reply.send({
      sources: result.rows.map((source) => ({
        id: source.id,
        type: source.type,
        url: source.url,
        file_name: source.file_name,
        status: source.status,
        error: source.error,
        created_at: source.created_at.toISOString(),
      })),
    })
  })

  // Get available agents
  fastify.get('/agents', async (request, reply) => {
    const result = await query<{
      id: number
      key: string
      label: string
      provider: string
      model: string
      enabled: boolean
    }>(
      `SELECT id, key, label, provider, model, enabled
       FROM agents
       WHERE enabled = true
       ORDER BY label`
    )

    return reply.send({ agents: result.rows })
  })
}
