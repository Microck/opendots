const env = import.meta.env as unknown as { VITE_API_BASE_URL?: string }
const rawBase = env.VITE_API_BASE_URL

export const API_BASE_URL = rawBase ? rawBase.replace(/\/$/, '') : ''

export function apiUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized
}
