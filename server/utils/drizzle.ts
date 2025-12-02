import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

export { and, eq, or, sql } from 'drizzle-orm'

export const tables = schema

// Fresh connection per request to avoid stale connections in CF Workers
// TODO: Consider Hyperdrive for connection pooling if latency becomes an issue
export function useDrizzle(): PostgresJsDatabase<typeof schema> {
  const connectionString = useRuntimeConfig().databaseUrl
  return drizzle(postgres(connectionString), { schema })
}
