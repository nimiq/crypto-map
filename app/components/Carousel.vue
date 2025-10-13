<script setup lang="ts">
defineProps<{
  title: string
  icon?: string
}>()
</script>

<template>
  <div translate-x="[calc(-1*var(--f-px))]" w-screen>
      <h2 flex="~ items-center gap-8" m-0 nq-label px="$f-px">
        <Icon v-if="icon" :name="icon" size-20 />
        {{ title }}
      </h2>
        <div f-mt-xs snap="x mandatory" flex="~ gap-12" children:snap-start nq-hide-scrollbar w-full of-x-auto scroll-pl="$f-px" first:children:ml="$f-px" last:children:mr="$f-px">
          <slot />
      </div>
  </div>
</template>
