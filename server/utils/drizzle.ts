import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../database/schema'

export { and, eq, or, sql } from 'drizzle-orm'

export const tables = schema

export function useDrizzle() {
  return drizzle(hubDatabase(), { schema })
}

export type Location = typeof schema.locations.$inferSelect
export type Category = typeof schema.categories.$inferSelect
export type LocationCategory = typeof schema.locationCategories.$inferSelect
