import pg from 'pg'
import { config } from 'dotenv'

config()

const { Pool } = pg

// Database connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected')
})

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err)
  process.exit(-1)
})

// Query helper with logging
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now()
  try {
    const res = await pool.query<T>(text, params)
    const duration = Date.now() - start

    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount })
    }

    return res
  } catch (error) {
    console.error('Database query error:', { text, error })
    throw error
  }
}

// Get a client from the pool (for transactions)
export async function getClient() {
  const client = await pool.connect()
  return client
}

// Similarity search helper
export async function searchSimilarChunks(
  chatId: number,
  queryEmbedding: number[],
  limit: number = 20
) {
  const result = await query<{
    id: number
    document_id: number
    chunk_index: number
    text: string
    similarity: number
  }>(
    `SELECT
      c.id,
      c.document_id,
      c.chunk_index,
      c.text,
      1 - (c.embedding <=> $1::vector) AS similarity
    FROM doc_chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE d.chat_id = $2
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <-> $1::vector
    LIMIT $3`,
    [JSON.stringify(queryEmbedding), chatId, limit]
  )

  return result.rows
}

export default { pool, query, getClient, searchSimilarChunks }
