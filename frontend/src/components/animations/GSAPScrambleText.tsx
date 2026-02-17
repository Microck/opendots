import { useGSAP } from '@gsap/react'
import { useRef, useState } from 'react'
import { gsap, ScrambleTextPlugin } from '../../lib/gsap'
import { useReducedMotion } from '../../hooks/useReducedMotion'

gsap.registerPlugin(ScrambleTextPlugin)

type GSAPScrambleTextProps = {
  text: string
  delay?: number
  duration?: number
  chars?: string
  speed?: number
  className?: string
}

export function GSAPScrambleText({
  text,
  delay = 0,
  duration = 2,
  chars = '!<>-_\\/[]{}=+*^?#@%&',
  speed = 0.25,
  className,
}: GSAPScrambleTextProps) {
  const el = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const [done, setDone] = useState(false)

  useGSAP(() => {
    if (prefersReducedMotion) {
      setDone(true)
      return
    }

    gsap.to(el.current, {
      duration,
      scrambleText: {
        text,
        chars,
        speed,
        revealDelay: delay,
      },
      onComplete: () => setDone(true),
    })
  }, { dependencies: [text, delay, duration, chars, speed, prefersReducedMotion] })

  return (
    <span ref={el} className={className} aria-label={text}>
      {prefersReducedMotion || done ? text : ''}
    </span>
  )
}
