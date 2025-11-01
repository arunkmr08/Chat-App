import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { config } from 'dotenv'

config()

// Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

// Job types
export type JobType = 'ingest' | 'embed' | 'answer'

export interface IngestJobData {
  sourceId: number
  chatId: number
  url: string
}

export interface EmbedJobData {
  documentId: number
  chatId: number
}

export interface AnswerJobData {
  messageId: number
  chatId: number
  agentIds: number[]
}

// Create queues
export const ingestQueue = new Queue<IngestJobData>('ingest', { connection })
export const embedQueue = new Queue<EmbedJobData>('embed', { connection })
export const answerQueue = new Queue<AnswerJobData>('answer', { connection })

// Queue event handlers
ingestQueue.on('error', (err) => {
  console.error('Ingest queue error:', err)
})

embedQueue.on('error', (err) => {
  console.error('Embed queue error:', err)
})

answerQueue.on('error', (err) => {
  console.error('Answer queue error:', err)
})

// Helper functions
export async function addIngestJob(data: IngestJobData) {
  return await ingestQueue.add('ingest-url', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  })
}

export async function addEmbedJob(data: EmbedJobData) {
  return await embedQueue.add('generate-embeddings', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  })
}

export async function addAnswerJob(data: AnswerJobData) {
  return await answerQueue.add('generate-answer', data, {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    timeout: 60000, // 1 minute timeout for AI responses
  })
}

// Get queue stats
export async function getQueueStats() {
  const [ingestCounts, embedCounts, answerCounts] = await Promise.all([
    ingestQueue.getJobCounts(),
    embedQueue.getJobCounts(),
    answerQueue.getJobCounts(),
  ])

  return {
    ingest: ingestCounts,
    embed: embedCounts,
    answer: answerCounts,
  }
}

// Graceful shutdown
export async function closeQueues() {
  await Promise.all([
    ingestQueue.close(),
    embedQueue.close(),
    answerQueue.close(),
    connection.quit(),
  ])
}
