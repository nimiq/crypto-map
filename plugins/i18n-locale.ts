export default defineNuxtPlugin(async () => {
  const { setLocale, locales } = useI18n()
  const route = useRoute()

  // Get available locale codes
  const availableLocales = (locales.value as { code: string }[]).map(l => l.code)

  // Check for locale in query param
  const queryLocale = route.query.locale as string | undefined

  if (queryLocale && availableLocales.includes(queryLocale)) {
    await setLocale(queryLocale)
  }
})
