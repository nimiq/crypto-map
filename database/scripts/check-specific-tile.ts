import { consola } from 'consola'
import postgres from 'postgres'
import 'dotenv/config'

const logger = consola.withTag('check-tile')

async function checkSpecificTile() {
  const sql = postgres(process.env.DATABASE_URL!)

  try {
    // Check the problematic tile: 10/537/364
    logger.info('Checking tile 10/537/364...')

    const result = await sql`
      WITH tile_envelope AS (
        SELECT ST_Transform(ST_TileEnvelope(10, 537, 364), 4326) AS bounds,
               ST_TileEnvelope(10, 537, 364) AS bounds_3857
      )
      SELECT
        l.uuid::text AS uuid,
        l.name,
        ST_GeometryType(l.location) as geom_type,
        ST_AsText(l.location) as wkt
      FROM locations l
      WHERE ST_Intersects(l.location, (SELECT bounds FROM tile_envelope))
      LIMIT 10
    `

    logger.info(`Found ${result.length} locations in tile`)
    console.table(result)

    // Now get the actual MVT
    const [{ tile }] = await sql`SELECT get_tile_mvt(10, 537, 364) as tile`

    logger.info('Tile data:', {
      exists: !!tile,
      length: tile?.length,
      firstBytes: tile?.slice(0, 20).toString('hex'),
    })
  }
  catch (error) {
    logger.error('Failed:', error)
    throw error
  }
  finally {
    await sql.end()
  }
}

checkSpecificTile()
