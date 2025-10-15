export interface WebsiteInfo { url: string, displayText: string, icon?: string, hasArrow: boolean }

export function parseWebsiteUrl(url: string): WebsiteInfo {
  let hostname: string

  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    hostname = urlObj.hostname.replace(/^www\./, '')
  }
  catch {
    hostname = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || ''
  }

  // Instagram
  if (hostname.includes('instagram.com')) {
    const match = url.match(/instagram\.com\/([^/?]+)/)
    const username = match?.[1] || hostname
    return { url, displayText: username, icon: 'i-nimiq:logos-instagram-mono', hasArrow: false }
  }

  // Twitter/X
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    const match = url.match(/(?:twitter\.com|x\.com)\/([^/?]+)/)
    const username = match?.[1] || hostname
    return { url, displayText: username, icon: 'i-nimiq:logos-x-mono', hasArrow: false }
  }

  // Facebook
  if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
    const match = url.match(/(?:facebook\.com|fb\.com)\/([^/?]+)/)
    const username = match?.[1] || hostname
    return { url, displayText: username, icon: 'i-nimiq:logos-facebook-mono', hasArrow: false }
  }

  // Regular website
  return { url, displayText: hostname, hasArrow: true }
}
