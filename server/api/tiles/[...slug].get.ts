import { z } from 'zod'

const tileParamSchema = z.object({
  z: z.coerce.number().int().min(0).max(20),
  x: z.coerce.number().int().min(0),
  y: z.coerce.number().int().min(0),
})

export default defineEventHandler(async (event) => {
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

  // Return uncompressed MVT - Cloudflare handles compression at the edge
  setResponseHeader(event, 'Content-Type', 'application/vnd.mapbox-vector-tile')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return mvt
})
