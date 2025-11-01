import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Migration tracking table
async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

// Get applied migrations
async function getAppliedMigrations(): Promise<string[]> {
  const result = await pool.query<{ name: string }>(
    'SELECT name FROM migrations ORDER BY id'
  )
  return result.rows.map((row) => row.name)
}

// Get migration files
function getMigrationFiles(): string[] {
  const migrationsDir = path.resolve(__dirname, '../../../infra/migrations')

  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found')
    return []
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
}

// Run a single migration
async function runMigration(filename: string) {
  const migrationsDir = path.resolve(__dirname, '../../../infra/migrations')
  const filepath = path.join(migrationsDir, filename)
  const sql = fs.readFileSync(filepath, 'utf-8')

  console.log(`Running migration: ${filename}`)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('INSERT INTO migrations (name) VALUES ($1)', [filename])
    await client.query('COMMIT')
    console.log(`✅ Migration complete: ${filename}`)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error(`❌ Migration failed: ${filename}`, error)
    throw error
  } finally {
    client.release()
  }
}

// Main migration runner
export async function runMigrations() {
  try {
    console.log('🚀 Starting migrations...')

    await ensureMigrationsTable()

    const appliedMigrations = await getAppliedMigrations()
    const migrationFiles = getMigrationFiles()

    const pendingMigrations = migrationFiles.filter(
      (file) => !appliedMigrations.includes(file)
    )

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations')
      return
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s)`)

    for (const migration of pendingMigrations) {
      await runMigration(migration)
    }

    console.log('✅ All migrations completed successfully')
  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log('Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Failed:', error)
      process.exit(1)
    })
}
