<script setup lang='ts'>
interface Props { category?: string, openNow: boolean, nearMe: boolean, categories?: Array<{ id: string, name: string, icon: string }> }
interface Emits { (e: 'update:category', value: string | undefined): void, (e: 'update:openNow', value: boolean): void, (e: 'update:nearMe', value: boolean): void }

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

const categoryLabel = computed(() => props.category ? formatCategoryLabel(props.category) : null)

function clearCategory() {
  emit('update:category', undefined)
}

const categoryIcon = computed(() => {
  if (!props.category || !props.categories)
    return 'i-tabler:category'
  const cat = props.categories.find(c => c.id === props.category)
  return cat?.icon || 'i-tabler:category'
})
</script>

<template>
  <div flex='~ gap-8'>
    <button v-if='category' outline='~ 1.5 offset--1.5 white/10' flex='~ items-center gap-4' py-3 border-0 rounded-full bg-blue cursor-pointer f-px-2xs @click='clearCategory'>
      <Icon :name='categoryIcon' scale-0- text-white />
      <span text='f-xs white' font-medium>{{ categoryLabel }}</span>
      <Icon name='i-tabler:x' text-white op-70 />
    </button>

    <ToggleGroupRoot v-model='selectedFilters' type='multiple' nq-raw flex='~ gap-8'>
      <ToggleGroupItem value='openNow' bg='neutral-0 reka-on:blue' outline='~ 1.5 offset--1.5 neutral/10 reka-on:white/10' flex='~ items-center gap-4' py-3 rounded-full f-px-2xs>
        <Icon name='i-tabler:clock' text='neutral-700 reka-on:white' scale-90 />
        <span text='f-xs neutral-800 reka-on:white' font-medium>{{ t('filters.openNow') }}</span>
      </ToggleGroupItem>
      <ToggleGroupItem value='nearMe' bg='neutral-0 reka-on:blue' outline='~ 1.5 offset--1.5 neutral/10' flex='~ items-center gap-4' py-3 rounded-full f-px-2xs>
        <Icon name='i-tabler:walk' text='neutral-700 reka-on:white' scale-90 />
        <span text='f-xs neutral-800 reka-on:white' font-medium>{{ t('filters.nearMe') }}</span>
      </ToggleGroupItem>
    </ToggleGroupRoot>
  </div>
</template>
