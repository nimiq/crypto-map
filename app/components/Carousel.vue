<script setup lang="ts">
const props = defineProps<{
  title: string
  icon?: string
  categories?: string[]
}>()

const emit = defineEmits<{
  seeAll: [categories: string[]]
}>()

const { t } = useI18n()

const showSeeAll = computed(() => props.categories && props.categories.length > 0)
</script>

<template>
  <div translate-x="[calc(-1*var(--f-px))]" w-screen>
    <div flex="~ items-center gap-8" m-0 nq-label px="$f-px">
      <Icon v-if="icon" :name="icon" size-20 />
      <h2 m-0>
        {{ title }}
      </h2>
      <button v-if="showSeeAll" type="button" flex="~ items-center gap-4" text="neutral-700 f-xs" tracking-normal ml-auto outline-none border-none bg-transparent cursor-pointer whitespace-nowrap transition-colors hover:text-neutral-900 @click="emit('seeAll', categories!)">
        <span font-semibold>{{ t("carousel.seeAll") }}</span>
        <Icon name="i-tabler:chevron-right" size-16 />
      </button>
    </div>
    <div snap="x mandatory" flex="~ gap-12" w-full of-x-auto f-mt-xs nq-hide-scrollbar children:snap-start scroll-pl="$f-px" scroll-pr="$f-px!" scroll-px="$f-px" first:children:ml="$f-px" last:children:mr="$f-px">
      <slot />
    </div>
  </div>
</template>
