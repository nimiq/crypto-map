import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

export { and, eq, or, sql } from 'drizzle-orm'

export const tables = schema

let cachedDb: PostgresJsDatabase<typeof schema> | null = null
const REQUEST_CACHE_KEY = '__hyperdrivePostgresDb'

interface HyperdriveBinding {
  connectionString: string
}

interface RequestContext extends Record<string, unknown> {
  cloudflare?: {
    env?: {
      POSTGRES?: HyperdriveBinding
    }
  }
}

function createHyperdriveDb(connection: string): PostgresJsDatabase<typeof schema> {
  const client = postgres(connection, {
    max: 1,
    prepare: false,
  })

  return drizzle({ client, schema })
}

export function useDrizzle(): PostgresJsDatabase<typeof schema> {
  let event: { context?: RequestContext } | undefined
  try {
    event = useEvent() as { context?: RequestContext } | undefined
  }
  catch {}

  const hyperdrive = event?.context?.cloudflare?.env?.POSTGRES
  if (hyperdrive?.connectionString) {
    if (event?.context) {
      event.context[REQUEST_CACHE_KEY] ??= createHyperdriveDb(hyperdrive.connectionString)
      return event.context[REQUEST_CACHE_KEY] as PostgresJsDatabase<typeof schema>
    }

    return createHyperdriveDb(hyperdrive.connectionString)
  }

  if (!cachedDb) {
    const connectionString = useRuntimeConfig().databaseUrl
    const client = postgres(connectionString, {
      max: 1,
      prepare: false,
      ssl: 'require',
    })
    cachedDb = drizzle({ client, schema })
  }

  return cachedDb
}
