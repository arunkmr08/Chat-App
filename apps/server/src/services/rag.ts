import { generateEmbedding } from './embeddings.js'
import { searchSimilarChunks } from '../lib/db.js'
import { query } from '../lib/db.js'

export interface ChunkResult {
  id: number
  document_id: number
  chunk_index: number
  text: string
  similarity: number
  document_title?: string
  source_url?: string
}

export interface RAGContext {
  chunks: ChunkResult[]
  contextText: string
  citations: Citation[]
  totalTokens: number
}

export interface Citation {
  document_id: number
  document_title: string
  chunk_index: number
  text: string
  source_url?: string
  similarity: number
}

/**
 * Build RAG context from a user question
 * 1. Generate embedding for question
 * 2. Find similar chunks (vector search)
 * 3. Fetch document metadata
 * 4. Build formatted context with citations
 */
export async function buildRAGContext(
  chatId: number,
  question: string,
  topK: number = 12
): Promise<RAGContext> {
  try {
    // Generate embedding for the question
    const { embedding } = await generateEmbedding(question)

    // Find similar chunks using vector similarity search
    const similarChunks = await searchSimilarChunks(chatId, embedding, topK)

    if (similarChunks.length === 0) {
      return {
        chunks: [],
        contextText: '',
        citations: [],
        totalTokens: 0,
      }
    }

    // Fetch document metadata for all chunks
    const documentIds = [...new Set(similarChunks.map((c) => c.document_id))]

    const docsResult = await query<{
      id: number
      title: string
      source_id: number
    }>(
      `SELECT id, title, source_id FROM documents WHERE id = ANY($1)`,
      [documentIds]
    )

    const docsMap = new Map(docsResult.rows.map((d) => [d.id, d]))

    // Fetch source URLs
    const sourceIds = [...new Set(docsResult.rows.map((d) => d.source_id))]
    const sourcesResult = await query<{
      id: number
      url: string
    }>(
      `SELECT id, url FROM sources WHERE id = ANY($1)`,
      [sourceIds]
    )

    const sourcesMap = new Map(sourcesResult.rows.map((s) => [s.id, s]))

    // Enrich chunks with metadata
    const enrichedChunks: ChunkResult[] = similarChunks.map((chunk) => {
      const doc = docsMap.get(chunk.document_id)
      const source = doc ? sourcesMap.get(doc.source_id) : undefined

      return {
        ...chunk,
        document_title: doc?.title,
        source_url: source?.url,
      }
    })

    // Build context text with citations
    let contextText = 'Context from knowledge base:\n\n'
    const citations: Citation[] = []
    let totalTokens = 0

    enrichedChunks.forEach((chunk, index) => {
      const citationLabel = `[Source ${index + 1}]`
      contextText += `${citationLabel}\n${chunk.text}\n\n`

      citations.push({
        document_id: chunk.document_id,
        document_title: chunk.document_title || 'Untitled',
        chunk_index: chunk.chunk_index,
        text: chunk.text.substring(0, 200) + '...', // Preview
        source_url: chunk.source_url,
        similarity: chunk.similarity,
      })

      // Approximate token count (will be more accurate in actual use)
      totalTokens += Math.ceil(chunk.text.length / 4)
    })

    return {
      chunks: enrichedChunks,
      contextText,
      citations,
      totalTokens,
    }
  } catch (error) {
    console.error('Error building RAG context:', error)
    throw error
  }
}

/**
 * Format context for AI prompt
 */
export function formatContextForPrompt(context: RAGContext): string {
  if (context.chunks.length === 0) {
    return 'No relevant context found in the knowledge base.'
  }

  let formatted = 'CONTEXT FROM KNOWLEDGE BASE:\n\n'

  context.chunks.forEach((chunk, index) => {
    const label = `[Document ${index + 1}${chunk.document_title ? `: ${chunk.document_title}` : ''}]`
    formatted += `${label}\n${chunk.text}\n\n---\n\n`
  })

  return formatted
}

/**
 * Check if context is sufficient to answer the question
 */
export function hasRelevantContext(context: RAGContext, minSimilarity: number = 0.5): boolean {
  if (context.chunks.length === 0) return false

  // Check if at least one chunk has good similarity
  return context.chunks.some((chunk) => chunk.similarity >= minSimilarity)
}
