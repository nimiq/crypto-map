import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { consola } from 'consola'

const logger = consola.withTag('update-mvt')

async function main() {
  try {
    logger.start('Updating MVT function with icon_name field...')

    const db = useDrizzle()
    const sqlPath = resolve(process.cwd(), 'database/functions/get_tile_mvt.sql')
    const sql = readFileSync(sqlPath, 'utf-8')

    logger.info('Executing SQL from:', sqlPath)
    await db.execute(sql)

    logger.success('MVT function updated successfully!')
  }
  catch (error) {
    logger.error('Failed to update MVT function:', error)
    process.exit(1)
  }
}

main()
