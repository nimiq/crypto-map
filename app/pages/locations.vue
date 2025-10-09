<script setup lang="ts">
import { toast, Toaster } from 'vue-sonner'

const page = ref(1)
const limit = ref(50)

const { data, pending } = useFetch('/api/locations/all', {
  query: { page, limit },
})

const locations = computed(() => data.value?.locations || [])
const pagination = computed(() => data.value?.pagination)

const hoveredPhoto = ref<string | null>(null)

const { copy } = useClipboard()

function getSourceIcon(source: string) {
  const icons: Record<string, string> = {
    naka: 'i-providers:naka',
    bluecode: 'i-providers:bluecode',
  }
  return icons[source.toLowerCase()] || null
}

function copyToClipboard(text: string, message: string) {
  copy(text)
  toast.success(message)
}
</script>

<template>
  <div>
    <Teleport to="body">
      <Toaster />
    </Teleport>
    <TooltipProvider>
      <div p-0 bg-neutral-50 min-h-screen>
        <div border-b="1 neutral-200" shadow-sm px-16 py-12 bg-white>
          <h1 text="neutral-900 f-xl" font-bold m-0>
            All Locations
          </h1>
          <p v-if="pagination" text="neutral-600 f-sm" m-0 mt-4>
            Showing {{ locations.length }} of {{ pagination.total }} locations (Page {{ pagination.page }} of {{ pagination.totalPages }})
          </p>
        </div>

        <div v-if="pending" flex="~ items-center justify-center" p-32>
          <div text="neutral-500 f-md">
            Loading...
          </div>
        </div>

        <div v-else overflow-x-auto>
          <table w-full text="f-xs left" border-collapse>
            <thead bg-neutral-100 top-0 sticky z-10>
              <tr>
                <th border-b="1 neutral-200" text-neutral-700 font-semibold px-8 py-8 whitespace-nowrap>
                  Photo
                </th>
                <th border-b="1 neutral-200" text-neutral-700 font-semibold px-8 py-8 whitespace-nowrap>
                  Location
                </th>
                <th border-b="1 neutral-200" text-neutral-700 font-semibold px-8 py-8 max-w-200 whitespace-nowrap>
                  Categories
                </th>
                <th border-b="1 neutral-200" text-neutral-700 font-semibold px-8 py-8 whitespace-nowrap>
                  Rating
                </th>
                <th border-b="1 neutral-200" text-neutral-700 font-semibold px-8 py-8 whitespace-nowrap>
                  Coordinates
                </th>
                <th border-b="1 neutral-200" text-neutral-700 font-semibold px-8 py-8 whitespace-nowrap>
                  Source
                </th>
                <th border-b="1 neutral-200" text-neutral-700 font-semibold px-8 py-8 whitespace-nowrap>
                  Timezone
                </th>
                <th border-b="1 neutral-200" text-neutral-700 font-semibold px-8 py-8 whitespace-nowrap>
                  Hours
                </th>
                <th border-b="1 neutral-200" text-neutral-700 font-semibold px-8 py-8 whitespace-nowrap>
                  IDs
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="location in locations" :key="location.uuid" bg="white hover:neutral-50" border-b="1 neutral-200" transition-colors group>
                <td px-8 py-8 relative>
                  <div v-if="location.photo" relative @mouseenter="hoveredPhoto = `/images/location/${location.uuid}`" @mouseleave="hoveredPhoto = null">
                    <NuxtImg :src="`/images/location/${location.uuid}`" :alt="location.name" rounded-4 h-32 w-32 object-cover />
                    <div v-if="hoveredPhoto === `/images/location/${location.uuid}`" p-8 rounded-8 bg-white shadow-lg fixed z-50 border="1 neutral-200" style="pointer-events: none; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                      <NuxtImg :src="`/images/location/${location.uuid}`" :alt="location.name" rounded-4 max-h-400 max-w-400 />
                      <p text="f-xs neutral-600" font-mono mb-0 mt-4 break-all>
                        /images/location/{{ location.uuid }}
                      </p>
                    </div>
                  </div>
                  <span v-else text-neutral-400>No photo</span>
                </td>
                <td px-8 py-8 max-w-300>
                  <div flex="~ col">
                    <div flex="~ items-center gap-6">
                      <span font-medium>{{ location.name }}</span>
                      <a :href="location.gmapsUrl" target="_blank" rel="noopener noreferrer" flex="~ items-center" text-neutral-600 transition-colors hover:text-neutral-900>
                        <Icon name="i-tabler:map-pin" size-14 />
                      </a>
                      <a v-if="location.website" :href="location.website" target="_blank" rel="noopener noreferrer" flex="~ items-center" text-neutral-600 transition-colors hover:text-neutral-900>
                        <Icon name="i-tabler:external-link" size-14 />
                      </a>
                    </div>
                    <span text="neutral-800 f-2xs" mt-2>{{ location.address }}</span>
                  </div>
                </td>
                <td px-8 py-8 max-w-200>
                  <div flex="~ wrap gap-2">
                    <span v-for="cat in location.categories" :key="cat.id" flex="~ items-center gap-2" px-4 py-1 rounded-3 bg-neutral-100 whitespace-nowrap text="10px">
                      <Icon :name="cat.icon" size-10 />
                      {{ cat.name }}
                    </span>
                  </div>
                </td>
                <td px-8 py-8 whitespace-nowrap>
                  <span v-if="location.rating" flex="~ items-center gap-4" font-semibold>
                    <Icon name="i-nimiq:star" size-12 text="neutral-500 group-hocus:gold" transition-colors />
                    {{ location.rating }}
                  </span>
                  <span v-else text-neutral-400>-</span>
                </td>
                <td px-8 py-8>
                  <div flex="~ items-center gap-6">
                    <div flex="~ col" text="10px" class="font-mono">
                      <span>{{ location.lat.toFixed(6) }}</span>
                      <span>{{ location.lng.toFixed(6) }}</span>
                    </div>
                    <button type="button" text-neutral-500 bg-transparent cursor-pointer transition-colors hover:text-neutral-900 @click="copyToClipboard(`${location.lat}, ${location.lng}`, 'Coordinates copied')">
                      <Icon name="i-nimiq:copy" size-12 />
                    </button>
                  </div>
                </td>
                <td px-8 py-8 whitespace-nowrap>
                  <Icon v-if="getSourceIcon(location.source)" :name="getSourceIcon(location.source)!" size-16 op="50 group-hocus:100" grayscale="~ group-hocus:0" transition-all />
                  <span v-else bg-blue-100 text-blue-800 font-medium px-6 py-2 rounded-4 text-f-xs>{{ location.source }}</span>
                </td>
                <td text="10px" font-mono px-8 py-8 whitespace-nowrap>
                  {{ location.timezone }}
                </td>
                <td px-8 py-8>
                  <OpeningHoursStatus v-if="location.openingHours && location.timezone" :opening-hours="location.openingHours" :timezone="location.timezone" />
                  <span v-else text-neutral-400>N/A</span>
                </td>
                <td px-8 py-8>
                  <div flex="~ col gap-2 items-start">
                    <button type="button" text="f-2xs neutral-600 hover:neutral-900 left" bg="neutral-50 hover:neutral-100" px-6 py-2 rounded-4 cursor-pointer whitespace-nowrap transition-colors class="font-mono" @click="copyToClipboard(location.uuid, 'UUID copied')">
                      {{ location.uuid }}
                    </button>
                    <button type="button" text="f-2xs neutral-600 hover:neutral-900 left" bg="neutral-50 hover:neutral-100" px-6 py-2 rounded-4 cursor-pointer whitespace-nowrap transition-colors class="font-mono" @click="copyToClipboard(location.gmapsPlaceId, 'Place ID copied')">
                      {{ location.gmapsPlaceId }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="pagination" flex="~ items-center justify-between" border-t="1 neutral-200" px-16 py-12 bg-white>
          <div text="neutral-600 f-sm">
            Page {{ pagination.page }} of {{ pagination.totalPages }} ({{ pagination.total }} total)
          </div>
          <PaginationRoot v-model:page="page" :total="pagination.total" :items-per-page="limit" :sibling-count="1" show-edges>
            <PaginationList v-slot="{ items }" flex="~ items-center gap-4">
              <PaginationPrev as-child>
                <button type="button" flex="~ items-center justify-center" bg="neutral-100 hover:neutral-200 disabled:neutral-50" text="neutral-900 disabled:neutral-400" font-medium px-12 py-6 rounded-6 cursor-pointer transition-colors text-f-sm disabled:cursor-not-allowed>
                  <Icon name="i-tabler:chevron-left" size-16 />
                  Previous
                </button>
              </PaginationPrev>
              <template v-for="(item, index) in items" :key="index">
                <PaginationListItem v-if="item.type === 'page'" :value="item.value" as-child>
                  <button type="button" :class="[item.value === pagination.page ? 'bg-blue text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900']" flex="~ items-center justify-center" font-medium rounded-6 size-32 cursor-pointer transition-colors text-f-sm>
                    {{ item.value }}
                  </button>
                </PaginationListItem>
                <PaginationEllipsis v-else as-child>
                  <span text-neutral-500>...</span>
                </PaginationEllipsis>
              </template>
              <PaginationNext as-child>
                <button type="button" flex="~ items-center justify-center" bg="neutral-100 hover:neutral-200 disabled:neutral-50" text="neutral-900 disabled:neutral-400" font-medium px-12 py-6 rounded-6 cursor-pointer transition-colors text-f-sm disabled:cursor-not-allowed>
                  Next
                  <Icon name="i-tabler:chevron-right" size-16 />
                </button>
              </PaginationNext>
            </PaginationList>
          </PaginationRoot>
        </div>
      </div>
    </TooltipProvider>
  </div>
</template>
