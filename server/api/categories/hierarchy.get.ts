import { inArray } from 'drizzle-orm'
import * as v from 'valibot'

const querySchema = v.object({
  categories: v.pipe(
    v.string(),
    v.transform(s => s.split(',').filter(Boolean)),
    v.minLength(1, 'At least one category is required'),
  ),
})

export default defineCachedEventHandler(async (event) => {
  const { categories } = await getValidatedQuery(event, data => v.parse(querySchema, data))

  const db = useDrizzle()

  // Fetch hierarchy relationships where both parent and child are in the provided categories
  const hierarchies = await db
    .select({
      childId: tables.categoryHierarchies.childId,
      parentId: tables.categoryHierarchies.parentId,
    })
    .from(tables.categoryHierarchies)
    .where(inArray(tables.categoryHierarchies.childId, categories))

  // Filter to only include hierarchies where the parent is also in the categories list
  const filteredHierarchies = hierarchies.filter(h => categories.includes(h.parentId))

  return {
    hierarchies: filteredHierarchies,
  }
}, {
  maxAge: 60 * 60 * 24 * 7, // Cache for 7 days (hierarchies rarely change)
  getKey: event => `hierarchy:${getQuery(event).categories}`,
  swr: true,
})
