import Supercluster from 'supercluster'
import type { Cluster, ClusterArea, Point } from '../../types/src/index.ts'
import { toPoint } from './geo-json.ts'

export const CLUSTERS_MAX_ZOOM = 17
export const algorithm = (radius: number) => new Supercluster({ radius, maxZoom: CLUSTERS_MAX_ZOOM })

/**
 * Computes marker clusters for map display using the Supercluster algorithm.
 *
 * This function processes location data for visualization on maps by grouping
 * nearby locations into clusters at different zoom levels. It operates on
 * pre-filtered location arrays, making it compatible with dataset scoping
 * where locations are filtered by dataset ID before clustering.
 *
 * @param algorithm - Configured Supercluster instance with radius and maxZoom settings
 * @param markers - Array of location objects implementing the Point interface.
 *                  Should be pre-filtered for the desired dataset scope.
 * @param config - Clustering configuration containing zoom level and bounding box
 * @param config.zoom - Current map zoom level for clustering
 * @param config.boundingBox - Map viewport bounds for cluster retrieval
 *
 * @returns Object containing clusters (grouped locations) and singles (individual locations)
 *
 * @example
 * ```typescript
 * // Dataset-scoped clustering - locations are pre-filtered by dataset
 * const prodLocations = await getLocations(bbox, { datasetId: 'prod' })
 * const { clusters, singles } = computeMarkers(
 *   algorithm(80),
 *   prodLocations,
 *   { zoom: 10, boundingBox: bbox }
 * )
 * ```
 */
export function computeMarkers<T extends Point>(algorithm: Supercluster, markers: T[], { zoom, boundingBox: bbox }: ClusterArea) {
  // Validate input parameters for dataset-scoped clustering
  if (!Array.isArray(markers))
    throw new Error('computeMarkers: markers must be an array of location objects')

  if (zoom < 0 || zoom > CLUSTERS_MAX_ZOOM)
    throw new Error(`computeMarkers: zoom must be between 0 and ${CLUSTERS_MAX_ZOOM}, got ${zoom}`)

  const singles: T[] = []
  const clusters: Cluster[] = []

  algorithm.load(markers.map(toPoint) as GeoJSON.Feature<GeoJSON.Point, T>[])
  for (const c of algorithm.getClusters([bbox.swLng, bbox.swLat, bbox.neLng, bbox.neLat], zoom)) {
    const count = c.properties.point_count || 1

    if (count > 1) {
      const clusterId = c.properties.cluster_id
      clusters.push({
        id: clusterId,
        lng: c.geometry.coordinates[0] as number,
        lat: c.geometry.coordinates[1] as number,
        count,
        cryptocities: [],
        diameter: Math.max(24, Math.min(48, 0.24 * count + 24)), // TODO Check if this is necessary

        // Compute it lazily
        get expansionZoom() { return algorithm.getClusterExpansionZoom(clusterId) },
      })
    }
    else {
      singles.push(c.properties as T)
    }
  }

  // Return clusters and singles for the provided dataset-filtered locations
  // The clustering algorithm processes whatever locations are provided,
  // so dataset isolation is maintained through pre-filtering at the caller level
  return { clusters, singles }
}
