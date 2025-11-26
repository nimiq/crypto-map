import { consola } from 'consola'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

const querySchema = z.object({
  min_lat: z.coerce.number(),
  min_lon: z.coerce.number(),
  max_lat: z.coerce.number(),
  max_lon: z.coerce.number(),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, body => querySchema.safeParse(body))
  if (!query.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query parameters',
      data: query.error.issues,
    })
  }

  const { min_lat, min_lon, max_lat, max_lon } = query.data

  // Construct the bounding box polygon (PostGIS uses ST_MakeEnvelope(xmin, ymin, xmax, ymax, srid))
  const bbox = sql`ST_MakeEnvelope(${min_lon}, ${min_lat}, ${max_lon}, ${max_lat}, 4326)`

  try {
    const result = await useDrizzle()
      .select({ count: sql<number>`count(*)` })
      .from(tables.locations)
      .where(sql`ST_Intersects(${tables.locations.location}, ${bbox})`)

    return {
      count: Number(result[0]?.count || 0),
    }
  }
  catch (error) {
    consola.error('Error counting locations:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    })
  }
})
