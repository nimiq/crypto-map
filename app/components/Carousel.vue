<script setup lang="ts">
defineProps<{
  title: string
  icon?: string
}>()

const scrollContainer = ref<HTMLElement>()
const showLeftArrow = ref(false)
const showRightArrow = ref(false)

function updateArrows() {
  if (!scrollContainer.value)
    return
  const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.value
  showLeftArrow.value = scrollLeft > 0
  showRightArrow.value = scrollLeft < scrollWidth - clientWidth - 10
}

function scroll(direction: 'left' | 'right') {
  if (!scrollContainer.value)
    return
  const scrollAmount = scrollContainer.value.clientWidth * 0.8
  scrollContainer.value.scrollBy({
    left: direction === 'left' ? -scrollAmount : scrollAmount,
    behavior: 'smooth',
  })
}

onMounted(() => {
  updateArrows()
  scrollContainer.value?.addEventListener('scroll', updateArrows)
})

onUnmounted(() => {
  scrollContainer.value?.removeEventListener('scroll', updateArrows)
})
</script>

<template>
  <div f-mb-xl>
    <div flex="~ items-center justify-between" f-mb-md>
      <h2 flex="~ items-center gap-8" m-0 nq-label>
        <Icon v-if="icon" :name="icon" size-20 />
        {{ title }}
      </h2>
      <div v-if="showLeftArrow || showRightArrow" flex="~ gap-8" class="hidden md:flex">
        <button v-if="showLeftArrow" type="button" flex="~ items-center justify-center" bg="neutral-200 hover:neutral-300" rounded-full size-32 transition-colors @click="scroll('left')">
          <Icon name="i-tabler:chevron-left" text-neutral-900 size-20 />
        </button>
        <button v-if="showRightArrow" type="button" flex="~ items-center justify-center" bg="neutral-200 hover:neutral-300" rounded-full size-32 transition-colors @click="scroll('right')">
          <Icon name="i-tabler:chevron-right" text-neutral-900 size-20 />
        </button>
      </div>
    </div>
    <div ref="scrollContainer"  translate-x="[calc(-1*var(--f-px))]" w-screen snap="x mandatory" class="carousel-container" flex="~" pb-8 gap-12 of-x-auto children:snap-align-start scroll-px-24 hide-scrollbar style="scrollbar-width: none; -webkit-overflow-scrolling: touch;">
      <slot />
    </div>
  </div>
</template>
