<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { Popover } from 'radix-vue/namespaced'
import { useRoute } from 'vue-router'
import Button from '@/components/atoms/Button.vue'
import CryptocityCard from '@/components/cards/cryptocity/CryptocityCard.vue'
import CryptocityIcon from '@/components/icons/icon-cryptocity.vue'
import GeolocationIcon from '@/components/icons/icon-geolocation.vue'
import MinusIcon from '@/components/icons/icon-minus.vue'
import PlusIcon from '@/components/icons/icon-plus.vue'
import { useGeoIp } from '@/composables/useGeoLocation'
import { useCryptocities } from '@/stores/cryptocities'
import { useMap } from '@/stores/map'

const isDev = import.meta.env.DEV

const { cryptocitiesInView } = storeToRefs(useCryptocities())
const { zoom } = storeToRefs(useMap())
const cryptocityControl = computed(() => cryptocitiesInView.value.find(c => c.showCardAtZoom <= zoom.value))

const route = useRoute()

const cryptocityCardOpen = ref(false)
watch(
  [() => route.query.cryptocity, cryptocitiesInView],
  ([c]) => {
    cryptocityCardOpen.value = typeof c === 'string' && !!(cryptocitiesInView.value.some(({ name }) => name === c))
  },
  { immediate: true },
)

const isGeolocationLoading = ref(false)
const { browserPositionIsSupported, ipPosition, ipPositionError, geolocateIp, geolocateUserViaBrowser, geolocatingUserBrowser, errorBrowser } = useGeoIp()

async function setBrowserPosition() {
  isGeolocationLoading.value = true
  const browserPosition = await geolocateUserViaBrowser()
  if (errorBrowser.value) {
    /* eslint-disable-next-line no-alert */
    alert(`${errorBrowser.value.message}. Moving to closest location`)
    await geolocateIp()
    if (!ipPositionError.value && ipPosition.value)
      useMap().setPosition(ipPosition.value)
    isGeolocationLoading.value = false
    return
  }
  isGeolocationLoading.value = false
  useMap().setPosition(browserPosition)
}

const clearLocalStorage = () => localStorage.clear()
</script>

<template>
  <div class="flex flex-col items-end gap-y-4">
    <Popover.Root
      v-if="cryptocityControl" :open="cryptocityCardOpen"
      @update:open="$router.push({ query: { ...$route.query, cryptocity: $event ? cryptocityControl.name : undefined } })"
    >
      <Popover.Trigger
        class="border border-[#e9e9ed] animate-scale !w-8 !h-8 shadow bg-white rounded-full p-1.5"
        data-cryptocity-card-trigger :aria-label="$t('Information about this Cryptocity')"
      >
        <CryptocityIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end" side="bottom" :side-offset="-32"
          class="max-desktop:-mb-[72px] max-desktop:w-screen will-change-[transform,opacity] animate-slideUpAndFade"
          @close-auto-focus.prevent @interact-outside.prevent @open-auto-focus.prevent
        >
          <CryptocityCard
            :cryptocity="cryptocityControl"
            @close="$router.push({ query: { ...$route.query, cryptocity: undefined } })"
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>

    <Button
      v-if="browserPositionIsSupported" class="!w-8 !h-8 shadow border border-[#e9e9ed]"
      :disabled="geolocatingUserBrowser" bg-color="white" :aria-label="$t('Show your location')"
      :title="$t('Show your location')" @click="setBrowserPosition"
    >
      <template #icon>
        <GeolocationIcon class="w-5" />
      </template>
    </Button>

    <div class="flex flex-col bg-white rounded-full shadow max-desktop:hidden border border-[#e9e9ed] w-8">
      <Button bg-color="white" class="!w-8 !h-8 rounded-b-0" @click="useMap().increaseZoom">
        <template #icon>
          <PlusIcon class="w-5" />
        </template>
      </Button>

      <hr class="self-stretch h-[2px] -my-px bg-space/10">

      <Button bg-color="white" class="!w-8 !h-8 rounded-t-0" @click="useMap().decreaseZoom">
        <template #icon>
          <MinusIcon class="w-5" />
        </template>
      </Button>
    </div>

    <div v-if="isDev" class="absolute bottom-0 flex position right-12">
      <Button bg-color="white" color="blue" size="sm" text-color="ocean" @click="clearLocalStorage">
        <template #label>
          Delete Storage
        </template>
      </Button>
    </div>
  </div>
</template>
