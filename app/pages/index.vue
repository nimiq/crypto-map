<script setup lang="ts">
import { toZonedTime } from 'date-fns-tz'
import OpeningHours from 'opening_hours'

function getOpeningHoursStatus(
  expression: string | null | undefined,
  timezone: string | null | undefined,
  reference: Date = new Date(),
): { isOpen: boolean, message: string, nextChange: Date | null, variant: 'open' | 'closing-soon' | 'closed' | 'unavailable' } {
  if (!expression || !timezone)
    return { isOpen: false, message: 'Hours unavailable', nextChange: null, variant: 'unavailable' }

  try {
    const localDate = toZonedTime(reference, timezone)
    const schedule = new OpeningHours(expression.trim())

    const isOpen = schedule.getState(localDate)
    const nextChange = schedule.getNextChange(localDate) || null

    // Check if closing soon (within 1 hour)
    let variant: 'open' | 'closing-soon' | 'closed' | 'unavailable' = isOpen ? 'open' : 'closed'
    let message = isOpen ? 'Open now' : 'Closed'

    if (isOpen && nextChange) {
      const timeUntilClose = nextChange.getTime() - localDate.getTime()
      const oneHour = 60 * 60 * 1000
      if (timeUntilClose <= oneHour) {
        variant = 'closing-soon'
        message = 'Closing soon'
      }
    }

    return { isOpen, message, nextChange, variant }
  }
  catch {
    return { isOpen: false, message: 'Hours unavailable', nextChange: null, variant: 'unavailable' }
  }
}

const searchQuery = ref('')

const params = useUrlSearchParams('history')

// Store only category IDs (URL + state)
const selectedCategories = computed<string[]>({
  get: () => params.categories ? (params.categories as string).split(',') : [],
  set: (val) => {
    params.categories = val.length ? val.join(',') : null as any
  },
})

const filters = computed<string[]>({
  get: () => params.filters ? (params.filters as string).split(',') : [],
  set: (val) => {
    params.filters = val.length ? val.join(',') : null as any
  },
})

const { locale, locales } = useI18n()
const router = useRouter()
const switchLocalePath = useSwitchLocalePath()

const availableLocales = computed(() => locales.value as { code: string, name: string }[])

async function changeLocale(code: string) {
  if (code === locale.value)
    return

  const path = switchLocalePath(code as any)
  if (!path)
    return

  await router.push(path)
}

const { data: categories, refresh: refreshCategories } = useFetch('/api/categories', {
  query: {
    q: searchQuery,
  },
  immediate: false,
  watch: false,
})

const { data: locations, pending } = await useFetch('/api/search', {
  query: {
    q: searchQuery,
    openNow: computed(() => filters.value.includes('open_now') ? 'true' : undefined),
    categories: computed(() => selectedCategories.value.length ? selectedCategories.value.join(',') : undefined),
  },
  transform: (data) => {
    return data?.map(location => ({
      ...location,
      hoursStatus: getOpeningHoursStatus(
        location.openingHours,
        location.timezone,
      ),
    })) ?? []
  },
})

const debouncedCategorySearch = useDebounceFn(refreshCategories, 300)
watch(searchQuery, () => debouncedCategorySearch())

const comboboxOpen = ref(false)

watch(selectedCategories, (newVal, oldVal) => {
  // When a category is added, clear the search query and close the combobox
  if (newVal.length > oldVal.length) {
    searchQuery.value = ''
    comboboxOpen.value = false
  }
})

function removeCategory(categoryId: string) {
  selectedCategories.value = selectedCategories.value.filter(id => id !== categoryId)
}

// Helper to get category details by ID
function getCategoryById(categoryId: string) {
  return categories.value?.find(c => c.id === categoryId)
}
</script>

