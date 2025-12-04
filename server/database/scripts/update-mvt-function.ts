import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { consola } from 'consola'
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

config()

const logger = consola.withTag('update-mvt')

async function updateMvtFunction() {
  if (!process.env.DATABASE_URL) {
    logger.error('DATABASE_URL not set')
    process.exit(1)
  }

  const client = postgres(process.env.DATABASE_URL)
  const db = drizzle(client)

  try {
    logger.info('Reading MVT function SQL...')
    const sql = await readFile('server/database/functions/get_tile_mvt.sql', 'utf-8')

    logger.info('Updating get_tile_mvt function...')
    await db.execute(sql)

    logger.success('MVT function updated successfully!')
  }
  catch (error) {
    logger.error('Failed to update MVT function:', error)
    process.exit(1)
  }
  finally {
    await client.end()
  }
}

updateMvtFunction()
