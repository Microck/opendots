/**
 * Shared animation configurations for OpenDots
 * Uses Motion (motion/react) for React 19 compatible animations
 */

import type { Transition, Variants } from 'motion/react'

/* ------------------------------------------------------------------ */
/*  Easing presets                                                     */
/* ------------------------------------------------------------------ */

/** Expo-out — fast start, gentle stop */
export const expoOut = [0.16, 1, 0.3, 1] as const

/** Smooth decel */
export const easeOutQuart = [0.25, 0.46, 0.45, 0.94] as const

/** Snappy spring-like */
export const snappy = [0.22, 0.68, 0, 1] as const

/* ------------------------------------------------------------------ */
/*  Fade variants                                                      */
/* ------------------------------------------------------------------ */

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: easeOutQuart },
  },
}

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOutQuart },
  },
}

export const fadeInUpLarge: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOutQuart },
  },
}

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOutQuart },
  },
}

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: expoOut },
  },
}

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: expoOut },
  },
}

/* ------------------------------------------------------------------ */
/*  Scale variants                                                     */
/* ------------------------------------------------------------------ */

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: expoOut },
  },
}

export const scaleInBlur: Variants = {
  hidden: { opacity: 0, scale: 0.95, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: expoOut },
  },
}

/* ------------------------------------------------------------------ */
/*  Container / stagger variants                                       */
/* ------------------------------------------------------------------ */

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0 },
  },
}

export const staggerFast: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
}

export const staggerGrid: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
}

export const staggerScroll: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOutQuart },
  },
}

export const staggerItemBlur: Variants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.45, ease: expoOut },
  },
}

/* ------------------------------------------------------------------ */
/*  Character / text variants                                          */
/* ------------------------------------------------------------------ */

export const characterStagger: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.03 },
  },
}

/* ------------------------------------------------------------------ */
/*  Draw / line variants                                               */
/* ------------------------------------------------------------------ */

export const drawLine: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.6, ease: easeOutQuart },
  },
}

export const drawLineDown: Variants = {
  hidden: { scaleY: 0 },
  visible: {
    scaleY: 1,
    transition: { duration: 0.6, ease: easeOutQuart },
  },
}

/* ------------------------------------------------------------------ */
/*  Hover interaction variants                                         */
/* ------------------------------------------------------------------ */

export const hoverScale: Variants = {
  rest: { scale: 1, transition: { duration: 0.2 } },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
  tap: { scale: 0.98, transition: { duration: 0.1 } },
}

export const hoverLift: Variants = {
  rest: {
    y: 0,
    boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)',
    transition: { duration: 0.25, ease: snappy },
  },
  hover: {
    y: -4,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    transition: { duration: 0.25, ease: snappy },
  },
  tap: {
    y: -2,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    transition: { duration: 0.1 },
  },
}

export const hoverGlow: Variants = {
  rest: {
    y: 0,
    boxShadow: '0 0 0 0 rgba(128, 220, 255, 0)',
    transition: { duration: 0.3, ease: snappy },
  },
  hover: {
    y: -3,
    boxShadow: '0 0 20px rgba(128, 220, 255, 0.12), 0 8px 24px rgba(0, 0, 0, 0.15)',
    transition: { duration: 0.3, ease: snappy },
  },
  tap: {
    y: -1,
    boxShadow: '0 0 10px rgba(128, 220, 255, 0.08), 0 4px 12px rgba(0, 0, 0, 0.1)',
    transition: { duration: 0.1 },
  },
}

/* ------------------------------------------------------------------ */
/*  Viewport / scroll config                                           */
/* ------------------------------------------------------------------ */

export const scrollViewports = {
  once: { once: true, margin: '0px 0px -60px 0px' },
  always: { once: false, margin: '0px 0px -60px 0px' },
  eager: { once: true, margin: '0px 0px -120px 0px' },
}

/* ------------------------------------------------------------------ */
/*  Default transition                                                 */
/* ------------------------------------------------------------------ */

export const defaultTransition: Transition = {
  duration: 0.4,
  ease: easeOutQuart,
}

/* ------------------------------------------------------------------ */
/*  Page enter/exit (kept for backward compat — prefer PageTransition) */
/* ------------------------------------------------------------------ */

export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOutQuart },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.25, ease: easeOutQuart },
  },
}

export const pageExit: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOutQuart },
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: { duration: 0.25, ease: easeOutQuart },
  },
}

/* ------------------------------------------------------------------ */
/*  Section entrance — reusable for any page section                   */
/* ------------------------------------------------------------------ */

export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 32, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: expoOut },
  },
}

export const cardEntrance: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: expoOut },
  },
}

/* ------------------------------------------------------------------ */
/*  Navbar-specific                                                    */
/* ------------------------------------------------------------------ */

export const navSlideDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: expoOut },
  },
}

export const navStagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.2 },
  },
}

export const navItem: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: expoOut },
  },
}
