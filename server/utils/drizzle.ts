import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import process from 'node:process'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../database/schema'

export { and, eq, or, sql } from 'drizzle-orm'

export const tables = schema

let db: PostgresJsDatabase<typeof schema> | null = null

export function useDrizzle() {
  if (db)
    return db

  // Use Hyperdrive in production if available, fallback to direct connection
  const hyperdrive = process.env.POSTGRES || (globalThis as any).__env__?.POSTGRES || (globalThis as any).POSTGRES
  const connectionString = hyperdrive?.connectionString ?? useRuntimeConfig().databaseUrl

  db = drizzle(postgres(connectionString), { schema })
  return db
}
