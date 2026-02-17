export type RenderQualityTier = 'low' | 'balanced' | 'high'

export function detectRenderQualityTier(): RenderQualityTier {
  if (typeof window === 'undefined') return 'balanced'

  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }

  const saveData = Boolean(nav.connection?.saveData)
  const memory = nav.deviceMemory ?? 8
  const cores = nav.hardwareConcurrency ?? 8
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches

  if (saveData || memory <= 4 || cores <= 4) return 'low'
  if (memory <= 6 || cores <= 6 || coarsePointer) return 'balanced'
  return 'high'
}
