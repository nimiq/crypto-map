import { eq, inArray, sql } from 'drizzle-orm'
import * as v from 'valibot'

const querySchema = v.object({
  uuids: v.string(), // Comma-separated UUIDs
})

export default defineEventHandler(async (event) => {
  const { uuids } = await getValidatedQuery(event, data => v.parse(querySchema, data))

  const uuidArray = uuids.split(',').filter(Boolean)
  if (uuidArray.length === 0)
    return []

  const db = useDrizzle()

  const locations = await db
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
    .where(inArray(tables.locations.uuid, uuidArray))
    .groupBy(tables.locations.uuid)

  // Preserve the order from the input UUIDs
  const locationsMap = new Map(locations.map(loc => [loc.uuid, loc]))
  return uuidArray.map(uuid => locationsMap.get(uuid)).filter(Boolean)
})
