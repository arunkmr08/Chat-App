import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { config } from 'dotenv'
import { query, getClient } from '../lib/db.js'
import { generateEmbeddingsBatch } from '../services/embeddings.js'
import { EmbedJobData } from '../lib/queue.js'

config()

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

/**
 * Process embedding generation job:
 * 1. Fetch all chunks for document
 * 2. Generate embeddings in batches
 * 3. Update chunks with embeddings
 * 4. Update source status to 'ready'
 */
async function processEmbedJob(job: Job<EmbedJobData>) {
  const { documentId, chatId } = job.data

  console.log(`[Embed Worker] Generating embeddings for document ${documentId}`)

  const client = await getClient()

  try {
    // Fetch all chunks for this document
    const chunksResult = await client.query<{
      id: number
      text: string
      chunk_index: number
    }>(
      `SELECT id, text, chunk_index
       FROM doc_chunks
       WHERE document_id = $1
       ORDER BY chunk_index`,
      [documentId]
    )

    const chunks = chunksResult.rows

    if (chunks.length === 0) {
      console.log(`[Embed Worker] No chunks found for document ${documentId}`)
      return
    }

    console.log(`[Embed Worker] Processing ${chunks.length} chunks`)

    // Generate embeddings in batch
    const texts = chunks.map((c) => c.text)
    const embeddings = await generateEmbeddingsBatch(texts)

    console.log(`[Embed Worker] Generated ${embeddings.length} embeddings`)

    // Update chunks with embeddings
    await client.query('BEGIN')

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = embeddings[i]

      await client.query(
        `UPDATE doc_chunks
         SET embedding = $1::vector
         WHERE id = $2`,
        [JSON.stringify(embedding.embedding), chunk.id]
      )
    }

    // Get source_id from document
    const docResult = await client.query<{ source_id: number }>(
      `SELECT source_id FROM documents WHERE id = $1`,
      [documentId]
    )

    if (docResult.rows.length > 0) {
      const sourceId = docResult.rows[0].source_id

      // Update source status to 'ready'
      await client.query(
        `UPDATE sources SET status = 'ready', updated_at = NOW() WHERE id = $1`,
        [sourceId]
      )

      console.log(`[Embed Worker] Source ${sourceId} is now ready`)
    }

    await client.query('COMMIT')

    return { documentId, chunks: chunks.length }
  } catch (error) {
    await client.query('ROLLBACK')

    console.error(`[Embed Worker] Error processing document ${documentId}:`, error)
    throw error
  } finally {
    client.release()
  }
}

// Create and start worker
export const embedWorker = new Worker<EmbedJobData>(
  'embed',
  processEmbedJob,
  {
    connection,
    concurrency: 3, // Process 3 documents in parallel
  }
)

embedWorker.on('completed', (job) => {
  console.log(`[Embed Worker] Job ${job.id} completed`)
})

embedWorker.on('failed', (job, err) => {
  console.error(`[Embed Worker] Job ${job?.id} failed:`, err.message)
})

console.log('✅ Embed worker started')
