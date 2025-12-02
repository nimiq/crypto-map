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
const VIEWPORT_BUFFER = 0.60 // Use 60% of viewport to ensure locations are comfortably visible
const DEFAULT_CENTER = { lat: 20, lng: 0 }

const TILE_SIZE = 256
const D2R = Math.PI / 180
const R2D = 180 / Math.PI

// Web Mercator projection: convert [lng, lat] to pixel coordinates at given zoom
function lngLatToPixel(lng: number, lat: number, zoom: number): [number, number] {
  const size = TILE_SIZE * 2 ** zoom
  const d = size / 2
  const bc = size / 360
  const cc = size / (2 * Math.PI)
  const f = Math.min(Math.max(Math.sin(D2R * lat), -0.9999), 0.9999)
  const x = d + lng * bc
  const y = d + 0.5 * Math.log((1 + f) / (1 - f)) * -cc
  return [x, y]
}

// Web Mercator projection: convert pixel coordinates to [lng, lat] at given zoom
function pixelToLngLat(px: number, py: number, zoom: number): [number, number] {
  const size = TILE_SIZE * 2 ** zoom
  const bc = size / 360
  const cc = size / (2 * Math.PI)
  const zc = size / 2
  const g = (py - zc) / -cc
  const lng = (px - zc) / bc
  const lat = R2D * (2 * Math.atan(Math.exp(g)) - 0.5 * Math.PI)
  return [lng, lat]
}

function getViewportBbox(lat: number, lng: number, width: number, height: number, zoom: number) {
  const [centerPx, centerPy] = lngLatToPixel(lng, lat, zoom)
  const [minLng, maxLat] = pixelToLngLat(centerPx - width / 2, centerPy - height / 2, zoom)
  const [maxLng, minLat] = pixelToLngLat(centerPx + width / 2, centerPy + height / 2, zoom)
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
