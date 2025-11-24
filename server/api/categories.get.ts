import { desc, sql } from 'drizzle-orm'

export default defineCachedEventHandler(async (event) => {
  const db = useDrizzle()

  // Get categories that have locations, sorted by location count
  const categories = await db
    .select({
      id: tables.categories.id,
      name: tables.categories.name,
      icon: tables.categories.icon,
      locationCount,
    })
    .from(tables.categories)
    .leftJoin(tables.locationCategories, categoryLocationJoin)
    .groupBy(tables.categories.id, tables.categories.name, tables.categories.icon)
    .having(sql`count(DISTINCT ${tables.locationCategories.locationUuid}) > 0`)
    .orderBy(desc(locationCount))
    .limit(20)

  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=43200')

  return categories
}, {
  maxAge: 60 * 60 * 12,
  swr: true,
})
