import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      remove: (widgetId: string) => void
    }
  }
}

type TurnstileWidgetProps = {
  siteKey: string
  onToken: (token: string) => void
  onExpire?: () => void
  onError?: () => void
  theme?: 'auto' | 'light' | 'dark'
}

const SCRIPT_ID = 'opendots-turnstile'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export default function TurnstileWidget({
  siteKey,
  onToken,
  onExpire,
  onError,
  theme = 'auto',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [ready, setReady] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean(window.turnstile)
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      if (!window.turnstile) {
        existing.addEventListener('load', () => setReady(true), { once: true })
      }
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', () => setReady(true), { once: true })
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!window.turnstile) return
    if (!containerRef.current) return

    // Ensure we don't double-render in StrictMode.
    if (widgetIdRef.current) {
      try { window.turnstile.remove(widgetIdRef.current) } catch { /* ignore */ }
      widgetIdRef.current = null
    }

    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      callback: (token: unknown) => {
        if (typeof token === 'string') onToken(token)
      },
      'expired-callback': () => onExpire?.(),
      'error-callback': () => onError?.(),
    })

    widgetIdRef.current = widgetId

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch { /* ignore */ }
        widgetIdRef.current = null
      }
    }
  }, [ready, siteKey, theme, onToken, onExpire, onError])

  return <div ref={containerRef} />
}
