import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

export { and, eq, or, sql } from 'drizzle-orm'

export const tables = schema

const DB_KEY = '__drizzle_db__' as const

export function useDrizzle(): PostgresJsDatabase<typeof schema> {
  // Use globalThis to persist across HMR in dev
  if (!(globalThis as any)[DB_KEY]) {
    const connectionString = useRuntimeConfig().databaseUrl
    ;(globalThis as any)[DB_KEY] = drizzle(postgres(connectionString, { max: 1 }), { schema })
  }
  return (globalThis as any)[DB_KEY]
}
