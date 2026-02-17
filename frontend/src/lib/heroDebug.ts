export interface AsciiHeroDebugSettings {
  characters: string
  resolution: number
  spinSpeed: number
  tiltX: number
  tiltZ: number
  outer: number
  border: number
  inner: number
  depth: number
  cameraZ: number
  fov: number
}

export const ASCII_HERO_DEBUG_STORAGE_KEY = 'opendots-ascii-hero-debug'
export const ASCII_HERO_DEBUG_EVENT = 'opendots:ascii-hero-debug-change'

export const DEFAULT_ASCII_HERO_DEBUG_SETTINGS: AsciiHeroDebugSettings = {
  characters: ' .,:;i1tfLCG08@',
  resolution: 0.14,
  spinSpeed: 0.4,
  tiltX: 0.25,
  tiltZ: 0.15,
  outer: 2.0,
  border: 0.42,
  inner: 0.55,
  depth: 0.6,
  cameraZ: 7,
  fov: 45,
}

const LEGACY_DEFAULTS: Pick<AsciiHeroDebugSettings, 'characters' | 'resolution'> = {
  characters: ' .:-+*=%@#',
  resolution: 0.2,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function sanitize(raw: Partial<AsciiHeroDebugSettings> | null | undefined): AsciiHeroDebugSettings {
  const base = { ...DEFAULT_ASCII_HERO_DEBUG_SETTINGS, ...(raw || {}) }

  // Migration: older localStorage values defaulted to a character set/resolution that
  // looks extra blocky with the new overlay styling. If user never customized these
  // (they match the legacy defaults exactly), adopt the new defaults.
  if (
    base.characters === LEGACY_DEFAULTS.characters &&
    Number(base.resolution) === LEGACY_DEFAULTS.resolution
  ) {
    base.characters = DEFAULT_ASCII_HERO_DEBUG_SETTINGS.characters
    base.resolution = DEFAULT_ASCII_HERO_DEBUG_SETTINGS.resolution
  }
  const outer = clamp(toFiniteNumber(base.outer, DEFAULT_ASCII_HERO_DEBUG_SETTINGS.outer), 1.2, 3.5)
  const border = clamp(toFiniteNumber(base.border, DEFAULT_ASCII_HERO_DEBUG_SETTINGS.border), 0.15, outer - 0.1)
  const innerMax = Math.max(0.15, outer - border - 0.05)
  const characters = typeof base.characters === 'string' && base.characters.length > 0
    ? base.characters
    : DEFAULT_ASCII_HERO_DEBUG_SETTINGS.characters

  return {
    characters: characters.slice(0, 64),
    resolution: clamp(toFiniteNumber(base.resolution, DEFAULT_ASCII_HERO_DEBUG_SETTINGS.resolution), 0.08, 0.45),
    spinSpeed: clamp(toFiniteNumber(base.spinSpeed, DEFAULT_ASCII_HERO_DEBUG_SETTINGS.spinSpeed), 0, 1.6),
    tiltX: clamp(toFiniteNumber(base.tiltX, DEFAULT_ASCII_HERO_DEBUG_SETTINGS.tiltX), 0, 0.7),
    tiltZ: clamp(toFiniteNumber(base.tiltZ, DEFAULT_ASCII_HERO_DEBUG_SETTINGS.tiltZ), 0, 0.7),
    outer,
    border,
    inner: clamp(toFiniteNumber(base.inner, DEFAULT_ASCII_HERO_DEBUG_SETTINGS.inner), 0.12, innerMax),
    depth: clamp(toFiniteNumber(base.depth, DEFAULT_ASCII_HERO_DEBUG_SETTINGS.depth), 0.15, 1.4),
    cameraZ: clamp(toFiniteNumber(base.cameraZ, DEFAULT_ASCII_HERO_DEBUG_SETTINGS.cameraZ), 4, 12),
    fov: clamp(toFiniteNumber(base.fov, DEFAULT_ASCII_HERO_DEBUG_SETTINGS.fov), 25, 75),
  }
}

export function readAsciiHeroDebugSettings(): AsciiHeroDebugSettings {
  if (typeof window === 'undefined') return DEFAULT_ASCII_HERO_DEBUG_SETTINGS
  try {
    const stored = window.localStorage.getItem(ASCII_HERO_DEBUG_STORAGE_KEY)
    if (!stored) return DEFAULT_ASCII_HERO_DEBUG_SETTINGS
    return sanitize(JSON.parse(stored))
  } catch {
    return DEFAULT_ASCII_HERO_DEBUG_SETTINGS
  }
}

export function writeAsciiHeroDebugSettings(next: Partial<AsciiHeroDebugSettings>): AsciiHeroDebugSettings {
  const merged = sanitize({ ...readAsciiHeroDebugSettings(), ...next })
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ASCII_HERO_DEBUG_STORAGE_KEY, JSON.stringify(merged))
    window.dispatchEvent(new CustomEvent(ASCII_HERO_DEBUG_EVENT, { detail: merged }))
  }
  return merged
}

export function resetAsciiHeroDebugSettings(): AsciiHeroDebugSettings {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ASCII_HERO_DEBUG_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(ASCII_HERO_DEBUG_EVENT, { detail: DEFAULT_ASCII_HERO_DEBUG_SETTINGS }))
  }
  return DEFAULT_ASCII_HERO_DEBUG_SETTINGS
}

export function subscribeAsciiHeroDebugSettings(
  handler: (settings: AsciiHeroDebugSettings) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}

  const onCustom = (event: Event) => {
    const custom = event as CustomEvent<AsciiHeroDebugSettings>
    if (custom.detail) {
      handler(sanitize(custom.detail))
      return
    }
    handler(readAsciiHeroDebugSettings())
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== ASCII_HERO_DEBUG_STORAGE_KEY) return
    handler(readAsciiHeroDebugSettings())
  }

  window.addEventListener(ASCII_HERO_DEBUG_EVENT, onCustom)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(ASCII_HERO_DEBUG_EVENT, onCustom)
    window.removeEventListener('storage', onStorage)
  }
}
