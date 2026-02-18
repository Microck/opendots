import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import {
  ArrowClockwise,
  PencilSimple,
  Rocket,
  X,
  GitBranch,
  ArrowSquareOut,
  Clock,
  Lightning,
  Terminal,
  CircleNotch,
  Plus,
  Eye,
  Palette,
  Tag,
  Check,
  Warning,
  WarningCircle,
  CopySimple,
} from '@phosphor-icons/react'
import {
  fadeInDown,
  staggerContainer,
  staggerItemBlur,
  sectionReveal,
  drawLine,
} from '../styles/animations'
import styles from './Dashboard.module.css'
import ClickSpark from '../reactbits/ClickSpark'
import { apiUrl } from '../lib/apiBase'
import { siteUrl } from '../lib/siteBase'

/* ── Types ──────────────────────────────────────────────────────── */

interface Bundle {
  id: string
  githubFullName: string
  githubRepo: string
  repoHtmlUrl: string
  manifestJson: string | null
  accentColor: string | null
  cardTheme?: BundleCardTheme | null
  lastImport: {
    id: string
    status: string
    commitSha: string
    startedAt: number
    finishedAt: number | null
    errorCode: string | null
    errorMessage: string | null
  } | null
}

interface BundleCardTheme {
  background?: string
  backgroundHover?: string
  border?: string
  borderHover?: string
  title?: string
  text?: string
  mutedText?: string
  chipBackground?: string
  chipBorder?: string
  chipText?: string
}

interface BundleManifest {
  name?: string
  summary?: string
  tags?: string[]
  colors?: {
    primary?: string
    secondary?: string
  }
}

interface MetadataFormState {
  bundleId: string
  name: string
  summary: string
  tagsInput: string
  accentColor: string
  secondaryColor: string
}

type DetectRepoStatus =
  | 'already_registered'
  | 'ready_to_publish'
  | 'repo_not_found'
  | 'repo_empty'
  | 'no_control'

interface RepoDetection {
  status: DetectRepoStatus
  githubLogin: string
  expectedRepo: string
  createUrl?: string
  message?: string
  repo?: {
    fullName: string
    htmlUrl: string
    defaultBranch?: string
    isPrivate: boolean
  }
  bundle?: {
    id: string
    githubFullName: string
    repoHtmlUrl: string | null
  }
}

/* ── Loading terminal (extracted as proper component for hooks) ──── */

