<script setup lang="ts">
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ClusterInfo } from '~/composables/useVisibleLocations'
import { Marker } from 'maplibre-gl'

interface CountryHotspot {
  code: 'SV' | 'CH'
  name: string
  center: { lat: number, lng: number }
  flagIcon: string
  zoom: number
}

const COUNTRY_HOTSPOTS: CountryHotspot[] = [
  { code: 'SV', name: 'El Salvador', center: { lat: 13.8, lng: -88.9 }, flagIcon: 'nimiq-flags:sv-hexagon', zoom: 8 },
  { code: 'CH', name: 'Switzerland', center: { lat: 46.8, lng: 8.2 }, flagIcon: 'nimiq-flags:ch-hexagon', zoom: 5.9 },
]

const BUBBLE_PADDING = 8
const BUBBLE_WIDTH = 160
const BUBBLE_HEIGHT = 56

const { mapInstance, flyTo, viewCenter } = useMapControls()
const { locationCount, clusterCount, clusters } = useVisibleLocations()
const { width: windowWidth, height: windowHeight } = useWindowSize()

// Fetch country counts (cached, for edge bubbles)
const { data: countryCounts } = useFetch<Record<string, number>>('/api/locations/country-counts', {
  default: () => ({}),
  lazy: true,
})

// Track MapLibre markers for cluster bubbles
const clusterMarkers = shallowRef(new Map<string, Marker>())
const markerRefs = shallowRef(new Map<string, HTMLElement>())

// Match cluster to closest country hotspot
function matchClusterToCountry(cluster: ClusterInfo): CountryHotspot {
  return COUNTRY_HOTSPOTS.reduce((prev, curr) => {
    const prevDist = Math.abs(prev.center.lat - cluster.lat) + Math.abs(prev.center.lng - cluster.lng)
    const currDist = Math.abs(curr.center.lat - cluster.lat) + Math.abs(curr.center.lng - cluster.lng)
    return currDist < prevDist ? curr : prev
  })
}

// Cluster bubbles to show (via MapLibre Markers)
const clusterBubbles = computed(() => {
  // Show cluster bubbles when we have 1-2 clusters and no individual locations
  if (locationCount.value > 0 || clusterCount.value === 0 || clusterCount.value > 2)
    return []

  return clusters.value.map((cluster) => {
    const country = matchClusterToCountry(cluster)
    return { ...country, lng: cluster.lng, lat: cluster.lat, count: cluster.pointCount }
  })
})

// Manage MapLibre markers lifecycle
watch([clusterBubbles, mapInstance], async ([bubbles, map]) => {
  if (!map)
    return

  // Wait for Vue to render elements
  await nextTick()

  const currentKeys = new Set(bubbles.map(b => b.code))

  // Remove markers that are no longer needed
  for (const [key, marker] of clusterMarkers.value.entries()) {
    if (!currentKeys.has(key as 'SV' | 'CH')) {
      marker.remove()
      clusterMarkers.value.delete(key)
      markerRefs.value.delete(key)
    }
  }

  // Add/update markers
  for (const bubble of bubbles) {
    let marker = clusterMarkers.value.get(bubble.code)
    const el = markerRefs.value.get(bubble.code)

    if (!marker && el) {
      marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat([bubble.lng, bubble.lat])
        .addTo(map as unknown as MapLibreMap)
      clusterMarkers.value.set(bubble.code, marker)
    }
    else if (marker) {
      marker.setLngLat([bubble.lng, bubble.lat])
    }
  }
}, { immediate: true })

// Cleanup on unmount
onUnmounted(() => {
  for (const marker of clusterMarkers.value.values()) {
    marker.remove()
  }
  clusterMarkers.value.clear()
})

// Calculate rhumb line bearing (straight line on Mercator projection)
function calculateMercatorBearing(from: { lat: number, lng: number }, to: { lat: number, lng: number }): number {
  const toRad = Math.PI / 180
  const y1 = Math.log(Math.tan(Math.PI / 4 + (from.lat * toRad) / 2))
  const y2 = Math.log(Math.tan(Math.PI / 4 + (to.lat * toRad) / 2))

  let dLng = to.lng - from.lng
  if (Math.abs(dLng) > 180)
    dLng = dLng > 0 ? dLng - 360 : dLng + 360

  const bearing = Math.atan2(dLng * toRad, y2 - y1) * 180 / Math.PI
  return (bearing + 360) % 360
}

