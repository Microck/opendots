import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useThree } from '@react-three/fiber'
import { AsciiEffect } from 'three-stdlib'
import gsap from 'gsap'
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
  MeshStandardMaterial,
} from 'three'
import { useLocation } from 'react-router-dom'
import { useReducedMotion } from '../hooks/useReducedMotion'
import {
  DEFAULT_ASCII_HERO_DEBUG_SETTINGS,
  readAsciiHeroDebugSettings,
  subscribeAsciiHeroDebugSettings,
  type AsciiHeroDebugSettings,
} from '../lib/heroDebug'
import { detectRenderQualityTier, type RenderQualityTier } from '../lib/renderQuality'

function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (gl) {
      const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')
      ext?.loseContext()
    }
    return !!gl
  } catch {
    return false
  }
}

const accentLineMaterial = new LineBasicMaterial({
  color: '#b8f1ff',
  transparent: true,
  opacity: 0.18,
})

const LOGO_PNG_URL = '/brand/opendots-logo.png'

function heartbeat(t: number): number {
  const phase = ((t % 1) + 1) % 1
  const p1 = Math.exp(-((phase - 0.3) ** 2) / 0.008)
  const p2 = Math.exp(-((phase - 0.58) ** 2) / 0.012) * 0.6
  return p1 + p2
}

