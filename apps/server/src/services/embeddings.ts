import OpenAI from 'openai'
import { config } from 'dotenv'

config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface EmbeddingResult {
  embedding: number[]
  tokens: number
}

/**
 * Generate embedding for a single text using OpenAI
 * Model: text-embedding-3-small (1536 dimensions, cheaper)
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    })

    return {
      embedding: response.data[0].embedding,
      tokens: response.usage.total_tokens,
    }
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return []

  try {
    // OpenAI allows up to 2048 inputs in one call
    const batchSize = 2048
    const results: EmbeddingResult[] = []

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
        encoding_format: 'float',
      })

      const batchResults = response.data.map((item) => ({
        embedding: item.embedding,
        tokens: response.usage.total_tokens / batch.length, // Approximate per-text
      }))

      results.push(...batchResults)
    }

    return results
  } catch (error) {
    console.error('Error generating batch embeddings:', error)
    throw error
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
