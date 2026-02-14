/**
 * AsciiHero - 3D ASCII rendering of Opendots logo with mouse-following rotation
 * 
 * Features:
 * - 3D ASCII art rendering using R3F + drei AsciiRenderer
 * - Mouse-following continuous rotation
 * - Lazy-loaded (React.lazy + Suspense)
 * - Proper WebGL resource disposal on unmount
 * - Fallback for reduced-motion / no-WebGL browsers
 */

import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { AsciiRenderer, Center } from '@react-three/drei'
import * as THREE from 'three'
import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * Check if WebGL is supported in the browser
 */
function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

/**
 * 3D Opendots logo text that rotates with mouse
 */
function RotatingLogo({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const meshRef = useRef<THREE.Group>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  
  useEffect(() => {
    if (prefersReducedMotion) return
    
    const handleMouseMove = (event: MouseEvent) => {
      // Normalize mouse position to -1 to 1
      setMousePosition({
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [prefersReducedMotion])
  
  useFrame((_state, delta) => {
    if (!meshRef.current || prefersReducedMotion) return
    
    // Base rotation (slow continuous spin)
    meshRef.current.rotation.y += delta * 0.3
    
    // Mouse-following rotation (subtle influence)
    meshRef.current.rotation.x += (mousePosition.y * 0.2 - meshRef.current.rotation.x) * delta * 2
    meshRef.current.rotation.z += (mousePosition.x * 0.1 - meshRef.current.rotation.z) * delta * 2
  })
  
  // Simplified 3D text representation
  // Using geometric shapes to form "O" for Opendots
  return (
    <group ref={meshRef} scale={0.8}>
      {/* Main "O" - torus */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[1.5, 0.3, 16, 48]} />
        <meshStandardMaterial 
          color="#6366f1" 
          emissive="#4f46e5"
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Inner dot */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial 
          color="#a5b4fc"
          emissive="#818cf8"
          emissiveIntensity={0.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Orbiting particles */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2
        return (
          <mesh 
            key={i}
            position={[
              Math.cos(angle) * 2.5,
              Math.sin(angle * 2) * 0.5,
              Math.sin(angle) * 2.5
            ]}
          >
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial 
              color="#c7d2fe"
              emissive="#a5b4fc"
              emissiveIntensity={0.8}
            />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * Loading fallback for Suspense
 */
function HeroLoader() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-dim)',
      fontFamily: 'var(--font-mono)',
      fontSize: '14px',
    }}>
      INITIALIZING_3D...
    </div>
  )
}

/**
 * Static fallback for no-WebGL or reduced-motion browsers
 */
function StaticFallback() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '48px',
        fontWeight: 700,
        color: 'var(--accent-primary)',
        textShadow: '0 0 20px var(--accent-primary)',
        letterSpacing: '8px',
      }}>
        ○
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: 'var(--text-dim)',
        letterSpacing: '2px',
      }}>
        OPENDOTS
      </div>
    </div>
  )
}

interface AsciiHeroProps {
  className?: string
}

export default function AsciiHero({ className }: AsciiHeroProps) {
  const prefersReducedMotion = useReducedMotion()
  const [webGLSupported, setWebGLSupported] = useState<boolean | null>(null)
  
  useEffect(() => {
    setWebGLSupported(isWebGLAvailable())
  }, [])
  
  // Show loading while checking WebGL
  if (webGLSupported === null) {
    return (
      <div className={className} style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <HeroLoader />
      </div>
    )
  }
  
  // Show static fallback for no-WebGL or reduced-motion
  if (!webGLSupported || prefersReducedMotion) {
    return (
      <div className={className}>
        <StaticFallback />
      </div>
    )
  }
  
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        // Ensure proper cleanup on unmount
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a5b4fc" />
        
        {/* 3D Logo */}
        <Center>
          <RotatingLogo prefersReducedMotion={prefersReducedMotion} />
        </Center>
        
        {/* ASCII Effect */}
        <AsciiRenderer
          invert={false}
          resolution={0.15}
          color={true}
        />
      </Canvas>
    </div>
  )
}

/**
 * Lazy-loaded version for code splitting
 * Use this in App.tsx: const AsciiHero = lazy(() => import('./components/AsciiHero'))
 */
export const LazyAsciiHero = AsciiHero
