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
        WHEN z >= 6 AND z <= 8 THEN ST_ClusterDBSCAN(
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
  -- Sub-cluster to find dense core within each cluster (tighter radius ~15-20% of original)
  dense_core AS (
    SELECT
      cluster_id, location,
      ST_ClusterDBSCAN(
        ST_Transform(location, 3857),
        CASE
          WHEN z = 6 THEN 156543.03 / POWER(2, z) * 3   -- ~17% of 18px
          WHEN z = 7 THEN 156543.03 / POWER(2, z) * 4   -- ~18% of 22px
          WHEN z = 8 THEN 156543.03 / POWER(2, z) * 5   -- ~17% of 30px
          ELSE 0
        END,
        1
      ) OVER (PARTITION BY cluster_id) AS sub_cluster_id
    FROM clustered
    WHERE cluster_id IS NOT NULL AND z >= 6 AND z <= 8
  ),
  -- Size and extent of each sub-cluster (extract bbox scalars to avoid box2d grouping issues)
  sub_cluster_stats AS (
    SELECT
      cluster_id, sub_cluster_id,
      COUNT(*) as sub_count,
      ST_XMin(ST_Extent(location)) as sub_bbox_west,
      ST_YMin(ST_Extent(location)) as sub_bbox_south,
      ST_XMax(ST_Extent(location)) as sub_bbox_east,
      ST_YMax(ST_Extent(location)) as sub_bbox_north,
      ST_Centroid(ST_Collect(ST_Transform(location, 3857))) as sub_centroid
    FROM dense_core
    WHERE sub_cluster_id IS NOT NULL
    GROUP BY cluster_id, sub_cluster_id
  ),
  -- Pick largest sub-cluster per parent cluster
  largest_sub AS (
    SELECT DISTINCT ON (cluster_id)
      cluster_id, sub_count, sub_bbox_west, sub_bbox_south, sub_bbox_east, sub_bbox_north, sub_centroid
    FROM sub_cluster_stats
    ORDER BY cluster_id, sub_count DESC
  ),
  -- Generate cluster points with dense bbox from largest sub-cluster
  cluster_points AS (
    SELECT
      c.cluster_id,
      COUNT(*) as point_count,
      COALESCE(ls.sub_centroid, ST_Centroid(ST_Collect(ST_Transform(c.location, 3857)))) as geom_3857,
      -- Use dense bbox from largest sub-cluster, fallback to full extent
      COALESCE(ls.sub_bbox_west, ST_XMin(ST_Extent(c.location))) as bbox_west,
      COALESCE(ls.sub_bbox_south, ST_YMin(ST_Extent(c.location))) as bbox_south,
      COALESCE(ls.sub_bbox_east, ST_XMax(ST_Extent(c.location))) as bbox_east,
      COALESCE(ls.sub_bbox_north, ST_YMax(ST_Extent(c.location))) as bbox_north
    FROM clustered c
    LEFT JOIN largest_sub ls ON ls.cluster_id = c.cluster_id
    WHERE c.cluster_id IS NOT NULL AND z >= 6 AND z <= 8
    GROUP BY c.cluster_id, ls.sub_bbox_west, ls.sub_bbox_south, ls.sub_bbox_east, ls.sub_bbox_north, ls.sub_centroid
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
      bbox_west,
      bbox_south,
      bbox_east,
      bbox_north,
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
      NULL::double precision as bbox_west,
      NULL::double precision as bbox_south,
      NULL::double precision as bbox_east,
      NULL::double precision as bbox_north,
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
      bbox_west,
      bbox_south,
      bbox_east,
      bbox_north,
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
  'Generates an MVT tile with clustering support. At zoom 6-8, clusters locations and uses sub-clustering to find dense core for bbox (better zoom on click). At zoom > 8, shows individual locations.';
