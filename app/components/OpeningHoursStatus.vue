<script setup lang="ts">
import { toZonedTime } from 'date-fns-tz'
import OpeningHours from 'opening_hours'

const props = defineProps<{
  openingHours: string
  timezone: string
}>()

const status = computed(() => {
  try {
    const localDate = toZonedTime(new Date(), props.timezone)
    const oh = new OpeningHours(props.openingHours.trim())
    const isOpen = oh.getState(localDate)

    if (isOpen) {
      const nextChange = oh.getNextChange(localDate)
      if (nextChange) {
        const minutesUntilClose = Math.floor((nextChange.getTime() - localDate.getTime()) / 1000 / 60)
        if (minutesUntilClose <= 60) {
          return { label: 'Closes soon', variant: 'warning' as const }
        }
      }
      return { label: 'Open now', variant: 'success' as const }
    }

    return { label: 'Closed', variant: 'neutral' as const }
  }
  catch {
    return { label: 'Unknown', variant: 'neutral' as const }
  }
})

const formattedHours = computed(() => {
  try {
    const oh = new OpeningHours(props.openingHours.trim())
    return oh.prettifyValue().split(';').map(line => line.trim()).filter(Boolean)
  }
  catch {
    return [props.openingHours]
  }
})

const variantClasses = {
  success: 'bg-neutral-100 text-neutral-800',
  warning: 'bg-orange-200 text-orange-800',
  neutral: 'bg-neutral-100 text-neutral-800',
}
</script>

<template>
  <div flex="~ items-center gap-4">
    <span :class="variantClasses[status.variant]" font-medium px-4 py-1 rounded-3 whitespace-nowrap text="10px">
      {{ status.label }}
    </span>
    <TooltipRoot :delay-duration="0">
      <TooltipTrigger as-child>
        <Icon name="i-nimiq:info" text-neutral-500 size-12 cursor-help />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent border="1 neutral-200" px-12 py-8 rounded-8 bg-white max-w-400 shadow-lg z-50>
          <div text="f-xs neutral-700" font-mono>
            <div v-for="(line, index) in formattedHours" :key="index">{{ line }}</div>
          </div>
          <TooltipArrow bg-white />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </div>
</template>
