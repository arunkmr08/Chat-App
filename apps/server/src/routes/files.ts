import { FastifyInstance } from 'fastify'
import { query } from '../lib/db.js'
import { parseFile, isFileTypeSupported, getSupportedExtensions } from '../services/file-parser.js'
import { chunkText } from '../services/chunker.js'

/**
 * File upload routes
 */
export default async function fileRoutes(fastify: FastifyInstance) {
  /**
   * Upload a file to a chat
   * POST /api/chats/:id/files
   */
  fastify.post('/chats/:id/files', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const chatId = parseInt(id, 10)

      // Verify chat exists
      const chatResult = await query(`SELECT id FROM chats WHERE id = $1`, [chatId])

      if (chatResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Chat not found' })
      }

      // Get uploaded file
      const data = await request.file()

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' })
      }

      const fileName = data.filename
      const buffer = await data.toBuffer()

      console.log(`[File Upload] Received file: ${fileName} (${buffer.length} bytes)`)

      // Check file type
      if (!isFileTypeSupported(fileName)) {
        return reply.status(400).send({
          error: `Unsupported file type. Supported: ${getSupportedExtensions().join(', ')}`,
        })
      }

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (buffer.length > maxSize) {
        return reply.status(400).send({
          error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`,
        })
      }

      // Create source record
      const sourceResult = await query<{ id: number }>(
        `INSERT INTO sources (chat_id, type, file_name, status)
         VALUES ($1, 'file', $2, 'parsing')
         RETURNING id`,
        [chatId, fileName]
      )

      const sourceId = sourceResult.rows[0].id

      try {
        // Parse file content
        console.log(`[File Upload] Parsing file ${fileName}`)
        const parsed = await parseFile(buffer, fileName)

        if (!parsed.text || parsed.text.trim().length === 0) {
          throw new Error('No text content extracted from file')
        }

        console.log(`[File Upload] Extracted ${parsed.text.length} characters`)

        // Create document record
        const docResult = await query<{ id: number }>(
          `INSERT INTO documents (source_id, chat_id, title, url, author, published_at)
           VALUES ($1, $2, $3, NULL, $4, NOW())
           RETURNING id`,
          [sourceId, chatId, parsed.metadata.title, parsed.metadata.author || null]
        )

        const docId = docResult.rows[0].id

        // Chunk the text
        const chunks = chunkText(parsed.text, {
          maxTokens: 800,
          overlapTokens: 100,
        })

        console.log(`[File Upload] Created ${chunks.length} chunks`)

        // Save chunks
        for (let i = 0; i < chunks.length; i++) {
          await query(
            `INSERT INTO doc_chunks (document_id, chunk_index, text, token_count)
             VALUES ($1, $2, $3, $4)`,
            [docId, i, chunks[i].text, chunks[i].estimatedTokens]
          )
        }

        // Update source status to queued for embedding
        await query(
          `UPDATE sources SET status = 'embedding' WHERE id = $1`,
          [sourceId]
        )

        // Queue embedding job
        const { addEmbedJob } = await import('../lib/queue.js')
        await addEmbedJob({ sourceId, documentId: docId })

        return reply.status(201).send({
          source_id: sourceId,
          document_id: docId,
          file_name: fileName,
          chunks: chunks.length,
          status: 'embedding',
        })
      } catch (error) {
        console.error('[File Upload] Error:', error)

        // Update source with error
        await query(
          `UPDATE sources SET status = 'error', error = $1 WHERE id = $2`,
          [String(error), sourceId]
        )

        return reply.status(500).send({
          error: `Failed to process file: ${error}`,
          source_id: sourceId,
        })
      }
    } catch (error) {
      console.error('[File Upload] Error:', error)
      return reply.status(500).send({ error: String(error) })
    }
  })

  /**
   * Get supported file types
   * GET /api/files/supported-types
   */
  fastify.get('/files/supported-types', async (_request, reply) => {
    return reply.send({
      extensions: getSupportedExtensions(),
      max_size_mb: 10,
    })
  })
}
