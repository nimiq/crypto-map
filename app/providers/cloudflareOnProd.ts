import { defineProvider } from '@nuxt/image/runtime'
import { joinURL } from 'ufo'

export default defineProvider({
  getImage: (src, options) => {
    const { modifiers = {}, siteUrl = '' } = options as typeof options & { siteUrl?: string }
    // Dev: no transformation
    if (import.meta.dev)
      return { url: src }

    // Production: use Cloudflare Image Resizing
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

    // Cloudflare Image Resizing needs full URL for same-origin API routes
    const fullSrc = src.startsWith('/') && siteUrl ? `${siteUrl}${src}` : src

    return { url: joinURL('/cdn-cgi/image', params.join(','), fullSrc) }
  },
})
