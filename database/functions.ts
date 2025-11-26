/**
 * PostgreSQL function type definitions
 * Auto-generated from SQL files in database/functions/
 * Run: pnpm run db:generate-functions
 */

export interface DbFunctions {
  /**
   * Generates an MVT tile with clustering support. At zoom <= 8, clusters locations within proximity (min 50-100 locations). At zoom > 8, shows individual locations. Returns point_count for clusters, NULL for individual locations.
   */
  get_tile_mvt: {
    args: {
      z: number
      x: number
      y: number
    }
    returns: unknown
  }
}

export type FunctionArgs<T extends keyof DbFunctions> = DbFunctions[T]['args']
export type FunctionReturns<T extends keyof DbFunctions> = DbFunctions[T]['returns']
