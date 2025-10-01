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
      const location = await db
        .select({ photo: tables.locations.photo, gmapsPlaceId: tables.locations.gmapsPlaceId })
        .from(tables.locations)
        .where(eq(tables.locations.uuid, uuid))
        .get()

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
