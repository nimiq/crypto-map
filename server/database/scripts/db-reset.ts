import process from 'node:process'
import { createConsola } from 'consola'
import { config } from 'dotenv'
import postgres from 'postgres'

config()

const consola = createConsola().withTag('db-reset')

async function main() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    consola.error('DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const sql = postgres(databaseUrl, { prepare: false })

  try {
    consola.start('Dropping all tables...')

    // Suppress NOTICE messages for idempotent DROP statements
    await sql.unsafe('SET client_min_messages = WARNING')
    await sql.unsafe('DROP TABLE IF EXISTS location_categories CASCADE')
    await sql.unsafe('DROP TABLE IF EXISTS category_hierarchies CASCADE')
    await sql.unsafe('DROP TABLE IF EXISTS locations CASCADE')
    await sql.unsafe('DROP TABLE IF EXISTS categories CASCADE')
    await sql.unsafe('DROP TABLE IF EXISTS _hub_migrations CASCADE')
    await sql.unsafe('DROP TABLE IF EXISTS drizzle.__drizzle_migrations CASCADE')
    await sql.unsafe('DROP SCHEMA IF EXISTS drizzle CASCADE')
    await sql.unsafe('SET client_min_messages = NOTICE')

    consola.success('All tables dropped successfully')
  }
  catch (error) {
    consola.error('Failed to drop tables:', error)
    process.exit(1)
  }
  finally {
    await sql.end()
  }
}

main()
