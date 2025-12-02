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
const ZOOM_STEP = 0.5
const VIEWPORT_BUFFER = 0.85 // Use 85% of viewport to ensure locations aren't at the edge
const DEFAULT_CENTER = { lat: 20, lng: 0 }

const merc = new SphericalMercator({ size: 256 })

function getViewportBbox(lat: number, lng: number, width: number, height: number, zoom: number) {
  const [centerPx, centerPy] = merc.px([lng, lat], zoom)
  const [minLng, maxLat] = merc.ll([centerPx - width / 2, centerPy - height / 2], zoom)
  const [maxLng, minLat] = merc.ll([centerPx + width / 2, centerPy + height / 2], zoom)
  return { minLat, maxLat, minLng, maxLng }
}

function isPointInViewport(pointLat: number, pointLng: number, bbox: ReturnType<typeof getViewportBbox>) {
  return pointLat >= bbox.minLat && pointLat <= bbox.maxLat && pointLng >= bbox.minLng && pointLng <= bbox.maxLng
}

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, q => v.safeParse(querySchema, q))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query parameters', data: query.issues })
  }

  const { lat: userLat, lng: userLng, width, height } = query.output

  // Find nearest location to user
  const nearest = await useDrizzle()
    .select({ lat: sql<number>`ST_Y(${tables.locations.location})`, lng: sql<number>`ST_X(${tables.locations.location})` })
    .from(tables.locations)
    .orderBy(sql`${tables.locations.location} <-> ST_SetSRID(ST_MakePoint(${userLng}, ${userLat}), 4326)`)
    .limit(1)

  if (!nearest[0]) {
    return { zoom: MIN_ZOOM, center: DEFAULT_CENTER }
  }

  const nearestLat = nearest[0].lat
  const nearestLng = nearest[0].lng

  // Compute midpoint between user and nearest location
  const centerLat = (userLat + nearestLat) / 2
  const centerLng = (userLng + nearestLng) / 2

  // Find highest zoom where nearest location is visible from midpoint center (with buffer)
  const bufferedWidth = width * VIEWPORT_BUFFER
  const bufferedHeight = height * VIEWPORT_BUFFER

  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= ZOOM_STEP) {
    const bbox = getViewportBbox(centerLat, centerLng, bufferedWidth, bufferedHeight, zoom)
    if (isPointInViewport(nearestLat, nearestLng, bbox)) {
      return { zoom, center: { lat: centerLat, lng: centerLng } }
    }
  }

  return { zoom: MIN_ZOOM, center: { lat: centerLat, lng: centerLng } }
})
