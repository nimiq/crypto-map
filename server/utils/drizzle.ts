import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../database/schema'

export { and, eq, or, sql } from 'drizzle-orm'

export const tables = schema

let db: PostgresJsDatabase<typeof schema> | null = null

export function useDrizzle() {
  if (db)
    return db
  db = drizzle(postgres(useRuntimeConfig().databaseUrl), { schema })
  return db
}
