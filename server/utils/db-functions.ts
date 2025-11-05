import { sql } from 'drizzle-orm'

/**
 * Get MVT tile for given coordinates
 */
export async function getTileMvt(z: number, x: number, y: number): Promise<Buffer> {
  const db = useDrizzle()

  const result = await db.execute(
    sql`SELECT get_tile_mvt(${z}, ${x}, ${y})`,
  )

  console.log('[getTileMvt] Raw result:', {
    isArray: Array.isArray(result),
    type: typeof result,
    keys: Object.keys(result),
  })

  const row = Array.isArray(result) ? result[0] : (result as { rows?: unknown[] })?.rows?.[0]

  console.log('[getTileMvt] Extracted row:', {
    row,
    hasGetTileMvt: row && 'get_tile_mvt' in row,
    type: typeof row?.get_tile_mvt,
    isBuffer: Buffer.isBuffer(row?.get_tile_mvt),
  })

  const mvtData = (row as { get_tile_mvt?: Buffer })?.get_tile_mvt

  // If it's a plain object with type: "Buffer", convert to actual Buffer
  if (mvtData && typeof mvtData === 'object' && 'type' in mvtData && mvtData.type === 'Buffer' && 'data' in mvtData) {
    console.log('[getTileMvt] Converting JSON Buffer to Buffer instance')
    return Buffer.from((mvtData as { data: number[] }).data)
  }

  return mvtData as Buffer
}
