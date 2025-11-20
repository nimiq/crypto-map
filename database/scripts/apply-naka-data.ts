import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { createConsola } from 'consola'
import postgres from 'postgres'
import { join } from 'pathe'

const consola = createConsola().withTag('apply-naka-data')

async function main() {
  try {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
      consola.error('DATABASE_URL environment variable is required')
      process.exit(1)
    }

    consola.start('Connecting to database...')
    const sql = postgres(databaseUrl)

    consola.start('Loading SQL file...')
    const sqlPath = join(import.meta.dirname, '..', 'sql', '3.naka.sql')
    const sqlContent = await readFile(sqlPath, 'utf-8')

    consola.start('Applying NAKA location data...')
    await sql.unsafe(sqlContent)

    consola.success('✅ Successfully applied NAKA location data!')
    consola.info('Database now has updated locations with ratings and cleaned categories')

    await sql.end()
  }
  catch (error) {
    consola.error('Failed to apply data:', error)
    process.exit(1)
  }
}

main()
