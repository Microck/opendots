import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (
            id.includes('/three/')
          ) {
            return 'three-core'
          }

          if (id.includes('postprocessing') || id.includes('@react-three/postprocessing')) {
            return 'postprocessing'
          }

          if (id.includes('@react-three/fiber') || id.includes('@react-three/drei')) {
            return 'three-react'
          }

          if (id.includes('/motion/')) return 'motion'

          if (id.includes('/gsap/')) return 'gsap'

          if (id.includes('better-auth')) return 'auth'

          if (id.includes('react-router')) return 'router'
          if (id.includes('@phosphor-icons')) return 'icons'

          return undefined
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Allow access over Tailscale (prevents Vite host-check blocks when using the tailnet DNS name).
    allowedHosts: [
      'oracle-ashburn-usa.tailc896c6.ts.net',
      'oracle-ashburn-usa.tailc896c6.ts.net.',
      '.tailc896c6.ts.net',
      '.tailc896c6.ts.net.',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
})
