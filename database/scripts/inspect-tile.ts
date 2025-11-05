import { consola } from 'consola'
import postgres from 'postgres'
import 'dotenv/config'

const logger = consola.withTag('inspect-tile')

async function inspectTile() {
  const sql = postgres(process.env.DATABASE_URL!)

  try {
    logger.info('Calling get_tile_mvt(13, 4299, 2913)...')

    const result = await sql`SELECT get_tile_mvt(13, 4299, 2913) as tile`

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

    // Try to decode the MVT to see what's inside
    logger.info('First 100 bytes (hex):', tile.slice(0, 100).toString('hex'))
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
