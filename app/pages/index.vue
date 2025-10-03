<script setup lang="ts">
const searchQuery = ref('')
const selectedCategories = ref<CategoryResponse[]>([])
const filters = ref<string[]>([])

const { data: categories, refresh: refreshCategories } = useFetch('/api/categories', {
  query: {
    q: searchQuery,
  },
  immediate: false,
  watch: false,
})

const { data: locations } = await useFetch('/api/search', {
  query: {
    q: searchQuery,
  },
})

const debouncedCategorySearch = useDebounceFn(refreshCategories, 300)
watch(searchQuery, () => debouncedCategorySearch())

function removeCategory(categoryId: string) {
  selectedCategories.value = selectedCategories.value.filter(c => c.id !== categoryId)
}
</script>

<template>
  <div bg-neutral-100 min-h-screen relative overflow-hidden f-py-xl>
    <!-- Background SVG -->
    <div opacity-3 flex pointer-events-none items-end bottom-0 left-0 right-0 fixed>
      <NuxtImg
        src="/assets/lugano.svg"
        alt="Lugano"
        h-auto w-full
      />
    </div>

    <!-- Language Selector -->
    <DevOnly>
      <div right-16 top-16 fixed z-50>
        <SelectRoot v-model="$i18n.locale">
          <SelectTrigger
            outline="~ 1.5 neutral-300"
            flex="~ items-center gap-8" shadow-sm font-medium py-8 rounded-8 bg-white cursor-pointer text-f-sm f-px-md
          >
            <SelectValue placeholder="Language" />
            <Icon name="i-tabler:chevron-down" />
          </SelectTrigger>
          <SelectContent
            position="popper" outline="~ 1.5 neutral-200"
            rounded-8 bg-white max-h-256 shadow z-50 of-auto
          >
            <SelectViewport f-p-xs>
              <SelectItem
                v-for="locale in $i18n.locales.value"
                :key="locale.code"
                :value="locale.code"
                flex="~ items-center gap-8" text="f-sm neutral-800 data-[highlighted]:neutral-900"
                bg="data-[highlighted]:neutral-50" py-10 outline-none rounded-6 cursor-pointer
                transition-colors f-px-md
              >
                {{ locale.name }}
              </SelectItem>
            </SelectViewport>
          </SelectContent>
        </SelectRoot>
      </div>
    </DevOnly>

    <div mx-auto max-w-640 relative z-1 f-px-md>
      <div f-mb-2xl>
        <h1 text="neutral-900 f-2xl" font-bold f-mb-xs>
          {{ $t('hero.title') }}
        </h1>
        <p text="neutral-600 f-md" f-mb-lg>
          {{ $t('hero.subtitle') }}
        </p>

        <ComboboxRoot v-model="selectedCategories" multiple>
          <ComboboxAnchor w-full>
            <ComboboxInput v-model="searchQuery" :placeholder="$t('search.placeholder')" nq-input-box :display-value="() => searchQuery" @focus="refreshCategories" />
          </ComboboxAnchor>

          <ComboboxContent position="popper" bg="white" outline="~ 1.5 neutral-200" rounded-t-8 max-h-256 w-full shadow z-50 of-auto>
            <ComboboxViewport f-p-xs>
              <ComboboxItem v-for="category in categories" :key="category.id" :value="category" flex="~ items-center gap-8" text="f-sm neutral-800 data-[highlighted]:neutral-900" bg="data-[highlighted]:neutral-50" py-10 outline-none rounded-6 cursor-pointer transition-colors f-px-md>
                <Icon v-if="category.icon" :name="category.icon" size-18 />
                {{ category.name }}
              </ComboboxItem>
              <ComboboxEmpty v-if="!categories?.length" f-p-md text="f-sm neutral-500 center">
                {{ $t('search.noCategoriesFound') }}
              </ComboboxEmpty>
            </ComboboxViewport>
          </ComboboxContent>
        </ComboboxRoot>

        <div flex="~ wrap gap-8" mt-4>
          <button
            v-for="category in selectedCategories"
            :key="category.id"
            outline="~ neutral-400 1.5"
            bg="neutral-100 hocus:neutral-200"
            text="14 neutral-800 hocus:neutral"
            font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs
            flex="~ items-center gap-6"
            @click="removeCategory(category.id)"
          >
            <Icon :name="category.icon" size-16 />
            {{ category.name }}
            <Icon name="i-nimiq:cross" size-16 />
          </button>

          <ToggleGroupRoot v-model="filters" type="multiple" flex="~ wrap gap-8">
            <ToggleGroupItem
              value="open_now"
              outline="~ neutral-400 1.5 reka-active:reka-blue"
              bg="neutral-100 hocus:neutral-200"
              text="14 neutral-800 hocus:neutral"
              font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs
            >
              {{ $t('filters.openNow') }}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="walkable"
              outline="~ neutral-400 1.5 reka-active:reka-blue"
              bg="neutral-100 hocus:neutral-200"
              text="14 neutral-800 hocus:neutral"
              font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs
            >
              {{ $t('filters.walkableDistance') }}
            </ToggleGroupItem>
          </ToggleGroupRoot>
        </div>

        <!-- Locations Grid -->
        <div flex="~ col gap-16" f-mt-xl>
          <div
            v-for="location in locations"
            :key="location.gmapsPlaceId"
            shadow="md hover:lg"

            rounded-12 cursor-pointer transition-all overflow-hidden
          >
            <div flex="~ gap-16" f-p-md>
              <!-- Image -->
              <div
                rounded-8 bg-neutral-200 flex-shrink-0 size-120 overflow-hidden
              >
                <NuxtImg v-if="location.photo" :src="location.photo" :alt="location.name" h-full w-full object-cover />
              </div>

              <!-- Content -->
              <div flex="~ col justify-between" flex-1>
                <div>
                  <div flex="~ items-start justify-between" f-mb-xs>
                    <h3 text="f-lg neutral-900" font-bold m-0>
                      {{ location.name }}
                    </h3>
                    <span
                      v-if="location.rating"
                      flex="~ items-center gap-4"
                      text="f-sm neutral-700"
                      bg="yellow-50"

                      font-medium px-8 py-4 rounded-full
                    >
                      <Icon name="i-nimiq:star" text-yellow-500 />
                      <span>{{ location.rating }}</span>
                    </span>
                  </div>

                  <p text="neutral-600 f-sm" mb-0 mt-4 line-clamp-2>
                    {{ location.address }}
                  </p>

                  <div flex="~ wrap gap-6" f-mt-sm>
                    <span
                      v-for="cat in location.categories.slice(0, 3)"
                      :key="cat.id"
                      text="f-xs neutral-700"
                      flex="~ items-center gap-4"
                      font-medium mt-0 px-10 py-6 rounded-full bg-neutral-100
                    >
                      <Icon :name="cat.icon" size-14 />
                      {{ cat.name }}
                    </span>
                  </div>
                </div>

                <NuxtLink
                  v-if="location.website"
                  :to="location.website"
                  target="_blank" external w-fit f-mt-sm nq-arrow nq-pill-blue
                >
                  {{ $t('location.visitWebsite') }}
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="!locations || locations.length === 0"

          shadow-md text-center rounded-12 f-py-2xl f-mt-xl
        >
          <p text="neutral-500" font-medium f-text-lg>
            {{ $t('empty.title') }}
          </p>
          <p text="neutral-400 f-sm" f-mt-xs>
            {{ $t('empty.subtitle') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
