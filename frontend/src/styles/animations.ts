/**
 * Shared animation configurations for Opendots
 * Uses Motion (motion/react) for React 19 compatible animations
 */

import type { Transition, Variants } from 'motion/react'

/**
 * Standard fade-in-up animation for section reveals
 */
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

/**
 * Fade in from bottom with more pronounced movement
 */
export const fadeInUpLarge: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

/**
 * Simple fade in (no movement)
 */
export const fadeIn: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
    },
  },
}

/**
 * Scale up from small to full size
 */
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

/**
 * Container for staggered children animations
 * Use with staggerChildren transition option
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0,
    },
  },
}

/**
 * Faster stagger for grid items
 */
export const staggerGrid: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

/**
 * Stagger container with scroll trigger
 */
export const staggerScroll: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
}

/**
 * Individual item variants for use in stagger containers
 */
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

/**
 * Character-level stagger for text reveals
 */
export const characterStagger: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.03,
    },
  },
}

/**
 * Line draw animation for decorative elements
 */
export const drawLine: Variants = {
  hidden: {
    scaleX: 0,
  },
  visible: {
    scaleX: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

/**
 * Hover scale interaction
 */
export const hoverScale: Variants = {
  rest: {
    scale: 1,
    transition: {
      duration: 0.2,
    },
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
    },
  },
}

/**
 * Hover lift interaction (subtle lift on hover)
 */
export const hoverLift: Variants = {
  rest: {
    y: 0,
    boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)',
    transition: {
      duration: 0.2,
    },
  },
  hover: {
    y: -4,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    transition: {
      duration: 0.2,
    },
  },
  tap: {
    y: -2,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    transition: {
      duration: 0.1,
    },
  },
}

/**
 * Default viewport settings for scroll animations
 */
export const scrollViewports = {
  once: { once: true, margin: '0px 0px -50px 0px' },
  always: { once: false, margin: '0px 0px -50px 0px' },
}

/**
 * Standard transition config
 */
export const defaultTransition: Transition = {
  duration: 0.4,
  ease: [0.25, 0.46, 0.45, 0.94],
}

/**
 * Page enter animation - fade in with slight upward slide
 */
export const pageEnter: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

/**
 * Page exit animation - fade out with slight downward slide
 */
export const pageExit: Variants = {
  hidden: {
    opacity: 0,
    y: -8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}
