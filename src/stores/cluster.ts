import { getClusterMaxZoom, getClusters } from 'database'
import { defineStore, storeToRefs } from 'pinia'
import type { ComputedClusterSet, LocationClusterParams, LocationClusterSet } from 'types'
import { addBBoxToArea, algorithm, bBoxIsWithinArea, toMultiPolygon } from 'shared'
import { computed, ref, shallowRef } from 'vue'
import { useLocations } from './locations'
import { useFilters } from './filters'
import { useMap } from './map'
import { DATABASE_ARGS, parseLocation } from '@/shared'
import { computeCluster } from '@/../shared/compute-cluster'

export const useCluster = defineStore('cluster', () => {
  const { setLocations, getLocations } = useLocations()
  const { filtersToString } = useFilters()
  const { zoom, boundingBox } = storeToRefs(useMap())

  /*
    With memoziation, we reduce redundant calculations/requests and optimizes user map interactions to optimize map performance:
      - `memoizedCluster` stores clusters, bounding boxes, and filters by zoom level.
      - Before re-clustering, we check for existing data matching the current zoom, bounding box, and filters.
      - If a match is found, we reuse stored clusters; otherwise, new clusters are computed and stored.
  */
  const memoized = shallowRef(new Map<LocationClusterParams, LocationClusterSet>())
  const active = ref<LocationClusterSet>()

  function getKey({ zoom, categories, currencies }: LocationClusterParams): LocationClusterParams | undefined {
    for (const key of memoized.value.keys()) {
      if (key.zoom === zoom && key.categories === categories && key.currencies === currencies)
        return key
    }
  }

  function getMemoized() {
    const obj = { zoom: zoom.value, ...filtersToString() }
    // If the key already exists, we need to reference the existing key by memory. Creating a new object, even with the same values, will not work.
    const key = getKey(obj) || obj

    const item: LocationClusterSet | undefined = memoized.value.get(key)

    // If the item exists and the bounding box is within the memoized area, we can reuse the memoized item and there is no need to re-cluster
    const needsToUpdate = !item || !bBoxIsWithinArea(boundingBox.value!, item.memoizedArea)

    // Update the memoized item if it exists
    if (!needsToUpdate) {
      active.value = undefined
      active.value = item
    }

    return { key, item, needsToUpdate }
  }

  let maxZoomFromServer: number | undefined
  async function shouldRunInClient({ zoom, categories, currencies }: LocationClusterParams): Promise<boolean> {
    // We cannot compute all clusters combinations in the server, if user has selected currencies or categories
    // we need to compute the clusters in the client
    if (currencies || categories)
      return true
    maxZoomFromServer ||= await getClusterMaxZoom(DATABASE_ARGS)
    return zoom > maxZoomFromServer
  }

  async function getClusterFromClient(): Promise<ComputedClusterSet> {
    const locations = await getLocations(boundingBox.value!)
    return computeCluster(algorithm, locations, { boundingBox: boundingBox.value!, zoom: zoom.value })
  }

  async function getClusterFromDatabase(): Promise<ComputedClusterSet> {
    const res = await getClusters(DATABASE_ARGS, boundingBox.value!, zoom.value, parseLocation)
    setLocations(res.singles)
    return res
  }

  async function cluster() {
    const { item, key, needsToUpdate } = getMemoized()

    if (!needsToUpdate)
      return

    const { clusters: newClusters, singles: newSingles } = await shouldRunInClient(key)
      ? await getClusterFromClient()
      : await getClusterFromDatabase()

    if (item) {
      item.memoizedArea = addBBoxToArea(boundingBox.value!, item.memoizedArea)
      item.memoizedClusters.forEach(cluster => newClusters.push(cluster))
      item.memoizedSingles.forEach(single => newSingles.push(single))
    }
    else {
      memoized.value.set(key, {
        memoizedArea: toMultiPolygon(boundingBox.value!).geometry,
        memoizedClusters: newClusters,
        memoizedSingles: newSingles,
      })
    }

    active.value = memoized.value.get(key)
  }

  return {
    cluster,
    clusters: computed(() => active.value?.memoizedClusters || []),
    singles: computed(() => {
      return active.value?.memoizedSingles || []
    }),
    getMemoized,
  }
})