function LogoCloud({
  reactivityRef,
  motionScale,
  depth,
  size,
  margin,
  radiusRef,
}: {
  reactivityRef: { current: number }
  motionScale: number
  depth: number
  size: number
  margin: number
  radiusRef: { current: number }
}) {
  const groupRef = useRef<Group>(null)
  const nodesRef = useRef<InstancedMesh>(null)
  const nodeMatRef = useRef<MeshStandardMaterial>(null)
  const [positions, setPositions] = useState<Array<[number, number, number]>>([])

  const tmpRef = useRef({
    matrix: new Matrix4(),
    pos: new Vector3(),
    scale: new Vector3(1, 1, 1),
    quat: new Quaternion(),
  })

  useEffect(() => {
    let cancelled = false

    const img = new Image()
    img.decoding = 'async'
    img.src = LOGO_PNG_URL

    img.onload = () => {
      if (cancelled) return

      // Downsample aggressively; this is just a point-cloud seed.
      const target = 128
      const canvas = document.createElement('canvas')
      canvas.width = target
      canvas.height = target

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      ctx.clearRect(0, 0, target, target)
      ctx.drawImage(img, 0, 0, target, target)

      const { data } = ctx.getImageData(0, 0, target, target)
      const alphaThreshold = 18

      // Find bounds of non-transparent area.
      let minX = target
      let maxX = 0
      let minY = target
      let maxY = 0

      for (let y = 0; y < target; y += 1) {
        for (let x = 0; x < target; x += 1) {
          const i = (y * target + x) * 4
          const a = data[i + 3]
          if (a <= alphaThreshold) continue
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }

      if (minX >= maxX || minY >= maxY) {
        setPositions([])
        return
      }

      const w = Math.max(1, maxX - minX)
      const h = Math.max(1, maxY - minY)

      const points: Array<[number, number, number]> = []
      const stride = w > 90 ? 2 : 1

      for (let y = minY; y <= maxY; y += stride) {
        for (let x = minX; x <= maxX; x += stride) {
          const i = (y * target + x) * 4
          const a = data[i + 3]
          if (a <= alphaThreshold) continue

          // Dither to avoid a perfect grid; deterministic jitter.
          const seed = (x * 73856093) ^ (y * 19349663)
          const jx = ((seed & 1023) / 1023 - 0.5) * 0.05
          const jy = (((seed >> 10) & 1023) / 1023 - 0.5) * 0.05

          const nx = (x - (minX + w / 2)) / w
          const ny = ((minY + h / 2) - y) / h
          const nz = ((a / 255) - 0.5) * depth * 0.65

          points.push([nx + jx, ny + jy, nz])
        }
      }

      // Clamp point count for perf. Keep it stable-ish.
      const maxPoints = 1600

      const finalPoints: Array<[number, number, number]> = []
      if (points.length > maxPoints) {
        const step = Math.ceil(points.length / maxPoints)
        for (let i = 0; i < points.length; i += step) finalPoints.push(points[i])
      } else {
        finalPoints.push(...points)
      }

      // Normalize to a predictable radius so we don't crop at the canvas edges.
      let maxRadius = 0.001
      for (const p of finalPoints) {
        const r = Math.hypot(p[0], p[1], p[2])
        if (r > maxRadius) maxRadius = r
      }

      const targetRadius = Math.max(0.8, size) * margin
      const s = targetRadius / maxRadius
      for (let i = 0; i < finalPoints.length; i += 1) {
        finalPoints[i] = [finalPoints[i][0] * s, finalPoints[i][1] * s, finalPoints[i][2] * s]
      }

      radiusRef.current = targetRadius
      setPositions(finalPoints)
    }

    img.onerror = () => {
      if (cancelled) return
      setPositions([])
    }

    return () => {
      cancelled = true
    }
  }, [depth, size, margin, radiusRef])

  useFrame((state, delta) => {
    const group = groupRef.current
    const nodes = nodesRef.current
    if (!group || !nodes || positions.length === 0) return

    const t = state.clock.getElapsedTime()
    const energy = reactivityRef.current
    const hb = heartbeat(t * 0.55)
    const tmp = tmpRef.current

    group.rotation.y += delta * (0.22 + energy * 0.3) * motionScale
    group.rotation.x = Math.sin(t * 0.2) * 0.18 * motionScale

    const base = 0.055 + energy * 0.06
    const pulse = 0.04 + hb * 0.06
    const zWave = 0.08 + energy * 0.12

    if (nodeMatRef.current) {
      nodeMatRef.current.emissiveIntensity = 0.12 + energy * 0.35 + hb * 0.08
    }

    for (let i = 0; i < positions.length; i += 1) {
      const p = positions[i]
      const wobble = Math.sin(t * 1.4 + i * 0.03) * zWave
      tmp.pos.set(p[0], p[1], p[2] + wobble)
      const s = base + pulse * (0.5 + (i % 7) / 9)
      tmp.scale.set(s, s, s)
      tmp.matrix.compose(tmp.pos, tmp.quat, tmp.scale)
      nodes.setMatrixAt(i, tmp.matrix)
    }
    nodes.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={nodesRef}
        // Remount when count changes.
        key={positions.length}
        args={[undefined as never, undefined as never, Math.max(1, positions.length)]}
      >
        <sphereGeometry args={[1, 6, 6]} />
        <meshStandardMaterial
          ref={nodeMatRef}
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.14}
          metalness={0.05}
          roughness={0.75}
        />
      </instancedMesh>
    </group>
  )
}

function HeroSculpture({
  reactivityRef,
  settings,
  motionScale,
  radiusRef,
}: {
  reactivityRef: { current: number }
  settings: AsciiHeroDebugSettings
  motionScale: number
  radiusRef: { current: number }
}) {
  const groupRef = useRef<Group>(null)
  const ringRef = useRef<LineSegments>(null)

  const orbitLayout = useMemo(() => {
    const count = 10
    const points: Array<[number, number, number]> = []
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2
      const r = 2.15
      points.push([Math.cos(a) * r, Math.sin(a) * r * 0.74, 0])
    }
    return points
  }, [])

  const orbitGeometry = useMemo(() => {
    const vertices: number[] = []
    for (let i = 0; i < orbitLayout.length; i += 1) {
      const next = (i + 1) % orbitLayout.length
      const a = orbitLayout[i]
      const b = orbitLayout[next]
      vertices.push(a[0], a[1], a[2], b[0], b[1], b[2])
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    return geometry
  }, [orbitLayout])

  useEffect(() => {
    return () => {
      orbitGeometry.dispose()
    }
  }, [orbitGeometry])

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return

    const t = state.clock.getElapsedTime()
    const energy = reactivityRef.current
    const hb = heartbeat(t * 0.7)

    group.rotation.z += delta * 0.08 * motionScale
    group.rotation.y += delta * settings.spinSpeed * (0.55 + energy * 0.55) * motionScale
    group.rotation.x = Math.sin(t * 0.3) * 0.12 * motionScale

    const scale = 1 + hb * 0.02 + energy * 0.03
    group.scale.setScalar(scale)
    accentLineMaterial.opacity = 0.12 + energy * 0.22

    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * (0.12 + energy * 0.2) * motionScale
    }
  })

  return (
    <group ref={groupRef}>
      <LogoCloud
        reactivityRef={reactivityRef}
        motionScale={motionScale}
        depth={settings.depth}
        size={settings.outer}
        margin={0.86}
        radiusRef={radiusRef}
      />

      <lineSegments ref={ringRef} geometry={orbitGeometry} material={accentLineMaterial} />
    </group>
  )
}

