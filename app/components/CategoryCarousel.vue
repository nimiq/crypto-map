<script setup lang="ts">
const props = defineProps<{
  categoryId: string
}>()

const emit = defineEmits<{
  select: [{ kind: 'location', uuid: string, name: string }]
}>()

const { data: locations } = useFetch(`/api/locations/by-category?categoryId=${props.categoryId}&limit=10`)

function selectLocation(location: any) {
  emit('select', { kind: 'location', uuid: location.uuid, name: location.name })
}
</script>

<template>
  <LocationCard v-for="location in locations" :key="location.uuid" :location="location" @click="selectLocation(location)" />
</template>
