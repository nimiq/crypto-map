import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'

export { and, eq, or, sql } from 'drizzle-orm'

export const tables = schema

let cachedDb: PostgresJsDatabase<typeof schema> | null = null

export function useDrizzle(): PostgresJsDatabase<typeof schema> {
  if (!cachedDb) {
    const connectionString = useRuntimeConfig().databaseUrl
    cachedDb = drizzle({
      connection: {
        url: connectionString,
        max: 1,
        ssl: 'require',
      },
      schema,
    })
  }

  return cachedDb
}
