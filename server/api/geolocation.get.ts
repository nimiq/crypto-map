export default defineEventHandler((event) => {
  const cf = (event.context.cloudflare as any)?.cf
  if (!cf?.latitude || !cf?.longitude)
    return { lat: null, lng: null }
  return { lat: Number(cf.latitude), lng: Number(cf.longitude) }
})
