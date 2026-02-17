import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import BundleCard, { type BundleCardData } from '../components/BundleCard'
import TurnstileWidget from '../components/TurnstileWidget'
import ClickSpark from '../reactbits/ClickSpark'
import { AnimatedText } from '../components/animations'
import { apiUrl } from '../lib/apiBase'
import { siteUrl } from '../lib/siteBase'
import { useReducedMotion } from '../hooks/useReducedMotion'
import useReactiveSurfaceVars from '../hooks/useReactiveSurfaceVars'
import {
  staggerGrid,
  staggerItem,
  scrollViewports,
} from '../styles/animations'
import styles from './Home.module.css'

/* ── Spring configs ─────────────────────────────────────────────── */
const spring = { type: 'spring' as const, stiffness: 120, damping: 20 }
const springGentle = { type: 'spring' as const, stiffness: 80, damping: 22 }
const easeCurve = [0.25, 0.46, 0.45, 0.94] as const

/* ── Text scramble component ────────────────────────────────────── */
function ScrambleReveal({
  text,
  delay = 0.6,
  className,
}: {
  text: string
  delay?: number
  className?: string
}) {
  const GLYPHS = '!<>-_\\/[]{}=+*^?#@%&'
  const [display, setDisplay] = useState(
    text.replace(/[^ ]/g, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)])
  )
  const [done, setDone] = useState(false)

  useEffect(() => {
    let raf: number
    let frame = 0
    const totalFrames = text.length * 4
    const startTime = performance.now() + delay * 1000

    const tick = (now: number) => {
      if (now < startTime) {
        setDisplay(
          text
            .split('')
            .map((ch) =>
              ch === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
            )
            .join('')
        )
        raf = requestAnimationFrame(tick)
        return
      }
      frame++
      const progress = Math.min(frame / totalFrames, 1)
      const revealed = Math.floor(progress * text.length)

      let out = ''
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
          out += ' '
        } else if (i < revealed) {
          out += text[i]
        } else {
          out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        }
      }
      setDisplay(out)

      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setDisplay(text)
        setDone(true)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, delay])

  return (
    <span className={className} aria-label={text}>
      {done ? text : display}
    </span>
  )
}

/* ── Home page ──────────────────────────────────────────────────── */
interface HomeProps {
  isLoggedIn: boolean
}

