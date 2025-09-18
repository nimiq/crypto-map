import { computed, readonly, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export type DatasetId = 'prod' | 'next'

const DEFAULT_DATASET_ID: DatasetId = 'prod'

// Global reactive state for dataset configuration
const currentDataset = ref<DatasetId>(DEFAULT_DATASET_ID)
const isInitialized = ref(false)

/**
 * Composable for managing dataset configuration with environment variables and URL parameter support
 *
 * Features:
 * - Reads VITE_DATASET_ID environment variable with 'prod' default
 * - Supports URL parameter override (?dataset=next)
 * - Session persistence for URL overrides
 * - Reactive state management for real-time dataset switching
 */
export function useDatasetConfig() {
  const route = useRoute()
  const router = useRouter()

  // Initialize dataset configuration on first use
  const initializeDataset = () => {
    if (isInitialized.value) return

    // 1. Start with environment variable (with fallback to 'prod')
    const envDatasetId = (import.meta.env.VITE_DATASET_ID || DEFAULT_DATASET_ID) as DatasetId

    // 2. Check for URL parameter override
    const urlDatasetParam = route.query.dataset as string

    // 3. Check session storage for persisted URL override
    const sessionDataset = sessionStorage.getItem('cryptomap__dataset_override') as DatasetId | null

    // Priority: URL param > Session storage > Environment variable
    let activeDataset: DatasetId = envDatasetId

    if (urlDatasetParam && (urlDatasetParam === 'prod' || urlDatasetParam === 'next')) {
      activeDataset = urlDatasetParam as DatasetId
      // Persist URL parameter to session storage
      sessionStorage.setItem('cryptomap__dataset_override', activeDataset)
    } else if (sessionDataset && (sessionDataset === 'prod' || sessionDataset === 'next')) {
      activeDataset = sessionDataset
    }

    currentDataset.value = activeDataset
    isInitialized.value = true
  }

  // Initialize on first call
  if (!isInitialized.value) {
    initializeDataset()
  }

  // Watch for URL changes and update dataset accordingly
  watch(
    () => route.query.dataset,
    (newDatasetParam) => {
      if (newDatasetParam && (newDatasetParam === 'prod' || newDatasetParam === 'next')) {
        const newDataset = newDatasetParam as DatasetId
        if (newDataset !== currentDataset.value) {
          currentDataset.value = newDataset
          // Persist to session storage
          sessionStorage.setItem('cryptomap__dataset_override', newDataset)
        }
      }
    },
    { immediate: false }
  )

  // Computed properties for convenience
  const datasetId = computed(() => currentDataset.value)
  const isProdDataset = computed(() => currentDataset.value === 'prod')
  const isNextDataset = computed(() => currentDataset.value === 'next')

  // Method to programmatically change dataset
  const setDataset = (dataset: DatasetId) => {
    if (dataset !== currentDataset.value) {
      currentDataset.value = dataset

      // Update URL parameter
      router.push({
        query: {
          ...route.query,
          dataset: dataset === DEFAULT_DATASET_ID ? undefined : dataset
        }
      })

      // Update session storage
      if (dataset === DEFAULT_DATASET_ID) {
        sessionStorage.removeItem('cryptomap__dataset_override')
      } else {
        sessionStorage.setItem('cryptomap__dataset_override', dataset)
      }
    }
  }

  // Method to clear dataset override and return to environment default
  const clearDatasetOverride = () => {
    const envDefault = (import.meta.env.VITE_DATASET_ID || DEFAULT_DATASET_ID) as DatasetId
    sessionStorage.removeItem('cryptomap__dataset_override')

    // Remove dataset param from URL
    const { dataset, ...queryWithoutDataset } = route.query
    router.push({ query: queryWithoutDataset })

    currentDataset.value = envDefault
  }

  return {
    // Reactive state
    datasetId: readonly(datasetId),
    isProdDataset: readonly(isProdDataset),
    isNextDataset: readonly(isNextDataset),

    // Methods
    setDataset,
    clearDatasetOverride,

    // Utilities
    isInitialized: readonly(isInitialized),
  }
}

// Export the default dataset constant for use in other modules
export { DEFAULT_DATASET_ID }