import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { config } from 'dotenv'
import { query, getClient } from '../lib/db.js'
import { fetchUrlContent } from '../services/url-fetcher.js'
import { chunkText } from '../services/chunker.js'
import { IngestJobData, addEmbedJob } from '../lib/queue.js'

config()

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

/**
 * Process URL ingestion job:
 * 1. Fetch URL content
 * 2. Create document record
 * 3. Chunk the text
 * 4. Save chunks to database
 * 5. Trigger embedding job
 */
async function processIngestJob(job: Job<IngestJobData>) {
  const { sourceId, chatId, url } = job.data

  console.log(`[Ingest Worker] Processing source ${sourceId}: ${url}`)

  const client = await getClient()

  try {
    await client.query('BEGIN')

    // Update source status to 'parsing'
    await client.query(
      `UPDATE sources SET status = 'parsing', updated_at = NOW() WHERE id = $1`,
      [sourceId]
    )

    // Fetch and extract content
    const content = await fetchUrlContent(url)

    console.log(`[Ingest Worker] Fetched "${content.title}" (${content.content.length} chars)`)

    // Create document record
    const docResult = await client.query<{ id: number }>(
      `INSERT INTO documents (chat_id, source_id, title, mime_type, token_count, status, metadata)
       VALUES ($1, $2, $3, 'text/html', 0, 'processing', $4)
       RETURNING id`,
      [
        chatId,
        sourceId,
        content.title,
        JSON.stringify({
          url: content.url,
          author: content.author,
          siteName: content.siteName,
          publishedTime: content.publishedTime,
        }),
      ]
    )

    const documentId = docResult.rows[0].id

    // Chunk the text
    const chunks = chunkText(content.content, {
      maxTokens: 800,
      overlapTokens: 100,
    })

    console.log(`[Ingest Worker] Created ${chunks.length} chunks`)

    // Insert chunks
    let totalTokens = 0
    for (const chunk of chunks) {
      await client.query(
        `INSERT INTO doc_chunks (document_id, chunk_index, text, token_count, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          documentId,
          chunk.index,
          chunk.text,
          chunk.tokenCount,
          JSON.stringify({ start: chunk.start, end: chunk.end }),
        ]
      )
      totalTokens += chunk.tokenCount
    }

    // Update document with token count and chunk count
    await client.query(
      `UPDATE documents
       SET token_count = $1, chunk_count = $2, status = 'ready'
       WHERE id = $3`,
      [totalTokens, chunks.length, documentId]
    )

    // Update source status to 'embedding' (will be updated after embeddings complete)
    await client.query(
      `UPDATE sources SET status = 'embedding', updated_at = NOW() WHERE id = $1`,
      [sourceId]
    )

    await client.query('COMMIT')

    console.log(`[Ingest Worker] Document ${documentId} created with ${chunks.length} chunks`)

    // Trigger embedding job
    await addEmbedJob({ documentId, chatId })

    return { documentId, chunks: chunks.length, tokens: totalTokens }
  } catch (error) {
    await client.query('ROLLBACK')

    // Update source with error
    await client.query(
      `UPDATE sources SET status = 'error', error = $1, updated_at = NOW() WHERE id = $2`,
      [String(error), sourceId]
    )

    console.error(`[Ingest Worker] Error processing source ${sourceId}:`, error)
    throw error
  } finally {
    client.release()
  }
}

// Create and start worker
export const ingestWorker = new Worker<IngestJobData>(
  'ingest',
  processIngestJob,
  {
    connection,
    concurrency: 5, // Process 5 URLs in parallel
  }
)

ingestWorker.on('completed', (job) => {
  console.log(`[Ingest Worker] Job ${job.id} completed`)
})

ingestWorker.on('failed', (job, err) => {
  console.error(`[Ingest Worker] Job ${job?.id} failed:`, err.message)
})

console.log('✅ Ingest worker started')
