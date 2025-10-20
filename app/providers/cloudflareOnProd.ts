import type { ProviderGetImage } from '@nuxt/image'
import { getImage as getImageWithCloudflare } from '#image/providers/cloudflare'
import { getImage as getImageWithNone } from '#image/providers/none'

export const getImage: ProviderGetImage = (src, options, ctx) => {
  if (useRuntimeConfig().public.siteURL === options.prodSiteURL) {
    return getImageWithCloudflare(src, options, ctx)
  }
  else {
    return getImageWithNone(src, options, ctx)
  }
}
