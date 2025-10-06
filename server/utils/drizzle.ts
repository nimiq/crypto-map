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

  const runtimeConfig = useRuntimeConfig()
  const { host, port, user, password, db: database } = runtimeConfig.postgres

  const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`

  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })

  db = drizzle(client, { schema })
  return db
}
