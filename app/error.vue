<script setup lang="ts">
import type { NuxtError } from '#app'

// Don't use the default layout for error pages
definePageMeta({
  layout: false,
})

const props = defineProps<{
  error: NuxtError
}>()

const { t } = useI18n()

const is404 = computed(() => props.error.statusCode === 404)

const title = computed(() => 
  is404.value ? t('error.notFound.title') : t('error.general.title')
)

const message = computed(() =>
  is404.value ? t('error.notFound.message') : t('error.general.message')
)

function handleGoHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div flex="~ col items-center justify-center" min-h-screen f-px-md f-py-2xl>
    <div flex="~ col items-center gap-16" max-w-md text-center>
      <!-- Error Icon -->
      <div 
        flex="~ items-center justify-center" 
        size-64 
        rounded-full 
        bg-neutral-200
      >
        <Icon 
          :name="is404 ? 'i-tabler:error-404' : 'i-tabler:alert-triangle'" 
          text-40 
          text-neutral-700
        />
      </div>

      <!-- Error Code -->
      <div flex="~ col gap-8">
        <h1 text="neutral-900 f-2xl" font-bold m-0>
          {{ error.statusCode }}
        </h1>
        <h2 text="neutral-800 f-lg" font-semibold m-0>
          {{ title }}
        </h2>
        <p text="neutral-700 f-sm" m-0>
          {{ message }}
        </p>
      </div>

      <!-- Actions -->
      <div flex="~ gap-12 wrap justify-center" f-mt-md>
        <button
          nq-button-s
          nq-button-blue
          @click="handleGoHome"
        >
          <Icon name="i-tabler:home" text-16 />
          {{ t('error.backToHome') }}
        </button>
        
        <button
          v-if="!is404"
          nq-button-s
          bg-transparent
          after:op-90
          un-text="blue-1100"
          @click="$router.back()"
        >
          <Icon name="i-tabler:arrow-left" text-16 />
          {{ t('error.goBack') }}
        </button>
      </div>
    </div>
  </div>
</template>