type PointerState = { x: number; y: number }

function clampNdc(value: number) {
  return Math.max(-1, Math.min(1, value))
}

function PointerTracker({
  hoveringRef,
  pointerTargetRef,
  reactivityRef,
  reactivityCap,
}: {
  hoveringRef: { current: boolean }
  pointerTargetRef: { current: PointerState }
  reactivityRef: { current: number }
  reactivityCap: number
}) {
  const { gl } = useThree()

  useEffect(() => {
    const el = gl.domElement
    if (!el) return

    const update = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)

      pointerTargetRef.current.x = clampNdc(x)
      pointerTargetRef.current.y = clampNdc(y)
    }

    const onEnter = (event: PointerEvent) => {
      hoveringRef.current = true
      update(event)
    }

    const onLeave = () => {
      hoveringRef.current = false
      pointerTargetRef.current.x = 0
      pointerTargetRef.current.y = 0
    }

    const onMove = (event: PointerEvent) => {
      update(event)
    }

    const onDown = () => {
      reactivityRef.current = Math.min(reactivityCap, reactivityRef.current + 0.85)
    }

    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerdown', onDown)

    return () => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
    }
  }, [gl, hoveringRef, pointerTargetRef, reactivityRef, reactivityCap])

  return null
}

function AsciiOverlay({
  fgColor,
  bgColor,
  characters,
  invert,
  color,
  resolution,
  hoveringRef,
  pointerRef,
  reactivityRef,
}: {
  fgColor: string
  bgColor: string
  characters: string
  invert: boolean
  color: boolean
  resolution: number
  hoveringRef: { current: boolean }
  pointerRef: { current: PointerState }
  reactivityRef: { current: number }
}) {
  const { size, gl, scene, camera } = useThree()

  const effectRef = useRef<AsciiEffect | null>(null)
  const tableRef = useRef<HTMLTableElement | null>(null)

  useEffect(() => {
    const dom = gl.domElement

    const instance = new AsciiEffect(gl, characters, {
      invert,
      color,
      resolution,
      scale: 1,
    })
    instance.domElement.style.position = 'absolute'
    instance.domElement.style.top = '0px'
    instance.domElement.style.left = '0px'
    instance.domElement.style.pointerEvents = 'none'
    instance.domElement.style.userSelect = 'none'
    instance.domElement.style.zIndex = '1'

    effectRef.current = instance
    tableRef.current = instance.domElement.querySelector('table') as HTMLTableElement | null

    dom.parentNode?.appendChild(instance.domElement)

    gsap.fromTo(
      instance.domElement,
      { opacity: 0 },
      { opacity: 1, duration: 0.65, ease: 'power2.out' },
    )

    return () => {
      try {
        dom.parentNode?.removeChild(instance.domElement)
      } catch {
        // ignore
      }
      effectRef.current = null
      tableRef.current = null
    }
  }, [gl, characters, invert, color, resolution])

  useLayoutEffect(() => {
    const effect = effectRef.current
    if (!effect) return
    effect.domElement.style.color = fgColor
    effect.domElement.style.backgroundColor = bgColor
  }, [fgColor, bgColor])

  useEffect(() => {
    effectRef.current?.setSize(size.width, size.height)
  }, [size])

  useFrame(() => {
    const effect = effectRef.current
    if (!effect) return

    effect.render(scene, camera)

    const energy = reactivityRef.current
    const hover = hoveringRef.current
    const px = pointerRef.current.x
    const py = pointerRef.current.y

    const el = tableRef.current ?? effect.domElement

    if (!hover) {
      el.style.textShadow = 'none'
      el.style.filter = 'contrast(1.15) brightness(1.05)'
      return
    }

    const split = 0.5 + energy * 2.2
    const sx = px * split
    const sy = -py * split

    el.style.textShadow =
      `${sx}px ${sy}px 0 rgba(255, 80, 80, 0.45), ` +
      `${-sx}px ${-sy}px 0 rgba(80, 255, 255, 0.38)`
    el.style.filter = `contrast(${1.12 + energy * 0.3}) brightness(${1.04 + energy * 0.08})`
  }, 1)

  return null
}

