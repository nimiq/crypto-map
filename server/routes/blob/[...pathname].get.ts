import { consola } from 'consola'

const MIN_VALID_IMAGE_BYTES = 1024
const IMAGE_MIME_PATTERN = /^image\//i

function isValidImage(contentType: string | null | undefined, buffer: ArrayBuffer | null): buffer is ArrayBuffer {
  if (!buffer)
    return false

  if (!contentType || !IMAGE_MIME_PATTERN.test(contentType))
    return false

  return buffer.byteLength >= MIN_VALID_IMAGE_BYTES
}

async function fetchPhotoFromGoogle(placeId: string, photoIndex = 0): Promise<{ data: ArrayBuffer | null, contentType: string | null, error: string | null }> {
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

    if (photoIndex >= photos.length)
      return { data: null, contentType: null, error: `Photo ${photoIndex} not available (has ${photos.length})` }

    const photoReference = photos[photoIndex].photo_reference

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

export default eventHandler(async (event) => {
  const { pathname } = getRouterParams(event)
  if (!pathname)
    throw createError({ statusCode: 400, message: 'Invalid pathname' })

  if (pathname.startsWith('location/')) {
    const parts = pathname.replace('location/', '').split('/')
    const uuid = parts[0]
    const indexStr = parts[1]

    if (!uuid || !indexStr)
      throw createError({ statusCode: 400, message: 'Invalid path. Use /blob/location/{uuid}/{index}' })

    const photoIndex = Number.parseInt(indexStr, 10)
    if (Number.isNaN(photoIndex) || photoIndex < 0 || photoIndex > 2)
      throw createError({ statusCode: 400, message: 'Photo index must be 0-2' })

    // Check if valid image exists in cache (fetch actual content to validate)
    const cachedBlob = await blob.get(pathname).catch(() => null)
    if (cachedBlob) {
      const cachedBuffer = await cachedBlob.arrayBuffer()
      const cachedContentType = cachedBlob.type

      if (isValidImage(cachedContentType, cachedBuffer)) {
        setHeader(event, 'Content-Type', cachedContentType)
        setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
        return cachedBuffer
      }

      // Delete invalid cached images
      await blob.delete(pathname).catch((error: unknown) => {
        consola.warn(`Deleted invalid cached image for ${uuid}:`, error, { tag: 'image-proxy' })
      })
    }

    // Fetch gmapsPlaceId from database
    const db = useDrizzle()
    const location = await db
      .select({ gmapsPlaceId: tables.locations.gmapsPlaceId })
      .from(tables.locations)
      .where(eq(tables.locations.uuid, uuid))
      .limit(1)
      .then(res => res?.at(0))

    if (!location)
      throw createError({ statusCode: 404, message: `Location ${uuid} not found` })

    let imageBuffer: ArrayBuffer | null = null
    let contentType = 'image/jpeg'

    if (location.gmapsPlaceId) {
      const { data, contentType: gmapsContentType, error } = await fetchPhotoFromGoogle(location.gmapsPlaceId, photoIndex)
      if (!error && data) {
        const resolvedContentType = gmapsContentType || 'image/jpeg'
        const dataSize = data.byteLength
        if (isValidImage(resolvedContentType, data)) {
          imageBuffer = data
          contentType = resolvedContentType
        }
        else {
          consola.warn(`Discarded invalid Google photo for ${uuid}`, {
            tag: 'image-proxy',
            contentType: resolvedContentType,
            size: dataSize,
          })
        }
      }
      else if (error) {
        consola.warn(`Google photo fetch failed for ${uuid}: ${error}`, { tag: 'image-proxy' })
      }
    }

    if (!isValidImage(contentType, imageBuffer))
      throw createError({ statusCode: 404, message: 'No image available for this location' })

    // Cache in background (fire-and-forget)
    // waitUntil ensures the task completes even after response is sent
    event.waitUntil(
      blob.put(pathname, imageBuffer, { contentType }).catch((error: unknown) => {
        consola.error(`Failed to cache image for ${uuid}:`, error, { tag: 'image-proxy' })
      }),
    )

    // Serve image directly
    setHeader(event, 'Content-Type', contentType)
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
    return imageBuffer
  }

  throw createError({ statusCode: 404, message: 'Image not found' })
})
