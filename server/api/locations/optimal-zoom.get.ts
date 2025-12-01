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

// Approximate degrees per pixel at each zoom level (at equator)
// Formula: 360 / (256 * 2^zoom)
function degreesPerPixel(zoom: number): number {
  return 360 / (256 * 2 ** zoom)
}

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, q => v.safeParse(querySchema, q))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query parameters', data: query.issues })
  }

  const { lat, lng, width, height } = query.output

  // Binary search for optimal zoom
  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom--) {
    const dpp = degreesPerPixel(zoom)
    // Adjust for latitude (Mercator projection)
    const latFactor = Math.cos((lat * Math.PI) / 180)
    const lngDelta = (width / 2) * dpp
    const latDelta = (height / 2) * dpp / latFactor

    const bbox = sql`ST_MakeEnvelope(${lng - lngDelta}, ${lat - latDelta}, ${lng + lngDelta}, ${lat + latDelta}, 4326)`

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
