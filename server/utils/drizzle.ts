import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'

export { and, eq, or, sql } from 'drizzle-orm'

export const tables = schema

let cachedDb: PostgresJsDatabase<typeof schema> | null = null

function createDb(connection: string): PostgresJsDatabase<typeof schema> {
  return drizzle({
    connection: {
      url: connection,
      max: 1,
      prepare: false,
      ssl: 'require',
    },
    schema,
  })
}

export function useDrizzle(): PostgresJsDatabase<typeof schema> {
  if (!cachedDb) {
    const connectionString = useRuntimeConfig().databaseUrl
    cachedDb = createDb(connectionString)
  }

  return cachedDb
}
