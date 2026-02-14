/**
 * Hook to detect user's motion preference
 * Respects prefers-reduced-motion for accessibility
 */

import { useState, useEffect } from 'react'

/**
 * Returns true if the user prefers reduced motion
 * Updates reactively if the preference changes
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return prefersReducedMotion
}

/**
 * Returns reduced animation variants when motion is disabled
 * Use this to get appropriate variants based on user preference
 */
export function useMotionVariants<T extends Record<string, unknown>>(
  normalVariants: T,
  reducedVariants?: T
): T {
  const reduced = useReducedMotion()

  if (reduced && reducedVariants) {
    return reducedVariants
  }

  return normalVariants
}

/**
 * Animation duration when reduced motion is enabled
 * Use this for any timing-sensitive operations
 */
export const reducedMotionDuration = 0
