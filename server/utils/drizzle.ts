import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'

export { and, eq, or, sql } from 'drizzle-orm'

export const tables = schema

let cachedDb: PostgresJsDatabase<typeof schema> | null = null
const REQUEST_CACHE_KEY = '__hyperdrivePostgresDb'
type HyperdriveBinding = { connectionString: string }
type RequestContext = Record<string, unknown> & {
  cloudflare?: {
    env?: {
      POSTGRES?: HyperdriveBinding
    }
  }
}

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
  let event: { context?: RequestContext } | undefined
  try {
    event = useEvent() as { context?: RequestContext } | undefined
  }
  catch {
    // useEvent() is not available in scripts or other non-request contexts.
  }

  const hyperdrive = event?.context?.cloudflare?.env?.POSTGRES
  if (hyperdrive?.connectionString) {
    if (event?.context) {
      event.context[REQUEST_CACHE_KEY] ??= createDb(hyperdrive.connectionString)
      return event.context[REQUEST_CACHE_KEY] as PostgresJsDatabase<typeof schema>
    }

    return createDb(hyperdrive.connectionString)
  }

  if (!cachedDb) {
    const connectionString = useRuntimeConfig().databaseUrl
    cachedDb = createDb(connectionString)
  }

  return cachedDb
}
