import * as v from 'valibot'
import { sql } from 'drizzle-orm'

const querySchema = v.object({
  q: v.optional(v.string()),
})

export default defineEventHandler(async (event): Promise<CategoryResponse[]> => {
  const { q: searchQuery } = await getValidatedQuery(event, data => v.parse(querySchema, data))

  const db = useDrizzle()

  const dbQuery = db.select().from(tables.categories)

  const categoriesFromDb = await (searchQuery
    ? dbQuery.where(sql`${tables.categories.name} ILIKE ${`%${searchQuery}%`}`)
    : dbQuery)

  return categoriesFromDb.map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
  }))
})
