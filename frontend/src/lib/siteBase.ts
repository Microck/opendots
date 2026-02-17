const env = import.meta.env as unknown as { VITE_SITE_BASE_URL?: string }
const rawSiteBase = env.VITE_SITE_BASE_URL

export const SITE_BASE_URL = rawSiteBase
  ? rawSiteBase.replace(/\/$/, '')
  : (typeof window !== 'undefined' ? window.location.origin : 'https://opendots.me')

export function siteUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_BASE_URL}${normalized}`
}