// Convert bearing to edge position on screen
function getEdgePosition(bearing: number, vpWidth: number, vpHeight: number): { x: number, y: number } {
  const angle = (90 - bearing) * Math.PI / 180
  const centerX = vpWidth / 2
  const centerY = vpHeight / 2

  const maxX = vpWidth - BUBBLE_PADDING - BUBBLE_WIDTH / 2
  const minX = BUBBLE_PADDING + BUBBLE_WIDTH / 2
  const maxY = vpHeight - BUBBLE_PADDING - BUBBLE_HEIGHT / 2
  const minY = BUBBLE_PADDING + BUBBLE_HEIGHT / 2 + 60

  const dx = Math.cos(angle)
  const dy = -Math.sin(angle)

  let t = Infinity
  if (dx > 0)
    t = Math.min(t, (maxX - centerX) / dx)
  if (dx < 0)
    t = Math.min(t, (minX - centerX) / dx)
  if (dy > 0)
    t = Math.min(t, (maxY - centerY) / dy)
  if (dy < 0)
    t = Math.min(t, (minY - centerY) / dy)

  return {
    x: Math.max(minX, Math.min(maxX, centerX + dx * t)),
    y: Math.max(minY, Math.min(maxY, centerY + dy * t)),
  }
}

// Edge bubbles: shown when no locations/clusters visible
const edgeBubbles = computed(() => {
  if (!mapInstance.value)
    return []

  const total = locationCount.value + clusterCount.value
  if (total > 0)
    return []

  const vpWidth = windowWidth.value
  const vpHeight = windowHeight.value
  if (!vpWidth || !vpHeight)
    return []

  const center = viewCenter.value
  return COUNTRY_HOTSPOTS.map((country) => {
    const bearing = calculateMercatorBearing(center, country.center)
    const position = getEdgePosition(bearing, vpWidth, vpHeight)
    const arrowAngle = bearing
    const count = countryCounts.value?.[country.code] || null

    return { ...country, position, arrowAngle, count }
  })
})

function flyToCountry(country: CountryHotspot) {
  flyTo(country.center, country.zoom)
}

function setMarkerRef(code: string, el: HTMLElement | null) {
  if (el) {
    markerRefs.value.set(code, el)
  }
}
</script>

<template>
  <ClientOnly>
    <!-- Edge bubbles: fixed position DOM elements -->
    <Teleport to="body">
      <TransitionGroup name="bubble">
        <Motion
          is="button"
          v-for="bubble in edgeBubbles"
          :key="bubble.code"
          :style="{ left: `${bubble.position.x}px`, top: `${bubble.position.y}px` }"
          cursor-pointer fixed z-50
          translate-x="-1/2" translate-y="-1/2"
          :initial="{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }"
          :animate="{ opacity: 1, scale: 1, filter: 'blur(0px)' }"
          :exit="{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }"
          :transition="{ type: 'spring', stiffness: 300, damping: 25 }"
          @click="flyToCountry(bubble)"
        >
          <div flex="~ items-center gap-8" outline="~ offset--1.5 1.5 neutral/20" p-8 rounded-12 bg-neutral-0 shadow-lg>
            <Icon :name="bubble.flagIcon" shrink-0 size-28 />
            <div flex="~ col" text-left>
              <span text="14 neutral-900" lh-tight font-semibold>{{ bubble.name }}</span>
              <span v-if="bubble.count" text="12 neutral-700" lh-tight>{{ bubble.count }} locations</span>
            </div>
            <Icon name="i-tabler:navigation-filled" text-neutral-600 size-14 :style="{ transform: `rotate(${bubble.arrowAngle}deg)` }" />
          </div>
        </Motion>
      </TransitionGroup>
    </Teleport>

    <!-- Cluster bubbles: rendered offscreen, MapLibre Marker moves them to correct position -->
    <Teleport to="body">
      <button
        v-for="bubble in clusterBubbles"
        :key="`marker-${bubble.code}`"
        :ref="(el) => setMarkerRef(bubble.code, el as HTMLElement)"
        cursor-pointer absolute left--9999
        @click="flyToCountry(bubble)"
      >
        <div flex="~ items-center gap-8" outline="~ offset--1.5 1.5 neutral/20" p-8 rounded-12 bg-neutral-0 shadow-lg>
          <Icon :name="bubble.flagIcon" shrink-0 size-28 />
          <div flex="~ col" text-left>
            <span text="14 neutral-900" lh-tight font-semibold>{{ bubble.name }}</span>
            <span v-if="bubble.count" text="12 neutral-700" lh-tight>{{ bubble.count }} locations</span>
          </div>
        </div>
      </button>
    </Teleport>
  </ClientOnly>
</template>

<style scoped>
.bubble-move,
.bubble-enter-active,
.bubble-leave-active {
  transition: all 0.3s ease;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.8);
  filter: blur(4px);
}

.bubble-leave-active {
  position: fixed;
}
</style>
