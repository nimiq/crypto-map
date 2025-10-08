// Browser Geolocation API integration
export function useGeolocation() {
  const latitude = useState<number | null>('geolocation-latitude', () => null)
  const longitude = useState<number | null>('geolocation-longitude', () => null)
  const error = useState<string | null>('geolocation-error', () => null)
  const isLoading = useState('geolocation-loading', () => false)

  async function requestLocation() {
    if (!import.meta.client)
      return

    if (!navigator.geolocation) {
      error.value = 'Geolocation is not supported by your browser'
      return
    }

    isLoading.value = true
    error.value = null

    navigator.geolocation.getCurrentPosition(
      (position) => {
        latitude.value = position.coords.latitude
        longitude.value = position.coords.longitude
        isLoading.value = false
      },
      (err) => {
        error.value = err.message
        isLoading.value = false
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      },
    )
  }

  // Auto-request location on client side
  if (import.meta.client && !latitude.value && !error.value) {
    requestLocation()
  }

  return {
    latitude,
    longitude,
    error,
    isLoading,
    requestLocation,
  }
}
