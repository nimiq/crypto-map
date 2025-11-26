import process from 'node:process'
import { consola } from 'consola'
import postgres from 'postgres'
import 'dotenv/config'

const logger = consola.withTag('check-geom')

async function checkGeometries() {
  const sql = postgres(process.env.DATABASE_URL!)

  try {
    logger.info('Checking location geometries...')

    // Check geometry types
    const result = await sql`
      SELECT 
        uuid,
        name,
        ST_GeometryType(location) as geom_type,
        ST_SRID(location) as srid,
        ST_AsText(location) as wkt
      FROM locations
      LIMIT 5
    `

    logger.info('Sample locations:')
    console.table(result)

    // Check count
    const [{ count }] = await sql`SELECT COUNT(*) as count FROM locations`
    logger.info(`Total locations: ${count}`)
  }
  catch (error) {
    logger.error('Failed:', error)
    throw error
  }
  finally {
    await sql.end()
  }
}

checkGeometries()
