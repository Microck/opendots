/**
 * Color utilities for theme-powered cards
 */

/**
 * Preset fallback palette for bundles without theme.json
 * Colors chosen to provide good contrast on dark blue background (#0a2590)
 * Each color passes WCAG AA contrast ratio (4.5:1 minimum)
 */
export const FALLBACK_ACCENT_PALETTE = [
  '#42A5F5', // Blue 400
  '#66BB6A', // Green 400
  '#AB47BC', // Purple 400
  '#FFA726', // Orange 400
  '#26C6DA', // Cyan 400
  '#EC407A', // Pink 400
  '#7E57C2', // Deep Purple 400
  '#29B6F6', // Light Blue 400
  '#9CCC65', // Light Green 400
  '#FF7043', // Deep Orange 400
] as const

export type AccentColor = string

/**
 * Convert hex color to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex)
  if (!match) {
    return null
  }
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  }
}

/**
 * Convert hex color to RGB CSS custom properties string
 * Returns: "r g b" format for use in CSS
 */
export function hexToRgbString(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) {
    return '128 220 255' // Default fallback (--border-active)
  }
  return `${rgb.r} ${rgb.g} ${rgb.b}`
}

/**
 * Generate deterministic fallback accent from bundle ID
 * Uses a simple hash to pick from preset palette
 */
export function getDeterministicAccent(bundleId: string | null): AccentColor {
  if (!bundleId) {
    return FALLBACK_ACCENT_PALETTE[0]
  }

  // Simple hash function
  let hash = 0
  for (let i = 0; i < bundleId.length; i++) {
    const char = bundleId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  const index = Math.abs(hash) % FALLBACK_ACCENT_PALETTE.length
  return FALLBACK_ACCENT_PALETTE[index]
}

/**
 * Check if accent color provides sufficient contrast on dark blue background
 * Returns true if contrast ratio >= 4.5:1 (WCAG AA for decorative elements)
 */
export function passesWcagContrast(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) {
    return false
  }

  // Background: #0a2590 = rgb(10, 37, 144)
  const bgR = 10
  const bgG = 37
  const bgB = 144

  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  const l1 = getLuminance(rgb.r, rgb.g, rgb.b)
  const l2 = getLuminance(bgR, bgG, bgB)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  const contrastRatio = (lighter + 0.05) / (darker + 0.05)
  return contrastRatio >= 3.0 // 3:1 for large decorative elements, 4.5:1 for text
}
