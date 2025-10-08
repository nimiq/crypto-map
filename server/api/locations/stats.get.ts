import { count } from 'drizzle-orm'

export default defineCachedEventHandler(async () => {
  const totalLocations = await useDrizzle()
    .select({ count: count() })
    .from(tables.locations)
    .then(res => res.at(0)?.count ?? 0)
  return { totalLocations }
}, { maxAge: 60 * 60 * 24, swr: true })
