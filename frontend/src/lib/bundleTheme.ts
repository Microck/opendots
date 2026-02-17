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
      ? null
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
