import * as v from 'valibot'
import { searchLocationsByText } from '../../utils/search'

const querySchema = v.object({
  q: v.pipe(v.string(), v.minLength(2, 'Query must be at least 2 characters')),
})

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event)

  const result = v.safeParse(querySchema, queryParams)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query parameters',
      data: result.issues,
    })
  }

  const { q: searchQuery } = result.output

  // Fast full-text search for autocomplete
  const locations = await searchLocationsByText(searchQuery)

  // Get categories for each location
  const db = useDrizzle()
  const allCategories = await db.select().from(tables.categories)
  const categoryMap = new Map(allCategories.map(cat => [cat.id, { id: cat.id, name: cat.name, icon: cat.icon }]))

  return locations.map(loc => ({
    ...loc,
    categories: loc.categoryIds
      ? loc.categoryIds.split(',').map(id => categoryMap.get(id)!).filter(Boolean)
      : [],
  }))
})
