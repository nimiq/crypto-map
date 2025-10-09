import { eq, isNotNull, sql } from 'drizzle-orm'
import * as v from 'valibot'

const querySchema = v.object({
  status: v.picklist(['open', 'popular']),
  limit: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
})

export default defineEventHandler(async (event) => {
  const { status, limit = 10 } = await getValidatedQuery(event, data => v.parse(querySchema, data))

  const db = useDrizzle()

  const baseQuery = db
    .select({
      uuid: tables.locations.uuid,
      name: tables.locations.name,
      address: tables.locations.address,
      rating: tables.locations.rating,
      photo: tables.locations.photo,
      gmapsPlaceId: tables.locations.gmapsPlaceId,
      gmapsUrl: tables.locations.gmapsUrl,
      website: tables.locations.website,
      timezone: tables.locations.timezone,
      openingHours: tables.locations.openingHours,
      lat: sql<number>`ST_Y(${tables.locations.location})`,
      lng: sql<number>`ST_X(${tables.locations.location})`,
      categories: sql<Array<{ id: string, name: string, icon: string }>>`
        COALESCE(
          json_agg(
            json_build_object(
              'id', ${tables.categories.id},
              'name', ${tables.categories.name},
              'icon', ${tables.categories.icon}
            )
          ) FILTER (WHERE ${tables.categories.id} IS NOT NULL),
          '[]'
        )
      `,
    })
    .from(tables.locations)
    .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .leftJoin(tables.categories, eq(tables.locationCategories.categoryId, tables.categories.id))
    .where(status === 'open' ? isNotNull(tables.locations.openingHours) : isNotNull(tables.locations.rating))
    .groupBy(tables.locations.uuid)
    .orderBy(sql`${tables.locations.rating} DESC NULLS LAST`)
    .limit(limit)

  const locations = await baseQuery

  // Filter for open now if status is 'open'
  if (status === 'open') {
    return filterOpenNow(locations as any)
  }

  return locations
})
