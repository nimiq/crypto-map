import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

export { and, eq, or, sql } from 'drizzle-orm'

export const tables = schema

let cachedDb: PostgresJsDatabase<typeof schema> | null = null

export function useDrizzle(): PostgresJsDatabase<typeof schema> {
  // Try to get Hyperdrive from Cloudflare context via Nitro's async context
  let hyperdrive: { connectionString: string } | undefined
  try {
    const event = useEvent()
    hyperdrive = event?.context?.cloudflare?.env?.POSTGRES as { connectionString: string } | undefined
  }
  catch {
    // useEvent() may fail outside of request context (e.g., in scripts)
  }

  // If we have Hyperdrive, always use its connection string (it handles pooling)
  if (hyperdrive?.connectionString) {
    // Don't cache Hyperdrive connections - they're pooled by Cloudflare
    return drizzle(postgres(hyperdrive.connectionString, { max: 1 }), { schema })
  }

  // Fallback: cache connection for local dev
  if (!cachedDb) {
    const connectionString = useRuntimeConfig().databaseUrl
    cachedDb = drizzle(postgres(connectionString, { max: 1 }), { schema })
  }
  return cachedDb
}
