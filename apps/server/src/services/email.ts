import nodemailer from 'nodemailer'

/**
 * Email Service
 * Handles sending transactional emails (magic links, notifications, etc.)
 */

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@zoai.app'
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASSWORD = process.env.SMTP_PASSWORD
const APP_URL = process.env.APP_URL || 'http://localhost:5173'

// Create transporter
let transporter: nodemailer.Transporter | null = null

if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
  transporter = nodemailer.createTransporter({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  })

  console.log('✅ Email service configured')
} else {
  console.warn('⚠️  Email service not configured - set SMTP_* environment variables')
  console.warn('   Magic link emails will be logged to console instead')
}

/**
 * Send magic link email
 */
export async function sendMagicLink(email: string, token: string): Promise<void> {
  const magicLink = `${APP_URL}/auth/verify?token=${token}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer { color: #666; font-size: 12px; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Sign in to ZoAI</h1>
          <p>Click the button below to sign in to your ZoAI account:</p>
          <a href="${magicLink}" class="button">Sign In</a>
          <p>Or copy and paste this link into your browser:</p>
          <p><code>${magicLink}</code></p>
          <p>This link will expire in 15 minutes.</p>
          <div class="footer">
            <p>If you didn't request this email, you can safely ignore it.</p>
            <p>ZoAI Multi-Agent Chat</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Sign in to ZoAI

Click this link to sign in to your account:
${magicLink}

This link will expire in 15 minutes.

If you didn't request this email, you can safely ignore it.
  `.trim()

  if (!transporter) {
    // Development mode - log to console
    console.log('\n' + '='.repeat(80))
    console.log('📧 MAGIC LINK EMAIL (Development Mode)')
    console.log('='.repeat(80))
    console.log(`To: ${email}`)
    console.log(`Link: ${magicLink}`)
    console.log('='.repeat(80) + '\n')
    return
  }

  // Production mode - send actual email
  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: 'Sign in to ZoAI',
      text,
      html,
    })

    console.log(`✅ Magic link email sent to ${email}`)
  } catch (error) {
    console.error('❌ Failed to send magic link email:', error)
    throw new Error('Failed to send email')
  }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  if (!transporter) {
    console.log(`📧 Would send welcome email to ${email} (${name})`)
    return
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to ZoAI, ${name || 'there'}! 👋</h1>
          <p>Thanks for joining ZoAI Multi-Agent Chat.</p>
          <p>You can now:</p>
          <ul>
            <li>Upload documents and URLs as knowledge sources</li>
            <li>Ask questions answered by multiple AI agents</li>
            <li>Get synthesized, grounded answers with citations</li>
          </ul>
          <p>Get started by creating your first chat!</p>
          <p>Happy chatting,<br>The ZoAI Team</p>
        </div>
      </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to ZoAI!',
      html,
    })

    console.log(`✅ Welcome email sent to ${email}`)
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error)
    // Don't throw - welcome emails are non-critical
  }
}
