<script setup lang="ts">
const props = defineProps<{ uuid: string }>()

const photoIndices = [0, 1, 2]
const failedPhotos = ref<Set<number>>(new Set())

function onError(index: number) {
  failedPhotos.value.add(index)
}

const availablePhotos = computed(() => photoIndices.filter(i => !failedPhotos.value.has(i)))
</script>

<template>
  <div v-if="availablePhotos.length > 0" flex="~" gap-2 of-x-auto snap-x snap-mandatory class="no-scrollbar">
    <div v-for="index in photoIndices" v-show="!failedPhotos.has(index)" :key="index" shrink-0 w-full snap-center>
      <NuxtImg
        :src="`/blob/location/${props.uuid}/${index}`"
        provider="cloudflareOnProd"
        :alt="`Photo ${index + 1}`"
        rounded-lg w-full aspect-video object-cover
        @error="onError(index)"
      />
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
