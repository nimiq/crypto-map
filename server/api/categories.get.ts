export default defineEventHandler(async (event): Promise<CategoryResponse[]> => {
  const db = useDrizzle()
  const { q } = getQuery(event)

  const query = db.select().from(tables.categories)

  const categoriesFromDb = await (q && typeof q === 'string'
    ? query.where(sql`${tables.categories.name} ILIKE ${`%${q}%`}`)
    : query)

  return categoriesFromDb.map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
  }))
})
