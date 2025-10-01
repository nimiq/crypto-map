async function fetchPhotoFromGoogle(placeId: string): Promise<{ data: ArrayBuffer | null, error: string | null }> {
  try {
    const config = useRuntimeConfig()
    const apiKey = config.googleApiKey

    if (!apiKey) {
      return { data: null, error: 'Google API key not configured' }
    }

    // Get photo reference from Place Details
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${apiKey}`
    const detailsResponse = await fetch(detailsUrl)
    const detailsData = await detailsResponse.json()

    if (!detailsResponse.ok || detailsData.status !== 'OK') {
      return { data: null, error: `Failed to fetch place details: ${detailsData.status}` }
    }

    const photos = detailsData.result?.photos
    if (!photos || photos.length === 0) {
      return { data: null, error: 'No photos found for this place' }
    }

    const photoReference = photos[0].photo_reference

    // Fetch the actual photo
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${apiKey}`
    const photoResponse = await fetch(photoUrl)

    if (!photoResponse.ok) {
      return { data: null, error: 'Failed to fetch photo' }
    }

    const arrayBuffer = await photoResponse.arrayBuffer()
    return { data: arrayBuffer, error: null }
  }
  catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export default eventHandler(async (event) => {
  const { pathname } = getRouterParams(event)

  if (!pathname) {
    throw createError({ statusCode: 400, message: 'Invalid pathname' })
  }

  // Handle location images: /images/location/{uuid}.jpg
  if (pathname.startsWith('location/')) {
    const uuid = pathname.replace('location/', '').replace(/\.[^/.]+$/, '')

    // Check if image exists in blob storage
    const blob = hubBlob()
    const existingImage = await blob.head(pathname).catch(() => null)

    // If not cached, fetch from external URL or Google Maps and store
    if (!existingImage) {
      const db = useDrizzle()
      const results = await db
        .select({ photo: tables.locations.photo, gmapsPlaceId: tables.locations.gmapsPlaceId })
        .from(tables.locations)
        .where(eq(tables.locations.uuid, uuid))
        .limit(1)

      const location = results[0]

      if (!location) {
        throw createError({ statusCode: 404, message: `Location ${uuid} not found` })
      }

      let imageBuffer: ArrayBuffer | null = null

      // Try fetching from external URL first
      if (location.photo) {
        try {
          const response = await fetch(location.photo)
          if (response.ok) {
            imageBuffer = await response.arrayBuffer()
          }
        }
        catch {
          // Fallback to Google Maps if external URL fails
        }
      }

      // Fallback to Google Maps API if no photo URL or fetch failed
      if (!imageBuffer && location.gmapsPlaceId) {
        const { data, error } = await fetchPhotoFromGoogle(location.gmapsPlaceId)
        if (!error && data) {
          imageBuffer = data
        }
      }

      if (!imageBuffer) {
        throw createError({ statusCode: 404, message: 'No image available for this location' })
      }

      await blob.put(pathname, imageBuffer, {
        contentType: 'image/jpeg',
      })
    }

    return blob.serve(event, pathname)
  }

  throw createError({ statusCode: 404, message: 'Image not found' })
})
