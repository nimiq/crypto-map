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

  console.log('[getTileMvt] mvtData details:', {
    type: typeof mvtData,
    isBuffer: Buffer.isBuffer(mvtData),
    hasTypeKey: mvtData && typeof mvtData === 'object' && 'type' in mvtData,
    typeValue: mvtData && typeof mvtData === 'object' && 'type' in mvtData ? mvtData.type : undefined,
    constructor: mvtData?.constructor?.name,
  })

  let finalMvt: Buffer | undefined

  // Debug log the raw mvtData structure to understand why previous check might have failed
  if (mvtData && typeof mvtData === 'object') {
    console.log('[getTileMvt] mvtData keys:', Object.keys(mvtData))
    // @ts-ignore
    if ('type' in mvtData)
      console.log('[getTileMvt] mvtData.type:', mvtData.type)
    // @ts-ignore
    if ('data' in mvtData)
      console.log('[getTileMvt] mvtData.data length:', mvtData.data?.length)
  }

  // Check for JSON-serialized Buffer structure { type: 'Buffer', data: [...] }
  // We use 'any' cast to safely access properties
  const raw = mvtData as any
  if (raw && typeof raw === 'object' && raw.type === 'Buffer' && Array.isArray(raw.data)) {
    console.log('[getTileMvt] Converting JSON Buffer to Buffer instance')
    finalMvt = Buffer.from(raw.data)
  }
  // If it's a string, likely hex encoded (postgres can return \x...)
  else if (typeof mvtData === 'string') {
    console.log('[getTileMvt] Converting string to Buffer')
    const hex = mvtData.startsWith('\\x') ? mvtData.slice(2) : mvtData
    finalMvt = Buffer.from(hex, 'hex')
  }
  else if (Buffer.isBuffer(mvtData)) {
    finalMvt = mvtData
  }
  else {
    console.warn('[getTileMvt] Unknown mvtData type:', typeof mvtData)
    // Fallback: try to return as is, but it might be the issue
    finalMvt = mvtData as Buffer
  }

  if (finalMvt && Buffer.isBuffer(finalMvt)) {
    console.log('[getTileMvt] Final Buffer check:', {
      length: finalMvt.length,
      start: finalMvt.slice(0, 10).toString('hex'),
    })
  }

  console.log('[getTileMvt] Returning processed MVT')
  return finalMvt as Buffer
}
