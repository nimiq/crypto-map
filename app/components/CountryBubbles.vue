<script setup lang="ts">
import type { Map as MapLibreMap } from 'maplibre-gl'
import { icons as flagIcons } from '@iconify-json/flag'
import { Marker } from 'maplibre-gl'

interface CountryHotspot {
  code: 'SV' | 'CH'
  name: string
  center: { lat: number, lng: number }
  flagIcon: string
  zoom: number
}

const COUNTRY_HOTSPOTS: CountryHotspot[] = [
  { code: 'SV', name: 'El Salvador', center: { lat: 13.7942, lng: -88.8965 }, flagIcon: 'flag:sv-4x3', zoom: 6.8 },
  { code: 'CH', name: 'Switzerland', center: { lat: 46.8, lng: 8.2 }, flagIcon: 'flag:ch-4x3', zoom: 6.5 },
]

const BUBBLE_PADDING = 8
const BUBBLE_WIDTH = 160
const BUBBLE_HEIGHT = 56

const { mapInstance, flyTo, viewCenter } = useMapControls()
const { locationCount, clusterCount } = useVisibleLocations()
const { width: windowWidth, height: windowHeight } = useWindowSize()

// Fetch country counts (cached)
const { data: countryCounts } = useFetch<Record<string, number>>('/api/locations/country-counts', {
  default: () => ({}),
  lazy: true,
})

// Track MapLibre markers for lat/lng bubbles
type CountryCode = 'SV' | 'CH'
const markers = new Map<CountryCode, Marker>()

// Hide bubbles during fly animation
const isFlying = ref(false)

// Show bubbles when nothing visible on map and not flying
const showBubbles = computed(() => !isFlying.value && locationCount.value === 0 && clusterCount.value === 0)

// Check if a point is within current map viewport
function isPointInViewport(point: { lat: number, lng: number }): boolean {
  if (!mapInstance.value)
    return false
  try {
    const bounds = mapInstance.value.getBounds()
    return bounds.contains([point.lng, point.lat])
  }
  catch {
    return false
  }
}

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

interface Bubble extends CountryHotspot {
  count: number | null
  latlng?: { lat: number, lng: number }
  edge?: { x: number, y: number, arrowAngle: number }
}

// Compute bubbles - either at country center (in view) or at edge (out of view)
const bubbles = computed<Bubble[]>(() => {
  if (!showBubbles.value || !mapInstance.value)
    return []

  const vpWidth = windowWidth.value
  const vpHeight = windowHeight.value
  if (!vpWidth || !vpHeight)
    return []

  return COUNTRY_HOTSPOTS.map((country) => {
    const count = countryCounts.value?.[country.code] || null
    const inView = isPointInViewport(country.center)

    if (inView) {
      // Show at country center (MapLibre Marker)
      return { ...country, count, latlng: country.center }
    }
    else {
      // Show at edge with arrow
      const bearing = calculateMercatorBearing(viewCenter.value, country.center)
      const position = getEdgePosition(bearing, vpWidth, vpHeight)
      return { ...country, count, edge: { ...position, arrowAngle: bearing } }
    }
  })
})

// Separate computed for each type - if any country is in view, hide all edge bubbles
const latlngBubbles = computed(() => bubbles.value.filter(b => b.latlng))
const edgeBubbles = computed(() => latlngBubbles.value.length > 0 ? [] : bubbles.value.filter(b => b.edge))

// Create marker element programmatically (lat/lng bubbles - no navigation icon)
function createMarkerElement(country: CountryHotspot): HTMLElement {
  const button = document.createElement('button')
  button.className = 'country-bubble-marker'
  button.style.cssText = 'cursor: pointer; background: none; border: none; padding: 0;'
  button.addEventListener('click', () => flyToCountry(country))

  const container = document.createElement('div')
  container.style.cssText = `
    display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 12px;
    background: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    outline: 1.5px solid rgb(0 0 0 / 0.2); outline-offset: -1.5px;
  `

  // Flag container with rounded corners (original icon size, clipped)
  const flagContainer = document.createElement('span')
  flagContainer.style.cssText = 'flex-shrink: 0; border-radius: 4px; overflow: hidden; display: flex;'

  const textContainer = document.createElement('div')
  textContainer.style.cssText = 'display: flex; flex-direction: column; text-align: left;'

  const nameSpan = document.createElement('span')
  nameSpan.style.cssText = 'font-size: 14px; color: #1f2937; line-height: 1.25; font-weight: 600;'
  nameSpan.textContent = country.name

  const countSpan = document.createElement('span')
  countSpan.style.cssText = 'font-size: 12px; color: #374151; line-height: 1.25;'
  countSpan.className = 'location-count'

  textContainer.appendChild(nameSpan)
  textContainer.appendChild(countSpan)
  container.appendChild(flagContainer)
  container.appendChild(textContainer)
  button.appendChild(container)

  // Load icon from bundled package
  loadIcon(country.flagIcon, flagContainer)

  return button
}