function InteractionRig({
  prefersReducedMotion,
  pointerRef,
  pointerTargetRef,
  hoveringRef,
  reactivityRef,
  reactivityCap,
  motionScale,
}: {
  prefersReducedMotion: boolean
  pointerRef: { current: PointerState }
  pointerTargetRef: { current: PointerState }
  hoveringRef: { current: boolean }
  reactivityRef: { current: number }
  reactivityCap: number
  motionScale: number
}) {
  const previousRef = useRef<PointerState>({ x: 0, y: 0 })

  useFrame((_state, delta) => {
    if (prefersReducedMotion) return

    const safeDelta = Math.max(delta, 1 / 120)
    const alpha = 1 - Math.exp(-6.5 * safeDelta)

    const hovering = hoveringRef.current

    const targetX = hovering ? pointerTargetRef.current.x : 0
    const targetY = hovering ? pointerTargetRef.current.y : 0

    pointerRef.current.x += (targetX - pointerRef.current.x) * alpha
    pointerRef.current.y += (targetY - pointerRef.current.y) * alpha

    const dx = pointerRef.current.x - previousRef.current.x
    const dy = pointerRef.current.y - previousRef.current.y
    const speed = Math.min(Math.hypot(dx, dy) / safeDelta, 8)

    // Energy should feel like inertia, not noise. Keep it stable.
    reactivityRef.current = Math.max(0, reactivityRef.current - safeDelta * 0.7)
    if (hovering) {
      reactivityRef.current = Math.min(
        reactivityCap,
        reactivityRef.current + speed * 0.05 * motionScale,
      )
    }

    previousRef.current.x = pointerRef.current.x
    previousRef.current.y = pointerRef.current.y
  })

  return null
}

function SceneRig({
  pointerRef,
  motionScale,
  children,
}: {
  pointerRef: { current: PointerState }
  motionScale: number
  children: ReactNode
}) {
  const rigRef = useRef<Group>(null)
  const scrollRef = useRef(0)

  useFrame((_state, delta) => {
    const rig = rigRef.current
    if (!rig) return

    const safeDelta = Math.max(delta, 1 / 120)
    const alpha = 1 - Math.exp(-5.5 * safeDelta)

    const scrollTarget = typeof window !== 'undefined' ? window.scrollY : 0
    scrollRef.current += (scrollTarget - scrollRef.current) * alpha
    const scrollPhase = (scrollRef.current / 900) * 0.35

    const targetX = -pointerRef.current.y * 0.18 * motionScale
    const targetY = pointerRef.current.x * 0.24 * motionScale + scrollPhase

    rig.rotation.x += (targetX - rig.rotation.x) * alpha
    rig.rotation.y += (targetY - rig.rotation.y) * alpha
  })

  return <group ref={rigRef}>{children}</group>
}

function CameraRig({
  pointerRef,
  reactivityRef,
  baseZ,
  baseFov,
  motionScale,
  contentRadiusRef,
}: {
  pointerRef: { current: PointerState }
  reactivityRef: { current: number }
  baseZ: number
  baseFov: number
  motionScale: number
  contentRadiusRef: { current: number }
}) {
  useFrame((state, delta) => {
    const energy = reactivityRef.current
    const safeDelta = Math.max(delta, 1 / 120)
    const alpha = 1 - Math.exp(-4.2 * safeDelta)

    const targetX = pointerRef.current.x * 0.55 * motionScale
    const targetY = pointerRef.current.y * 0.4 * motionScale

    const aspect = state.size.width > 0 ? state.size.width / state.size.height : 1
    const vFov = (baseFov * Math.PI) / 180
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
    const minTan = Math.max(0.001, Math.min(Math.tan(vFov / 2), Math.tan(hFov / 2)))
    const fitRadius = Math.max(1.2, contentRadiusRef.current)
    const fitZ = (fitRadius / minTan) * 1.15

    const targetZ = Math.max(baseZ, fitZ) - energy * 0.4

    state.camera.position.x += (targetX - state.camera.position.x) * alpha
    state.camera.position.y += (targetY - state.camera.position.y) * alpha
    state.camera.position.z += (targetZ - state.camera.position.z) * alpha
    state.camera.lookAt(0, 0, 0)

    const perspectiveCamera = state.camera as { fov: number; updateProjectionMatrix: () => void }
    const fovTarget = baseFov - energy * 1.15
    perspectiveCamera.fov += (fovTarget - perspectiveCamera.fov) * alpha
    if (Math.abs(fovTarget - perspectiveCamera.fov) > 0.01) {
      perspectiveCamera.updateProjectionMatrix()
    }
  })

  return null
}

function StaticFallback() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      lineHeight: 1.2,
      color: 'rgba(255, 255, 255, 0.6)',
      whiteSpace: 'pre',
      letterSpacing: '0.1em',
    }}>
{`####################
####################
##                ##
##                ##
##    ########    ##
##    ########    ##
##    ########    ##
##                ##
##                ##
####################
####################`}
    </div>
  )
}

