/**
 * Text chunking service for splitting documents into manageable pieces
 * with overlap for better context preservation
 */

export interface ChunkOptions {
  maxTokens?: number // Max tokens per chunk (approximate)
  overlapTokens?: number // Token overlap between chunks
  minChunkSize?: number // Minimum characters per chunk
}

export interface Chunk {
  text: string
  index: number
  tokenCount: number
  start: number
  end: number
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxTokens: 800,
  overlapTokens: 100,
  minChunkSize: 100,
}

/**
 * Approximate token count (rough estimation: 1 token ≈ 4 characters)
 * For production, use tiktoken for accurate counting
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Split text into sentences (simple approach)
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries, keeping the delimiter
  return text
    .split(/([.!?]+\s+)/)
    .reduce((acc: string[], curr, i, arr) => {
      if (i % 2 === 0 && curr.trim()) {
        const sentence = curr + (arr[i + 1] || '')
        acc.push(sentence.trim())
      }
      return acc
    }, [])
    .filter((s) => s.length > 0)
}

/**
 * Chunk text with overlap for better context
 */
export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Clean up text
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!cleanText || cleanText.length < opts.minChunkSize) {
    return [
      {
        text: cleanText,
        index: 0,
        tokenCount: estimateTokens(cleanText),
        start: 0,
        end: cleanText.length,
      },
    ]
  }

  const sentences = splitIntoSentences(cleanText)
  const chunks: Chunk[] = []

  let currentChunk: string[] = []
  let currentTokens = 0
  let charPosition = 0

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    const sentenceTokens = estimateTokens(sentence)

    // If adding this sentence exceeds max, save current chunk
    if (currentTokens + sentenceTokens > opts.maxTokens && currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ')
      const startPos = charPosition - chunkText.length

      chunks.push({
        text: chunkText,
        index: chunks.length,
        tokenCount: currentTokens,
        start: startPos,
        end: charPosition,
      })

      // Keep overlap sentences for next chunk
      const overlapSentences: string[] = []
      let overlapTokens = 0

      // Go backwards to collect overlap
      for (let j = currentChunk.length - 1; j >= 0; j--) {
        const s = currentChunk[j]
        const tokens = estimateTokens(s)

        if (overlapTokens + tokens <= opts.overlapTokens) {
          overlapSentences.unshift(s)
          overlapTokens += tokens
        } else {
          break
        }
      }

      currentChunk = overlapSentences
      currentTokens = overlapTokens
    }

    // Add sentence to current chunk
    currentChunk.push(sentence)
    currentTokens += sentenceTokens
    charPosition += sentence.length + 1
  }

  // Add remaining chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ')
    const startPos = charPosition - chunkText.length

    chunks.push({
      text: chunkText,
      index: chunks.length,
      tokenCount: currentTokens,
      start: Math.max(0, startPos),
      end: charPosition,
    })
  }

  return chunks
}

/**
 * Chunk text by character count (simpler, for short texts)
 */
export function chunkTextSimple(
  text: string,
  maxChars: number = 3000,
  overlap: number = 300
): Chunk[] {
  const chunks: Chunk[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length)
    const chunkText = text.slice(start, end)

    chunks.push({
      text: chunkText,
      index: chunks.length,
      tokenCount: estimateTokens(chunkText),
      start,
      end,
    })

    // Move start position with overlap
    start = end - overlap

    // Prevent infinite loop
    if (start >= text.length - overlap) break
  }

  return chunks
}
