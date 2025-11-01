import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from 'dotenv'

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

// Health check endpoint
server.get('/healthz', async (_request, reply) => {
  return reply.send({ ok: true, timestamp: new Date().toISOString() })
})

// Root endpoint
server.get('/', async (_request, reply) => {
  return reply.send({
    name: 'ZoAI Multi-Agent Chat API',
    version: '0.1.0',
    status: 'running'
  })
})

// Start server
const start = async () => {
  try {
    await server.listen({ port: PORT, host: HOST })
    console.log(`🚀 Server running at http://${HOST}:${PORT}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
