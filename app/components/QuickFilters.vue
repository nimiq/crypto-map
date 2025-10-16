<script setup lang='ts'>
interface Props { selectedCategories?: string[], openNow: boolean, nearMe: boolean, categories?: Array<{ id: string, name: string, icon: string }> }
interface Emits { (e: 'removeCategory', categoryId: string): void, (e: 'update:openNow', value: boolean): void, (e: 'update:nearMe', value: boolean): void }

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const selectedFilters = computed<string[]>({
  get: () => {
    const filters: string[] = []
    if (props.openNow)
      filters.push('openNow')
    if (props.nearMe)
      filters.push('nearMe')
    return filters
  },
  set: (value: string[]) => {
    emit('update:openNow', value.includes('openNow'))
    emit('update:nearMe', value.includes('nearMe'))
  },
})

function formatCategoryLabel(cat: string) {
  const translationKey = `categories.${cat}`
  const translated = t(translationKey)
  if (translated && translated !== translationKey)
    return translated
  return cat.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function getCategoryIcon(categoryId: string) {
  if (!props.categories)
    return 'i-tabler:category'
  const cat = props.categories.find(c => c.id === categoryId)
  return cat?.icon || 'i-tabler:category'
}

function removeCategory(categoryId: string) {
  emit('removeCategory', categoryId)
}
</script>

<template>
  <div translate-x="[calc(-1*var(--f-px))]" w-screen>
    <div flex="~ gap-8" of-x-auto nq-hide-scrollbar px="$f-px">
      <button v-for="catId in selectedCategories" :key="catId" outline="~ 1.5 offset--1.5 white/10" flex="~ items-center gap-4" py-3 border-0 rounded-full bg-blue cursor-pointer f-px-2xs @click="removeCategory(catId)">
        <Icon :name="getCategoryIcon(catId)" text-white scale-90 />
        <span text="f-xs white" font-medium>{{ formatCategoryLabel(catId) }}</span>
        <Icon name="i-tabler:x" text-white op-70 />
      </button>

      <ToggleGroupRoot v-model="selectedFilters" type="multiple" nq-raw flex="~ gap-8">
        <ToggleGroupItem value="openNow" bg="neutral-0 reka-on:blue" outline="~ 1.5 offset--1.5 neutral/10 reka-on:white/10" flex="~ items-center gap-4" py-3 rounded-full f-px-2xs>
          <Icon name="i-tabler:clock" text="neutral-700 reka-on:white" scale-90 />
          <span text="f-xs neutral-800 reka-on:white" font-medium>{{ t('filters.openNow') }}</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="nearMe" bg="neutral-0 reka-on:blue" outline="~ 1.5 offset--1.5 neutral/10" flex="~ items-center gap-4" py-3 rounded-full f-px-2xs>
          <Icon name="i-tabler:walk" text="neutral-700 reka-on:white" scale-90 />
          <span text="f-xs neutral-800 reka-on:white" font-medium>{{ t('filters.nearMe') }}</span>
        </ToggleGroupItem>
      </ToggleGroupRoot>
    </div>
  </div>
</template>