interface AsciiHeroProps {
  className?: string
}

export default function AsciiHero({ className }: AsciiHeroProps) {
  const prefersReducedMotion = useReducedMotion()
  const [webGLSupported] = useState(() => isWebGLAvailable())
  const [debugSettings, setDebugSettings] = useState<AsciiHeroDebugSettings>(() => readAsciiHeroDebugSettings())
  const [qualityTier] = useState<RenderQualityTier>(() => detectRenderQualityTier())
  const location = useLocation()

  useEffect(() => {
    const unsubscribe = subscribeAsciiHeroDebugSettings(setDebugSettings)
    return unsubscribe
  }, [])


  const quality = useMemo(() => {
    if (qualityTier === 'low') {
      return {
        maxDpr: 1.1,
        antialias: false,
        powerPreference: 'low-power' as const,
        motionScale: 0.72,
        reactivityCap: 1.25,
        minResolution: 0.19,
      }
    }

    if (qualityTier === 'high') {
      return {
        maxDpr: 1.5,
        antialias: true,
        powerPreference: 'high-performance' as const,
        motionScale: 1,
        reactivityCap: 1.8,
        minResolution: 0.1,
      }
    }

    return {
      maxDpr: 1.3,
      antialias: true,
      powerPreference: 'high-performance' as const,
      motionScale: 0.86,
      reactivityCap: 1.45,
      minResolution: 0.14,
    }
  }, [qualityTier])

  const safeResolution = Number.isFinite(debugSettings.resolution)
    ? Math.max(debugSettings.resolution, quality.minResolution)
    : Math.max(DEFAULT_ASCII_HERO_DEBUG_SETTINGS.resolution, quality.minResolution)

  const safeCharacters = debugSettings.characters && debugSettings.characters.length > 0
    ? debugSettings.characters
    : DEFAULT_ASCII_HERO_DEBUG_SETTINGS.characters

  const reactivityRef = useRef(0)
  const contentRadiusRef = useRef(2.2)
  const pointerRef = useRef<PointerState>({ x: 0, y: 0 })
  const pointerTargetRef = useRef<PointerState>({ x: 0, y: 0 })
  const hoveringRef = useRef(false)

  if (!webGLSupported || prefersReducedMotion) {
    return (
      <div className={className} style={{ width: '100%', height: '100%' }}>
        <StaticFallback />
      </div>
    )
  }

  return (
    <div key={location.pathname} className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        className="od-ascii-canvas"
        camera={{ position: [0, 0, Math.max(debugSettings.cameraZ, 8)], fov: debugSettings.fov }}
        gl={{ antialias: quality.antialias, alpha: true, powerPreference: quality.powerPreference }}
        dpr={[1, quality.maxDpr]}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0) }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-3, -2, 4]} intensity={0.4} color="#ffffff" />
        <PointerTracker
          hoveringRef={hoveringRef}
          pointerTargetRef={pointerTargetRef}
          reactivityRef={reactivityRef}
          reactivityCap={quality.reactivityCap}
        />
        <InteractionRig
          prefersReducedMotion={prefersReducedMotion}
          pointerRef={pointerRef}
          pointerTargetRef={pointerTargetRef}
          hoveringRef={hoveringRef}
          reactivityRef={reactivityRef}
          reactivityCap={quality.reactivityCap}
          motionScale={quality.motionScale}
        />
        <CameraRig
          pointerRef={pointerRef}
          reactivityRef={reactivityRef}
          baseZ={Math.max(debugSettings.cameraZ, 6.2)}
          baseFov={debugSettings.fov}
          motionScale={quality.motionScale}
          contentRadiusRef={contentRadiusRef}
        />

        <SceneRig pointerRef={pointerRef} motionScale={quality.motionScale}>
          <HeroSculpture
            reactivityRef={reactivityRef}
            settings={debugSettings}
            motionScale={quality.motionScale}
            radiusRef={contentRadiusRef}
          />
        </SceneRig>
        <AsciiOverlay
          fgColor="white"
          bgColor="transparent"
          invert={false}
          color={false}
          resolution={safeResolution}
          characters={safeCharacters}
          hoveringRef={hoveringRef}
          pointerRef={pointerRef}
          reactivityRef={reactivityRef}
        />
      </Canvas>
    </div>
  )
}

export const LazyAsciiHero = AsciiHero
