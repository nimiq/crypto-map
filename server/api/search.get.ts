import * as v from 'valibot'

const querySchema = v.object({
  lat: v.optional(v.pipe(
    v.string(),
    v.transform(Number),
    v.number('Latitude must be a number'),
    v.minValue(-90, 'Latitude must be >= -90'),
    v.maxValue(90, 'Latitude must be <= 90'),
  )),
  lng: v.optional(v.pipe(
    v.string(),
    v.transform(Number),
    v.number('Longitude must be a number'),
    v.minValue(-180, 'Longitude must be >= -180'),
    v.maxValue(180, 'Longitude must be <= 180'),
  )),
  categories: v.optional(v.pipe(
    v.union([v.string(), v.array(v.string())]),
    v.transform(val => Array.isArray(val) ? val : [val]),
    v.array(v.string()),
  )),
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const result = v.safeParse(querySchema, query)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query parameters',
      data: result.issues,
    })
  }

  let lat = result.output.lat
  let lng = result.output.lng
  const categories = result.output.categories

  // Try to get lat/lng from Cloudflare IP if not provided
  if (lat === undefined || lng === undefined) {
    const cfConnectingIp = getHeader(event, 'cf-connecting-ip')

    if (cfConnectingIp) {
      try {
        const location = await locateByHost(cfConnectingIp)
        lat = location.lat
        lng = location.lng
      }
      catch {
        // Silently continue without location
      }
    }
  }

  if (lat !== undefined && lng !== undefined) {
    console.log(`User location: ${lat}, ${lng} (not used for sorting yet)`)
  }

  const db = useDrizzle()

  // If no categories selected, return 10 random locations
  if (!categories || categories.length === 0) {
    const randomLocations = await db
      .select()
      .from(tables.locations)
      .orderBy(sql`RANDOM()`)
      .limit(10)
      .all()

    return randomLocations
  }

  // Filter locations by categories using JSON search
  const filteredLocations = await db
    .select()
    .from(tables.locations)
    .where(
      sql`EXISTS (
        SELECT 1 FROM json_each(${tables.locations.categories})
        WHERE value IN (${sql.join(categories.map(c => sql`${c}`), sql`, `)})
      )`,
    )
    .all()

  return filteredLocations
})
