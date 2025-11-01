import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import { config } from 'dotenv'
import { pool, query } from './lib/db.js'
import { closeQueues } from './lib/queue.js'
import authRoutes from './routes/auth.js'
import chatRoutes from './routes/chats.js'
import messageRoutes from './routes/messages.js'
import streamRoutes from './routes/stream.js'
import fileRoutes from './routes/files.js'

// Load environment variables
config()

const PORT = parseInt(process.env.PORT || '3000', 10)
const HOST = process.env.HOST || '0.0.0.0'

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
})

// Register CORS
await server.register(cors, {
  origin: true,
  credentials: true
})

// Register cookie support
await server.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'change-this-to-a-random-secret',
  parseOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
})

// Register multipart for file uploads
await server.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
})

// Register routes
await server.register(authRoutes, { prefix: '/api' })
await server.register(chatRoutes, { prefix: '/api' })
await server.register(messageRoutes, { prefix: '/api' })
await server.register(streamRoutes, { prefix: '/api' })
await server.register(fileRoutes, { prefix: '/api' })

// Health check endpoints
const healthCheck = async (_request, reply) => {
  let dbStatus = 'unknown'

  try {
    const result = await query('SELECT NOW() as time')
    dbStatus = result.rows.length > 0 ? 'connected' : 'disconnected'
  } catch (error) {
    dbStatus = 'error'
  }

  return reply.send({
    ok: true,
    timestamp: new Date().toISOString(),
    database: dbStatus
  })
}

server.get('/health', healthCheck)
server.get('/healthz', healthCheck)

// Root endpoint
server.get('/', async (_request, reply) => {
  return reply.send({
    name: 'ZoAI Multi-Agent Chat API',
    version: '0.1.0',
    status: 'running'
  })
})

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...')
  await closeQueues()
  await pool.end()
  await server.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// Start server
const start = async () => {
  try {
    // Test database connection
    try {
      const result = await query('SELECT NOW() as time')
      console.log('✅ Database connected:', result.rows[0].time)
    } catch (error) {
      console.warn('⚠️  Database not available:', (error as Error).message)
      console.warn('   You need to start Postgres - see README.md')
    }

    // Start workers (import here to avoid running them during migration)
    try {
      await import('./workers/ingest-worker.js')
      await import('./workers/embed-worker.js')
      console.log('✅ Workers started')
    } catch (error) {
      console.warn('⚠️  Redis not available, workers not started')
      console.warn('   Background jobs will not process without Redis')
    }

    await server.listen({ port: PORT, host: HOST })
    console.log(`🚀 Server running at http://${HOST}:${PORT}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