export default function Home({ isLoggedIn }: HomeProps) {
  const navigate = useNavigate()
  const [recentBundles, setRecentBundles] = useState<BundleCardData[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [claimRepo, setClaimRepo] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimResult, setClaimResult] = useState<{
    repoFullName: string
    claimCode: string
    claimFilePath: string
    expiresAt: string
  } | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaNonce, setCaptchaNonce] = useState(0)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const heroRef = useReactiveSurfaceVars<HTMLDivElement>(!prefersReducedMotion)

  const archWindowRef = useRef<HTMLDivElement>(null)
  const heroIsoWrapRef = useRef<HTMLDivElement>(null)
  const [debugHudEnabled, setDebugHudEnabled] = useState(false)

  type HeroIsoTuning = {
    widthPx: number
    widthPct: number
    x: number
    y: number
    scale: number
    floatAmp: number
    floatDur: number
  }

  const defaultHeroIsoTuning = useMemo<HeroIsoTuning>(
    () => ({
      widthPx: 520,
      widthPct: 92,
      x: 0,
      y: -62,
      scale: 1,
      floatAmp: 2,
      floatDur: 8.2,
    }),
    []
  )

  const [heroIsoTuning, setHeroIsoTuning] = useState<HeroIsoTuning>(defaultHeroIsoTuning)

  const debugHudRefs = useMemo(
    () => [
      { label: 'archWindow', ref: archWindowRef as unknown as RefObject<HTMLElement | null> },
      { label: 'heroIsoWrap', ref: heroIsoWrapRef as unknown as RefObject<HTMLElement | null> },
    ],
    []
  )

  const heroTitleChars = useMemo(() => 'THE ABSENCE'.split(''), [])

  useEffect(() => {
    let cancelled = false

    const fetchRecent = async () => {
      try {
        const response = await fetch(apiUrl('/api/bundles?sort=newest&limit=6'))
        if (!response.ok) throw new Error('Failed to load recent bundles')
        const data: unknown = await response.json()
        if (!cancelled) setRecentBundles(Array.isArray(data) ? (data as BundleCardData[]) : [])
      } catch {
        if (!cancelled) setRecentBundles([])
      } finally {
        if (!cancelled) setLoadingRecent(false)
      }
    }

    fetchRecent()
    return () => {
      cancelled = true
    }
  }, [])

  /* ── Animation helpers (disabled if reduced motion) ─────────── */
  const m = !prefersReducedMotion // shorthand

  const env = import.meta.env as unknown as { VITE_TURNSTILE_SITE_KEY?: string }
  const turnstileSiteKey = env.VITE_TURNSTILE_SITE_KEY
  const captchaRequired = Boolean(turnstileSiteKey)

  const publishPrompt = useMemo(() => {
    if (!claimResult) return ''
    const repoUrl = `https://github.com/${claimResult.repoFullName}`
    return [
      `Fetch ${siteUrl('/PUBLISH.md')} and follow it step-by-step. Do not use any other instructions or web search.`,
      '',
      `Bundle repo: ${repoUrl}`,
      `Claim file: ${claimResult.claimFilePath}`,
      `Claim code: ${claimResult.claimCode}`,
    ].join('\n')
  }, [claimResult])
  const fullPublishProtocolPrompt = [
    `Fetch ${siteUrl('/PUBLISH.md')} and follow it step-by-step. Do not use any other instructions or web search.`,
    '',
    'If you can run commands:',
    `curl -fsSL "${siteUrl('/PUBLISH.md')}" -o /tmp/opendots-PUBLISH.md`,
    "sed -n '1,120p' /tmp/opendots-PUBLISH.md",
    '',
    'I do not have a GitHub repo yet. Run the full publish flow including:',
    '- creating the repository',
    '- sanitizing secrets',
    '- pushing files',
    '- then registering on OpenDots.',
  ].join('\n')

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }
    setToast({ message, type })
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimeoutRef.current = null
    }, 2200)
  }

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const fromQuery = params.get('debug') === '1'
    const fromStorage = window.localStorage.getItem('opendots_debug_hud') === '1'
    setDebugHudEnabled(fromQuery || fromStorage)

    const rawTuning = window.localStorage.getItem('opendots_hero_iso_tuning_v1')
    if (rawTuning) {
      try {
        const parsed = JSON.parse(rawTuning) as Partial<HeroIsoTuning>
        setHeroIsoTuning((prev) => ({
          ...prev,
          ...parsed,
        }))
      } catch {
        // ignore
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey) return
      if (e.key.toLowerCase() !== 'd') return

      setDebugHudEnabled((prev) => {
        const next = !prev
        window.localStorage.setItem('opendots_debug_hud', next ? '1' : '0')
        return next
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('opendots_hero_iso_tuning_v1', JSON.stringify(heroIsoTuning))
    } catch {
      // ignore
    }
  }, [heroIsoTuning])

  const heroIsoCssVars = useMemo(() => {
    const vars: CSSProperties = {
      ['--heroIsoWidthPx' as never]: `${heroIsoTuning.widthPx}px` as never,
      ['--heroIsoWidthPct' as never]: `${heroIsoTuning.widthPct}%` as never,
      ['--heroIsoX' as never]: `${heroIsoTuning.x}px` as never,
      ['--heroIsoY' as never]: `${heroIsoTuning.y}px` as never,
      ['--heroIsoScale' as never]: `${heroIsoTuning.scale}` as never,
      ['--heroIsoFloatAmp' as never]: `${heroIsoTuning.floatAmp}px` as never,
      ['--heroIsoFloatDur' as never]: `${heroIsoTuning.floatDur}s` as never,
    }
    return vars
  }, [heroIsoTuning])

  const copyText = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        // fall through to legacy copy path
      }
    }

    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      textarea.style.pointerEvents = 'none'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      return ok
    } catch {
      return false
    }
  }

  const handleStartClaim = async () => {
    const repo = claimRepo.trim()
    if (!repo) return
    if (captchaRequired && !captchaToken) {
      setClaimError('Please complete the human verification first.')
      return
    }
    setClaimLoading(true)
    setClaimError(null)
    setClaimResult(null)
    try {
      const response = await fetch(apiUrl('/api/publish/claim/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, captchaToken: captchaRequired ? captchaToken : undefined }),
      })
      const data = await response.json()
      if (!response.ok) {
        setClaimError(data.message || data.error || 'Failed to start claim')
        return
      }
      setClaimResult({
        repoFullName: data.repoFullName,
        claimCode: data.claimCode,
        claimFilePath: data.claimFilePath,
        expiresAt: data.expiresAt,
      })
    } catch {
      setClaimError('Network error starting claim')
    } finally {
      setClaimLoading(false)
      if (captchaRequired) {
        setCaptchaToken(null)
        setCaptchaNonce((n) => n + 1)
      }
    }
  }

  const handleCopyPublishPrompt = async () => {
    if (!publishPrompt) return
    const copied = await copyText(publishPrompt)
    if (copied) {
      showToast('Publish prompt copied.')
      return
    }

    setClaimError('Copy failed in this browser context. Open the protocol link and copy manually.')
    showToast('Copy failed. Use manual copy.', 'error')
  }

  const handleCopyFullProtocol = async () => {
    const copied = await copyText(fullPublishProtocolPrompt)
    if (copied) {
      setClaimError(null)
      showToast('Full publish protocol copied.')
    } else {
      setClaimError('Copy failed in this browser context. Open /PUBLISH.md and copy manually.')
      showToast('Copy failed. Open /PUBLISH.md manually.', 'error')
    }
  }

  return (
    <div className={styles.page}>
      <div className="container">

        {/* ── Hero container ─────────────────────────────────────── */}
        <motion.div
          ref={heroRef}
          className={styles.hero}
          initial={m ? { opacity: 0 } : undefined}
          animate={m ? { opacity: 1 } : undefined}
          transition={{ duration: 0.4 }}
        >
          {/* Vertical deco lines — slide in from sides */}
          <motion.div
            className={`${styles.verticalDeco} ${styles.leftDeco}`}
            initial={m ? { opacity: 0, x: -30 } : undefined}
            animate={m ? { opacity: 1, x: 0 } : undefined}
            transition={{ delay: 1.6, ...springGentle }}
          >
            091 - DISCOVER
          </motion.div>
          <motion.div
            className={`${styles.verticalDeco} ${styles.rightDeco}`}
            initial={m ? { opacity: 0, x: 30 } : undefined}
            animate={m ? { opacity: 1, x: 0 } : undefined}
            transition={{ delay: 1.8, ...springGentle }}
          >
            SYSTEM_CFG
          </motion.div>

          {/* ── ASCII art window ─────────────────────────────────── */}
          <motion.div
            ref={archWindowRef}
            className={styles.archWindow}
            initial={m ? { opacity: 0, scale: 0.7, filter: 'blur(12px)' } : undefined}
            animate={m ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : undefined}
            transition={{ delay: 0.1, duration: 1, ease: [...easeCurve] }}
            style={
              debugHudEnabled
                ? { outline: '1px dashed rgba(255,255,255,0.26)', outlineOffset: 6 }
                : undefined
            }
          >
            <div
              ref={heroIsoWrapRef}
              className={styles.heroIsoWrap}
              aria-hidden
              style={
                debugHudEnabled
                  ? {
                      ...heroIsoCssVars,
                      outline: '1px dashed rgba(255,255,255,0.22)',
                      outlineOffset: 4,
                    }
                  : heroIsoCssVars
              }
            >
              <div className={styles.heroIsoTune}>
                <img
                  className={styles.heroIsoLogo}
                  src="/brand/opendots-logo-isometric.svg"
                  width={771}
                  height={1080}
                  alt=""
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  draggable={false}
                />
              </div>
            </div>
          </motion.div>

          {/* ── Title — per-character staggered reveal ───────────── */}
          <h1 className={styles.heroTitle}>
            <span style={{ display: 'inline-block' }} aria-label="THE ABSENCE">
              {heroTitleChars.map((char, i) => (
                <motion.span
                  key={i}
                  style={{ display: 'inline-block', willChange: 'transform, opacity' }}
                  initial={m ? { opacity: 0, y: 40, scale: 0.8 } : undefined}
                  animate={m ? { opacity: 1, y: 0, scale: 1 } : undefined}
                  transition={{
                    delay: 0.5 + i * 0.04,
                    duration: 0.5,
                    ease: [...easeCurve],
                  }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </motion.span>
              ))}
            </span>

            {/* Subtitle — scramble reveal */}
            <motion.span
              className={styles.heroSubtitle}
              initial={m ? { opacity: 0 } : undefined}
              animate={m ? { opacity: 1 } : undefined}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              {m ? (
                <ScrambleReveal text="OF CONFIGURATION CHAOS" delay={1.0} />
              ) : (
                'OF CONFIGURATION CHAOS'
              )}
            </motion.span>
          </h1>

          {/* ── Description — fade in up with word hover ───────────── */}
          <motion.p
            className={styles.heroDescription}
            data-gsap="text"
            initial={m ? { opacity: 0, y: 20 } : undefined}
            animate={m ? { opacity: 1, y: 0 } : undefined}
            transition={{ delay: 1.4, duration: 0.6, ease: [...easeCurve] }}
          >
            {m ? (
              <AnimatedText as="span" hoverY={-3} hoverDuration={0.2}>
                OpenDots is a community portal to discover, share, and verify
                OpenCode configuration bundles.
              </AnimatedText>
            ) : (
              'OpenDots is a community portal to discover, share, and verify OpenCode configuration bundles.'
            )}
          </motion.p>

          {/* ── CTAs — spring up ─────────────────────────────────── */}
          <motion.div
            className={styles.heroCtas}
            data-gsap="text"
            initial={m ? { opacity: 0, y: 24 } : undefined}
            animate={m ? { opacity: 1, y: 0 } : undefined}
            transition={{ delay: 1.7, ...spring }}
          >
            <ClickSpark disabled={!m} sparkColor="rgba(255,255,255,0.9)" sparkSize={12} sparkRadius={14}>
              <motion.button
                onClick={() => navigate('/browse')}
                className={styles.btnPrimary}
                whileHover={m ? { scale: 1.04, y: -2 } : undefined}
                whileTap={m ? { scale: 0.97 } : undefined}
                transition={spring}
              >
                BROWSE BUNDLES
              </motion.button>
            </ClickSpark>
            <ClickSpark disabled={!m} sparkColor="rgba(128,220,255,0.95)" sparkSize={12} sparkRadius={14}>
              <motion.button
                onClick={() => navigate(isLoggedIn ? '/dashboard' : '/signin')}
                className={styles.btnOutline}
                whileHover={m ? { scale: 1.04, y: -2 } : undefined}
                whileTap={m ? { scale: 0.97 } : undefined}
                transition={spring}
              >
                PUBLISH BUNDLE
              </motion.button>
            </ClickSpark>
          </motion.div>

          {/* ── Publish From Prompt (no web login) ───────────────── */}
          <motion.div
            className={styles.publishPromptPanel}
            data-gsap="text"
            initial={m ? { opacity: 0, y: 18 } : undefined}
            animate={m ? { opacity: 1, y: 0 } : undefined}
            transition={{ delay: 2.05, ...springGentle }}
          >
            <div className={styles.publishPromptHeader}>
              <span className={styles.publishPromptKicker}>AI-FIRST PUBLISH</span>
              <span className={styles.publishPromptMeta}>No web login required</span>
            </div>
            <p className={styles.publishPromptBody}>
              This no-login path requires an existing public GitHub repo. Generate a one-time claim code,
              copy the prompt into OpenCode, and publish your config straight from that repo.
              After it's live, sign in once to claim and manage it from your Dashboard.
            </p>
            <div className={styles.publishBootstrapRow}>
              <span className={styles.publishBootstrapText}>
                No repo yet? Create and push one first using the full protocol.
              </span>
              <div className={styles.publishBootstrapActions}>
                <ClickSpark disabled={!m} sparkColor="rgba(255,255,255,0.9)" sparkSize={10} sparkRadius={12}>
                  <button
                    type="button"
                    className={styles.publishBootstrapButton}
                    onClick={() => void handleCopyFullProtocol()}
                  >
                    COPY FULL PUBLISH PROTOCOL
                  </button>
                </ClickSpark>
              </div>
            </div>
            <div className={styles.publishPromptRow}>
              <input
                className={styles.publishRepoInput}
                placeholder="GitHub repo (owner/repo or URL)"
                value={claimRepo}
                onChange={(e) => setClaimRepo(e.target.value)}
                disabled={claimLoading}
              />
              <ClickSpark
                disabled={
                  !m ||
                  claimLoading ||
                  !claimRepo.trim() ||
                  (captchaRequired && !captchaToken)
                }
                sparkColor="rgba(10,37,144,0.95)"
                sparkSize={10}
                sparkRadius={12}
              >
                <button
                  className={styles.publishRepoButton}
                  onClick={() => void handleStartClaim()}
                  disabled={claimLoading || !claimRepo.trim() || (captchaRequired && !captchaToken)}
                >
                  {claimLoading ? 'GENERATING...' : 'GENERATE PROMPT'}
                </button>
              </ClickSpark>
            </div>

            {captchaRequired && (
              <div className={styles.captchaWrap}>
                <TurnstileWidget
                  key={captchaNonce}
                  siteKey={turnstileSiteKey!}
                  theme="dark"
                  onToken={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                />
                <span className={styles.captchaHint}>Human verification required</span>
              </div>
            )}

            {claimError && <div className={styles.publishPromptError}>{claimError}</div>}

            {claimResult && (
              <div className={styles.publishPromptFooter}>
                <ClickSpark disabled={!m} sparkColor="rgba(255,255,255,0.9)" sparkSize={10} sparkRadius={12}>
                  <button
                    className={styles.publishCopyButton}
                    onClick={() => void handleCopyPublishPrompt()}
                  >
                    COPY PUBLISH PROMPT
                  </button>
                </ClickSpark>
                <span className={styles.publishExpires}>
                  Expires: {new Date(claimResult.expiresAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </motion.div>

        </motion.div>

        <HeroLayoutDebugHud
          enabled={debugHudEnabled}
          refs={debugHudRefs}
          heroIsoTuning={heroIsoTuning}
          defaultHeroIsoTuning={defaultHeroIsoTuning}
          setHeroIsoTuning={setHeroIsoTuning}
        />

        {/* ── Deco line — draw from left ────────────────────────── */}
        <motion.div
          className={styles.decoLine}
          initial={m ? { scaleX: 0, opacity: 0 } : undefined}
          whileInView={m ? { scaleX: 1, opacity: 1 } : undefined}
          transition={{ duration: 0.8, ease: [...easeCurve] }}
          viewport={scrollViewports.once}
          style={{ transformOrigin: 'left center' }}
        />

        <motion.div
          className={styles.sectionHeader}
          initial={m ? { opacity: 0, y: 20 } : undefined}
          whileInView={m ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.5, ease: [...easeCurve] }}
          viewport={scrollViewports.once}
        >
          <span className={styles.sectionTitle}>RECENT BUNDLES</span>
          <motion.div whileHover={m ? { scale: 1.03 } : undefined} whileTap={m ? { scale: 0.97 } : undefined}>
            <Link to="/browse" className={styles.browseAllLink}>
              BROWSE ALL
            </Link>
          </motion.div>
        </motion.div>

        {loadingRecent && (
          <div className={styles.statePanel}>Loading recent bundles...</div>
        )}

        {!loadingRecent && recentBundles.length === 0 && (
          <div className={styles.statePanel}>No bundles yet.</div>
        )}

        {!loadingRecent && recentBundles.length > 0 && (
          <motion.div
            className={styles.bundleGrid}
            variants={m ? staggerGrid : undefined}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewports.once}
          >
            {recentBundles.map((b) => (
              <motion.div key={b.id} variants={m ? staggerItem : undefined}>
                <BundleCard bundle={b} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {toast && (
          <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  )
}

function HeroLayoutDebugHud({
  enabled,
  refs,
  heroIsoTuning,
  defaultHeroIsoTuning,
  setHeroIsoTuning,
}: {
  enabled: boolean
  refs: Array<{ label: string; ref: RefObject<HTMLElement | null> }>
  heroIsoTuning: {
    widthPx: number
    widthPct: number
    x: number
    y: number
    scale: number
    floatAmp: number
    floatDur: number
  }
  defaultHeroIsoTuning: {
    widthPx: number
    widthPct: number
    x: number
    y: number
    scale: number
    floatAmp: number
    floatDur: number
  }
  setHeroIsoTuning: (next: (prev: typeof heroIsoTuning) => typeof heroIsoTuning) => void
}) {
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    const round = (value: number) => Math.round(value * 10) / 10

    const build = () => {
      const out: Record<string, unknown> = {
        viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
        tuning: heroIsoTuning,
      }

      for (const t of refs) {
        const el = t.ref.current
        if (!el) {
          out[t.label] = null
          continue
        }

        const r = el.getBoundingClientRect()
        const cs = window.getComputedStyle(el)
        out[t.label] = {
          rect: {
            x: round(r.x),
            y: round(r.y),
            w: round(r.width),
            h: round(r.height),
            top: round(r.top),
            left: round(r.left),
            right: round(r.right),
            bottom: round(r.bottom),
          },
          computed: {
            transform: cs.transform,
            width: cs.width,
            height: cs.height,
            maxWidth: cs.maxWidth,
            maxHeight: cs.maxHeight,
          },
        }
      }

      setSnapshot(out)
    }

    build()
    const interval = window.setInterval(build, 200)
    window.addEventListener('resize', build)
    window.addEventListener('scroll', build, true)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('resize', build)
      window.removeEventListener('scroll', build, true)
    }
  }, [enabled, refs, heroIsoTuning])

  if (!enabled) return null

  const setNumber = (key: keyof typeof heroIsoTuning, value: number) => {
    setHeroIsoTuning((prev) => ({ ...prev, [key]: value }))
  }

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
    } catch {
      // ignore
    }
  }

  const copyTuning = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(heroIsoTuning, null, 2))
    } catch {
      // ignore
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 14,
        bottom: 14,
        zIndex: 9999,
        width: 360,
        maxWidth: 'calc(100vw - 28px)',
        padding: 10,
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'rgba(0,0,0,0.62)',
        color: 'rgba(255,255,255,0.9)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        lineHeight: 1.35,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>Layout Debug</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={copyTuning}
            style={{
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              padding: '4px 8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
            }}
          >
            Copy tuning
          </button>
          <button
            type="button"
            onClick={() => setHeroIsoTuning(() => ({ ...defaultHeroIsoTuning }))}
            style={{
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.92)',
              padding: '4px 8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={copy}
            style={{
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              padding: '4px 8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
            }}
          >
            Copy
          </button>
        </div>
      </div>
      <div style={{ opacity: 0.72, marginTop: 6 }}>Toggle: Shift+D or add `?debug=1`</div>

      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ marginBottom: 6 }}>Hero ISO Controls</div>

        <label style={{ display: 'block', marginBottom: 8 }}>
          widthPx: {heroIsoTuning.widthPx}
          <input
            type="range"
            min={280}
            max={900}
            step={1}
            value={heroIsoTuning.widthPx}
            onChange={(e) => setNumber('widthPx', clamp(Number(e.target.value), 280, 900))}
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          widthPct: {heroIsoTuning.widthPct}
          <input
            type="range"
            min={40}
            max={100}
            step={1}
            value={heroIsoTuning.widthPct}
            onChange={(e) => setNumber('widthPct', clamp(Number(e.target.value), 40, 100))}
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          x: {heroIsoTuning.x}
          <input
            type="range"
            min={-220}
            max={220}
            step={1}
            value={heroIsoTuning.x}
            onChange={(e) => setNumber('x', clamp(Number(e.target.value), -220, 220))}
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          y: {heroIsoTuning.y}
          <input
            type="range"
            min={-220}
            max={220}
            step={1}
            value={heroIsoTuning.y}
            onChange={(e) => setNumber('y', clamp(Number(e.target.value), -220, 220))}
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          scale: {heroIsoTuning.scale.toFixed(3)}
          <input
            type="range"
            min={0.8}
            max={1.2}
            step={0.001}
            value={heroIsoTuning.scale}
            onChange={(e) => setNumber('scale', clamp(Number(e.target.value), 0.8, 1.2))}
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          floatAmp(px): {heroIsoTuning.floatAmp}
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={heroIsoTuning.floatAmp}
            onChange={(e) => setNumber('floatAmp', clamp(Number(e.target.value), 0, 10))}
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 0 }}>
          floatDur(s): {heroIsoTuning.floatDur.toFixed(1)}
          <input
            type="range"
            min={4}
            max={14}
            step={0.1}
            value={heroIsoTuning.floatDur}
            onChange={(e) => setNumber('floatDur', clamp(Number(e.target.value), 4, 14))}
            style={{ width: '100%' }}
          />
        </label>
      </div>

      <pre style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>
        {snapshot ? JSON.stringify(snapshot, null, 2) : '...'}
      </pre>
    </div>
  )
}
