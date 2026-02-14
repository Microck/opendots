import { type ReactNode } from 'react'
import { motion } from 'motion/react'
import { pageEnter } from '../styles/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

/**
 * PageTransition - Wrapper component for smooth page transitions
 * Uses AnimatePresence in parent with useLocation key to trigger transitions
 */
export default function PageTransition({ children, className }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={prefersReducedMotion ? undefined : pageEnter}
    >
      {children}
    </motion.div>
  )
}
