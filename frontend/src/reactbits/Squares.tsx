import { useEffect, useRef } from 'react'

import styles from './Squares.module.css'

export type SquaresDirection = 'right' | 'left' | 'up' | 'down' | 'diagonal'

type SquaresProps = {
  direction?: SquaresDirection
  speed?: number
  borderColor?: string
  squareSize?: number
  hoverFillColor?: string
  className?: string
  interactive?: boolean
}

// ReactBits: https://reactbits.dev/backgrounds/squares
// Ported with small tweaks:
// - pointer-events stay off (so it doesn't block clicks)
// - mouse tracking listens on window instead of the canvas
// - speed=0 renders a static grid (no RAF loop)
export default function Squares({
  direction = 'right',
  speed = 0.35,
  borderColor = 'rgba(255,255,255,0.10)',
  squareSize = 56,
  hoverFillColor = 'rgba(128,220,255,0.06)',
  className = '',
  interactive = true,
}: SquaresProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const gridOffset = useRef({ x: 0, y: 0 })
  const hoveredSquare = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1

    const resizeCanvas = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawGrid = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      if (w <= 0 || h <= 0) return

      ctx.clearRect(0, 0, w, h)

      ctx.lineWidth = 1

      // Clip to avoid 1px edge artifacts at viewport bounds.
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, w, h)
      ctx.clip()

      const startX = Math.floor(gridOffset.current.x / squareSize) * squareSize
      const startY = Math.floor(gridOffset.current.y / squareSize) * squareSize

      for (let x = startX; x < w + squareSize; x += squareSize) {
        for (let y = startY; y < h + squareSize; y += squareSize) {
          const squareX = x - (gridOffset.current.x % squareSize)
          const squareY = y - (gridOffset.current.y % squareSize)

          const sx = Math.round(squareX) + 0.5
          const sy = Math.round(squareY) + 0.5

          if (sx >= w || sy >= h || sx + squareSize <= 0 || sy + squareSize <= 0) {
            continue
          }

          if (
            hoveredSquare.current &&
            Math.floor((x - startX) / squareSize) === hoveredSquare.current.x &&
            Math.floor((y - startY) / squareSize) === hoveredSquare.current.y
          ) {
            ctx.fillStyle = hoverFillColor
            ctx.fillRect(Math.round(squareX), Math.round(squareY), squareSize, squareSize)
          }

          ctx.strokeStyle = borderColor
          ctx.strokeRect(sx, sy, squareSize, squareSize)
        }
      }

      const gradient = ctx.createRadialGradient(
        w / 2,
        h / 2,
        0,
        w / 2,
        h / 2,
        Math.sqrt(w ** 2 + h ** 2) / 2
      )
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.55)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)

      ctx.restore()
    }

    const tick = () => {
      const effectiveSpeed = Math.max(speed, 0)
      if (effectiveSpeed > 0) {
        switch (direction) {
          case 'right':
            gridOffset.current.x = (gridOffset.current.x - effectiveSpeed + squareSize) % squareSize
            break
          case 'left':
            gridOffset.current.x = (gridOffset.current.x + effectiveSpeed + squareSize) % squareSize
            break
          case 'up':
            gridOffset.current.y = (gridOffset.current.y + effectiveSpeed + squareSize) % squareSize
            break
          case 'down':
            gridOffset.current.y = (gridOffset.current.y - effectiveSpeed + squareSize) % squareSize
            break
          case 'diagonal':
            gridOffset.current.x = (gridOffset.current.x - effectiveSpeed + squareSize) % squareSize
            gridOffset.current.y = (gridOffset.current.y - effectiveSpeed + squareSize) % squareSize
            break
          default:
            break
        }
      }

      drawGrid()

      if (effectiveSpeed > 0) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!interactive) return
      const rect = canvas.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      if (mouseX < 0 || mouseY < 0 || mouseX > rect.width || mouseY > rect.height) {
        if (hoveredSquare.current) {
          hoveredSquare.current = null
          drawGrid()
        }
        return
      }

      const startX = Math.floor(gridOffset.current.x / squareSize) * squareSize
      const startY = Math.floor(gridOffset.current.y / squareSize) * squareSize

      const hoveredSquareX = Math.floor((mouseX + gridOffset.current.x - startX) / squareSize)
      const hoveredSquareY = Math.floor((mouseY + gridOffset.current.y - startY) / squareSize)

      if (
        !hoveredSquare.current ||
        hoveredSquare.current.x !== hoveredSquareX ||
        hoveredSquare.current.y !== hoveredSquareY
      ) {
        hoveredSquare.current = { x: hoveredSquareX, y: hoveredSquareY }
        drawGrid()
      }
    }

    resizeCanvas()
    tick()

    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [direction, speed, borderColor, hoverFillColor, squareSize, interactive])

  return <canvas ref={canvasRef} className={`${styles.canvas} ${className}`} />
}
