import { inArray, sql } from 'drizzle-orm'

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
      sql`${tables.categoryHierarchies.childId} = ANY(${categoryIds}::text[])
          AND ${tables.categoryHierarchies.parentId} = ANY(${categoryIds}::text[])`,
    )

  // Build a set of all parent IDs (categories that have children in this set)
  const parentIds = new Set(hierarchyRelations.map(r => r.parentId))

  // Find categories that are NOT parents (leaf nodes)
  const leafCategories = categoryIds.filter(id => !parentIds.has(id))

  // Return the first leaf category, or first category if no hierarchy exists, or empty string
  return leafCategories[0] || categoryIds[0] || ''
}

/**
 * Batch version: finds the most specific category for multiple locations
 * More efficient than calling getMostSpecificCategory multiple times
 *
 * @param locationCategories - Map of location UUID to array of category IDs
 * @returns Map of location UUID to most specific category ID
 */
export async function getMostSpecificCategoriesBatch(
  locationCategories: Map<string, string[]>,
): Promise<Map<string, string>> {
  const db = useDrizzle()
  const results = new Map<string, string>()

  // Get all unique category IDs across all locations
  const allCategoryIds = Array.from(
    new Set(
      Array.from(locationCategories.values()).flat(),
    ),
  )

  if (allCategoryIds.length === 0)
    return results

  // Fetch all relevant hierarchy relationships in one query
  const hierarchyRelations = await db
    .select({
      childId: tables.categoryHierarchies.childId,
      parentId: tables.categoryHierarchies.parentId,
    })
    .from(tables.categoryHierarchies)
    .where(
      inArray(tables.categoryHierarchies.childId, allCategoryIds),
    )

  // Build a map of child -> parent relationships
  const childToParent = new Map<string, Set<string>>()
  for (const rel of hierarchyRelations) {
    if (!childToParent.has(rel.childId))
      childToParent.set(rel.childId, new Set())
    childToParent.get(rel.childId)!.add(rel.parentId)
  }

  // For each location, find the most specific category
  for (const [locationId, categoryIds] of locationCategories) {
    if (categoryIds.length === 0) {
      results.set(locationId, '')
      continue
    }
    if (categoryIds.length === 1) {
      const firstCategory = categoryIds[0]
      results.set(locationId, firstCategory || '')
      continue
    }

    // Find parent IDs that exist in this location's categories
    const parentIdsInSet = new Set<string>()
    for (const categoryId of categoryIds) {
      const parents = childToParent.get(categoryId)
      if (parents) {
        for (const parent of parents) {
          if (categoryIds.includes(parent))
            parentIdsInSet.add(parent)
        }
      }
    }

    // Find leaf nodes (categories with no children in this set)
    const leafCategories = categoryIds.filter(id => !parentIdsInSet.has(id))

    results.set(locationId, leafCategories[0] || categoryIds[0] || '')
  }

  return results
}
