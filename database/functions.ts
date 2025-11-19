import type { Buffer } from 'node:buffer'

/**
 * PostgreSQL function type definitions
 * Auto-generated from SQL files in database/functions/
 * Run: pnpm run db:generate-functions
 */

export interface DbFunctions {
  /**
   * Generates an MVT (Mapbox Vector Tile) for the given tile coordinates (z/x/y). Returns category_id for client-side color computation.
   */
  get_tile_mvt: {
    args: {
      z: number
      x: number
      y: number
    }
    returns: Buffer
  }
}

export type FunctionArgs<T extends keyof DbFunctions> = DbFunctions[T]['args']
export type FunctionReturns<T extends keyof DbFunctions> = DbFunctions[T]['returns']
