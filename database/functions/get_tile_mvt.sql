-- Function to generate MVT tiles with clustering support
-- At low zoom levels (< 13), clusters locations that are close together
-- At high zoom levels (>= 13), shows individual locations
-- Clusters only appear when 100+ locations would be in the same visual area
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
  -- Get all locations in this tile
  tile_locations AS (
    SELECT
      l.uuid,
      l.name,
      l.rating,
      l.location,
      COALESCE(
        (SELECT c.id FROM categories c JOIN location_categories lc ON lc.category_id = c.id WHERE lc.location_uuid = l.uuid LIMIT 1),
        'misc'
      ) AS category_id
    FROM locations l, bounds
    WHERE ST_Intersects(
      l.location,
      ST_Transform(bounds.geom, 4326)
    )
  ),
  -- At low zoom, cluster locations using spatial clustering
  -- Distance threshold varies by zoom: more clustering at lower zooms
  clustered AS (
    SELECT
      uuid,
      name,
      rating,
      category_id,
      location,
      CASE
        WHEN z <= 8 THEN ST_ClusterDBSCAN(
          ST_Transform(location, 3857),
          -- Dynamic cluster radius based on screen pixels converted to meters
          -- Formula: pixels_on_screen * meters_per_pixel_at_zoom
          -- At equator: meters_per_pixel = 156543.03 * cos(0) / (2^zoom)
          -- Smaller radius = more distinct clusters (tighter grouping)
          CASE
            WHEN z <= 4 THEN 156543.03 / POWER(2, z) * 8    -- ~8px spacing (includes z3)
            WHEN z = 5 THEN 156543.03 / POWER(2, z) * 11    -- ~11px spacing (more clusters)
            WHEN z = 6 THEN 156543.03 / POWER(2, z) * 18    -- ~18px spacing
            WHEN z = 7 THEN 156543.03 / POWER(2, z) * 22    -- ~22px spacing
            WHEN z = 8 THEN 156543.03 / POWER(2, z) * 30    -- ~30px spacing
            ELSE 0
          END,
          1  -- Minimum 1 point to form cluster
        ) OVER ()
        ELSE NULL  -- No clustering above zoom 8
      END AS cluster_id
    FROM tile_locations
  ),
  -- Generate cluster points (centroids with counts)
  cluster_points AS (
    SELECT
      cluster_id,
      COUNT(*) as point_count,
      ST_Centroid(ST_Collect(ST_Transform(location, 3857))) as geom_3857
    FROM clustered
    WHERE cluster_id IS NOT NULL AND z <= 8
    GROUP BY cluster_id
    HAVING COUNT(*) >= CASE
      WHEN z <= 4 THEN 2    -- Very low threshold at world view
      WHEN z <= 6 THEN 3    -- Allow small clusters at continent/country
      WHEN z <= 7 THEN 5    -- Moderate threshold at region view
      ELSE 10               -- Higher threshold only at city view (z=8)
    END
  ),
  -- Individual locations (non-clustered or high zoom)
  individual_locations AS (
    SELECT
      c.uuid,
      c.name,
      c.rating,
      c.category_id,
      NULL::integer as point_count,  -- NULL for individual points
      ST_Transform(c.location, 3857) as geom_3857
    FROM clustered c
    LEFT JOIN cluster_points cp ON c.cluster_id = cp.cluster_id
    WHERE
      -- Show individual points if:
      -- 1. Above clustering range (> 8), OR
      -- 2. Not part of a cluster (cluster_id IS NULL), OR
      -- 3. Part of a small cluster (< 50 points)
      z > 8
      OR c.cluster_id IS NULL
      OR cp.cluster_id IS NULL
  ),
  -- Combine clusters and individual locations
  combined AS (
    -- Cluster points
    SELECT
      NULL::text as uuid,
      NULL::text as name,
      NULL::numeric as rating,
      NULL::text as category_id,
      point_count,
      geom_3857
    FROM cluster_points

    UNION ALL

    -- Individual locations
    SELECT
      uuid::text,
      name,
      rating,
      category_id,
      point_count,
      geom_3857
    FROM individual_locations
  ),
  -- Convert to MVT geometry
  mvt_data AS (
    SELECT
      uuid,
      name,
      rating,
      category_id,
      point_count,
      ST_AsMVTGeom(
        geom_3857,
        bounds.geom,
        4096,
        256,
        false
      ) AS geom
    FROM combined, bounds
  )
  SELECT ST_AsMVT(mvt_data.*, 'locations')
  FROM mvt_data
  WHERE geom IS NOT NULL
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_tile_mvt(integer, integer, integer) IS
  'Generates an MVT tile with clustering support. At zoom <= 8, clusters locations within proximity (min 50-100 locations). At zoom > 8, shows individual locations. Returns point_count for clusters, NULL for individual locations.';
