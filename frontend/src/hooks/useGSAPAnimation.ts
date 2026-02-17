import { useGSAP } from '@gsap/react'
import type { RefObject } from 'react'
import { gsap } from '../lib/gsap'
import { useReducedMotion } from './useReducedMotion'

type UseGSAPAnimationOptions = {
  scope: RefObject<HTMLElement | null>
  dependencies?: unknown[]
}

export function useGSAPAnimation(
  animation: () => void | (() => void),
  options: UseGSAPAnimationOptions
) {
  const prefersReducedMotion = useReducedMotion()

  useGSAP(() => {
    if (prefersReducedMotion) return
    return animation()
  }, {
    scope: options.scope,
    dependencies: [prefersReducedMotion, ...(options.dependencies ?? [])],
  })
}

export function useGSAPScrollReveal(
  selector: string,
  options: {
    scope: RefObject<HTMLElement | null>
    y?: number
    opacity?: number
    scale?: number
    stagger?: number
    duration?: number
    start?: string
    once?: boolean
  }
) {
  const { scope, y = 20, opacity = 0, scale, stagger = 0.05, duration = 0.5, start = 'top 85%', once = true } = options
  const prefersReducedMotion = useReducedMotion()

  useGSAP(() => {
    if (prefersReducedMotion) return

    const elements = gsap.utils.toArray(selector)
    
    gsap.from(elements, {
      opacity,
      y,
      ...(scale !== undefined && { scale }),
      stagger,
      duration,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: scope.current,
        start,
        once,
      },
    })
  }, { scope, dependencies: [prefersReducedMotion, selector] })
}
