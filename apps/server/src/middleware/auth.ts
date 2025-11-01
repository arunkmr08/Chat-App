import { FastifyRequest, FastifyReply } from 'fastify'
import { validateSession, User } from '../lib/auth.js'

/**
 * Authentication Middleware
 */

// Extend Fastify request to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: User
  }
}

/**
 * Extract session token from request
 */
function extractToken(request: FastifyRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check cookie
  const token = request.cookies?.session_token
  if (token) {
    return token
  }

  return null
}

/**
 * Require authentication - reject if not authenticated
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractToken(request)

  if (!token) {
    reply.status(401).send({ error: 'Authentication required' })
    return
  }

  const user = await validateSession(token)

  if (!user) {
    reply.status(401).send({ error: 'Invalid or expired session' })
    return
  }

  // Attach user to request
  request.user = user
}

/**
 * Optional authentication - attach user if authenticated, but don't reject
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const token = extractToken(request)

  if (!token) {
    return
  }

  const user = await validateSession(token)

  if (user) {
    request.user = user
  }
}
