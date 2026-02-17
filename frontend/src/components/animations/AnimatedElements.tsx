import { useGSAP } from '@gsap/react'
import { useRef, type ReactNode, type MouseEventHandler } from 'react'
import { gsap, SplitText } from '../../lib/gsap'
import { useReducedMotion } from '../../hooks/useReducedMotion'

type AnimatedButtonProps = {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
  disabled?: boolean
  hoverScale?: number
  hoverY?: number
  hoverDuration?: number
}

export function AnimatedButton({
  children,
  onClick,
  className,
  disabled,
  hoverScale = 1.04,
  hoverY = -3,
  hoverDuration = 0.25,
}: AnimatedButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useGSAP(() => {
    if (prefersReducedMotion || disabled) return
    if (!btnRef.current) return

    const btn = btnRef.current

    const handleEnter = () => {
      gsap.to(btn, {
        scale: hoverScale,
        y: hoverY,
        duration: hoverDuration,
        ease: 'power2.out',
      })
    }

    const handleLeave = () => {
      gsap.to(btn, {
        scale: 1,
        y: 0,
        duration: hoverDuration,
        ease: 'power2.out',
      })
    }

    const handleDown = () => {
      gsap.to(btn, {
        scale: 0.97,
        duration: 0.1,
        ease: 'power2.out',
      })
    }

    const handleUp = () => {
      gsap.to(btn, {
        scale: hoverScale,
        duration: 0.15,
        ease: 'power2.out',
      })
    }

    btn.addEventListener('mouseenter', handleEnter)
    btn.addEventListener('mouseleave', handleLeave)
    btn.addEventListener('mousedown', handleDown)
    btn.addEventListener('mouseup', handleUp)

    return () => {
      btn.removeEventListener('mouseenter', handleEnter)
      btn.removeEventListener('mouseleave', handleLeave)
      btn.removeEventListener('mousedown', handleDown)
      btn.removeEventListener('mouseup', handleUp)
    }
  }, { scope: btnRef, dependencies: [prefersReducedMotion, disabled, hoverScale, hoverY, hoverDuration] })

  return (
    <button ref={btnRef} onClick={onClick} className={className} disabled={disabled}>
      {children}
    </button>
  )
}

type AnimatedLinkProps = {
  children: string
  href?: string
  to?: string
  className?: string
  hoverY?: number
  hoverScale?: number
  hoverDuration?: number
  onClick?: () => void
}

export function AnimatedLink({
  children,
  href,
  className,
  hoverY = -3,
  hoverScale,
  hoverDuration = 0.2,
  onClick,
}: AnimatedLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useGSAP(() => {
    if (prefersReducedMotion) return
    if (!linkRef.current) return

    const link = linkRef.current
    const split = new SplitText(link, { type: 'chars' })
    const chars = split.chars

    const handleEnter = () => {
      gsap.to(chars, {
        y: hoverY,
        scale: hoverScale,
        duration: hoverDuration,
        ease: 'power2.out',
        stagger: { each: 0.02, from: 'start' },
      })
    }

    const handleLeave = () => {
      gsap.to(chars, {
        y: 0,
        scale: 1,
        duration: hoverDuration,
        ease: 'power2.out',
        stagger: { each: 0.01, from: 'end' },
      })
    }

    link.addEventListener('mouseenter', handleEnter)
    link.addEventListener('mouseleave', handleLeave)

    return () => {
      link.removeEventListener('mouseenter', handleEnter)
      link.removeEventListener('mouseleave', handleLeave)
      split.revert()
    }
  }, { scope: linkRef, dependencies: [children, hoverY, hoverScale, hoverDuration, prefersReducedMotion] })

  return (
    <a ref={linkRef} href={href} className={className} onClick={onClick}>
      {children}
    </a>
  )
}

type AnimatedTextProps = {
  children: string
  as?: 'span' | 'p' | 'div'
  className?: string
  hoverY?: number
  hoverScale?: number
  hoverDuration?: number
}

export function AnimatedText({
  children,
  as: Component = 'span',
  className,
  hoverY = -4,
  hoverScale,
  hoverDuration = 0.2,
}: AnimatedTextProps) {
  const ref = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const setRef = (node: HTMLElement | null) => {
    ref.current = node
  }

  useGSAP(() => {
    if (prefersReducedMotion) return
    if (!ref.current) return

    const el = ref.current
    const split = new SplitText(el, { type: 'words' })
    const words = split.words

    const handleEnter = () => {
      gsap.to(words, {
        y: hoverY,
        scale: hoverScale,
        duration: hoverDuration,
        ease: 'power2.out',
        stagger: { each: 0.03, from: 'start' },
      })
    }

    const handleLeave = () => {
      gsap.to(words, {
        y: 0,
        scale: 1,
        duration: hoverDuration,
        ease: 'power2.out',
        stagger: { each: 0.02, from: 'end' },
      })
    }

    el.addEventListener('mouseenter', handleEnter)
    el.addEventListener('mouseleave', handleLeave)

    return () => {
      el.removeEventListener('mouseenter', handleEnter)
      el.removeEventListener('mouseleave', handleLeave)
      split.revert()
    }
  }, { scope: ref, dependencies: [children, hoverY, hoverScale, hoverDuration, prefersReducedMotion] })

  if (prefersReducedMotion) {
    return <Component className={className}>{children}</Component>
  }

  return <Component ref={setRef} className={className}>{children}</Component>
}
