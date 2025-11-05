-- Function to generate MVT tiles for locations (simplified)
-- Returns bytea (binary MVT data)
CREATE OR REPLACE FUNCTION get_tile_mvt(
  z integer,
  x integer,
  y integer
)
RETURNS bytea
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  WITH bounds AS (
    SELECT ST_TileEnvelope(z, x, y) AS geom
  ),
  mvt_data AS (
    SELECT
      l.uuid,
      l.name,
      COALESCE(
        (SELECT c.icon FROM categories c JOIN location_categories lc ON lc.category_id = c.id WHERE lc.location_uuid = l.uuid LIMIT 1),
        'tabler:map-pin'
      ) AS icon_name,
      ST_AsMVTGeom(
        ST_Transform(l.location, 3857),
        bounds.geom,
        4096,
        0,
        false
      ) AS geom
    FROM locations l, bounds
    WHERE ST_Intersects(
      l.location,
      ST_Transform(bounds.geom, 4326)
    )
  )
  SELECT ST_AsMVT(mvt_data.*, 'locations')
  FROM mvt_data
  WHERE geom IS NOT NULL
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_tile_mvt(integer, integer, integer) IS
  'Generates an MVT (Mapbox Vector Tile) for the given tile coordinates (z/x/y). Returns binary MVT data.';
