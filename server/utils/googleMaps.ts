export async function fetchPhotoFromGoogle(placeId: string): Promise<{ data: ArrayBuffer | null, error: string | null }> {
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