// Load icon from bundled @iconify-json/flag
function loadIcon(iconName: string, container: HTMLElement) {
  // Parse icon name (format: "flag:sv-4x3")
  const [collection, name] = iconName.split(':')
  if (collection !== 'flag' || !name)
    return

  const iconData = flagIcons.icons[name]
  if (!iconData)
    return

  const width = flagIcons.width || 640
  const height = flagIcons.height || 480
  container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">${iconData.body}</svg>`
}

// Update marker count text
function updateMarkerCount(marker: Marker, count: number | null) {
  const el = marker.getElement()
  const countSpan = el.querySelector('.location-count') as HTMLElement
  if (countSpan) {
    countSpan.textContent = count ? `${count} locations` : ''
  }
}

// Sync markers: create/remove/update as needed
function syncMarkers() {
  const map = mapInstance.value
  if (!map)
    return

  const currentCodes = new Set(latlngBubbles.value.map(b => b.code))

  // Remove markers for countries no longer visible at lat/lng
  for (const [code, marker] of markers.entries()) {
    if (!currentCodes.has(code)) {
      marker.remove()
      markers.delete(code)
    }
  }

  // Create/update markers for current latlng bubbles
  for (const bubble of latlngBubbles.value) {
    if (!bubble.latlng)
      continue

    const country = COUNTRY_HOTSPOTS.find(c => c.code === bubble.code)!
    let marker = markers.get(bubble.code)

    if (!marker) {
      const el = createMarkerElement(country)
      marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat([bubble.latlng.lng, bubble.latlng.lat])
        .addTo(map as unknown as MapLibreMap)
      markers.set(bubble.code, marker)
    }
    else {
      marker.setLngLat([bubble.latlng.lng, bubble.latlng.lat])
    }

    updateMarkerCount(marker, bubble.count)
  }
}

// Sync when bubbles or map changes
watch([latlngBubbles, mapInstance, countryCounts], syncMarkers, { immediate: true })

// Cleanup on unmount
onUnmounted(() => {
  for (const marker of markers.values()) {
    marker.remove()
  }
  markers.clear()
})

function flyToCountry(country: CountryHotspot) {
  isFlying.value = true

  // Immediately remove all markers so both bubbles disappear
  for (const marker of markers.values()) {
    marker.remove()
  }
  markers.clear()

  flyTo(country.center, country.zoom)

  // Reset after fly animation completes (flyTo uses 1000ms duration)
  mapInstance.value?.once('moveend', () => {
    isFlying.value = false
  })
}
</script>

<template>
  <ClientOnly>
    <!-- Edge bubbles: fixed position DOM elements -->
    <Teleport to="body">
      <button
        v-for="bubble in edgeBubbles"
        :key="`edge-${bubble.code}`"
        :style="{ left: `${bubble.edge!.x}px`, top: `${bubble.edge!.y}px` }"
        cursor-pointer fixed z-40
        translate-x="-1/2" translate-y="-1/2"
        @click="flyToCountry(bubble)"
      >
        <div flex="~ items-center gap-8" outline="~ offset--1.5 1.5 neutral/20" p-8 rounded-12 bg-neutral-0 shadow-lg>
          <!-- Navigation icon with background -->
          <div flex="~ items-center justify-center" rounded-8 bg-neutral-100 shrink-0 size-32 :style="{ transform: `rotate(${bubble.edge!.arrowAngle}deg)` }">
            <Icon name="i-tabler:navigation-filled" text-neutral-600 size-16 />
          </div>
          <!-- Flag with rounded corners -->
          <span rounded-4 flex shrink-0 overflow-hidden>
            <Icon :name="bubble.flagIcon" />
          </span>
          <div flex="~ col" text-left>
            <span text="14 neutral-900" lh-tight font-semibold>{{ bubble.name }}</span>
            <span v-if="bubble.count" text="12 neutral-700" lh-tight>{{ bubble.count }} locations</span>
          </div>
        </div>
      </button>
    </Teleport>

    <!-- Lat/lng bubbles are created programmatically as MapLibre Markers -->
  </ClientOnly>
</template>
