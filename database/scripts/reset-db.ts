import process from 'node:process'
import { createConsola } from 'consola'
import postgres from 'postgres'

const consola = createConsola().withTag('reset-db')

async function main() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    consola.error('DATABASE_URL environment variable is required')
    consola.info('Usage: DATABASE_URL=xxx pnpm exec tsx database/scripts/reset-db.ts')
    process.exit(1)
  }

  const sql = postgres(databaseUrl, { prepare: false })

  try {
    consola.start('Dropping all tables...')

    // Drop schema and recreate
    await sql.unsafe('DROP SCHEMA IF EXISTS public CASCADE')
    await sql.unsafe('CREATE SCHEMA public')
    await sql.unsafe('GRANT ALL ON SCHEMA public TO postgres')
    await sql.unsafe('GRANT ALL ON SCHEMA public TO public')

    consola.success('Database reset complete')
  }
  catch (error) {
    consola.error('Failed to reset database:', error)
    process.exit(1)
  }
  finally {
    await sql.end()
  }
}

main()
