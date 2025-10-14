import { consola } from 'consola'

async function fetchPhotoFromGoogle(placeId: string): Promise<{ data: ArrayBuffer | null, contentType: string | null, error: string | null }> {
  try {
    const config = useRuntimeConfig()
    const apiKey = config.googleApiKey

    if (!apiKey)
      return { data: null, contentType: null, error: 'Google API key not configured' }

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${apiKey}`
    const detailsResponse = await fetch(detailsUrl)
    const detailsData = await detailsResponse.json()

    if (!detailsResponse.ok || detailsData.status !== 'OK')
      return { data: null, contentType: null, error: `Failed to fetch place details: ${detailsData.status}` }

    const photos = detailsData.result?.photos
    if (!photos || photos.length === 0)
      return { data: null, contentType: null, error: 'No photos found for this place' }

    const photoReference = photos[0].photo_reference

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${apiKey}`
    const photoResponse = await fetch(photoUrl)

    if (!photoResponse.ok)
      return { data: null, contentType: null, error: 'Failed to fetch photo' }

    const arrayBuffer = await photoResponse.arrayBuffer()
    const contentType = photoResponse.headers.get('content-type') || 'image/jpeg'
    return { data: arrayBuffer, contentType, error: null }
  }
  catch (error) {
    return { data: null, contentType: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const uuid = query.uuid as string

  if (!uuid)
    throw createError({ statusCode: 400, message: 'UUID parameter required' })

  const blob = hubBlob()
  const pathname = `location/${uuid}`

  // Check if image exists in cache
  const existingImage = await blob.head(pathname).catch(() => null)
  if (existingImage)
    return blob.serve(event, pathname)

  // Fetch image from database and external sources
  const db = useDrizzle()
  const location = await db
    .select({ photo: tables.locations.photo, gmapsPlaceId: tables.locations.gmapsPlaceId })
    .from(tables.locations)
    .where(eq(tables.locations.uuid, uuid))
    .limit(1)
    .then(res => res?.at(0))

  if (!location)
    throw createError({ statusCode: 404, message: `Location ${uuid} not found` })

  let imageBuffer: ArrayBuffer | null = null
  let contentType = 'image/jpeg'

  if (location.photo) {
    try {
      const response = await fetch(location.photo)
      if (response.ok) {
        imageBuffer = await response.arrayBuffer()
        contentType = response.headers.get('content-type') || 'image/jpeg'
      }
    }
    catch {
      // Fallback to Google Maps if external URL fails
    }
  }

  if (!imageBuffer && location.gmapsPlaceId) {
    const { data, contentType: gmapsContentType, error } = await fetchPhotoFromGoogle(location.gmapsPlaceId)
    if (!error && data) {
      imageBuffer = data
      contentType = gmapsContentType || 'image/jpeg'
    }
  }

  if (!imageBuffer)
    throw createError({ statusCode: 404, message: 'No image available for this location' })

  // Cache in background (fire-and-forget)
  // waitUntil ensures the task completes even after response is sent
  event.waitUntil(
    blob.put(pathname, imageBuffer, { contentType }).catch((error) => {
      consola.error(`Failed to cache image for ${uuid}:`, error, { tag: 'image-proxy' })
    }),
  )

  // Serve image directly
  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return imageBuffer
})