<template>
  <div bg-neutral-100 h-screen relative overflow-hidden>
    <!-- Background SVG at bottom -->
    <NuxtImg src="/assets/lugano.svg" alt="Lugano" mx-auto op-3 flex h-auto w-full pointer-events-none items-end bottom-0 left-0 right-0 absolute z-0 />

    <!-- Language Selector -->
    <DevOnly>
      <div right-16 top-16 fixed z-50>
        <SelectRoot :model-value="locale" @update:model-value="changeLocale">
          <SelectTrigger
            outline="~ 1.5 neutral-300"
            flex="~ items-center gap-8" shadow-sm font-medium py-8 rounded-8 bg-white cursor-pointer text-f-sm f-px-md
          >
            <SelectValue placeholder="Language" />
            <span text="neutral-500 f-xs" ml--4>(dev)</span>
            <Icon name="i-tabler:chevron-down" />
          </SelectTrigger>
          <SelectContent
            position="popper" outline="~ 1.5 neutral-200"
            rounded-8 bg-white max-h-256 shadow z-50 of-auto
          >
            <SelectViewport f-p-xs>
              <SelectItem
                v-for="availableLocale in availableLocales"
                :key="availableLocale.code"
                :value="availableLocale.code"
                flex="~ items-center gap-8" text="f-sm neutral-800 data-[highlighted]:neutral-900"
                bg="data-[highlighted]:neutral-50" py-10 outline-none rounded-6 cursor-pointer
                transition-colors f-px-md
              >
                {{ availableLocale.name }}
              </SelectItem>
            </SelectViewport>
          </SelectContent>
        </SelectRoot>
      </div>
    </DevOnly>

    <div h-full overflow-y-auto f-py-xl>
      <div mx-auto relative z-1 f-px-xl>
        <h1 text="neutral-900 f-2xl" font-bold f-mb-xs>
          {{ $t('hero.title') }}
        </h1>
        <p text="neutral-600 f-md" f-mb-lg>
          {{ $t('hero.subtitle') }}
        </p>

        <ComboboxRoot v-model="selectedCategories" v-model:open="comboboxOpen" multiple>
          <ComboboxAnchor w-full>
            <ComboboxInput v-model="searchQuery" :placeholder="$t('search.placeholder')" nq-input-box :display-value="() => searchQuery" @focus="refreshCategories" />
          </ComboboxAnchor>

          <ComboboxContent position="popper" bg="white" outline="~ 1.5 neutral-200" rounded-t-8 max-h-256 w-full shadow z-50 of-auto>
            <ComboboxViewport f-p-xs>
              <ComboboxItem v-for="category in categories" :key="category.id" :value="category.id" flex="~ items-center gap-8" text="f-sm neutral-800 data-[highlighted]:neutral-900" bg="data-[highlighted]:neutral-50" py-10 outline-none rounded-6 cursor-pointer transition-colors f-px-md>
                <Icon v-if="category.icon" :name="category.icon" size-18 />
                {{ category.name }}
              </ComboboxItem>
              <ComboboxEmpty v-if="!categories?.length" f-p-md text="f-sm neutral-700 center">
                {{ $t('search.noCategoriesFound') }}
              </ComboboxEmpty>
            </ComboboxViewport>
          </ComboboxContent>
        </ComboboxRoot>

        <div flex="~ wrap gap-8" mt-4>
          <button
            v-for="categoryId in selectedCategories"
            :key="categoryId"
            outline="~ neutral-400 1.5"
            bg="neutral-100 hocus:neutral-200"
            text="14 neutral-800 hocus:neutral"
            font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs
            flex="~ items-center gap-6"
            @click="removeCategory(categoryId)"
          >
            <Icon :name="getCategoryById(categoryId)?.icon || ''" size-16 />
            {{ getCategoryById(categoryId)?.name }}
            <Icon name="i-nimiq:cross" size-16 />
          </button>

          <ToggleGroupRoot v-model="filters" type="multiple" flex="~ wrap gap-8">
            <ToggleGroupItem
              value="open_now"
              outline="~ neutral-400 1.5 reka-on:transparent"
              bg="neutral-100 hocus:neutral-200 reka-on:blue"
              text="14 neutral-800 hocus:neutral reka-on:white"
              font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs
            >
              {{ $t('filters.openNow') }}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="walkable"
              outline="~ neutral-400 1.5 reka-on:reka-blue"
              bg="neutral-100 hocus:neutral-200"
              text="14 neutral-800 hocus:neutral"
              font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs
            >
              {{ $t('filters.walkableDistance') }}
            </ToggleGroupItem>
          </ToggleGroupRoot>
        </div>

        <!-- Loading Skeleton -->
        <div v-if="pending" grid="~ cols-1 sm:cols-2 lg:cols-3 gap-24" f-mt-xl>
          <div
            v-for="i in 6"
            :key="`skeleton-${i}`"

            outline="~ 1 neutral-200"

            flex="~ col"
            shadow-sm rounded-12 bg-white overflow-hidden animate-pulse
          >
            <!-- Image skeleton -->
            <div aspect="16/9" bg-neutral-200 flex-shrink-0 />

            <!-- Content skeleton -->
            <div f-p-md flex="~ col gap-12">
              <!-- Title -->
              <div rounded-6 bg-neutral-200 h-20 w="3/4" />

              <!-- Status -->
              <div flex="~ gap-8">
                <div rounded-full bg-neutral-200 h-24 w-80 />
                <div rounded-6 bg-neutral-200 h-24 w-100 />
              </div>

              <!-- Address -->
              <div flex="~ gap-8">
                <div mt-2 rounded-4 bg-neutral-200 flex-shrink-0 size-16 />
                <div flex="~ col gap-6 flex-1">
                  <div rounded-4 bg-neutral-200 h-16 w-full />
                  <div rounded-4 bg-neutral-200 h-16 w="2/3" />
                </div>
              </div>

              <!-- Categories -->
              <div flex="~ gap-6">
                <div rounded-full bg-neutral-200 h-24 w-80 />
                <div rounded-full bg-neutral-200 h-24 w-60 />
              </div>

              <!-- Action -->
              <div mt-auto pt-8 rounded-6 bg-neutral-200 h-20 w-100 />
            </div>
          </div>
        </div>

        <!-- Locations Grid -->
        <div v-else grid="~ cols-1 sm:cols-2 lg:cols-3 gap-24" f-mt-xl>
          <a
            v-for="location in locations"
            :key="location.gmapsPlaceId"
            :href="location.gmapsUrl"
            :aria-label="`View ${location.name} on Google Maps`"
            target="_blank"
            rel="noopener noreferrer"

            outline="~ 1 neutral-200"

            flex="~ col"
            group p-0 rounded-12 bg-white no-underline h-full block overflow-hidden nq-hoverable
          >
            <!-- Image with Rating Overlay (16:9 aspect ratio) -->
            <div aspect="16/9" bg-neutral-200 flex-shrink-0 relative overflow-hidden>
              <NuxtImg
                v-if="location.photo"
                :src="location.photo"
                :alt="`Photo of ${location.name}`"

                h-full w-full transition-transform duration-300 object-cover group-hover:scale-105
              />

              <!-- Rating Pill Overlay -->
              <div
                v-if="location.rating"

                flex="~ items-center gap-4"
                bg="white/95"

                text="neutral-900 f-sm"

                shadow-sm font-semibold px-8 py-4 rounded-full right-8 top-8 absolute backdrop-blur-sm
                outline="1.5 offset--1.5 neutral/10"
              >
                <Icon name="i-nimiq:star" text-gold size-16 />
                <span>{{ location.rating }}</span>
              </div>
            </div>

            <!-- Content with consistent vertical rhythm -->
            <div flex="~ col gap-12" flex-1 f-p-md>
              <!-- Name (1 line max) -->
              <h3
                text="f-lg neutral-900"
                font-bold
                m-0
                line-clamp-1
              >
                {{ location.name }}
              </h3>

              <!-- Hours Status -->
              <div
                v-if="location.openingHours"
                flex="~ items-center gap-8 wrap"
              >
                <span
                  class="font-semibold px-8 py-4 rounded-full whitespace-nowrap text-f-xs" :class="[
                    location.hoursStatus.variant === 'open' && 'bg-green-400 text-green-1100 outline-1.5 outline-green-400',
                    location.hoursStatus.variant === 'closing-soon' && 'bg-orange-400 text-orange-1100 outline-1.5 outline-orange-400',
                    location.hoursStatus.variant === 'closed' && 'bg-neutral-200 text-neutral-800',
                    location.hoursStatus.variant === 'unavailable' && 'bg-neutral-200 text-neutral-700',
                  ]"
                >
                  {{ location.hoursStatus.message }}
                </span>
                <span
                  v-if="location.hoursStatus.nextChange"
                  text="f-xs neutral-800"
                  whitespace-nowrap
                >
                  {{ location.hoursStatus.isOpen ? 'Closes' : 'Opens' }} at
                  <NuxtTime
                    :datetime="location.hoursStatus.nextChange"
                    hour="numeric"
                    minute="2-digit"
                  />
                </span>
              </div>

              <!-- Address with Icon (2 lines max) -->
              <div flex="~ items-start gap-8">
                <Icon
                  name="i-tabler:map-pin"

                  text-neutral-700 mt-2 flex-shrink-0 size-16
                />
                <p
                  text="neutral-800 f-sm"

                  m-0 flex-1 line-clamp-2
                >
                  {{ location.address }}
                </p>
              </div>

              <!-- Categories (max 3 + counter) -->
              <div flex="~ wrap gap-6">
                <span
                  v-for="cat in location.categories.slice(0, 3)"
                  :key="cat.id"
                  text="f-xs neutral-800"
                  flex="~ items-center gap-4"
                  font-medium
                  px-8
                  py-4
                  rounded-full
                  bg-neutral-100
                >
                  <Icon :name="cat.icon" size-12 />
                  {{ cat.name }}
                </span>
                <span
                  v-if="location.categories.length > 3"
                  text="f-xs neutral-700"
                  font-medium
                  px-8
                  py-4
                >
                  +{{ location.categories.length - 3 }} more
                </span>
              </div>

              <!-- Actions (pushed to bottom) -->
              <div flex="~ gap-8 items-center" mt-auto pt-8>
                <span
                  text="blue f-sm"
                  font-semibold
                  nq-arrow
                >
                  View on Maps
                </span>

                <a
                  v-if="location.website"
                  :href="location.website"
                  :aria-label="`Visit ${location.name} website`"
                  target="_blank"
                  rel="noopener noreferrer"
                  un-text="neutral-600 hover:neutral-900 f-sm"
                  font-medium

                  ml-auto no-underline transition-colors nq-arrow @click.stop
                >
                  Website
                </a>
              </div>
            </div>
          </a>
        </div>

        <!-- Empty State -->
        <div
          v-if="!pending && (!locations || locations.length === 0)"

          outline="~ 1 neutral-200"

          shadow-sm text-center rounded-12 bg-white f-px-lg f-py-2xl f-mt-xl
        >
          <div

            flex="~ items-center justify-center"

            mx-auto rounded-full bg-neutral-100 size-64 f-mb-md
          >
            <Icon
              name="i-nimiq:magnifying-glass"

              text-neutral-400 size-32
            />
          </div>
          <p text="neutral-800 f-lg" font-semibold m-0>
            {{ $t('empty.title') }}
          </p>
          <p text="neutral-600 f-sm" m-0 f-mt-xs>
            {{ $t('empty.subtitle') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
