import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const sqlPath = path.join(__dirname, 'schema.sql')
  const sql = await fs.readFile(sqlPath, 'utf8')
  await pool.query(sql)
  console.log('✅ PostgreSQL schema initialized')
  await pool.end()
}

main().catch((error) => {
  console.error('❌ Failed to initialize PostgreSQL schema')
  console.error(error)
  process.exit(1)
})
