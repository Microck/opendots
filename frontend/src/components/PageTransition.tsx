import { type ReactNode } from 'react'
import { motion } from 'motion/react'
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

/**
 * PageTransition - Dramatic page enter/exit with scale, blur, and opacity.
 * AnimatePresence in App.tsx drives mount/unmount via key={location.pathname}.
 */

const pageVariants = {
  initial: {
    opacity: 0,
    scale: 0.97,
    filter: 'blur(6px)',
    y: 24,
  },
  enter: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    filter: 'blur(4px)',
    y: -16,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
} satisfies import('motion/react').Variants

export default function PageTransition({ children, className }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion()
  const rootRef = useRef<HTMLDivElement | null>(null)

  useGSAP(() => {
    if (prefersReducedMotion) return

    const scope = rootRef.current
    if (!scope) return

    const q = gsap.utils.selector(scope)
    const nodes = q('[data-gsap="text"]') as HTMLElement[]
    const limited = nodes.slice(0, 80)

    limited.forEach((el) => {
      if (!el || el.dataset.gsapBound === '1') return
      el.dataset.gsapBound = '1'

      gsap.set(el, {
        opacity: 0,
        y: 12,
        filter: 'blur(6px)',
        clipPath: 'inset(0 0 100% 0)',
      })

      gsap.to(el, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        clipPath: 'inset(0 0 0% 0)',
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
        },
      })
    })

    const id = window.setTimeout(() => ScrollTrigger.refresh(), 50)
    return () => {
      window.clearTimeout(id)
    }
  }, { scope: rootRef, dependencies: [prefersReducedMotion] })

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={rootRef}
      className={className}
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}
