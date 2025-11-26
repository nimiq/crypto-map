import process from 'node:process'
import { consola } from 'consola'
import postgres from 'postgres'
import 'dotenv/config'

const logger = consola.withTag('test-mvt')

async function testMvtGeneration() {
  const sql = postgres(process.env.DATABASE_URL!)

  try {
    // Test the MVT generation for the failing tile
    logger.info('Testing MVT generation for tile 13/4299/2914...')

    const result = await sql`
      WITH tile_envelope AS (
        SELECT ST_Transform(ST_TileEnvelope(13, 4299, 2914), 4326) AS bounds,
               ST_TileEnvelope(13, 4299, 2914) AS bounds_3857
      ),
      mvt_data AS (
        SELECT
          l.uuid::text AS uuid,
          l.name,
          ST_GeometryType(l.location) as original_type,
          ST_GeometryType(ST_Transform(l.location, 3857)) as transformed_type,
          ST_GeometryType(
            ST_AsMVTGeom(
              ST_Transform(l.location, 3857),
              (SELECT bounds_3857 FROM tile_envelope),
              4096,
              256,
              true
            )
          ) as mvt_geom_type
        FROM locations l
        WHERE ST_Intersects(l.location, (SELECT bounds FROM tile_envelope))
        LIMIT 5
      )
      SELECT * FROM mvt_data
    `

    logger.info('MVT geometry types:')
    console.table(result)
  }
  catch (error) {
    logger.error('Failed:', error)
    throw error
  }
  finally {
    await sql.end()
  }
}

testMvtGeneration()
