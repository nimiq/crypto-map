import { SphericalMercator } from '@mapbox/sphericalmercator'
import { sql } from 'drizzle-orm'
import * as v from 'valibot'

const querySchema = v.object({
  lat: v.pipe(v.string(), v.transform(Number), v.number()),
  lng: v.pipe(v.string(), v.transform(Number), v.number()),
  width: v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1)),
  height: v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1)),
})

const MIN_ZOOM = 3
const MAX_ZOOM = 15

const merc = new SphericalMercator({ size: 256 })

function getViewportBbox(lat: number, lng: number, width: number, height: number, zoom: number) {
  const [centerPx, centerPy] = merc.px([lng, lat], zoom)
  const [minLng, maxLat] = merc.ll([centerPx - width / 2, centerPy - height / 2], zoom)
  const [maxLng, minLat] = merc.ll([centerPx + width / 2, centerPy + height / 2], zoom)
  return { minLat, maxLat, minLng, maxLng }
}

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, q => v.safeParse(querySchema, q))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query parameters', data: query.issues })
  }

  const { lat, lng, width, height } = query.output

  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom--) {
    const { minLat, maxLat, minLng, maxLng } = getViewportBbox(lat, lng, width, height, zoom)
    const bbox = sql`ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)`

    const result = await useDrizzle()
      .select({ count: sql<number>`count(*)` })
      .from(tables.locations)
      .where(sql`ST_Intersects(${tables.locations.location}, ${bbox})`)
      .limit(1)

    if (Number(result[0]?.count || 0) > 0) {
      return { zoom }
    }
  }

  return { zoom: MIN_ZOOM }
})
