<script setup lang="ts">
import type { Location } from 'types'

defineProps<{ location: Location, isAtm: boolean }>()

const { isMobile } = storeToRefs(useApp())

// For the banner Nimiq Pay, the label should be Nimiq Pay
function handleProviderPlaceholder({ banner, provider }: Location) {
  if (banner === 'Nimiq-Pay') return 'Nimiq Pay'
  return provider
}
</script>

<template>
  <footer class="relative flex items-center" :h="location.bannerLabel ? '64' : '36'">
    <LocationCardBg v-if="!location.isAtm && location.bannerLabel" :location="location" />

    <div v-if="location.bannerLabel" flex="~ items-center gap-8" pt-6 pl-24 pr-72 text-12>
      <i18n-t :keypath="location.bannerLabel" tag="p" text-neutral-50>
        <!-- The name in the label can optionally be written bold by including a {provider} placeholder -->
        <template #provider>
          <b>{{ handleProviderPlaceholder(location) }}</b>
        </template>
      </i18n-t>

      <PopoverRoot>
        <PopoverTrigger>
          <div i-nimiq:info text="14 neutral-0/50 inverted:neutral/50" />
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent as-child max-w-320 p-16 text-neutral-0 rounded-6 shadow z-100 bg-gradient-neutral
            :side-offset="4" :collision-padding="8" :side="isMobile ? 'top' : 'right'">
            <div>
              <header flex="~ items-center justify-start gap-8">
                <BannerCircleLogo :banner="location.banner" />
                <h4 font-semibold truncate text-16 text-neutral-400 lh-20>
                  {{ handleProviderPlaceholder(location) }}
                </h4>
                <div v-if="location.bannerTooltipLabel" ml-auto text-neutral-600 text-10 whitespace-nowrap label>
                  {{ location.bannerTooltipLabel }}
                </div>
              </header>

              <p text="14 neutral-600" mt-8>
                {{ location.bannerTooltip }}
              </p>

              <a v-if="location.bannerTooltipCta" :href="location.bannerTooltipCta" target="_blank"
                rel="noopener noreferrer" arrow un-text-neutral-600 block mt-12 before:op-80 flex="~ items-center">
                {{ $t('Learn more') }}
              </a>

              <template v-if="location.bannerAppStore || location.bannerGooglePlay">
                <div flex="~ items-center gap-24" mt-16 text-40>
                  <a v-if="location.bannerAppStore" :href="location.bannerAppStore" target="_blank"
                    rel="noopener noreferrer" flex-1 :aria-label="$t('Download on App Store')"
                    i-nimiq:logos-download-app-store />
                  <a v-if="location.bannerGooglePlay" :href="location.bannerGooglePlay" target="_blank"
                    rel="noopener noreferrer" flex-1 :aria-label="$t('Download on Play Store')"
                    i-nimiq:logos-download-google-play />
                </div>
              </template>
              <PopoverArrow data-arrow fill-neutral desktop:relative size="10" />

              <PopoverArrow as-child>
                <div w-16 h-8 i-nimiq:tooltip-triangle aria-hidden :style="`color: ${location.bg}`" />
              </PopoverArrow>
            </div>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
    </div>
  </footer>
</template>