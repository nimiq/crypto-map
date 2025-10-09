import { eq, sql } from 'drizzle-orm'
import * as v from 'valibot'

const querySchema = v.object({
  categoryId: v.string(),
  limit: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
})

export default defineEventHandler(async (event) => {
  const { categoryId, limit = 10 } = await getValidatedQuery(event, data => v.parse(querySchema, data))

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
    .innerJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .leftJoin(tables.categories, eq(tables.locationCategories.categoryId, tables.categories.id))
    .where(sql`${tables.locations.uuid} IN (
      SELECT ${tables.locationCategories.locationUuid}
      FROM ${tables.locationCategories}
      WHERE ${tables.locationCategories.categoryId} = ${categoryId}
    )`)
    .groupBy(tables.locations.uuid)
    .orderBy(sql`${tables.locations.rating} DESC NULLS LAST`)
    .limit(limit)

  return locations
})
