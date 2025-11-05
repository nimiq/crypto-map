<script setup lang="ts">
defineProps<{
  icon?: string
  badges?: Array<{ icon: string, color: string }>
  color?: string
}>()
</script>

<template>
  <div inline-block relative>
    <!-- Pin base (teardrop shape) -->
    <svg width="48" height="64" viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Shadow -->
      <ellipse cx="24" cy="62" rx="8" ry="2" fill="black" opacity="0.2" />

      <!-- Pin shape -->
      <path
        d="M24 0C13.5066 0 5 8.5066 5 19C5 29.4934 24 56 24 56C24 56 43 29.4934 43 19C43 8.5066 34.4934 0 24 0Z"
        :fill="color || '#E9B213'"
        stroke="white"
        stroke-width="2"
      />

      <!-- Icon circle background -->
      <circle cx="24" cy="19" r="13" fill="white" />

      <!-- Category icon -->
      <g v-if="icon" transform="translate(24, 19)">
        <text
          text-anchor="middle"
          dominant-baseline="central"
          font-size="16"
        >
          {{ icon }}
        </text>
      </g>
    </svg>

    <!-- Badges positioned at bottom right of pin -->
    <div v-if="badges?.length" absolute bottom="8" right="-4" flex="~ row gap-2">
      <div
        v-for="(badge, i) in badges"
        :key="i"
        :style="{ backgroundColor: badge.color }"

        flex="~ items-center justify-center"

        border="2 white"
        text-xs text-white font-bold rounded-full size-20 shadow
      >
        {{ badge.icon }}
      </div>
    </div>
  </div>
</template>
