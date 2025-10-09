-- Test script to verify GIST index usage with EXPLAIN ANALYZE
-- Run this against your PostgreSQL database to verify the optimizations

-- 1. Test text search with geospatial filter (walkable distance)
-- This should show the location_spatial_idx GIST index being used
EXPLAIN ANALYZE
WITH text_query AS (
  SELECT l.uuid,
         l.name,
         l.address,
         ST_Y(l.location) as latitude,
         ST_X(l.location) as longitude,
         l.rating,
         l.photo,
         l."gmapsPlaceId",
         l."gmapsUrl",
         l.website,
         l.source,
         l.timezone,
         l."openingHours",
         l."createdAt",
         l."updatedAt",
         ts_headline('english', l.name, to_tsquery('english', 'cafe'), 'StartSel=<mark>, StopSel=</mark>') as "highlightedName",
         ST_Distance(
           l.location::geography,
           ST_SetSRID(ST_MakePoint(8.9511, 46.0037), 4326)::geography
         ) as "distanceMeters"
  FROM locations l
  WHERE to_tsvector('english', l.name || ' ' || l.address) @@ to_tsquery('english', 'cafe')
    AND ST_DWithin(
      l.location::geography,
      ST_SetSRID(ST_MakePoint(8.9511, 46.0037), 4326)::geography,
      1500
    )
)
SELECT tq.*,
       STRING_AGG(lc."categoryId", ',') as "categoryIds",
       COALESCE(
         json_agg(
           json_build_object(
             'id', c.id,
             'name', c.name,
             'icon', c.icon
           )
         ) FILTER (WHERE c.id IS NOT NULL),
         '[]'
       ) as categories
FROM text_query tq
LEFT JOIN location_categories lc ON tq.uuid = lc."locationUuid"
LEFT JOIN categories c ON lc."categoryId" = c.id
GROUP BY tq.uuid, tq.name, tq.address, tq.latitude, tq.longitude, tq.rating, tq.photo,
         tq."gmapsPlaceId", tq."gmapsUrl", tq.website, tq.source, tq.timezone,
         tq."openingHours", tq."createdAt", tq."updatedAt", tq."highlightedName", tq."distanceMeters"
ORDER BY tq."distanceMeters"
LIMIT 10;

-- 2. Test semantic search with geospatial filter
-- This should also show the location_spatial_idx GIST index being used
EXPLAIN ANALYZE
WITH similar_categories AS (
  SELECT id
  FROM categories
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> '[0.1, 0.2, 0.3, ...]'::vector) >= 0.7
  ORDER BY 1 - (embedding <=> '[0.1, 0.2, 0.3, ...]'::vector) DESC
  LIMIT 5
)
SELECT l.uuid,
       l.name,
       l.address,
       ST_Y(l.location) as latitude,
       ST_X(l.location) as longitude,
       l.rating,
       l.photo,
       l."gmapsPlaceId",
       l."gmapsUrl",
       l.website,
       l.source,
       l.timezone,
       l."openingHours",
       l."createdAt",
       l."updatedAt",
       STRING_AGG(lc."categoryId", ',') as "categoryIds",
       COALESCE(
         json_agg(
           json_build_object(
             'id', c.id,
             'name', c.name,
             'icon', c.icon
           )
         ) FILTER (WHERE c.id IS NOT NULL),
         '[]'
       ) as categories,
       ST_Distance(
         l.location::geography,
         ST_SetSRID(ST_MakePoint(8.9511, 46.0037), 4326)::geography
       ) as "distanceMeters"
FROM locations l
INNER JOIN location_categories lc ON l.uuid = lc."locationUuid"
INNER JOIN similar_categories sc ON lc."categoryId" = sc.id
LEFT JOIN categories c ON lc."categoryId" = c.id
WHERE ST_DWithin(
  l.location::geography,
  ST_SetSRID(ST_MakePoint(8.9511, 46.0037), 4326)::geography,
  1500
)
GROUP BY l.uuid
ORDER BY "distanceMeters"
LIMIT 10;

-- 3. Verify that the GIST index exists
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'locations'
  AND indexname LIKE '%spatial%';

-- Expected output should show:
-- - Index Scan or Bitmap Index Scan using location_spatial_idx
-- - The GIST index should be used for ST_DWithin operations
-- - Query execution time should be significantly faster than sequential scan
