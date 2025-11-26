<script setup lang="ts">
import { DrawerContent, DrawerHandle, DrawerPortal, DrawerRoot } from 'vaul-vue'

const dummyLocations: LocationDetailResponse[] = [
  {
    uuid: 'test-1',
    name: 'Overnice Creatives',
    address: 'Kreuzbergstr. 28, 10965 Berlin',
    latitude: 52.4934,
    longitude: 13.4014,
    rating: 4.1,
    ratingCount: 135,
    photos: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800', 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800'],
    gmapsPlaceId: 'test1',
    gmapsUrl: 'https://maps.google.com',
    website: 'https://overnice.com',
    source: 'naka',
    timezone: 'Europe/Berlin',
    openingHours: 'Mo-Fr 09:00-17:00',
    categories: [{ id: 'design_studio', name: 'Design Studio', icon: 'design' }],
    primaryCategory: { id: 'design_studio', name: 'Design Studio', icon: 'design' },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    uuid: 'test-2',
    name: 'La Bella Italia',
    address: 'Via Roma 15, 6900 Lugano',
    latitude: 46.0037,
    longitude: 8.9511,
    rating: 1.4,
    ratingCount: 42,
    photos: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'],
    gmapsPlaceId: 'test2',
    gmapsUrl: 'https://maps.google.com',
    website: 'https://labellaitalia.ch',
    source: 'naka',
    timezone: 'Europe/Zurich',
    openingHours: 'Mo-Su 11:00-23:00',
    categories: [{ id: 'italian_restaurant', name: 'Italian Restaurant', icon: 'restaurant' }],
    primaryCategory: { id: 'italian_restaurant', name: 'Italian Restaurant', icon: 'restaurant' },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    uuid: 'test-3',
    name: 'Crypto Coffee Hub',
    address: 'Bahnhofstrasse 42, 8001 Zürich',
    latitude: 47.3769,
    longitude: 8.5417,
    rating: 3.5,
    ratingCount: 89,
    photos: ['https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800'],
    gmapsPlaceId: 'test3',
    gmapsUrl: 'https://maps.google.com',
    website: null,
    source: 'naka',
    timezone: 'Europe/Zurich',
    openingHours: 'Mo-Fr 07:00-19:00; Sa 09:00-17:00',
    categories: [{ id: 'coffee_shop', name: 'Coffee Shop', icon: 'cafe' }],
    primaryCategory: { id: 'coffee_shop', name: 'Coffee Shop', icon: 'cafe' },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    uuid: 'test-4',
    name: 'No Rating Place',
    address: 'Unknown Street 1, 12345 City',
    latitude: 47.0,
    longitude: 8.0,
    rating: null,
    ratingCount: null,
    photos: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800'],
    gmapsPlaceId: 'test4',
    gmapsUrl: 'https://maps.google.com',
    website: 'https://example.com',
    source: 'naka',
    timezone: 'Europe/Zurich',
    openingHours: null,
    categories: [{ id: 'restaurant', name: 'Restaurant', icon: 'restaurant' }],
    primaryCategory: { id: 'restaurant', name: 'Restaurant', icon: 'restaurant' },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    uuid: 'test-5',
    name: 'Minimal Data Shop',
    address: 'Main St 100, 10000 Town',
    latitude: 46.5,
    longitude: 8.5,
    rating: null,
    ratingCount: null,
    photos: null,
    gmapsPlaceId: 'test5',
    gmapsUrl: 'https://maps.google.com',
    website: null,
    source: 'naka',
    timezone: 'Europe/Zurich',
    openingHours: null,
    categories: [],
    primaryCategory: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    uuid: 'test-6',
    name: 'High Rated Spa',
    address: 'Wellness Alley 5, 6000 Luzern',
    latitude: 47.0502,
    longitude: 8.3093,
    rating: 4.8,
    ratingCount: 512,
    photos: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800'],
    gmapsPlaceId: 'test6',
    gmapsUrl: 'https://maps.google.com',
    website: 'https://highrated-spa.ch',
    source: 'naka',
    timezone: 'Europe/Zurich',
    openingHours: 'Mo-Su 10:00-22:00',
    categories: [{ id: 'spa', name: 'Spa', icon: 'spa' }],
    primaryCategory: { id: 'spa', name: 'Spa', icon: 'spa' },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Drawer state for testing the full LocationDrawer component
const snapPoints: (string | number)[] = ['450px', 1]
const drawerOpen = ref(false)
const selectedLocation = ref<LocationDetailResponse | null>(null)
const snap = ref<string | number | null>(snapPoints[0] ?? null)

function openDrawer(loc: LocationDetailResponse) {
  selectedLocation.value = loc
  snap.value = snapPoints[0] ?? null
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
  selectedLocation.value = null
}
</script>

<template>
  <div p-16 bg-neutral-100 min-h-screen>
    <!-- Test Triggers -->
    <h2 text-18 font-bold mb-16>
      Drawer Test Triggers
    </h2>
    <div flex="~ wrap gap-8" mb-24>
      <button
        v-for="loc in dummyLocations"
        :key="loc.uuid"

        text-white font-medium px-16 py-8 rounded-8 bg-blue transition-colors shadow-sm hover:bg-blue-600
        @click="openDrawer(loc)"
      >
        {{ loc.name }}
      </button>
    </div>

    <!-- Test Drawer (using vaul-vue directly with local data) -->
    <DrawerRoot v-model:open="drawerOpen" v-model:active-snap-point="snap" :snap-points :should-scale-background="false" :modal="false">
      <DrawerPortal>
        <div
          v-if="snap === 1"
          bg="neutral/20" inset-0 fixed z-40
          @click="closeDrawer"
        />
        <DrawerContent flex="~ col" shadow="[0_-4px_24px_rgba(0,0,0,0.1)]" outline-none rounded-t-10 bg-neutral-0 h-full max-h-95vh inset-x-0 bottom-0 fixed z-50>
          <DrawerHandle my-8 />
          <div v-if="selectedLocation" flex-1 min-h-0 of-hidden>
            <LocationDrawerContent
              :key="selectedLocation.uuid"
              :location="selectedLocation"
              :snap
              @close="closeDrawer"
            />
          </div>
        </DrawerContent>
      </DrawerPortal>
    </DrawerRoot>
  </div>
</template>
