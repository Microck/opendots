import { useEffect, useRef } from 'react'

type ReactiveSurfaceOptions = {
  shiftX?: number
  shiftY?: number
  spotRange?: number
  baseBlueprintOpacity?: number
  energyBlueprintOpacity?: number
  basePulseOpacity?: number
  energyPulseOpacity?: number
  baseScale?: number
  energyScale?: number
  maxEnergy?: number
  decay?: number
  smoothing?: number
  velocityFactor?: number
  pointerBoost?: number
  leaveDamp?: number
  maxRotateXDeg?: number
  maxRotateYDeg?: number
  rgbShiftPx?: number
}

const DEFAULT_OPTIONS: Required<ReactiveSurfaceOptions> = {
  shiftX: 26,
  shiftY: 18,
  spotRange: 18,
  baseBlueprintOpacity: 0.24,
  energyBlueprintOpacity: 0.24,
  basePulseOpacity: 0.24,
  energyPulseOpacity: 0.32,
  baseScale: 0.92,
  energyScale: 0.18,
  maxEnergy: 1.9,
  decay: 0.016,
  smoothing: 0.12,
  velocityFactor: 2.6,
  pointerBoost: 0.55,
  leaveDamp: 0.25,
  maxRotateXDeg: 10,
  maxRotateYDeg: 14,
  rgbShiftPx: 10,
}

export default function useReactiveSurfaceVars<T extends HTMLElement = HTMLDivElement>(
  enabled: boolean,
  options: ReactiveSurfaceOptions = {},
) {
  const ref = useRef<T | null>(null)

  const {
    shiftX,
    shiftY,
    spotRange,
    baseBlueprintOpacity,
    energyBlueprintOpacity,
    basePulseOpacity,
    energyPulseOpacity,
    baseScale,
    energyScale,
    maxEnergy,
    decay,
    smoothing,
    velocityFactor,
    pointerBoost,
    leaveDamp,
    maxRotateXDeg,
    maxRotateYDeg,
    rgbShiftPx,
  } = { ...DEFAULT_OPTIONS, ...options }

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let raf = 0
    const target = { x: 0, y: 0, energy: 0 }
    const current = { x: 0, y: 0, energy: 0 }

    const setVars = () => {
      element.style.setProperty('--rx-x', current.x.toFixed(4))
      element.style.setProperty('--rx-y', current.y.toFixed(4))
      element.style.setProperty('--rx-energy', current.energy.toFixed(4))
      element.style.setProperty('--rx-shift-x', `${(current.x * shiftX).toFixed(2)}px`)
      element.style.setProperty('--rx-shift-y', `${(current.y * shiftY).toFixed(2)}px`)
      element.style.setProperty('--rx-spot-x', `${(50 + current.x * spotRange).toFixed(2)}%`)
      element.style.setProperty('--rx-spot-y', `${(50 + current.y * spotRange).toFixed(2)}%`)
      element.style.setProperty('--rx-blueprint-opacity', (baseBlueprintOpacity + current.energy * energyBlueprintOpacity).toFixed(4))
      element.style.setProperty('--rx-pulse-opacity', (basePulseOpacity + current.energy * energyPulseOpacity).toFixed(4))
      element.style.setProperty('--rx-scale', (baseScale + current.energy * energyScale).toFixed(4))

      const rotX = (-current.y * maxRotateXDeg).toFixed(2)
      const rotY = (current.x * maxRotateYDeg).toFixed(2)
      element.style.setProperty('--rx-rot-x', `${rotX}deg`)
      element.style.setProperty('--rx-rot-y', `${rotY}deg`)

      element.style.setProperty('--rx-rgb-x', `${(current.x * rgbShiftPx).toFixed(2)}px`)
      element.style.setProperty('--rx-rgb-y', `${(current.y * rgbShiftPx).toFixed(2)}px`)
    }

    setVars()

    if (!enabled) {
      return
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1
      const clampedX = Math.max(-1, Math.min(1, x))
      const clampedY = Math.max(-1, Math.min(1, y))

      const velocity = Math.min(
        Math.hypot(clampedX - target.x, clampedY - target.y) * velocityFactor,
        maxEnergy,
      )

      target.x = clampedX
      target.y = clampedY
      target.energy = Math.min(maxEnergy, target.energy + velocity * 0.4)
    }

    const onPointerLeave = () => {
      target.x *= leaveDamp
      target.y *= leaveDamp
    }

    const onPointerDown = () => {
      target.energy = Math.min(maxEnergy, target.energy + pointerBoost)
    }

    const tick = () => {
      target.energy = Math.max(0, target.energy - decay)

      current.x += (target.x - current.x) * smoothing
      current.y += (target.y - current.y) * smoothing
      current.energy += (target.energy - current.energy) * (smoothing + 0.04)

      setVars()
      raf = window.requestAnimationFrame(tick)
    }

    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerleave', onPointerLeave)
    element.addEventListener('pointerdown', onPointerDown)
    raf = window.requestAnimationFrame(tick)

    return () => {
      if (raf) {
        window.cancelAnimationFrame(raf)
      }
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerleave', onPointerLeave)
      element.removeEventListener('pointerdown', onPointerDown)
    }
  }, [
    enabled,
    shiftX,
    shiftY,
    spotRange,
    baseBlueprintOpacity,
    energyBlueprintOpacity,
    basePulseOpacity,
    energyPulseOpacity,
    baseScale,
    energyScale,
    maxEnergy,
    decay,
    smoothing,
    velocityFactor,
    pointerBoost,
    leaveDamp,
    maxRotateXDeg,
    maxRotateYDeg,
    rgbShiftPx,
  ])

  return ref
}
