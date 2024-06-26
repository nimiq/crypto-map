<script setup lang="ts">
import type { Currency } from 'types'
import { ModalName } from './Modal.vue'
import type { GoogleSuggestion } from '@/composables/useAutocomplete'

const selectedPlace = ref<GoogleSuggestion>()
const selectedCryptos = ref<Currency[]>([])

const open = ref(false)

const body = computed(() => ({
  name: selectedPlace.value?.label,
  gmapsPlaceId: selectedPlace.value?.placeId,
  currencies: selectedCryptos.value,
  dev: import.meta.env.DEV,
}))
const url = import.meta.env.VITE_SLACK_NEW_CANDIDATE_URL
const disabled = computed(() => !selectedPlace.value || !selectedCryptos.value.length)
const { state, submit, reset, isError, isSuccess, isSubmitted } = useForm({ url, body })
</script>

<template>
  <Modal v-model:open="open" :name="ModalName.Candidate" nested mx-auto pill-blue>
    <template #trigger>
      {{ $t('Add Crypto location') }}
    </template>
    <template #title>
      <div ml--6 text-center>
        <template v-if="isSuccess">
          {{ $t('Thank you!') }}
        </template>
        <template v-else-if="isError">
          {{ $t('Something went wrong') }}
        </template>
        <template v-else>
          {{ $t('Add a location') }}
        </template>
      </div>
    </template>
    <template #description>
      <template v-if="isSuccess">
        {{ $t('This may take a few days to process. Keep an eye out for changes to the location in the Crypto Map.') }}
      </template>
      <template v-else-if="isError">
        {{ $t('There has been a problem on our side. Please try again.') }}
      </template>
      <template v-else>
        {{ $t('Add any location that has a Google Business profile.') }}
      </template>
    </template>
    <template #content>
      <div v-if="!isSubmitted" mt-8 flex="~ col">
        <a
          href="https://www.google.com/business/" target="_blank" rel="noopener noreferrer" un-text="blue center"
          font-bold lh-20 arrow
        >
          {{ $t('Create Google Business profile') }}
        </a>
        <form mt-32 @submit.prevent="submit">
          <label for="name" text="14 neutral-900" mb-4 block font-200>{{ $t('Find Location') }}</label>
          <LocationSearchBox v-model:selected="selectedPlace" disable-persist-state />

          <label for="name" text="14 neutral-900" mb-4 mt-24 block font-200>{{ $t('Select Cryptocurrency') }}</label>
          <CurrencySelector v-model:selected="selectedCryptos" />

          <div flex="~ gap-16 justify-between">
            <DialogClose :aria-label="$t('Cancel')" pill-sm pill-secondary>
              Cancel
            </DialogClose>
            <button type="submit" :disabled :loading="state === FormState.Loading" pill-sm pill-blue>
              {{ $t('Submit Location') }}
            </button>
          </div>
        </form>
      </div>
      <button v-else pill-sm mt-32 pill-blue @click="isError ? reset() : (open = false)">
        {{ isError ? $t('Try again') : $t('Back to the Map') }}
      </button>
    </template>
  </Modal>
</template>
