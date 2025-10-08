import { eq } from 'drizzle-orm'
import { locationSelect } from '../../utils/search'

export default defineEventHandler(async (event) => {
  const uuid = getRouterParam(event, 'uuid')

  if (!uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'UUID is required',
    })
  }

  const db = useDrizzle()

  const location = await db
    .select(locationSelect)
    .from(tables.locations)
    .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .where(eq(tables.locations.uuid, uuid))
    .groupBy(tables.locations.uuid)
    .limit(1)

  if (!location.length) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Location not found',
    })
  }

  const allCategories = await db.select().from(tables.categories)
  const categoryMap = new Map(allCategories.map(cat => [cat.id, { id: cat.id, name: cat.name, icon: cat.icon }]))

  return location.map(loc => ({
    ...loc,
    categories: loc.categoryIds
      ? loc.categoryIds.split(',').map(id => categoryMap.get(id)!).filter(Boolean)
      : [],
  }))[0]
})
