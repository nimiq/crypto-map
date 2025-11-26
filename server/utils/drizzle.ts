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

  const connectionString = process.env.DATABASE_URL
  if (!connectionString)
    throw new Error('DATABASE_URL is required')

  db = drizzle(postgres(connectionString), { schema })
  return db
}
