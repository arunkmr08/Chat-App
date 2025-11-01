import crypto from 'crypto'
import { query } from './db.js'

/**
 * Authentication Service
 * Handles user authentication, magic links, and sessions
 */

export interface User {
  id: number
  email: string
  name: string | null
  created_at: Date
}

export interface Session {
  id: number
  user_id: number
  token: string
  expires_at: Date
}

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Create or get user by email
 */
export async function getOrCreateUser(email: string, name?: string): Promise<User> {
  // Check if user exists
  const existing = await query<User>(
    'SELECT id, email, name, created_at FROM users WHERE email = $1',
    [email]
  )

  if (existing.rows.length > 0) {
    return existing.rows[0]
  }

  // Create new user
  const result = await query<User>(
    `INSERT INTO users (email, name) VALUES ($1, $2)
     RETURNING id, email, name, created_at`,
    [email, name || null]
  )

  return result.rows[0]
}

/**
 * Create a magic link for passwordless authentication
 */
export async function createMagicLink(email: string): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  await query(
    `INSERT INTO magic_links (email, token, expires_at)
     VALUES ($1, $2, $3)`,
    [email, token, expiresAt]
  )

  return token
}

/**
 * Verify a magic link token
 */
export async function verifyMagicLink(token: string): Promise<string | null> {
  const result = await query<{ email: string; expires_at: Date; used: boolean }>(
    `SELECT email, expires_at, used
     FROM magic_links
     WHERE token = $1`,
    [token]
  )

  if (result.rows.length === 0) {
    return null
  }

  const link = result.rows[0]

  // Check if already used
  if (link.used) {
    return null
  }

  // Check if expired
  if (new Date() > link.expires_at) {
    return null
  }

  // Mark as used
  await query(
    'UPDATE magic_links SET used = true WHERE token = $1',
    [token]
  )

  return link.email
}

/**
 * Create a session for a user
 */
export async function createSession(userId: number): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await query(
    `INSERT INTO auth_sessions (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  )

  return token
}

/**
 * Validate a session token and return user
 */
export async function validateSession(token: string): Promise<User | null> {
  const result = await query<{
    user_id: number
    expires_at: Date
    email: string
    name: string | null
    created_at: Date
  }>(
    `SELECT s.user_id, s.expires_at, u.email, u.name, u.created_at
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1`,
    [token]
  )

  if (result.rows.length === 0) {
    return null
  }

  const session = result.rows[0]

  // Check if expired
  if (new Date() > session.expires_at) {
    // Delete expired session
    await query('DELETE FROM auth_sessions WHERE token = $1', [token])
    return null
  }

  return {
    id: session.user_id,
    email: session.email,
    name: session.name,
    created_at: session.created_at,
  }
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  await query('DELETE FROM auth_sessions WHERE token = $1', [token])
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: number): Promise<void> {
  await query('DELETE FROM auth_sessions WHERE user_id = $1', [userId])
}

/**
 * Clean up expired sessions and magic links
 */
export async function cleanupExpired(): Promise<void> {
  const now = new Date()

  await query('DELETE FROM auth_sessions WHERE expires_at < $1', [now])
  await query('DELETE FROM magic_links WHERE expires_at < $1', [now])
}
