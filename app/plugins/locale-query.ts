type SupportedLocale = 'en' | 'es' | 'de' | 'fr' | 'pt'
const supportedLocales: SupportedLocale[] = ['en', 'es', 'de', 'fr', 'pt']

function isSupportedLocale(lang: unknown): lang is SupportedLocale {
  return typeof lang === 'string' && supportedLocales.includes(lang as SupportedLocale)
}

export default defineNuxtPlugin(() => {
  const { $i18n } = useNuxtApp()
  const route = useRoute()
  const localeCookie = useCookie<SupportedLocale | null>('i18n_locale', { maxAge: 60 * 60 * 24 * 365 })

  const lang = route.query.lang
  if (isSupportedLocale(lang) && lang !== $i18n.locale.value) {
    $i18n.setLocale(lang)
    localeCookie.value = lang
  }

  // Watch for client navigation with ?lang param
  watch(() => route.query.lang, async (newLang) => {
    if (isSupportedLocale(newLang) && newLang !== $i18n.locale.value) {
      await $i18n.setLocale(newLang)
      localeCookie.value = newLang
    }
  })
})
