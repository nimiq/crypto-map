import { Buffer } from 'node:buffer'

import { sql } from 'drizzle-orm'

/**
 * Get MVT tile for given coordinates with clustering support
 */
export async function getTileMvt(z: number, x: number, y: number): Promise<Buffer> {
  const db = useDrizzle()

  const result = await db.execute(
    sql`SELECT get_tile_mvt(${z}, ${x}, ${y})`,
  )

  const row = Array.isArray(result) ? result[0] : (result as { rows?: unknown[] })?.rows?.[0]
  const mvtData: unknown = (row as { get_tile_mvt?: unknown })?.get_tile_mvt

  let finalMvt: Buffer | undefined

  // Check for JSON-serialized Buffer structure { type: 'Buffer', data: [...] }
  if (mvtData && typeof mvtData === 'object' && 'type' in mvtData && (mvtData as any).type === 'Buffer' && Array.isArray((mvtData as any).data)) {
    finalMvt = Buffer.from((mvtData as any).data)
  }
  // If it's a string, likely hex encoded (postgres can return \x...)
  else if (typeof mvtData === 'string') {
    const hex = mvtData.startsWith('\\x') ? mvtData.slice(2) : mvtData
    finalMvt = Buffer.from(hex, 'hex')
  }
  else if (Buffer.isBuffer(mvtData)) {
    finalMvt = mvtData
  }
  else {
    finalMvt = undefined // Explicitly set to undefined if no valid type found
  }

  if (!finalMvt) {
    throw new Error('Could not process MVT data into a Buffer')
  }

  return finalMvt
}
