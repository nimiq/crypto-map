<script setup lang="ts">
const page = ref(1)
const limit = 50

const { data, pending } = useFetch(() => `/api/locations/all?page=${page.value}&limit=${limit}`)

const locations = computed(() => data.value?.locations || [])
const pagination = computed(() => data.value?.pagination)

function nextPage() {
  if (pagination.value && pagination.value.totalPages && page.value < pagination.value.totalPages) {
    page.value++
  }
}

function prevPage() {
  if (page.value > 1) {
    page.value--
  }
}

function goToPage(p: number) {
  page.value = p
}

const hoveredPhoto = ref<string | null>(null)

const { copy } = useClipboard()

function copyToClipboard(text: string) {
  copy(text)
}

function formatUuid(uuid: string) {
  return `${uuid.slice(0, 8)}...${uuid.slice(-8)}`
}

function formatOpeningHours(hours: string | null) {
  if (!hours)
    return 'N/A'
  try {
    const parsed = JSON.parse(hours)
    return Object.entries(parsed)
      .map(([day, times]) => `${day}: ${times}`)
      .join('\n')
  }
  catch {
    return 'Invalid format'
  }
}
</script>

<template>
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
              Name
            </th>
            <th border-b="1 neutral-200" text-neutral-700 font-semibold px-8 py-8 whitespace-nowrap>
              Address
            </th>
            <th border-b="1 neutral-200" text-neutral-700 font-semibold px-8 py-8 whitespace-nowrap>
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
              UUID
            </th>
            <th border-b="1 neutral-200" text-neutral-700 font-semibold px-8 py-8 whitespace-nowrap>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="location in locations" :key="location.uuid" bg="white hover:neutral-50" border-b="1 neutral-200" transition-colors>
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
            <td font-medium px-8 py-8 max-w-200 whitespace-nowrap text-ellipsis overflow-hidden>
              {{ location.name }}
            </td>
            <td text-neutral-600 px-8 py-8 max-w-250 whitespace-nowrap text-ellipsis overflow-hidden>
              {{ location.address }}
            </td>
            <td px-8 py-8>
              <div flex="~ wrap gap-4">
                <span v-for="cat in location.categories.slice(0, 2)" :key="cat.id" flex="~ items-center gap-4" px-6 py-2 rounded-4 bg-neutral-100 whitespace-nowrap text-f-xs>
                  <Icon :name="cat.icon" size-12 />
                  {{ cat.name }}
                </span>
                <PopoverRoot v-if="location.categories.length > 2">
                  <PopoverTrigger as-child>
                    <span text="neutral-500 f-xs" bg="hover:neutral-100" px-6 py-2 rounded-4 cursor-pointer transition-colors>+{{ location.categories.length - 2 }}</span>
                  </PopoverTrigger>
                  <PopoverPortal>
                    <PopoverContent border="1 neutral-200" p-8 rounded-8 bg-white max-w-300 shadow-lg z-50>
                      <div flex="~ col gap-4">
                        <span v-for="cat in location.categories" :key="cat.id" flex="~ items-center gap-4" px-6 py-2 rounded-4 bg-neutral-100 whitespace-nowrap text-f-xs>
                          <Icon :name="cat.icon" size-12 />
                          {{ cat.name }}
                        </span>
                      </div>
                      <PopoverArrow bg-white />
                    </PopoverContent>
                  </PopoverPortal>
                </PopoverRoot>
              </div>
            </td>
            <td px-8 py-8 whitespace-nowrap>
              <span v-if="location.rating" flex="~ items-center gap-4" font-semibold>
                <Icon name="i-nimiq:star" text-gold size-12 />
                {{ location.rating }}
              </span>
              <span v-else text-neutral-400>-</span>
            </td>
            <td font-mono px-8 py-8 text-f-xs>
              <div flex="~ col">
                <span>{{ location.lat.toFixed(6) }}</span>
                <span>{{ location.lng.toFixed(6) }}</span>
              </div>
            </td>
            <td px-8 py-8 whitespace-nowrap>
              <span bg-blue-100 text-blue-800 font-medium px-6 py-2 rounded-4 text-f-xs>{{ location.source }}</span>
            </td>
            <td text="10px" font-mono px-8 py-8 whitespace-nowrap>
              {{ location.timezone }}
            </td>
            <td px-8 py-8>
              <TooltipRoot v-if="location.openingHours" :delay-duration="0">
                <TooltipTrigger as-child>
                  <span text-neutral-600 cursor-help border-b="1 dotted neutral-400">Available</span>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent border="1 neutral-200" px-12 py-8 rounded-8 bg-white max-w-400 shadow-lg z-50>
                    <pre text="f-xs neutral-700" font-mono m-0 whitespace-pre-wrap>{{ formatOpeningHours(location.openingHours) }}</pre>
                    <TooltipArrow bg-white />
                  </TooltipContent>
                </TooltipPortal>
              </TooltipRoot>
              <span v-else text-neutral-400>N/A</span>
            </td>
            <td px-8 py-8>
              <button type="button" text="f-xs neutral-500 hover:neutral-900" bg="transparent hover:neutral-100" font-mono px-6 py-2 rounded-4 cursor-pointer whitespace-nowrap transition-colors @click="copyToClipboard(location.uuid)">
                {{ formatUuid(location.uuid) }}
              </button>
            </td>
            <td px-8 py-8>
              <DropdownMenuRoot>
                <DropdownMenuTrigger flex="~ items-center justify-center" bg="transparent hover:neutral-100" rounded-4 size-24 cursor-pointer transition-colors>
                  <Icon name="i-tabler:dots-vertical" text-neutral-600 size-16 />
                </DropdownMenuTrigger>
                <DropdownMenuContent border="1 neutral-200" p-4 rounded-8 bg-white min-w-160 shadow-lg z-50>
                  <DropdownMenuItem as-child>
                    <a :href="location.gmapsUrl" target="_blank" rel="noopener noreferrer" flex="~ items-center gap-8" un-text="f-sm neutral-800 hover:neutral-900" bg="hover:neutral-50" px-8 py-6 outline-none rounded-4 no-underline cursor-pointer transition-colors>
                      <Icon name="i-tabler:map-pin" size-16 />
                      Open in Maps
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem v-if="location.website" as-child>
                    <a :href="location.website" target="_blank" rel="noopener noreferrer" flex="~ items-center gap-8" un-text="f-sm neutral-800 hover:neutral-900" bg="hover:neutral-50" px-8 py-6 outline-none rounded-4 no-underline cursor-pointer transition-colors>
                      <Icon name="i-tabler:external-link" size-16 />
                      Visit Website
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem as-child>
                    <button type="button" flex="~ items-center gap-8" text="f-sm neutral-800 hover:neutral-900" bg="hover:neutral-50" px-8 py-6 outline-none rounded-4 w-full cursor-pointer transition-colors @click="() => copyToClipboard(location.uuid)">
                      <Icon name="i-tabler:copy" size-16 />
                      Copy UUID
                    </button>
                  </DropdownMenuItem>
                  <DropdownMenuItem as-child>
                    <button type="button" flex="~ items-center gap-8" text="f-sm neutral-800 hover:neutral-900" bg="hover:neutral-50" px-8 py-6 outline-none rounded-4 w-full cursor-pointer transition-colors @click="() => copyToClipboard(`${location.lat}, ${location.lng}`)">
                      <Icon name="i-tabler:location" size-16 />
                      Copy Coords
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuRoot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pagination" flex="~ items-center justify-between" border-t="1 neutral-200" px-16 py-12 bg-white>
      <div text="neutral-600 f-sm">
        Page {{ pagination.page }} of {{ pagination.totalPages }} ({{ pagination.total }} total)
      </div>
      <div flex="~ items-center gap-8">
        <button type="button" :disabled="page === 1" flex="~ items-center justify-center" bg="neutral-100 hover:neutral-200 disabled:neutral-50" text="neutral-900 disabled:neutral-400" font-medium px-12 py-6 rounded-6 cursor-pointer transition-colors text-f-sm disabled:cursor-not-allowed @click="prevPage">
          <Icon name="i-tabler:chevron-left" size-16 />
          Previous
        </button>
        <div flex="~ items-center gap-4">
          <button v-for="p in Math.min(pagination.totalPages || 1, 5)" :key="p" type="button" :class="[p === pagination.page ? 'bg-blue-500 text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900']" flex="~ items-center justify-center" font-medium rounded-6 size-32 cursor-pointer transition-colors text-f-sm @click="goToPage(p)">
            {{ p }}
          </button>
          <span v-if="pagination.totalPages && pagination.totalPages > 5" text-neutral-500>...</span>
        </div>
        <button type="button" :disabled="!pagination || page === pagination.totalPages" flex="~ items-center justify-center" bg="neutral-100 hover:neutral-200 disabled:neutral-50" text="neutral-900 disabled:neutral-400" font-medium px-12 py-6 rounded-6 cursor-pointer transition-colors text-f-sm disabled:cursor-not-allowed @click="nextPage">
          Next
          <Icon name="i-tabler:chevron-right" size-16 />
        </button>
      </div>
    </div>
  </div>
</template>
