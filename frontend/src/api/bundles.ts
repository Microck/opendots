import type { BundleCardData } from '../components/BundleCard'

export type BrowseSort = 'newest'

export interface BrowseQuery {
  q?: string
  tags?: string[]
  artifactTypes?: string[]
  opencode?: string
  sort?: BrowseSort
}

function appendMany(searchParams: URLSearchParams, key: string, values: string[] | undefined) {
  if (!values || values.length === 0) {
    return
  }

  for (const value of values) {
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      searchParams.append(key, trimmed)
    }
  }
}

export function buildBundlesQueryString(params: BrowseQuery): string {
  const searchParams = new URLSearchParams()
  const q = params.q?.trim()
  const opencode = params.opencode?.trim()

  if (q) {
    searchParams.set('q', q)
  }

  appendMany(searchParams, 'tag', params.tags)
  appendMany(searchParams, 'type', params.artifactTypes)

  if (opencode) {
    searchParams.set('opencode', opencode)
  }

  if (params.sort) {
    searchParams.set('sort', params.sort)
  }

  return searchParams.toString()
}

export async function fetchBundles(params: BrowseQuery, signal: AbortSignal): Promise<BundleCardData[]> {
  const queryString = buildBundlesQueryString(params)
  const endpoint = queryString.length > 0 ? `/api/bundles?${queryString}` : '/api/bundles'
  const response = await fetch(endpoint, { signal })

  if (!response.ok) {
    throw new Error(`Failed to load bundles (${response.status})`)
  }

  const payload: unknown = await response.json()
  return Array.isArray(payload) ? (payload as BundleCardData[]) : []
}
