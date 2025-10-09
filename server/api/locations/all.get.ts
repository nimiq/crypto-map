import { sql } from 'drizzle-orm'
import * as v from 'valibot'

const querySchema = v.object({
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
  limit: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
})

export default defineEventHandler(async (event) => {
  const result = await getValidatedQuery(event, data => v.safeParse(querySchema, data))
  const { page = 1, limit = 50 } = result.success ? result.output : {}

  const db = useDrizzle()

  const offset = (page - 1) * limit

  const [locations, totalCount] = await Promise.all([
    db
      .select({
        uuid: tables.locations.uuid,
        name: tables.locations.name,
        address: tables.locations.address,
        rating: tables.locations.rating,
        photo: tables.locations.photo,
        gmapsPlaceId: tables.locations.gmapsPlaceId,
        gmapsUrl: tables.locations.gmapsUrl,
        website: tables.locations.website,
        source: tables.locations.source,
        timezone: tables.locations.timezone,
        openingHours: tables.locations.openingHours,
        createdAt: tables.locations.createdAt,
        updatedAt: tables.locations.updatedAt,
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
      .leftJoin(tables.locationCategories, sql`${tables.locations.uuid} = ${tables.locationCategories.locationUuid}`)
      .leftJoin(tables.categories, sql`${tables.locationCategories.categoryId} = ${tables.categories.id}`)
      .groupBy(tables.locations.uuid)
      .orderBy(tables.locations.name)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(tables.locations).then(r => r[0]?.count || 0),
  ])

  return {
    locations,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
})
