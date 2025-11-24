import { Buffer } from 'node:buffer'
import { createGzip } from 'node:zlib'
import { z } from 'zod'

const tileParamSchema = z.object({
  z: z.coerce.number().int().min(0).max(20),
  x: z.coerce.number().int().min(0),
  y: z.coerce.number().int().min(0),
})

export default defineCachedEventHandler(async (event) => {
  const { slug } = getRouterParams(event)
  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tile slug is missing',
    })
  }
  const [z, x, y] = slug.split('/').map(Number)

  const query = tileParamSchema.safeParse({ z, x, y })
  if (!query.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid tile parameters',
      data: query.error.issues,
    })
  }

  const { z: zoom, x: tileX, y: tileY } = query.data

  const mvt = await getTileMvt(zoom, tileX, tileY)

  if (mvt.length === 0) {
    setResponseStatus(event, 204)
    return ''
  }

  // Check if client accepts gzip
  const acceptEncoding = getRequestHeader(event, 'accept-encoding')
  if (acceptEncoding?.includes('gzip')) {
    try {
      const zippedMvt = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        createGzip().on('data', chunk => chunks.push(chunk)).once('end', () => resolve(Buffer.concat(chunks))).once('error', reject).end(mvt)
      })
      setResponseHeader(event, 'Content-Type', 'application/vnd.mapbox-vector-tile')
      setResponseHeader(event, 'Content-Encoding', 'gzip')
      setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
      return zippedMvt
    }
    catch (error) {
      // If any error occurs during gzip, log it and fall back to uncompressed MVT
      console.error('Error gzipping MVT tile, falling back to uncompressed:', error)
    }
  }

  // Fallback: no gzip or gzip failed
  setResponseHeader(event, 'Content-Type', 'application/vnd.mapbox-vector-tile')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return mvt
}, { maxAge: 60 * 60, swr: true, staleMaxAge: 60 * 60 * 24 })
