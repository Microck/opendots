import { useEffect, useMemo, useRef } from 'react'

import { useReducedMotion } from '../hooks/useReducedMotion'
import styles from './CustomCursor.module.css'

type CustomCursorProps = {
  hideDefaultCursor?: boolean
}

function shouldUseNativeCursor(target: EventTarget | null): boolean {
  const el = target instanceof HTMLElement ? target : null
  if (!el) return false

  if (el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], [contenteditable]')) {
    return true
  }

  return false
}

export default function CustomCursor({ hideDefaultCursor = true }: CustomCursorProps) {
  const prefersReducedMotion = useReducedMotion()
  const cursorRef = useRef<HTMLDivElement | null>(null)

  const enable = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (prefersReducedMotion) return false
    const fine = window.matchMedia?.('(pointer: fine)').matches
    const hover = window.matchMedia?.('(hover: hover)').matches
    return Boolean(fine && hover)
  }, [prefersReducedMotion])

  useEffect(() => {
    if (!enable) return
    if (!cursorRef.current) return

    const cursor = cursorRef.current

    let plusModeEnabled = false
    const enablePlusMode = () => {
      if (!hideDefaultCursor) return
      if (plusModeEnabled) return
      plusModeEnabled = true
      document.body.classList.add('cursorPlus')
    }

    // Start hidden until first mouse move, prevents a "stuck" plus.
    cursor.style.opacity = '0'

    let latestX = window.innerWidth / 2
    let latestY = window.innerHeight / 2
    let rafId = 0
    let hasMoved = false

    const applyTransform = () => {
      rafId = 0
      cursor.style.transform = `translate3d(${latestX}px, ${latestY}px, 0) translate(-50%, -50%)`
    }

    const onMove = (e: MouseEvent) => {
      latestX = e.clientX
      latestY = e.clientY

      if (!hasMoved) {
        hasMoved = true
        enablePlusMode()
        cursor.style.opacity = hideDefaultCursor ? '1' : '0.9'
      }

      // Update at most once per frame for perf, but without lerp lag.
      if (!rafId) {
        rafId = window.requestAnimationFrame(applyTransform)
      }
    }

    const onOver = (e: MouseEvent) => {
      const useNative = shouldUseNativeCursor(e.target)
      cursor.style.opacity = useNative ? '0' : (hasMoved ? '1' : '0')
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseover', onOver, { passive: true })

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }

      if (plusModeEnabled) {
        document.body.classList.remove('cursorPlus')
      }
    }
  }, [enable, hideDefaultCursor])

  if (!enable) return null

  return <div ref={cursorRef} className={styles.cursor} aria-hidden />
}
