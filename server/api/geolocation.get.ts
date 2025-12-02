export default defineEventHandler((event) => {
  const cf = event.context.cf as { latitude?: string, longitude?: string } | undefined
  if (!cf?.latitude || !cf?.longitude)
    return { lat: null, lng: null }
  return { lat: Number(cf.latitude), lng: Number(cf.longitude) }
})
