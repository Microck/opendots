import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import { DoubleSide, TextureLoader } from 'three'
import type { Group, Mesh } from 'three'
import { ASCIIEffect } from '../three/ASCIIEffect'
import HeroLogoMark from './HeroLogoMark'
import { useReducedMotion } from '../hooks/useReducedMotion'
import styles from './HeroLogoAscii.module.css'

function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return Boolean(gl)
  } catch {
    return false
  }
}

function LogoScene({
  hoveringRef,
  clickImpulseRef,
  energyRef,
}: {
  hoveringRef: { current: boolean }
  clickImpulseRef: { current: number }
  energyRef: { current: number }
}) {
  const texture = useLoader(TextureLoader, '/brand/opendots-logo.png')
  const tiltRef = useRef<Group>(null)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const frontRef = useRef<Mesh>(null)
  const backRef = useRef<Mesh>(null)

  // Keep texture crisp for the ASCII sampling.
  // eslint-disable-next-line react-hooks/immutability
  texture.anisotropy = 4

  useFrame((state, delta) => {
    const tilt = tiltRef.current
    if (!tilt) return

    const safeDelta = Math.max(delta, 1 / 120)
    const alpha = 1 - Math.exp(-6.5 * safeDelta)

    const hovering = hoveringRef.current
    const px = hovering ? state.pointer.x : 0
    const py = hovering ? state.pointer.y : 0

    const dx = px - lastPointerRef.current.x
    const dy = py - lastPointerRef.current.y
    const speed = Math.min(Math.hypot(dx, dy) / safeDelta, 7)

    energyRef.current = Math.max(0, energyRef.current - safeDelta * 1.2)
    if (hovering) {
      energyRef.current = Math.min(1.4, energyRef.current + speed * 0.06)
    }

    // Click impulse decays quickly; used for punchy reactions.
    clickImpulseRef.current = Math.max(0, clickImpulseRef.current - safeDelta * 2.6)

    lastPointerRef.current.x = px
    lastPointerRef.current.y = py

    const e = energyRef.current
    const impulse = clickImpulseRef.current
    const t = state.clock.getElapsedTime()

    const micro = impulse * 0.07
    const targetRotX = -py * (0.22 + e * 0.09) + Math.sin(t * 12.0) * micro
    const targetRotY = px * (0.34 + e * 0.12) + Math.cos(t * 10.0) * micro

    tilt.rotation.x += (targetRotX - tilt.rotation.x) * alpha
    tilt.rotation.y += (targetRotY - tilt.rotation.y) * alpha
    // Keep the mark level; any roll reads like an "accidental" tilt.
    tilt.rotation.z += (0 - tilt.rotation.z) * alpha

    const s = 1 + impulse * 0.12 + e * 0.04
    tilt.scale.x += (s - tilt.scale.x) * alpha
    tilt.scale.y += (s - tilt.scale.y) * alpha
    tilt.scale.z = 1

    // "Extrude" depth + subtle offset on click.
    if (backRef.current) {
      const bz = -0.05 - impulse * 0.11
      backRef.current.position.z += (bz - backRef.current.position.z) * alpha
      backRef.current.position.x += (0.03 + Math.sin(t * 18) * impulse * 0.01 - backRef.current.position.x) * alpha
      backRef.current.position.y += (-0.02 + Math.cos(t * 17) * impulse * 0.01 - backRef.current.position.y) * alpha
    }
    if (frontRef.current) {
      const fz = 0.02 + impulse * 0.06
      frontRef.current.position.z += (fz - frontRef.current.position.z) * alpha
      frontRef.current.position.x += (-0.02 - frontRef.current.position.x) * alpha
      frontRef.current.position.y += (0.02 - frontRef.current.position.y) * alpha
    }
  })

  return (
    <group ref={tiltRef}>
        {/* extrude layers */}
        <mesh ref={backRef} position={[0.03, -0.02, -0.05]}>
          <planeGeometry args={[2.6, 2.6]} />
          <meshBasicMaterial
            map={texture}
            side={DoubleSide}
            transparent
            depthWrite={false}
            color="#7ff0ff"
            opacity={0.75}
          />
        </mesh>
        <mesh ref={frontRef} position={[-0.02, 0.02, 0.02]}>
          <planeGeometry args={[2.6, 2.6]} />
          <meshBasicMaterial
            map={texture}
            side={DoubleSide}
            transparent
            depthWrite={false}
            color="#ffffff"
            opacity={0.95}
          />
        </mesh>
    </group>
  )
}

function AsciiReactiveTuner({
  effect,
  hoveringRef,
  clickImpulseRef,
  energyRef,
}: {
  effect: ASCIIEffect
  hoveringRef: { current: boolean }
  clickImpulseRef: { current: number }
  energyRef: { current: number }
}) {
  useFrame((_state, delta) => {
    const safeDelta = Math.max(delta, 1 / 120)
    // Fade energy on idle even if LogoScene isn't running (safety).
    if (!hoveringRef.current) {
      energyRef.current = Math.max(0, energyRef.current - safeDelta * 0.6)
    }

    const hover = hoveringRef.current ? 1 : 0
    const impulse = clickImpulseRef.current
    const e = energyRef.current

    // Smaller cellSize => more detail. Go slightly finer on hover/click.
    const cell = 11 - hover * 1.5 - impulse * 2.5 - e * 0.9
    effect.setCellSize(Math.max(7.5, Math.min(14, cell)))

    // Subtle cyan flash on click, otherwise white.
    if (impulse > 0.02) {
      effect.setColor('#b8f1ff')
    } else {
      effect.setColor('#ffffff')
    }

    // Tiny invert flicker on click.
    effect.setInvert(impulse > 0.85)
  }, 1)

  return null
}

export default function HeroLogoAscii() {
  const prefersReducedMotion = useReducedMotion()
  const hoveringRef = useRef(false)
  const clickImpulseRef = useRef(0)
  const energyRef = useRef(0)

  const asciiEffect = useMemo(() => {
    return new ASCIIEffect({
      // darker -> lighter
      characters: ' .,:;i1tfLCG08@',
      fontSize: 56,
      cellSize: 11,
      color: '#ffffff',
      invert: false,
    })
  }, [])

  if (prefersReducedMotion || !isWebGLAvailable()) {
    return <HeroLogoMark />
  }

  return (
    <div className={styles.wrap} aria-hidden>
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
        onPointerEnter={() => {
          hoveringRef.current = true
        }}
        onPointerLeave={() => {
          hoveringRef.current = false
        }}
        onPointerDown={() => {
          clickImpulseRef.current = Math.min(1.6, clickImpulseRef.current + 1)
          energyRef.current = Math.min(1.4, energyRef.current + 0.9)
        }}
      >
        <Suspense fallback={null}>
          <LogoScene
            hoveringRef={hoveringRef}
            clickImpulseRef={clickImpulseRef}
            energyRef={energyRef}
          />
        </Suspense>
        <EffectComposer>
          <primitive object={asciiEffect} />
        </EffectComposer>
        <AsciiReactiveTuner
          effect={asciiEffect}
          hoveringRef={hoveringRef}
          clickImpulseRef={clickImpulseRef}
          energyRef={energyRef}
        />
      </Canvas>
    </div>
  )
}
