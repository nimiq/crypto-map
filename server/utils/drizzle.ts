import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../database/schema'

export { and, eq, or, sql } from 'drizzle-orm'

export const tables = schema

export function useDrizzle() {
  const runtimeConfig = useRuntimeConfig()
  const { host, port, user, password, db } = runtimeConfig.postgres

  const connectionString = `postgresql://${user}:${password}@${host}:${port}/${db}`

  const client = postgres(connectionString)
  return drizzle(client, { schema })
}
