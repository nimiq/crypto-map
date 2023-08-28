import { defineStore, storeToRefs } from 'pinia'
import type { AnyProps } from 'supercluster'
import Supercluster from 'supercluster'
import { ref } from 'vue'
import { useApp } from './app'
import type { BoundingBox, Cluster, Location, MemoizedCluster, Point } from '@/types'

export const useCluster = defineStore('cluster', () => {
  const { selectedCategories, selectedCurrencies } = storeToRefs(useApp())

  const clusters = ref<Cluster[]>([])

  const BASE_RADIUS = 140 // This is the max cluster radius at zoom level 0
  const DECAY_FACTOR = 1.05 // You can adjust this to change how fast the radius decreases

  function locationToPoint({ lat, lng, name }: Location): Supercluster.PointFeature<AnyProps> {
    return { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { name } }
  }

  /*
    Memoization in Clustering:

    We use memoization to optimize map performance and prevent resource-heavy site crashes.

    1. Why?
      - Memoization stores and reuses previous clusters to save resources.

    2. How?
      - `memoizedCluster` stores clusters, bounding boxes, and filters by zoom level.
      - Before re-clustering, we check for existing data matching the current zoom, bounding box, and filters.
      - If a match is found, we reuse stored clusters; otherwise, new clusters are computed and stored.

    This reduces redundant calculations and optimizes user map interactions.
  */
  const memoizedCluster = ref<Map<number, MemoizedCluster[]>>(new Map())

  const clusterAlgorithm = ref<Supercluster>()

  function cluster(locations: Location[], { neLat, neLng, swLat, swLng }: BoundingBox, zoom: number) {
    const existingData = memoizedCluster.value.get(zoom)

    if (existingData) {
      for (const { boundingBox: { neLat: memNeLat, neLng: memNeLng, swLat: memSwLat, swLng: memSwLng }, clusters: memoizedCluster, categories, currencies } of existingData) {
        const isWithinBoundingBox = neLat <= memNeLat && neLng <= memNeLng && swLat >= memSwLat && swLng >= memSwLng
        const hasSameCategories = JSON.stringify(categories) === JSON.stringify(selectedCategories.value)
        const hasSameCurrencies = JSON.stringify(currencies) === JSON.stringify(selectedCurrencies.value)
        if (isWithinBoundingBox && hasSameCategories && hasSameCurrencies) {
          clusters.value = memoizedCluster
          return
        }
      }
    }

    // Compute new clusters if not found in memoized data
    clusterAlgorithm.value = new Supercluster({
      radius: BASE_RADIUS / DECAY_FACTOR ** zoom,
    })
    clusterAlgorithm.value.load(locations.map(locationToPoint))
    clusters.value = clusterAlgorithm.value.getClusters([swLng, swLat, neLng, neLat], zoom).map((c) => {
      const center: Point = { lng: c.geometry.coordinates[0], lat: c.geometry.coordinates[1] }
      const count = c.properties.point_count || 1
      const name = count === 1 ? c.properties.name : ''
      return { center, count, clusterId: c.properties.cluster_id, name }
    })

    // Store this newly computed cluster data in memoizedData
    const newMemoizedData: MemoizedCluster = {
      boundingBox: { neLat, neLng, swLat, swLng },
      clusters: clusters.value,
      categories: selectedCategories.value,
      currencies: selectedCurrencies.value,
    }

    if (existingData)
      existingData.push(newMemoizedData)

    else
      memoizedCluster.value.set(zoom, [newMemoizedData])
  }

  return {
    clusterAlgorithm,
    cluster,
    clusters,
  }
})