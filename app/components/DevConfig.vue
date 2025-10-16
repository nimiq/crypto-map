<script setup lang="ts">
const { locale, locales, t } = useI18n()
const router = useRouter()
const switchLocalePath = useSwitchLocalePath()
const { useLuganoLocation, isFromQueryParams } = useUserLocation()

const availableLocales = computed(
  () => locales.value as { code: string, name: string }[],
)

async function changeLocale(code: string) {
  if (code === locale.value)
    return

  const path = switchLocalePath(code as any)
  if (!path)
    return

  await router.push(path)
}

const flags = {
  en: 'i-nimiq-flags:gb-hexagon',
  de: 'i-nimiq-flags:de-hexagon',
  es: 'i-nimiq-flags:es-hexagon',
  pt: 'i-nimiq-flags:pt-hexagon',
  fr: 'i-nimiq-flags:fr-hexagon',
} as const
</script>

<template>
  <div bottom-16 right-16 fixed z-50>
    <PopoverRoot>
      <PopoverTrigger as-child>
        <button
          flex="~ items-center justify-center"
          outline="~ 1.5 neutral-200 focus-visible:neutral-900"
          rounded-full
          bg-neutral-0
          size-40
          cursor-pointer
          shadow
          transition-colors
          hover:bg-neutral-50
        >
          <Icon name="i-tabler:settings" text-neutral size-20 />
        </button>
      </PopoverTrigger>
      <PopoverContent
        outline="~ 1.5 neutral-200"
        rounded-8
        bg-white
        w-280
        shadow-lg
        bottom-16
        right-16
        fixed
        z-50
        f-p-md
      >
        <!-- Language Section -->
        <div f-mb-md>
          <h3 text="f-xs neutral-900" font-semibold m-0 f-mb-xs>
            {{ t("devConfig.language") }}
          </h3>
          <div flex="~ col gap-4">
            <button
              v-for="availableLocale in availableLocales"
              :key="availableLocale.code"
              flex="~ items-center gap-8"
              text="f-sm neutral-800 hover:neutral-900"
              bg="hover:neutral-50"
              :class="{
                'bg-neutral-100 font-semibold': locale === availableLocale.code,
              }"
              outline-none
              rounded-6
              cursor-pointer
              transition-colors
              f-p-2xs
              @click="changeLocale(availableLocale.code)"
            >
              <Icon
                :name="flags[availableLocale.code as keyof typeof flags]"
                size-20
              />
              {{ availableLocale.name }}
            </button>
          </div>
        </div>

        <!-- Location Section -->
        <div border="t neutral-200" f-pt-md>
          <h3 text="f-xs neutral-900" font-semibold m-0 f-mb-xs>
            {{ t("devConfig.location") }}
          </h3>
          <label flex="~ items-center justify-between" cursor-pointer>
            <span text="f-sm neutral-800">
              {{ t("devConfig.useLuganoLocation") }}
            </span>
            <input v-model="useLuganoLocation" type="checkbox" nq-switch>
          </label>
          <p
            v-if="!useLuganoLocation && isFromQueryParams"
            text="f-xs neutral-600"
            m-0
            f-mt-xs
          >
            {{ t("devConfig.usingQueryParams") }}
          </p>
        </div>
      </PopoverContent>
    </PopoverRoot>
  </div>
</template>
