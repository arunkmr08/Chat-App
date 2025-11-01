import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  createMagicLink,
  verifyMagicLink,
  getOrCreateUser,
  createSession,
  deleteSession,
  deleteAllUserSessions,
  cleanupExpired,
} from '../lib/auth.js'
import { sendMagicLink, sendWelcomeEmail } from '../services/email.js'
import { requireAuth } from '../middleware/auth.js'

// Request schemas
const SendMagicLinkSchema = z.object({
  email: z.string().email().toLowerCase(),
})

const VerifyTokenSchema = z.object({
  token: z.string().min(1),
})

/**
 * Authentication routes
 */
export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * Send magic link for passwordless login
   * POST /auth/send-magic-link
   */
  fastify.post('/auth/send-magic-link', async (request, reply) => {
    try {
      const body = SendMagicLinkSchema.parse(request.body)

      // Create magic link
      const token = await createMagicLink(body.email)

      // Send email
      await sendMagicLink(body.email, token)

      return reply.send({
        success: true,
        message: 'Magic link sent to your email',
      })
    } catch (error) {
      console.error('[Auth] Send magic link error:', error)

      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid email address' })
      }

      return reply.status(500).send({ error: 'Failed to send magic link' })
    }
  })

  /**
   * Verify magic link token and create session
   * POST /auth/verify
   */
  fastify.post('/auth/verify', async (request, reply) => {
    try {
      const body = VerifyTokenSchema.parse(request.body)

      // Verify magic link
      const email = await verifyMagicLink(body.token)

      if (!email) {
        return reply.status(400).send({
          error: 'Invalid or expired magic link',
        })
      }

      // Get or create user
      const user = await getOrCreateUser(email)

      // Check if this is a new user
      const isNewUser = new Date().getTime() - user.created_at.getTime() < 1000

      // Create session
      const sessionToken = await createSession(user.id)

      // Send welcome email for new users
      if (isNewUser) {
        await sendWelcomeEmail(user.email, user.name || user.email).catch((err) =>
          console.error('Failed to send welcome email:', err)
        )
      }

      // Set cookie
      reply.setCookie('session_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      })

      return reply.send({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        session_token: sessionToken,
      })
    } catch (error) {
      console.error('[Auth] Verify token error:', error)

      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid token' })
      }

      return reply.status(500).send({ error: 'Failed to verify token' })
    }
  })

  /**
   * Get current user
   * GET /auth/me
   */
  fastify.get(
    '/auth/me',
    {
      onRequest: requireAuth,
    },
    async (request, reply) => {
      return reply.send({
        user: {
          id: request.user!.id,
          email: request.user!.email,
          name: request.user!.name,
        },
      })
    }
  )

  /**
   * Logout (delete current session)
   * POST /auth/logout
   */
  fastify.post(
    '/auth/logout',
    {
      onRequest: requireAuth,
    },
    async (request, reply) => {
      const token = request.cookies?.session_token

      if (token) {
        await deleteSession(token)
      }

      reply.clearCookie('session_token')

      return reply.send({
        success: true,
        message: 'Logged out successfully',
      })
    }
  )

  /**
   * Logout from all devices (delete all sessions)
   * POST /auth/logout-all
   */
  fastify.post(
    '/auth/logout-all',
    {
      onRequest: requireAuth,
    },
    async (request, reply) => {
      await deleteAllUserSessions(request.user!.id)

      reply.clearCookie('session_token')

      return reply.send({
        success: true,
        message: 'Logged out from all devices',
      })
    }
  )

  // Clean up expired sessions and magic links periodically
  setInterval(
    async () => {
      try {
        await cleanupExpired()
      } catch (error) {
        console.error('[Auth] Cleanup error:', error)
      }
    },
    60 * 60 * 1000
  ) // Every hour
}
