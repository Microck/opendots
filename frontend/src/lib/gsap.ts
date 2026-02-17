import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin)

gsap.defaults({
  ease: 'power2.out',
  duration: 0.5,
})

ScrollTrigger.defaults({
  toggleActions: 'play none none reverse',
})

export { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin }

export const easePresets = {
  smooth: 'power2.out',
  snappy: 'power3.out',
  elastic: 'elastic.out(1, 0.5)',
  bounce: 'back.out(1.7)',
  expo: 'expo.out',
} as const

export const durations = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.7,
  entrance: 0.8,
} as const

export const staggerPresets = {
  chars: { each: 0.02, from: 'start' as const },
  words: { each: 0.08, from: 'start' as const },
  items: { each: 0.05, from: 'start' as const },
  grid: { each: 0.04, from: 'center' as const },
} as const
