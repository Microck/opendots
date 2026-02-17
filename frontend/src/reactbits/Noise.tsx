import { useEffect, useRef } from 'react'

import styles from './Noise.module.css'

type NoiseProps = {
  patternRefreshInterval?: number
  patternAlpha?: number
  className?: string
}

// ReactBits: https://reactbits.dev (Animations/Noise)
// Ported with minor sizing changes:
// - uses 100% sizing instead of 100vw/100vh to avoid viewport overflow seams
export default function Noise({
  patternRefreshInterval = 2,
  patternAlpha = 14,
  className = '',
}: NoiseProps) {
  const grainRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = grainRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let frame = 0
    let animationId = 0
    const canvasSize = 1024

    const resize = () => {
      canvas.width = canvasSize
      canvas.height = canvasSize
    }

    const drawGrain = () => {
      const imageData = ctx.createImageData(canvasSize, canvasSize)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255
        data[i] = value
        data[i + 1] = value
        data[i + 2] = value
        data[i + 3] = patternAlpha
      }

      ctx.putImageData(imageData, 0, 0)
    }

    const loop = () => {
      if (frame % patternRefreshInterval === 0) {
        drawGrain()
      }
      frame++
      animationId = window.requestAnimationFrame(loop)
    }

    window.addEventListener('resize', resize)
    resize()
    loop()

    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(animationId)
    }
  }, [patternRefreshInterval, patternAlpha])

  return <canvas ref={grainRef} className={`${styles.canvas} ${className}`} />
}
