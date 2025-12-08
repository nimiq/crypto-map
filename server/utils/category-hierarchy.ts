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
 * Single query fetches all hierarchy relations, then computes leaf categories in-memory.
 * @param locationCategories - Map of location UUIDs to their category ID arrays
 * @returns Map of location UUIDs to their most specific category ID
 */
export async function getMostSpecificCategoriesBatch(locationCategories: Map<string, string[]>): Promise<Map<string, string>> {
  const result = new Map<string, string>()

  if (locationCategories.size === 0)
    return result

  // Collect all unique category IDs across all locations
  const allCategoryIds = new Set<string>()
  for (const categoryIds of locationCategories.values()) {
    for (const id of categoryIds) {
      allCategoryIds.add(id)
    }
  }

  if (allCategoryIds.size === 0)
    return result

  // Single query: fetch all hierarchy relations for all categories at once
  const db = useDrizzle()
  const hierarchyRelations = await db
    .select({
      childId: tables.categoryHierarchies.childId,
      parentId: tables.categoryHierarchies.parentId,
    })
    .from(tables.categoryHierarchies)
    .where(
      and(
        inArray(tables.categoryHierarchies.childId, Array.from(allCategoryIds)),
        inArray(tables.categoryHierarchies.parentId, Array.from(allCategoryIds)),
      ),
    )

  // Build parent->children map for quick lookup
  const childToParents = new Map<string, Set<string>>()
  for (const { childId, parentId } of hierarchyRelations) {
    if (!childToParents.has(childId))
      childToParents.set(childId, new Set())
    childToParents.get(childId)!.add(parentId)
  }

  // For each location, find the most specific category (leaf node within its set)
  for (const [uuid, categoryIds] of locationCategories) {
    if (categoryIds.length === 0)
      continue
    if (categoryIds.length === 1) {
      result.set(uuid, categoryIds[0]!)
      continue
    }

    const categorySet = new Set(categoryIds)
    // A category is a "parent" if another category in this set has it as parent
    const parentsInSet = new Set<string>()
    for (const id of categoryIds) {
      const parents = childToParents.get(id)
      if (parents) {
        for (const p of parents) {
          if (categorySet.has(p))
            parentsInSet.add(p)
        }
      }
    }

    // Leaf = not a parent of any other category in this set
    const leaf = categoryIds.find(id => !parentsInSet.has(id))
    if (leaf)
      result.set(uuid, leaf)
  }

  return result
}
