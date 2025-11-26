import { and, inArray } from 'drizzle-orm'

/**
 * Finds the most specific (leaf) category from a list of category IDs.
 * The most specific category is one that has no children in the given set.
 *
 * For example, if categories = ['restaurant', 'italian_restaurant', 'pizza_restaurant']:
 * - 'restaurant' is parent of both 'italian_restaurant' and 'pizza_restaurant'
 * - 'italian_restaurant' is parent of 'pizza_restaurant'
 * - 'pizza_restaurant' has no children → most specific
 *
 * @param categoryIds - Array of category IDs for a location
 * @returns The most specific category ID, or first category if no hierarchy exists
 */
export async function getMostSpecificCategory(categoryIds: string[]): Promise<string> {
  if (categoryIds.length === 0)
    return ''
  if (categoryIds.length === 1)
    return categoryIds[0] ?? ''

  const db = useDrizzle()

  // Query category_hierarchies to find parent-child relationships within this set
  const hierarchyRelations = await db
    .select({
      childId: tables.categoryHierarchies.childId,
      parentId: tables.categoryHierarchies.parentId,
    })
    .from(tables.categoryHierarchies)
    .where(
      and(
        inArray(tables.categoryHierarchies.childId, categoryIds),
        inArray(tables.categoryHierarchies.parentId, categoryIds),
      ),
    )

  // Build a set of all parent IDs (categories that have children in this set)
  const parentIds = new Set(hierarchyRelations.map(r => r.parentId))

  // Find categories that are NOT parents (leaf nodes)
  const leafCategories = categoryIds.filter(id => !parentIds.has(id))

  // Return the first leaf category, or first category if no hierarchy exists, or empty string
  return leafCategories[0] || categoryIds[0] || ''
}

/**
 * Batch version of getMostSpecificCategory for processing multiple locations efficiently.
 * @param locationCategories - Map of location UUIDs to their category ID arrays
 * @returns Map of location UUIDs to their most specific category ID
 */
export async function getMostSpecificCategoriesBatch(locationCategories: Map<string, string[]>): Promise<Map<string, string>> {
  const result = new Map<string, string>()

  // For now, process each location individually
  // Future optimization: fetch all hierarchies in one query
  for (const [uuid, categoryIds] of locationCategories) {
    const mostSpecific = await getMostSpecificCategory(categoryIds)
    if (mostSpecific) {
      result.set(uuid, mostSpecific)
    }
  }

  return result
}