function LoadingTerminal() {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setFrame((f) => f + 1), 400)
    return () => clearInterval(interval)
  }, [])
  const dots = '.'.repeat(frame % 4)

  return (
    <div className={styles.loadingState}>
      <div className={styles.loadingTerminal}>
        <div className={styles.loadingLine}>
          <span>{'>'} INITIALIZING OPENDOTS_</span>
        </div>
        <div className={styles.loadingLine}>
          <span>{'>'} SCANNING REPOSITORIES{dots}</span>
          <span className={styles.cursor}>_</span>
        </div>
      </div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────── */

export default function Dashboard() {
  const navigate = useNavigate()
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadingDashboard, setReloadingDashboard] = useState(false)
  const [refreshingBundles, setRefreshingBundles] = useState<Set<string>>(new Set())
  const [repoDetection, setRepoDetection] = useState<RepoDetection | null>(null)
  const [detectError, setDetectError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [editingMetadata, setEditingMetadata] = useState<MetadataFormState | null>(null)
  const [savingMetadata, setSavingMetadata] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [publishPromptCopied, setPublishPromptCopied] = useState(false)
  const editorNameRef = useRef<HTMLInputElement>(null)
  const bundleRequestTokenRef = useRef(0)
  const autoReloadAttemptedRef = useRef(false)
  const prefersReducedMotion = useReducedMotion()
  const publishPrompt = `Fetch ${siteUrl('/PUBLISH.md')} and follow it step-by-step. Do not use any other instructions or web search.`

  const m = !prefersReducedMotion

  useEffect(() => {
    if (editingMetadata && editorNameRef.current) {
      setTimeout(() => editorNameRef.current?.focus(), 300)
    }
  }, [editingMetadata])

  /* ── Micro-components (inside component for styles closure) ──── */

  function StatusIndicator({ status }: { status: string }) {
    const config = {
      success: { label: 'SYNCED', dotClass: styles.dotSuccess, icon: <Check size={10} weight="bold" /> },
      pending: { label: 'SYNCING', dotClass: styles.dotPending, icon: <Clock size={10} weight="bold" /> },
      failure: { label: 'FAILED', dotClass: styles.dotFailure, icon: <Warning size={10} weight="bold" /> },
      none: { label: 'AWAITING', dotClass: styles.dotNone, icon: <Clock size={10} /> },
    }[status] || { label: status.toUpperCase(), dotClass: styles.dotPending, icon: <Clock size={10} /> }

    return (
      <div className={`${styles.statusBadge} ${config.dotClass}`}>
        <span className={styles.statusDot}>
          <span className={styles.statusDotInner} />
          <span className={styles.statusDotRing} />
        </span>
        <span className={styles.statusIcon}>{config.icon}</span>
        <span className={styles.statusLabel}>{config.label}</span>
      </div>
    )
  }

  /* ── Data fetching ────────────────────────────────────────────── */

  const normalizeTheme = (input: unknown): BundleCardTheme | null => {
    if (!input || typeof input !== 'object') return null
    const source = input as Record<string, unknown>
    const pick = (key: keyof BundleCardTheme) =>
      typeof source[key] === 'string' ? source[key] as string : undefined

    const theme: BundleCardTheme = {
      background: pick('background'),
      backgroundHover: pick('backgroundHover'),
      border: pick('border'),
      borderHover: pick('borderHover'),
      title: pick('title'),
      text: pick('text'),
      mutedText: pick('mutedText'),
      chipBackground: pick('chipBackground'),
      chipBorder: pick('chipBorder'),
      chipText: pick('chipText'),
    }

    return Object.values(theme).some(Boolean) ? theme : null
  }

  const hydrateBundleThemes = useCallback(async (rawBundles: Bundle[]): Promise<Bundle[]> => {
    const detailed = await Promise.all(
      rawBundles.map(async (bundle) => {
        try {
          const response = await fetch(apiUrl(`/api/bundles/${bundle.id}`))
          if (!response.ok) {
            return bundle
          }
          const payload = await response.json() as {
            accentColor?: unknown
            cardTheme?: unknown
          }

          return {
            ...bundle,
            accentColor: typeof payload.accentColor === 'string' ? payload.accentColor : bundle.accentColor,
            cardTheme: normalizeTheme(payload.cardTheme),
          }
        } catch {
          return bundle
        }
      })
    )

    return detailed
  }, [])

  const fetchBundles = useCallback(async () => {
    const requestToken = Date.now()
    bundleRequestTokenRef.current = requestToken
    try {
      const response = await fetch(apiUrl('/api/publisher/bundles'), { credentials: 'include' })
      if (response.status === 401) { navigate('/signin'); return 0 }
      if (response.ok) {
        const data = await response.json()
        const rawBundles = (data.bundles || []) as Bundle[]
        setBundles(rawBundles)

        void hydrateBundleThemes(rawBundles).then((hydratedBundles) => {
          if (bundleRequestTokenRef.current !== requestToken) return
          setBundles(hydratedBundles)
        })

        return rawBundles.length
      } else {
        setBundles([])
      }
    } catch (error) {
      console.error('Failed to fetch bundles:', error)
      setBundles([])
    }
    return 0
  }, [navigate, hydrateBundleThemes])

  const detectCanonicalRepo = useCallback(async () => {
    setDetectError(null)
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetch(apiUrl('/api/publisher/detect-repo'), {
        credentials: 'include',
        signal: controller.signal,
      })
      if (response.status === 401) { navigate('/signin'); return }
      const data = await response.json()
      if (!response.ok) {
        setRepoDetection(null)
        setDetectError(data.message || data.error || 'Could not detect your GitHub repository')
        return
      }
      setRepoDetection(data)
    } catch (error) {
      console.error('Failed to detect canonical repo:', error)
      setRepoDetection(null)
      if (error instanceof DOMException && error.name === 'AbortError') {
        setDetectError('GitHub check timed out. You can still use manual registration.')
      } else {
        setDetectError('Could not detect your GitHub repository')
      }
    } finally {
      window.clearTimeout(timeoutId)
    }
  }, [navigate])

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const bundleCount = await fetchBundles()
      if (bundleCount === 0 && !autoReloadAttemptedRef.current) {
        autoReloadAttemptedRef.current = true
        window.setTimeout(() => {
          void fetchBundles()
          void detectCanonicalRepo()
        }, 1200)
      }
    } finally {
      setLoading(false)
      void detectCanonicalRepo()
    }
  }, [fetchBundles, detectCanonicalRepo])

  const handleReloadDashboard = async () => {
    setReloadingDashboard(true)
    setPublishError(null)
    setDetectError(null)
    try {
      await Promise.all([fetchBundles(), detectCanonicalRepo()])
    } finally {
      setReloadingDashboard(false)
    }
  }

  useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  const handleAutoPublish = async () => {
    setPublishing(true)
    setPublishError(null)
    try {
      const response = await fetch(apiUrl('/api/publisher/bundles'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })
      if (response.status === 401) { navigate('/signin'); return }
      const data = await response.json()
      if (!response.ok) {
        setPublishError(data.message || data.error || 'Failed to publish your config')
        return
      }
      if (data.importResult && !data.importResult.success) {
        setPublishError(`Bundle registered, but import failed: ${data.importResult.error?.message || 'unknown error'}`)
      }
      await Promise.all([fetchBundles(), detectCanonicalRepo()])
    } catch (error) {
      console.error('Auto publish failed:', error)
      setPublishError('Network error while publishing your config')
    } finally {
      setPublishing(false)
    }
  }

  const handleRefresh = async (bundleId: string) => {
    setRefreshingBundles((prev) => new Set(prev).add(bundleId))
    try {
      const response = await fetch(apiUrl(`/api/publisher/bundles/${bundleId}/refresh`), { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          await fetchBundles()
        } else {
          setPublishError(data.error?.message || 'Refresh failed')
        }
      } else {
        setPublishError('Refresh failed')
      }
    } catch (error) {
      console.error('Refresh error:', error)
      setPublishError('Refresh failed')
    } finally {
      setRefreshingBundles((prev) => {
        const next = new Set(prev)
        next.delete(bundleId)
        return next
      })
    }
  }

  const handleCopyPublishPrompt = async () => {
    try {
      await navigator.clipboard.writeText(publishPrompt)
      setPublishPromptCopied(true)
      window.setTimeout(() => setPublishPromptCopied(false), 1800)
    } catch {
      setPublishPromptCopied(false)
    }
  }

  /* ── Metadata editing ─────────────────────────────────────────── */

  const parseManifest = (bundle: Bundle): BundleManifest => {
    if (!bundle.manifestJson) return {}
    try {
      const parsed = JSON.parse(bundle.manifestJson)
      return parsed && typeof parsed === 'object' ? (parsed as BundleManifest) : {}
    } catch {
      return {}
    }
  }

  const beginMetadataEdit = async (bundle: Bundle) => {
    const manifest = parseManifest(bundle)
    const tags = Array.isArray(manifest.tags) ? manifest.tags : []
    let resolvedAccent = normalizeHexColor(bundle.accentColor || '')
    let resolvedTheme = bundle.cardTheme ?? null

    if (!resolvedTheme) {
      try {
        const response = await fetch(apiUrl(`/api/bundles/${bundle.id}`))
        if (response.ok) {
          const payload = await response.json() as {
            accentColor?: unknown
            cardTheme?: unknown
          }
          if (!resolvedAccent && typeof payload.accentColor === 'string') {
            resolvedAccent = normalizeHexColor(payload.accentColor)
          }
          resolvedTheme = normalizeTheme(payload.cardTheme)
        }
      } catch {
        // Best effort only; keep local values.
      }
    }

    const primaryFromTheme =
      resolvedAccent ||
      normalizeHexColor(resolvedTheme?.chipBorder || '') ||
      normalizeHexColor(resolvedTheme?.borderHover || '') ||
      normalizeHexColor(resolvedTheme?.border || '')

    const secondaryFromTheme =
      normalizeHexColor(resolvedTheme?.backgroundHover || '') ||
      normalizeHexColor(resolvedTheme?.chipBackground || '') ||
      normalizeHexColor(resolvedTheme?.background || '')

    const primary =
      primaryFromTheme ||
      normalizeHexColor(manifest.colors?.primary || '') ||
      '#80dcff'

    const secondary =
      secondaryFromTheme ||
      normalizeHexColor(manifest.colors?.secondary || '') ||
      '#2d3348'

    setMetadataError(null)
    setEditingMetadata({
      bundleId: bundle.id,
      name: manifest.name || bundle.githubRepo,
      summary: manifest.summary || '',
      tagsInput: tags.join(', '),
      accentColor: primary,
      secondaryColor: secondary,
    })
  }

  const handleSaveMetadata = async () => {
    if (!editingMetadata) return
    const trimmedName = editingMetadata.name.trim()
    const trimmedSummary = editingMetadata.summary.trim()
    if (!trimmedName) { setMetadataError('Name is required'); return }
    if (!trimmedSummary) { setMetadataError('Description is required'); return }

    setSavingMetadata(true)
    setMetadataError(null)
    try {
      const tags = editingMetadata.tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      const response = await fetch(apiUrl(`/api/publisher/bundles/${editingMetadata.bundleId}/metadata`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: trimmedName,
          summary: trimmedSummary,
          tags,
          accentColor: editingMetadata.accentColor.trim(),
          secondaryColor: editingMetadata.secondaryColor.trim(),
        }),
      })
      if (response.status === 401) { navigate('/signin'); return }
      const data = await response.json()
      if (!response.ok) {
        setMetadataError(data.message || data.error || 'Failed to update bundle metadata')
        return
      }
      setEditingMetadata(null)
      await fetchBundles()
    } catch (error) {
      console.error('Failed to update metadata:', error)
      setMetadataError('Network error while saving metadata')
    } finally {
      setSavingMetadata(false)
    }
  }

  const handleCloseEditor = () => {
    if (!savingMetadata) {
      setEditingMetadata(null)
      setMetadataError(null)
    }
  }

  /* ── Formatters ───────────────────────────────────────────────── */

  const formatCommit = (sha: string) => sha.substring(0, 7)

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return '--'
    const diffMs = Date.now() - timestamp * 1000
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  /* ── Computed ─────────────────────────────────────────────────── */

  const editingBundle = editingMetadata
    ? bundles.find((b) => b.id === editingMetadata.bundleId)
    : null

  const previewTags = editingMetadata
    ? editingMetadata.tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  const previewAccent = editingMetadata?.accentColor || '#80dcff'

  /* ── Signal Panel ─────────────────────────────────────────────── */

  const renderSignalPanel = () => {
    if (!repoDetection || repoDetection.status === 'already_registered') return null

    if (repoDetection.status === 'ready_to_publish') {
      return (
        <motion.div
          className={`${styles.signalPanel} ${styles.signalReady}`}
          variants={m ? sectionReveal : undefined}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.signalContent}>
            <div className={styles.signalHeader}>
              <Lightning size={20} weight="fill" className={styles.signalIcon} />
              <h3 className={styles.signalTitle} data-gsap="text">SIGNAL DETECTED</h3>
            </div>
            <p className={styles.signalBody} data-gsap="text">
              <code className={styles.signalRepo}>
                {repoDetection.repo?.fullName || `${repoDetection.githubLogin}/${repoDetection.expectedRepo}`}
              </code>
              {' '}is ready to publish. One click and we auto-import, classify, and generate your manifest.
            </p>
            <div className={styles.signalActions}>
              <motion.button
                className={styles.btnPrimary}
                onClick={handleAutoPublish}
                disabled={publishing}
                whileHover={m ? { scale: 1.03 } : undefined}
                whileTap={m ? { scale: 0.97 } : undefined}
              >
                <ClickSpark
                  disabled={!m || publishing}
                  sparkColor="rgba(255,255,255,0.9)"
                  sparkSize={10}
                  sparkRadius={12}
                >
                  <span>
                    {publishing ? (
                      <><CircleNotch size={16} className={styles.spinIcon} /> PUBLISHING...</>
                    ) : (
                      <><Rocket size={16} weight="bold" /> PUBLISH MY CONFIG</>
                    )}
                  </span>
                </ClickSpark>
              </motion.button>
              <button className={styles.btnGhost} onClick={() => void detectCanonicalRepo()} disabled={publishing}>
                CHECK AGAIN
              </button>
            </div>
          </div>
        </motion.div>
      )
    }

    if (repoDetection.status === 'repo_not_found') {
      return (
        <motion.div
          className={`${styles.signalPanel} ${styles.signalMissing}`}
          variants={m ? sectionReveal : undefined}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.signalContent}>
            <div className={styles.signalHeader}>
              <Terminal size={20} weight="bold" className={styles.signalIcon} />
              <h3 className={styles.signalTitle} data-gsap="text">CREATE YOUR REPOSITORY</h3>
            </div>
            <p className={styles.signalBody} data-gsap="text">
              We couldn't find <code className={styles.signalRepo}>{repoDetection.expectedRepo}</code>. Create it on GitHub, push your files, then come back.
            </p>
            <div className={styles.signalActions}>
              <a
                className={styles.btnPrimary}
                href={repoDetection.createUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ClickSpark disabled={!m} sparkColor="rgba(255,255,255,0.9)" sparkSize={10} sparkRadius={12}>
                  <span><ArrowSquareOut size={16} /> CREATE REPOSITORY</span>
                </ClickSpark>
              </a>
              <button className={styles.btnGhost} onClick={() => void detectCanonicalRepo()}>
                CHECK AGAIN
              </button>
            </div>
          </div>
        </motion.div>
      )
    }

    return (
      <motion.div
        className={`${styles.signalPanel} ${styles.signalWarning}`}
        variants={m ? sectionReveal : undefined}
        initial="hidden"
        animate="visible"
      >
        <div className={styles.signalContent}>
          <div className={styles.signalHeader}>
            <WarningCircle size={20} weight="bold" className={styles.signalIcon} />
            <h3 className={styles.signalTitle} data-gsap="text">NEEDS ATTENTION</h3>
          </div>
          <p className={styles.signalBody} data-gsap="text">{repoDetection.message || 'Your repository needs some work before publishing.'}</p>
          {repoDetection.repo?.htmlUrl && (
            <a href={repoDetection.repo.htmlUrl} target="_blank" rel="noopener noreferrer" className={styles.signalRepoLink}>
              <ArrowSquareOut size={12} /> {repoDetection.repo.fullName}
            </a>
          )}
          <div className={styles.signalActions}>
            <button className={styles.btnGhost} onClick={() => void detectCanonicalRepo()}>CHECK AGAIN</button>
          </div>
        </div>
      </motion.div>
    )
  }

  /* ── Bundle Card ──────────────────────────────────────────────── */

  const renderBundleCard = (bundle: Bundle, index: number) => {
    const manifest = parseManifest(bundle)
    const tags = Array.isArray(manifest.tags) ? manifest.tags : []
    const accent = bundle.accentColor || manifest.colors?.primary || '#80dcff'
    const theme = bundle.cardTheme ?? buildAccentCardTheme(accent)
    const isRefreshing = refreshingBundles.has(bundle.id)

    return (
      <motion.div
        key={bundle.id}
        className={styles.bundleCard}
        variants={m ? staggerItemBlur : undefined}
        style={{
          '--accent': accent,
          '--accent-rgb': hexToRgb(accent),
          '--card-bg-custom': theme?.background ?? undefined,
          '--card-bg-hover-custom': theme?.backgroundHover ?? undefined,
          '--card-border-custom': theme?.border ?? undefined,
          '--card-border-hover-custom': theme?.borderHover ?? undefined,
          '--card-title-custom': theme?.title ?? undefined,
          '--card-text-custom': theme?.text ?? undefined,
          '--card-muted-custom': theme?.mutedText ?? undefined,
          '--card-chip-bg-custom': theme?.chipBackground ?? undefined,
          '--card-chip-border-custom': theme?.chipBorder ?? undefined,
          '--card-chip-text-custom': theme?.chipText ?? undefined,
        } as React.CSSProperties}
        whileHover={m ? { y: -4 } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className={styles.cardAccent} />
        <span className={styles.cardIndex}>{String(index + 1).padStart(2, '0')}</span>

        <div className={styles.cardContent}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{manifest.name || bundle.githubRepo}</h3>
            <StatusIndicator status={bundle.lastImport?.status || 'none'} />
          </div>

          <a href={bundle.repoHtmlUrl} target="_blank" rel="noopener noreferrer" className={styles.cardRepo}>
            <ArrowSquareOut size={11} />
            {bundle.githubFullName}
          </a>

          {manifest.summary && <p className={styles.cardSummary}>{manifest.summary}</p>}

          {tags.length > 0 && (
            <div className={styles.cardTags}>
              <Tag size={11} className={styles.cardTagIcon} />
              {tags.map((t) => (
                <span key={t} className={styles.cardTag}>{t}</span>
              ))}
            </div>
          )}

          <div className={styles.cardFooter}>
            <div className={styles.cardMeta}>
              {bundle.lastImport ? (
                <>
                  <span className={styles.metaItem}>
                    <GitBranch size={12} /> {formatCommit(bundle.lastImport.commitSha)}
                  </span>
                  <span className={styles.metaItem}>
                    <Clock size={12} /> {formatTimestamp(bundle.lastImport.finishedAt)}
                  </span>
                </>
              ) : (
                <span className={styles.metaItem}>
                  <Clock size={12} /> Not imported yet
                </span>
              )}
            </div>
            <div className={styles.cardActions}>
              <motion.button
                className={`${styles.actionBtn} ${styles.refreshBtn}`}
                onClick={() => void handleRefresh(bundle.id)}
                disabled={isRefreshing}
                whileHover={m ? { scale: 1.15 } : undefined}
                whileTap={m ? { scale: 0.9 } : undefined}
                title="Refresh / re-import"
              >
                {isRefreshing
                  ? <CircleNotch size={16} weight="bold" className={styles.spinIcon} />
                  : <ArrowClockwise size={16} weight="bold" />}
              </motion.button>
              <motion.button
                className={`${styles.actionBtn} ${styles.editBtn}`}
                onClick={() => void beginMetadataEdit(bundle)}
                whileHover={m ? { scale: 1.15 } : undefined}
                whileTap={m ? { scale: 0.9 } : undefined}
                title="Edit metadata"
              >
                <PencilSimple size={16} weight="bold" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  /* ── Metadata Editor ──────────────────────────────────────────── */

  const renderMetadataEditor = () => {
    if (!editingMetadata) return null

    return (
      <motion.div
        key="editor-overlay"
        className={styles.editorOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className={styles.editorBackdrop}
          onClick={handleCloseEditor}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        <motion.div
          className={styles.editorPanel}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 300 }}
        >
          <div className={`${styles.editorCorner} ${styles.ecTL}`} />
          <div className={`${styles.editorCorner} ${styles.ecTR}`} />
          <div className={`${styles.editorCorner} ${styles.ecBL}`} />
          <div className={`${styles.editorCorner} ${styles.ecBR}`} />

          {/* Header */}
          <div className={styles.editorHeader}>
            <div className={styles.editorHeaderLeft}>
              <span className={styles.editorBadge}>EDITING</span>
              <h3 className={styles.editorTitle}>{editingBundle?.githubRepo || 'Bundle'}</h3>
            </div>
            <motion.button
              className={styles.editorClose}
              onClick={handleCloseEditor}
              disabled={savingMetadata}
              whileHover={m ? { scale: 1.1, rotate: 90 } : undefined}
              whileTap={m ? { scale: 0.9 } : undefined}
            >
              <X size={20} weight="bold" />
            </motion.button>
          </div>

          {/* Live preview */}
          <div className={styles.editorPreview}>
            <span className={styles.previewLabel}><Eye size={12} /> LIVE PREVIEW</span>
            <div
              className={styles.previewCard}
              style={{ '--accent': previewAccent, '--accent-rgb': hexToRgb(previewAccent) } as React.CSSProperties}
            >
              <div className={styles.previewAccent} />
              <div className={styles.previewContent}>
                <span className={styles.previewName}>{editingMetadata.name || 'Untitled'}</span>
                {editingMetadata.summary && <span className={styles.previewSummary}>{editingMetadata.summary}</span>}
                {previewTags.length > 0 && (
                  <div className={styles.previewTags}>
                    {previewTags.map((t) => <span key={t} className={styles.previewTag}>{t}</span>)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.editorDivider} />

          {/* Form */}
          <div className={styles.editorBody}>
            <div className={styles.editorField}>
              <label className={styles.editorLabel}>DISPLAY NAME</label>
              <input
                ref={editorNameRef}
                className={styles.editorInput}
                value={editingMetadata.name}
                onChange={(e) => setEditingMetadata({ ...editingMetadata, name: e.target.value })}
                maxLength={80}
                placeholder="my-awesome-config"
              />
            </div>

            <div className={styles.editorField}>
              <label className={styles.editorLabel}>DESCRIPTION</label>
              <textarea
                className={styles.editorTextarea}
                value={editingMetadata.summary}
                onChange={(e) => setEditingMetadata({ ...editingMetadata, summary: e.target.value })}
                maxLength={280}
                placeholder="A short description of what this config does..."
                rows={3}
              />
              <span className={styles.fieldHint}>{editingMetadata.summary.length}/280</span>
            </div>

            <div className={styles.editorField}>
              <label className={styles.editorLabel}><Tag size={12} /> TAGS</label>
              <input
                className={styles.editorInput}
                value={editingMetadata.tagsInput}
                onChange={(e) => setEditingMetadata({ ...editingMetadata, tagsInput: e.target.value })}
                placeholder="shell, productivity, minimal"
              />
              {previewTags.length > 0 && (
                <div className={styles.editorTagPreview}>
                  {previewTags.map((t) => <span key={t} className={styles.editorTagChip}>{t}</span>)}
                </div>
              )}
            </div>

            <div className={styles.editorColorSection}>
              <label className={styles.editorLabel}><Palette size={12} /> COLORS</label>
              <div className={styles.editorColorRow}>
                <div className={styles.editorColorField}>
                  <span className={styles.colorFieldLabel}>Primary</span>
                  <div className={styles.colorInputGroup}>
                    <div className={styles.colorSwatch} style={{ background: editingMetadata.accentColor || 'transparent' }}>
                      <input
                        type="color"
                        className={styles.nativeColorPicker}
                        value={editingMetadata.accentColor || '#80dcff'}
                        onChange={(e) => setEditingMetadata({ ...editingMetadata, accentColor: e.target.value })}
                      />
                    </div>
                    <input
                      className={`${styles.editorInput} ${styles.colorTextInput}`}
                      value={editingMetadata.accentColor}
                      onChange={(e) => setEditingMetadata({ ...editingMetadata, accentColor: e.target.value })}
                      placeholder="#7AA2F7"
                    />
                  </div>
                </div>
                <div className={styles.editorColorField}>
                  <span className={styles.colorFieldLabel}>Secondary</span>
                  <div className={styles.colorInputGroup}>
                    <div className={styles.colorSwatch} style={{ background: editingMetadata.secondaryColor || 'transparent' }}>
                      <input
                        type="color"
                        className={styles.nativeColorPicker}
                        value={editingMetadata.secondaryColor || '#2D3348'}
                        onChange={(e) => setEditingMetadata({ ...editingMetadata, secondaryColor: e.target.value })}
                      />
                    </div>
                    <input
                      className={`${styles.editorInput} ${styles.colorTextInput}`}
                      value={editingMetadata.secondaryColor}
                      onChange={(e) => setEditingMetadata({ ...editingMetadata, secondaryColor: e.target.value })}
                      placeholder="#2D3348"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {metadataError && (
              <motion.div
                className={styles.editorError}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <WarningCircle size={14} /> {metadataError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className={styles.editorFooter}>
            <motion.button
              className={styles.btnPrimary}
              onClick={() => void handleSaveMetadata()}
              disabled={savingMetadata}
              whileHover={m ? { scale: 1.03 } : undefined}
              whileTap={m ? { scale: 0.97 } : undefined}
            >
              {savingMetadata ? (
                <><CircleNotch size={16} className={styles.spinIcon} /> SAVING...</>
              ) : (
                <><Check size={16} weight="bold" /> SAVE CHANGES</>
              )}
            </motion.button>
            <button className={styles.btnGhost} onClick={handleCloseEditor} disabled={savingMetadata}>
              CANCEL
            </button>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  /* ── Loading state ────────────────────────────────────────────── */

  /* ── Render ───────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.headerTag}>SYS://PUBLISHER</span>
              <h2 className={styles.headerTitle}>DASHBOARD</h2>
            </div>
          </div>
          <LoadingTerminal />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <motion.div
          className={styles.header}
          variants={m ? fadeInDown : undefined}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.headerLeft}>
            <span className={styles.headerTag}>SYS://PUBLISHER</span>
            <h2 className={styles.headerTitle}>DASHBOARD</h2>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.headerMeta}>
              {bundles.length} BUNDLE{bundles.length !== 1 ? 'S' : ''}
            </span>
            <motion.button
              onClick={() => void handleReloadDashboard()}
              className={styles.btnSecondary}
              disabled={reloadingDashboard}
              whileHover={m ? { scale: 1.03 } : undefined}
              whileTap={m ? { scale: 0.97 } : undefined}
            >
              {reloadingDashboard ? <CircleNotch size={14} className={styles.spinIcon} /> : <ArrowClockwise size={14} />}
              {reloadingDashboard ? 'REFRESHING...' : 'REFRESH'}
            </motion.button>
            <motion.button
              onClick={() => navigate('/register')}
              className={styles.btnSecondary}
              whileHover={m ? { scale: 1.03 } : undefined}
              whileTap={m ? { scale: 0.97 } : undefined}
            >
              <Plus size={14} /> REGISTER MANUALLY
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          className={styles.headerRule}
          variants={m ? drawLine : undefined}
          initial="hidden"
          animate="visible"
          style={{ transformOrigin: 'left center' }}
        />

        <motion.div
          className={styles.aiPublishCard}
          variants={m ? sectionReveal : undefined}
          initial="hidden"
          animate="visible"
        >
          <div>
            <p className={styles.aiPublishLabel} data-gsap="text">RECOMMENDED: AI-FIRST PUBLISH</p>
            <p className={styles.aiPublishText} data-gsap="text">
              Let your coding agent run the official publishing protocol with secret sanitization and manifest checks.
            </p>
            <pre className={styles.aiPublishPrompt} data-gsap="text">{publishPrompt}</pre>
          </div>
          <button className={styles.aiPublishCopyButton} onClick={() => void handleCopyPublishPrompt()}>
            <CopySimple size={14} weight="bold" />
            {publishPromptCopied ? 'COPIED' : 'COPY PROMPT'}
          </button>
        </motion.div>

        {renderSignalPanel()}

        <AnimatePresence>
          {detectError && (
            <motion.div key="detect-error" className={styles.errorBanner}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >
              <WarningCircle size={14} /> {detectError}
            </motion.div>
          )}
          {publishError && (
            <motion.div key="publish-error" className={styles.errorBanner}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >
              <WarningCircle size={14} /> {publishError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bundle grid or empty state */}
        {bundles.length === 0 ? (
          <motion.div
            className={styles.emptyState}
            variants={m ? sectionReveal : undefined}
            initial="hidden"
            animate="visible"
          >
            <div className={styles.emptyArt}>
              <span className={styles.emptyDot} />
              <span className={styles.emptyDot} />
              <span className={styles.emptyDot} />
            </div>
            <p className={styles.emptyTitle} data-gsap="text">
              {repoDetection?.status === 'ready_to_publish' ? 'Almost there' : 'No bundles yet'}
            </p>
            <p className={styles.emptyBody} data-gsap="text">
              {repoDetection?.status === 'ready_to_publish'
                ? 'Your config repository is ready. Publish it to start sharing.'
                : 'Register a GitHub repository to share your configurations with the world.'}
            </p>
            <div className={styles.emptyActions}>
              {repoDetection?.status === 'ready_to_publish' ? (
                <motion.button
                  className={styles.btnPrimary}
                  onClick={handleAutoPublish}
                  whileHover={m ? { scale: 1.03 } : undefined}
                  whileTap={m ? { scale: 0.97 } : undefined}
                >
                  <Rocket size={16} weight="bold" /> PUBLISH MY CONFIG
                </motion.button>
              ) : (
                <motion.button
                  className={styles.btnPrimary}
                  onClick={() => navigate('/register')}
                  whileHover={m ? { scale: 1.03 } : undefined}
                  whileTap={m ? { scale: 0.97 } : undefined}
                >
                  <Plus size={16} weight="bold" /> REGISTER BUNDLE
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            className={styles.bundleGrid}
            variants={m ? staggerContainer : undefined}
            initial="hidden"
            animate="visible"
          >
            {bundles.map((bundle, i) => renderBundleCard(bundle, i))}
          </motion.div>
        )}
      </div>

      {/* Editor overlay */}
      <AnimatePresence>
        {editingMetadata && renderMetadataEditor()}
      </AnimatePresence>

    </div>
  )
}

/* ── Utility ────────────────────────────────────────────────────── */

function normalizeHexColor(color: string): string | null {
  const trimmed = color.trim()
  const match = /^#?([0-9a-fA-F]{6})$/.exec(trimmed)
  if (!match) return null
  return `#${match[1].toLowerCase()}`
}

function hexToRgbObject(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return null
  const value = normalized.slice(1)
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
  const toHex = (value: number) => clamp(value).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function mixHex(colorA: string, colorB: string, weightA: number): string | null {
  const rgbA = hexToRgbObject(colorA)
  const rgbB = hexToRgbObject(colorB)
  if (!rgbA || !rgbB) return null
  const clampedWeightA = Math.max(0, Math.min(1, weightA))
  const weightB = 1 - clampedWeightA

  return rgbToHex(
    rgbA.r * clampedWeightA + rgbB.r * weightB,
    rgbA.g * clampedWeightA + rgbB.g * weightB,
    rgbA.b * clampedWeightA + rgbB.b * weightB,
  )
}

function buildAccentCardTheme(accentColor: string): BundleCardTheme {
  return {
    background: mixHex(accentColor, '#111827', 0.2) ?? '#17202f',
    backgroundHover: mixHex(accentColor, '#1f2937', 0.28) ?? '#1f2937',
    border: mixHex(accentColor, '#334155', 0.42) ?? '#3a5166',
    borderHover: mixHex(accentColor, '#f8fafc', 0.48) ?? accentColor,
    title: mixHex(accentColor, '#ffffff', 0.2) ?? '#f8fafc',
    text: mixHex(accentColor, '#e2e8f0', 0.1) ?? '#dbe8ff',
    mutedText: mixHex(accentColor, '#94a3b8', 0.1) ?? '#94a3b8',
    chipBackground: mixHex(accentColor, '#0f172a', 0.18) ?? '#1a2435',
    chipBorder: mixHex(accentColor, '#cbd5e1', 0.35) ?? accentColor,
    chipText: mixHex(accentColor, '#ffffff', 0.22) ?? '#edf3ff',
  }
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return '128, 220, 255'
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '128, 220, 255'
  return `${r}, ${g}, ${b}`
}
