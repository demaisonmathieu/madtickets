import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Pool } = pg

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn('[postgres] DATABASE_URL is not defined. Configure it before starting the API server.')
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
})

export async function query(text, params = []) {
  return pool.query(text, params)
}

export async function withTransaction(callback) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
