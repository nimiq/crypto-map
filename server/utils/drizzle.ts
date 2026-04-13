import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'

export { and, eq, or, sql } from 'drizzle-orm'

export const tables = schema

let cachedDb: PostgresJsDatabase<typeof schema> | null = null

export function useDrizzle(): PostgresJsDatabase<typeof schema> {
  let hyperdrive: { connectionString: string } | undefined
  try {
    const event = useEvent()
    hyperdrive = event?.context?.cloudflare?.env?.POSTGRES as { connectionString: string } | undefined
  }
  catch {
    // useEvent() is not available in scripts or other non-request contexts.
  }

  if (hyperdrive?.connectionString) {
    return drizzle({
      connection: hyperdrive.connectionString,
      schema,
    })
  }

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
