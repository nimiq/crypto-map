import { sql } from 'drizzle-orm'

// Convert tile coordinates to geographic bbox
function tileToBBox(z: number, x: number, y: number) {
  const n = 2 ** z
  const lonMin = (x / n) * 360 - 180
  const latMax = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * (180 / Math.PI)
  const lonMax = ((x + 1) / n) * 360 - 180
  const latMin = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * (180 / Math.PI)

  return { lonMin, latMin, lonMax, latMax }
}

export default defineEventHandler(async (event) => {
  const z = Number(getRouterParam(event, 'z'))
  const x = Number(getRouterParam(event, 'x'))
  const y = Number(getRouterParam(event, 'y'))

  if (Number.isNaN(z) || Number.isNaN(x) || Number.isNaN(y)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid tile coordinates',
    })
  }

  const bbox = tileToBBox(z, x, y)
  const db = useDrizzle()

  // Generate MVT tile with PostGIS
  const result = await db.execute(sql`
    WITH mvt_data AS (
      SELECT
        l.uuid,
        l.name,
        ST_AsMVTGeom(
          l.location,
          ST_MakeEnvelope(${bbox.lonMin}, ${bbox.latMin}, ${bbox.lonMax}, ${bbox.latMax}, 4326),
          4096,
          256,
          true
        ) AS geom,
        json_agg(
          json_build_object(
            'id', c.id,
            'icon', c.icon
          )
        ) AS categories
      FROM locations l
      LEFT JOIN location_categories lc ON l.uuid = lc.location_uuid
      LEFT JOIN categories c ON lc.category_id = c.id
      WHERE ST_Intersects(
        l.location,
        ST_MakeEnvelope(${bbox.lonMin}, ${bbox.latMin}, ${bbox.lonMax}, ${bbox.latMax}, 4326)
      )
      GROUP BY l.uuid, l.name, l.location
    )
    SELECT ST_AsMVT(mvt_data.*, 'locations', 4096, 'geom') as mvt
    FROM mvt_data
  `)

  const mvt = result.rows[0]?.mvt as Buffer | null

  if (!mvt) {
    setResponseStatus(event, 204)
    return new Uint8Array()
  }

  setResponseHeader(event, 'Content-Type', 'application/vnd.mapbox-vector-tile')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
  return mvt
})
