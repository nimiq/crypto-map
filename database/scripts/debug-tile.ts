import { consola } from 'consola'

const logger = consola.withTag('debug-tile')

async function main() {
  const db = useDrizzle()

  // Check a sample tile's raw data
  const result = await db.execute(`
    SELECT 
      l.uuid,
      l.name,
      ST_GeometryType(l.location) as geom_type,
      ST_AsText(l.location) as location_wkt,
      l.location IS NULL as is_null
    FROM locations l
    LIMIT 5
  `)

  logger.info('Sample location data:')
  console.log(result)

  // Check if MVT function exists
  const funcCheck = await db.execute(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_name = 'get_tile_mvt'
  `)

  logger.info('MVT function exists:', funcCheck.length > 0)
}

main()
