import { defineProvider } from '@nuxt/image/runtime'

export default defineProvider({
  getImage(src, { modifiers }) {
    // Use import.meta.dev for reliable dev detection
    if (!import.meta.dev) {
      // Use Cloudflare Image Resizing in production
      const params = []
      const { width, height, fit = 'cover', quality = 85, format } = modifiers

      if (width)
        params.push(`width=${width}`)
      if (height)
        params.push(`height=${height}`)
      if (fit)
        params.push(`fit=${fit}`)
      params.push(`quality=${quality}`)
      if (format)
        params.push(`format=${format}`)

      return {
        url: `/cdn-cgi/image/${params.join(',')}${src}`,
      }
    }
    else {
      // Dev: no transformation
      return { url: src }
    }
  },
})
