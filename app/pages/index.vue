<script setup lang="ts">
const searchQuery = ref('')
const filters = ref<string[]>([])

const { data: categories } = await useFetch('/api/categories')

const { data: locations } = await useFetch('/api/search', {
  query: {
    q: searchQuery,
  },
})
</script>

<template>
  <div bg-neutral-100 min-h-screen f-py-xl>
    <div mx-auto max-w-512 f-px-md>
      <div f-mb-lg>
        <h1 text="neutral-900 f-lg" f-mb-xs>
          Spend your crypto in Lugano
        </h1>
        <p text="neutral-600 f-sm">
          Discover places that accept cryptocurrency payments
        </p>

        <input v-model="searchQuery" type="text" nq-input-box placeholder="Search locations..." w-full mt-4 />

        <ToggleGroupRoot v-model="filters" type="multiple" flex="~ wrap gap-8" mt-4>
          <ToggleGroupItem
            v-for="category in categories"
            :key="category.id"
            :value="category.id"
            outline="~ neutral-400 1.5 reka-active:reka-blue"
            bg="neutral-100 hocus:neutral-200"
            text="14 neutral-800 hocus:neutral"
            font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs
            flex="~ items-center gap-6"
          >
            <Icon v-if="category.icon" :name="category.icon" w-16 h-16 />
            {{ category.name }}
          </ToggleGroupItem>
        </ToggleGroupRoot>

        <!-- Locations Grid -->
        <div flex="~ col gap-16">
          <div v-for="location in locations" :key="location.gmapsPlaceId" flex="~ gap-12" f-p-sm>
            <!-- Image -->
            <div
              w-64 h-64 rounded-8 bg-neutral-200 flex-shrink-0 overflow-hidden
            >
              <NuxtImg :src="`/images/location/${location.uuid}.jpg`" :alt="location.name" w-full h-full object-cover />
            </div>

            <!-- Content -->
            <div flex="~ col" flex-1>
              <div flex="~ items-start justify-between">
                <h3 text="18 neutral" font-semibold m-0>
                  {{ location.name }}
                </h3>
                <span
                  v-if="location.rating"
                  flex="~ items-center gap-4"
                  text="14 neutral-700"
                >
                  <Icon name="i-nimiq:star" />
                  <span>{{ location.rating }}</span>
                </span>
              </div>

              <p text="neutral-800 f-sm" mt-4 mb-0>
                {{ location.address }}
              </p>

              <div flex="~ wrap gap-4" mt-6>
                <span
                  v-for="cat in location.categories.slice(0, 3)"
                  :key="cat"
                  mt-0 text="f-xs neutral-700" px-8 py-4 rounded-4 bg-neutral-200
                  flex="~ items-center gap-4"
                >
                  <Icon v-if="getCategoryIcon(cat)" :name="getCategoryIcon(cat)" w-12 h-12 />
                  {{ cat }}
                </span>
              </div>

              <NuxtLink
                v-if="location.website"
                :to="location.website"
                external target="_blank" nq-arrow nq-pill-blue mt-2
              >
                Visit Website
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="!locations || locations.length === 0"
          text-center
          f-py-2xl
        >
          <p text="neutral-500" f-text-lg>
            No locations found for the selected categories
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
