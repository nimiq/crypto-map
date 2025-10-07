import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../database/schema'

export { and, eq, ilike, or, sql } from 'drizzle-orm'

export const tables = schema

let db: PostgresJsDatabase<typeof schema> | null = null

export function useDrizzle() {
  if (db)
    return db

  const runtimeConfig = useRuntimeConfig()
  const connectionString = runtimeConfig.databaseUrl

  const client = postgres(connectionString, {
    prepare: false, // Required for Supabase transaction pooler
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })

  db = drizzle(client, { schema })
  return db
}
