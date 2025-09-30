export default defineEventHandler(async () => {
  const db = useDrizzle()

  const categoriesFromDb = await db.select().from(tables.categories).all()

  return categoriesFromDb.map(cat => ({
    id: cat.id,
    name: cat.name,
  }))
})
