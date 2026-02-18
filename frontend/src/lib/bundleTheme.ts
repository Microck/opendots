export interface BundleCardTheme {
  background?: string
  backgroundHover?: string
  border?: string
  borderHover?: string
  title?: string
  text?: string
  mutedText?: string
  chipBackground?: string
  chipBorder?: string
  chipText?: string
}

const THEME_VAR_KEYS = [
  '--bg-body',
  '--bg-card',
  '--bg-surface',
  '--nav-bg',
  '--nav-border',
  '--nav-text',
  '--nav-muted',
  '--nav-button-bg',
  '--nav-button-text',
  '--text-main',
  '--text-muted',
  '--text-dim',
  '--border-light',
  '--border-hover',
  '--border-active',
] as const

const DEFAULT_GRAY_THEME: BundleCardTheme = {
  background: '#111111',
  border: '#3f3f3f',
  title: '#f5f5f5',
  text: '#d4d4d4',
  mutedText: '#a3a3a3',
}

function normalizeHexColor(color: string): string | null {
  const trimmed = color.trim()
  const match = /^#?([0-9a-fA-F]{6})$/.exec(trimmed)
  if (!match) {
    return null
  }

  return `#${match[1].toLowerCase()}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHexColor(hex)
  if (!normalized) {
    return null
  }

  const value = normalized.slice(1)
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
  const toHex = (value: number) => clamp(value).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function mixHexColors(colorA: string, colorB: string, weightA: number): string | null {
  const rgbA = hexToRgb(colorA)
  const rgbB = hexToRgb(colorB)
  if (!rgbA || !rgbB) {
    return null
  }

  const clampedWeightA = Math.max(0, Math.min(1, weightA))
  const weightB = 1 - clampedWeightA

  return rgbToHex(
    rgbA.r * clampedWeightA + rgbB.r * weightB,
    rgbA.g * clampedWeightA + rgbB.g * weightB,
    rgbA.b * clampedWeightA + rgbB.b * weightB,
  )
}

function buildAccentFallbackTheme(accentColor: string): BundleCardTheme | null {
  const accent = normalizeHexColor(accentColor)
  if (!accent) {
    return null
  }

  const background = mixHexColors(accent, '#0f172a', 0.2)
  const backgroundHover = mixHexColors(accent, '#111827', 0.3)
  const border = mixHexColors(accent, '#334155', 0.45)
  const borderHover = mixHexColors(accent, '#f8fafc', 0.52)
  const title = mixHexColors(accent, '#ffffff', 0.2)
  const text = mixHexColors(accent, '#e2e8f0', 0.1)
  const mutedText = mixHexColors(accent, '#94a3b8', 0.08)

  return {
    background: background ?? undefined,
    backgroundHover: backgroundHover ?? undefined,
    border: border ?? undefined,
    borderHover: borderHover ?? undefined,
    title: title ?? undefined,
    text: text ?? undefined,
    mutedText: mutedText ?? undefined,
    chipBackground: backgroundHover ?? undefined,
    chipBorder: border ?? undefined,
    chipText: title ?? undefined,
  }
}

function hasThemeValues(theme: BundleCardTheme | null): theme is BundleCardTheme {
  return Boolean(theme && Object.values(theme).some(Boolean))
}

export function applyBundleThemeToRoot(
  theme: BundleCardTheme | null,
  accentColor?: string | null,
): () => void {
  if (typeof document === 'undefined') {
    return () => {}
  }

  const root = document.documentElement
  const previousValues = new Map<string, string>()
  for (const key of THEME_VAR_KEYS) {
    previousValues.set(key, root.style.getPropertyValue(key))
  }

  const effectiveTheme = hasThemeValues(theme)
    ? theme
    : accentColor
      ? (buildAccentFallbackTheme(accentColor) ?? null)
      : DEFAULT_GRAY_THEME

  const transitionsEnabled = hasThemeValues(effectiveTheme)
  if (transitionsEnabled) {
    document.body.classList.add('bundle-theme-transition')
  }

  const background = effectiveTheme?.background
  const border = effectiveTheme?.border
  const borderHover = effectiveTheme?.borderHover ?? border ?? effectiveTheme?.title
  const title = effectiveTheme?.title
  const text = effectiveTheme?.text
  const muted = effectiveTheme?.mutedText ?? text
  const active = accentColor ?? borderHover ?? border

  const navBackground = effectiveTheme?.backgroundHover ?? effectiveTheme?.background
  const navBorder = borderHover ?? border
  const navText = title ?? text
  const navMuted = muted ?? text
  const navButtonBackground = title ?? active
  const navButtonText = navBackground ?? effectiveTheme?.background

  if (background) {
    root.style.setProperty('--bg-body', background)
    root.style.setProperty('--bg-card', `color-mix(in srgb, ${background} 45%, transparent)`)
    root.style.setProperty('--bg-surface', `color-mix(in srgb, ${background} 68%, #000000)`)
  }

  if (title) {
    root.style.setProperty('--text-main', title)
  }

  if (text) {
    root.style.setProperty('--text-muted', text)
  }

  if (muted) {
    root.style.setProperty('--text-dim', muted)
  }

  if (border) {
    root.style.setProperty('--border-light', `color-mix(in srgb, ${border} 45%, transparent)`)
  }

  if (borderHover) {
    root.style.setProperty('--border-hover', borderHover)
  }

  if (active) {
    root.style.setProperty('--border-active', active)
  }

  if (navBackground) {
    root.style.setProperty('--nav-bg', `color-mix(in srgb, ${navBackground} 84%, #000000 16%)`)
  }

  if (navBorder) {
    root.style.setProperty('--nav-border', `color-mix(in srgb, ${navBorder} 55%, transparent)`)
  }

  if (navText) {
    root.style.setProperty('--nav-text', navText)
  }

  if (navMuted) {
    root.style.setProperty('--nav-muted', navMuted)
  }

  if (navButtonBackground) {
    root.style.setProperty('--nav-button-bg', navButtonBackground)
  }

  if (navButtonText) {
    root.style.setProperty('--nav-button-text', navButtonText)
  }

  return () => {
    for (const key of THEME_VAR_KEYS) {
      const previous = previousValues.get(key) ?? ''
      if (previous.length > 0) {
        root.style.setProperty(key, previous)
      } else {
        root.style.removeProperty(key)
      }
    }

    if (transitionsEnabled) {
      document.body.classList.remove('bundle-theme-transition')
    }
  }
}
