import { consola } from 'consola'
import postgres from 'postgres'
import 'dotenv/config'

const logger = consola.withTag('inspect-tile')

async function inspectTile() {
  const sql = postgres(process.env.DATABASE_URL!)

  try {
    logger.info('Calling get_tile_mvt(13, 4300, 2914)...')

    const result = await sql`SELECT get_tile_mvt(13, 4300, 2914) as tile`

    const tile = result[0]?.tile

    if (!tile) {
      logger.warn('No tile data returned')
      return
    }

    logger.info('Tile response:', {
      type: typeof tile,
      isBuffer: Buffer.isBuffer(tile),
      length: tile?.length,
      firstBytes: tile?.slice(0, 20).toString('hex'),
    })

    // List locations in the tile
    logger.info('Listing locations in tile 13/4300/2914...')
    const locations = await sql`
      WITH bounds AS (
        SELECT ST_TileEnvelope(13, 4300, 2914) AS geom
      )
      SELECT 
        l.uuid, 
        l.name, 
        ST_AsText(l.location) as wkt,
        ST_X(ST_Transform(l.location, 3857)) as x_3857,
        ST_Y(ST_Transform(l.location, 3857)) as y_3857
      FROM locations l, bounds
      WHERE ST_Intersects(l.location, ST_Transform(bounds.geom, 4326))
    `
    console.log(locations)
  }
  catch (error) {
    logger.error('Failed:', error)
    throw error
  }
  finally {
    await sql.end()
  }
}

inspectTile()
