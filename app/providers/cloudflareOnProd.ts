export default defineImageProvider({
  getImage(src, { modifiers }) {
    const config = useRuntimeConfig()
    const isProduction = config.public.siteURL !== 'http://localhost:3000'

    if (isProduction) {
      // Use Cloudflare Image Resizing in production
      const params = []
      const { width, height, fit = 'cover', quality = 85, format } = modifiers

      if (width) params.push(`width=${width}`)
      if (height) params.push(`height=${height}`)
      if (fit) params.push(`fit=${fit}`)
      params.push(`quality=${quality}`)
      if (format) params.push(`format=${format}`)

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
