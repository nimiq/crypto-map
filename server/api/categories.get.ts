import * as v from 'valibot'

const querySchema = v.object({
  q: v.optional(v.string()),
})

export default defineEventHandler(async (event): Promise<CategoryResponse[]> => {
  const query = getQuery(event)

  const result = v.safeParse(querySchema, query)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query parameters',
      data: result.issues,
    })
  }

  const db = useDrizzle()
  const { q: searchQuery } = result.output

  let dbQuery = db.select().from(tables.categories)
  if (searchQuery)
    dbQuery = dbQuery.where(sql`${tables.categories.name} ILIKE ${`%${searchQuery}%`}`)
  const categoriesFromDb = await dbQuery

  return categoriesFromDb.map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
  }))
})
