import { consola } from 'consola'
import * as v from 'valibot'

const logger = consola.withTag('tiles')

const tileParamsSchema = v.pipe(
  v.object({
    slug: v.string(),
  }),
  v.transform(({ slug }) => {
    // Remove .mvt extension if present and split by /
    const cleaned = slug.replace(/\.mvt$/, '')
    const parts = cleaned.split('/')
    return { tile: parts }
  }),
  v.check(
    ({ tile }) => tile.length === 3,
    'Expected 3 tile coordinates (z/x/y)',
  ),
  v.transform(({ tile: [z, x, y] }) => ({
    z: Number(z),
    x: Number(x),
    y: Number(y),
  })),
  v.check(
    ({ z, x, y }) =>
      !Number.isNaN(z) && !Number.isNaN(x) && !Number.isNaN(y),
    'Invalid tile coordinates',
  ),
)

export default defineEventHandler(async (event) => {
  const { z, x, y } = await getValidatedRouterParams(event, data =>
    v.parse(tileParamsSchema, data))

  logger.info(`Tile request: ${z}/${x}/${y}`)

  try {
    let mvt = await getTileMvt(z, x, y)

    // Failsafe: Handle JSON-serialized Buffer if it leaked through
    if (mvt && typeof mvt === 'object' && 'type' in mvt && (mvt as any).type === 'Buffer' && 'data' in mvt) {
      logger.warn('Detected JSON-serialized Buffer in API handler, converting...')
      mvt = Buffer.from((mvt as any).data)
    }

    logger.info('MVT result:', {
      exists: !!mvt,
      isBuffer: Buffer.isBuffer(mvt),
      length: mvt?.length,
      type: typeof mvt,
      constructor: mvt?.constructor?.name,
      firstBytes: Buffer.isBuffer(mvt) ? mvt.slice(0, 20).toString('hex') : 'not-buffer',
    })

    if (!mvt || mvt.length === 0) {
      setResponseStatus(event, 204)
      return new Uint8Array()
    }

    setResponseHeader(
      event,
      'Content-Type',
      'application/vnd.mapbox-vector-tile',
    )
    setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')

    // Use send() to prevent JSON serialization
    return send(event, Buffer.from(mvt))
  }
  catch (error) {
    logger.error('Error generating MVT tile:', error)
    setResponseStatus(event, 500)
    throw createError({
      statusCode: 500,
      message: 'Failed to generate tile',
    })
  }
})
