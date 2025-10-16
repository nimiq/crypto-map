import process from 'node:process'
import { createConsola } from 'consola'
import { config } from 'dotenv'
import postgres from 'postgres'

config()

const consola = createConsola().withTag('verify-data')

async function main() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    consola.error('DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const sql = postgres(databaseUrl, { prepare: false })

  try {
    const locations = await sql.unsafe('SELECT COUNT(*) as count FROM locations')
    consola.info(`Total locations: ${locations[0].count}`)

    const categories = await sql.unsafe('SELECT COUNT(*) as count FROM location_categories')
    consola.info(`Total location-category mappings: ${categories[0].count}`)

    const bySource = await sql.unsafe('SELECT source, COUNT(*) as count FROM locations GROUP BY source')
    consola.info('By source:')
    bySource.forEach((row: any) => consola.info(`  ${row.source}: ${row.count}`))

    consola.success('Database verification complete')
  }
  catch (error) {
    consola.error('Failed to verify database:', error)
    process.exit(1)
  }
  finally {
    await sql.end()
  }
}

main()
