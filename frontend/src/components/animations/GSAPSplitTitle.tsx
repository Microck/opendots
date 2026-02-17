import { useGSAP } from '@gsap/react'
import { useRef } from 'react'
import { gsap, SplitText } from '../../lib/gsap'
import { useReducedMotion } from '../../hooks/useReducedMotion'

type GSAPSplitTitleProps = {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
  splitType?: 'chars' | 'words' | 'lines' | 'chars,words'
  stagger?: number
  duration?: number
  delay?: number
  y?: number
  scale?: number
  ease?: string
  className?: string
  textClassName?: string
}

export function GSAPSplitTitle({
  text,
  as: Component = 'h1',
  splitType = 'chars',
  stagger = 0.04,
  duration = 0.5,
  delay = 0,
  y = 40,
  scale = 0.8,
  ease = 'power3.out',
  className,
  textClassName,
}: GSAPSplitTitleProps) {
  const container = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const setContainerRef = (node: HTMLElement | null) => {
    container.current = node
  }

  useGSAP(() => {
    if (prefersReducedMotion) return
    if (!container.current) return

    const split = new SplitText(container.current, { type: splitType })
    
    gsap.from(split.chars.length > 0 ? split.chars : split.words, {
      opacity: 0,
      y,
      scale,
      stagger,
      duration,
      ease,
      delay,
    })

    return () => split.revert()
  }, { 
    scope: container, 
    dependencies: [text, stagger, duration, delay, y, scale, ease, prefersReducedMotion, splitType] 
  })

  if (prefersReducedMotion) {
    return (
      <Component className={className}>
        <span className={textClassName}>{text}</span>
      </Component>
    )
  }

  return (
    <Component ref={setContainerRef} className={className}>
      <span className={textClassName}>{text}</span>
    </Component>
  )
}
