import { useGSAP } from '@gsap/react'
import { useRef, type RefObject } from 'react'
import { gsap, SplitText } from '../../lib/gsap'
import { useReducedMotion } from '../../hooks/useReducedMotion'

type GSAPTextRevealProps = {
  children: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div'
  splitType?: 'chars' | 'words' | 'lines'
  stagger?: number
  duration?: number
  delay?: number
  y?: number
  x?: number
  rotation?: number
  scale?: number
  ease?: string
  className?: string
  trigger?: 'load' | 'scroll' | RefObject<HTMLElement | null>
  start?: string
}

export function GSAPTextReveal({
  children,
  as: Component = 'span',
  splitType = 'chars',
  stagger = 0.03,
  duration = 0.6,
  delay = 0,
  y = 30,
  x,
  rotation,
  scale,
  ease = 'power3.out',
  className,
  trigger = 'load',
  start = 'top 85%',
}: GSAPTextRevealProps) {
  const container = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const setContainerRef = (node: HTMLElement | null) => {
    container.current = node
  }

  useGSAP(() => {
    if (prefersReducedMotion) return
    if (!container.current) return

    const split = new SplitText(container.current, { type: splitType })
    const targets = split.chars.length > 0 ? split.chars : split.words

    const animationConfig: gsap.TweenVars = {
      opacity: 0,
      y,
      duration,
      stagger: { each: stagger, from: 'start' },
      ease,
      delay,
    }

    if (x !== undefined) animationConfig.x = x
    if (rotation !== undefined) animationConfig.rotation = rotation
    if (scale !== undefined) animationConfig.scale = scale

    if (trigger === 'scroll') {
      gsap.from(targets, {
        ...animationConfig,
        scrollTrigger: {
          trigger: container.current,
          start,
          once: true,
        },
      })
    } else if (typeof trigger === 'object' && trigger?.current) {
      gsap.from(targets, {
        ...animationConfig,
        scrollTrigger: {
          trigger: trigger.current,
          start,
          once: true,
        },
      })
    } else {
      gsap.from(targets, animationConfig)
    }

    return () => split.revert()
  }, {
    scope: container,
    dependencies: [children, stagger, duration, delay, y, x, rotation, scale, ease, trigger, start, prefersReducedMotion, splitType],
  })

  if (prefersReducedMotion) {
    return <Component className={className}>{children}</Component>
  }

  return <Component ref={setContainerRef} className={className}>{children}</Component>
}

type GSAPTextHoverProps = {
  children: string
  as?: 'span' | 'a' | 'button'
  splitType?: 'chars' | 'words'
  hoverY?: number
  hoverScale?: number
  hoverRotation?: number
  duration?: number
  ease?: string
  className?: string
  href?: string
  onClick?: () => void
}

export function GSAPTextHover({
  children,
  as: Component = 'span',
  splitType = 'chars',
  hoverY = -5,
  hoverScale,
  hoverRotation,
  duration = 0.3,
  ease = 'power2.out',
  className,
  href,
  onClick,
}: GSAPTextHoverProps) {
  const container = useRef<HTMLElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useGSAP(() => {
    if (prefersReducedMotion) return
    if (!container.current) return

    const split = new SplitText(container.current, { type: splitType })
    const targets = split.chars.length > 0 ? split.chars : split.words

    const handleEnter = () => {
      gsap.to(targets, {
        y: hoverY,
        scale: hoverScale,
        rotation: hoverRotation,
        duration,
        ease,
        stagger: { each: 0.02, from: 'start' },
      })
    }

    const handleLeave = () => {
      gsap.to(targets, {
        y: 0,
        scale: 1,
        rotation: 0,
        duration,
        ease,
        stagger: { each: 0.01, from: 'end' },
      })
    }

    const el = container.current
    el.addEventListener('mouseenter', handleEnter)
    el.addEventListener('mouseleave', handleLeave)

    return () => {
      el.removeEventListener('mouseenter', handleEnter)
      el.removeEventListener('mouseleave', handleLeave)
      split.revert()
    }
  }, {
    scope: container,
    dependencies: [children, hoverY, hoverScale, hoverRotation, duration, ease, prefersReducedMotion, splitType],
  })

  if (prefersReducedMotion) {
    if (Component === 'a') {
      return <a href={href} className={className}>{children}</a>
    }
    if (Component === 'button') {
      return <button onClick={onClick} className={className}>{children}</button>
    }
    return <span className={className}>{children}</span>
  }

  if (Component === 'a') {
    return <a ref={container as React.RefObject<HTMLAnchorElement>} href={href} className={className}>{children}</a>
  }
  if (Component === 'button') {
    return <button ref={container as React.RefObject<HTMLButtonElement>} onClick={onClick} className={className}>{children}</button>
  }
  return <span ref={container} className={className}>{children}</span>
}

type GSAPWaveTextProps = {
  children: string
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p'
  waveAmplitude?: number
  waveDuration?: number
  stagger?: number
  className?: string
}

export function GSAPWaveText({
  children,
  as: Component = 'span',
  waveAmplitude = 10,
  waveDuration = 0.6,
  stagger = 0.03,
  className,
}: GSAPWaveTextProps) {
  const container = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const setContainerRef = (node: HTMLElement | null) => {
    container.current = node
  }

  useGSAP(() => {
    if (prefersReducedMotion) return
    if (!container.current) return

    const split = new SplitText(container.current, { type: 'chars' })
    const chars = split.chars

    gsap.from(chars, {
      y: waveAmplitude,
      opacity: 0,
      duration: waveDuration,
      stagger: {
        each: stagger,
        from: 'center',
        ease: 'sine.out',
      },
      ease: 'back.out(1.7)',
    })

    return () => split.revert()
  }, {
    scope: container,
    dependencies: [children, waveAmplitude, waveDuration, stagger, prefersReducedMotion],
  })

  if (prefersReducedMotion) {
    return <Component className={className}>{children}</Component>
  }

  return <Component ref={setContainerRef} className={className}>{children}</Component>
}

type GSAPTypewriterProps = {
  children: string
  as?: 'span' | 'p'
  speed?: number
  cursorChar?: string
  cursorBlink?: boolean
  className?: string
}

export function GSAPTypewriter({
  children,
  as: Component = 'span',
  speed = 0.05,
  cursorChar = '|',
  cursorBlink = true,
  className,
}: GSAPTypewriterProps) {
  const container = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const setContainerRef = (node: HTMLElement | null) => {
    container.current = node
  }

  useGSAP(() => {
    if (prefersReducedMotion) return
    if (!container.current) return

    const split = new SplitText(container.current, { type: 'chars' })
    const chars = split.chars

    gsap.set(chars, { opacity: 0 })

    gsap.to(chars, {
      opacity: 1,
      duration: speed,
      stagger: speed,
      ease: 'none',
    })

    return () => split.revert()
  }, {
    scope: container,
    dependencies: [children, speed, prefersReducedMotion],
  })

  if (prefersReducedMotion) {
    return <Component className={className}>{children}</Component>
  }

  return (
    <Component ref={setContainerRef} className={className}>
      {children}
      {cursorBlink && (
        <span style={{ 
          animation: 'blink 1s step-end infinite',
          marginLeft: '1px',
        }}>{cursorChar}</span>
      )}
    </Component>
  )
}
