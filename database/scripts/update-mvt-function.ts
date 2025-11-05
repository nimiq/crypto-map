import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { consola } from 'consola'
import { sql } from 'drizzle-orm'

const logger = consola.withTag('update-mvt')

async function updateMvtFunction() {
  try {
    const db = useDrizzle()
    const sqlContent = readFileSync(join(process.cwd(), 'database/functions/get_tile_mvt.sql'), 'utf8')

    logger.info('Updating get_tile_mvt function...')
    await db.execute(sql.raw(sqlContent))
    logger.success('✓ Function updated successfully')
  }
  catch (error) {
    logger.error('Failed to update function:', error)
    process.exit(1)
  }
}

updateMvtFunction()
