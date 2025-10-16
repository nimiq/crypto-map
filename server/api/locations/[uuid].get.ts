import * as v from 'valibot'
import { baseLocationSelect } from '../../utils/sql-fragments'

const querySchema = v.object({
  uuid: v.pipe(v.string(), v.uuid()),
})

export default defineCachedEventHandler(async (event) => {
  const { uuid } = await getValidatedRouterParams(event, data => v.parse(querySchema, data))

  const db = useDrizzle()

  const result = await db
    .select(baseLocationSelect)
    .from(tables.locations)
    .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .leftJoin(tables.categories, eq(tables.locationCategories.categoryId, tables.categories.id))
    .where(eq(tables.locations.uuid, uuid))
    .groupBy(tables.locations.uuid)
    .limit(1)
    .then(rows => rows[0])

  if (!result)
    throw createError({ statusCode: 404, statusMessage: 'Location not found' })

  setResponseHeader(event, 'Cache-Control', 'public, max-age=900, stale-while-revalidate=900')

  return result
}, {
  maxAge: 60 * 15,
  swr: true,
  getKey: event => getRouterParam(event, 'uuid') || '',
})
