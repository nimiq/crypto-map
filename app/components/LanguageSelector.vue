<script setup lang="ts">
const { locale, locales } = useI18n()
const router = useRouter()
const switchLocalePath = useSwitchLocalePath()

const availableLocales = computed(() => locales.value as { code: string, name: string }[])

async function changeLocale(code: string) {
  if (code === locale.value)
    return

  const path = switchLocalePath(code as any)
  if (!path)
    return

  await router.push(path)
}
</script>

<template>
  <div bottom-16 right-16 fixed z-50>
    <SelectRoot :model-value="locale" @update:model-value="changeLocale">
      <SelectTrigger flex="~ items-center justify-center" bg="white/95 hover:white" shadow-sm rounded-full size-40 cursor-pointer transition-colors backdrop-blur-sm outline="~ 1.5 neutral-200">
        <Icon name="i-tabler:world" text-neutral-900 size-20 />
      </SelectTrigger>
      <SelectContent position="popper" outline="~ 1.5 neutral-200" rounded-8 bg-white max-h-256 shadow z-50 of-auto>
        <SelectViewport f-p-xs>
          <SelectItem v-for="availableLocale in availableLocales" :key="availableLocale.code" :value="availableLocale.code" flex="~ items-center gap-8" text="f-sm neutral-800 data-[highlighted]:neutral-900" bg="data-[highlighted]:neutral-50" py-10 outline-none rounded-6 cursor-pointer transition-colors f-px-md>
            {{ availableLocale.name }}
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectRoot>
  </div>
</template>
