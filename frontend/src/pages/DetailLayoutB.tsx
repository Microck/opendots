import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  FolderSimple,
  Globe,
  ArrowSquareOut,
  ShieldCheck,
  Warning,
  Star,
  GitFork,
  Files,
  Clock,
  CalendarBlank,
  CopySimple,
} from '@phosphor-icons/react'
import CodeExplorer from '../components/CodeExplorer'
import {
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  staggerContainer,
  staggerFast,
  staggerItemBlur,
  sectionReveal,
  cardEntrance,
  drawLine,
  scrollViewports,
} from '../styles/animations'
import type { DetailLayoutProps } from './detailTypes'
import { buildThemedStyle, formatSize, formatDate, formatCount } from './detailTypes'
import styles from './DetailLayoutB.module.css'
import ClickSpark from '../reactbits/ClickSpark'
import { apiUrl } from '../lib/apiBase'
import { siteUrl } from '../lib/siteBase'
import useReactiveSurfaceVars from '../hooks/useReactiveSurfaceVars'

const CodeContentRenderer = lazy(() => import('../components/CodeContentRenderer'))
const OVERVIEW_MARKER_START = '<!-- OPENDOTS_AUTO_CONTENTS_START -->'
const OVERVIEW_MARKER_END = '<!-- OPENDOTS_AUTO_CONTENTS_END -->'
const OVERVIEW_PAGE_SIZE = 12

type OverviewTab = 'overview' | 'files'

interface OverviewResponse {
  readmePath: string
  source: 'markers' | 'contents' | 'full'
  markdown: string
}

interface OverviewItem {
  id: string
  name: string
  summary: string
}

interface OverviewSection {
  id: string
  title: string
  items: OverviewItem[]
}

function pickReadmePath(files: DetailLayoutProps['bundle']['fileIndex']): string | null {
  const normalized = files.map((file) => ({
    path: file.path,
    lowerPath: file.path.toLowerCase(),
  }))

  const exactRoot = normalized.find((file) => file.lowerPath === 'readme.md')
  if (exactRoot) {
    return exactRoot.path
  }

  const nestedReadmes = normalized
    .filter((file) => file.lowerPath.endsWith('/readme.md'))
    .sort((a, b) => a.path.length - b.path.length)

  return nestedReadmes[0]?.path ?? null
}

function extractOverviewSection(readmeContent: string): string | null {
  const markerStart = readmeContent.indexOf(OVERVIEW_MARKER_START)
  const markerEnd = readmeContent.indexOf(OVERVIEW_MARKER_END)
  if (markerStart >= 0 && markerEnd > markerStart) {
    const section = readmeContent
      .slice(markerStart + OVERVIEW_MARKER_START.length, markerEnd)
      .trim()

    if (section.length > 0) {
      return section
    }
  }

  const contentsMatch = readmeContent.match(/(?:^|\n)##\s+Contents\s*\n([\s\S]*?)(?:\n##\s+|\n#\s+|$)/i)
  if (contentsMatch?.[1]?.trim()) {
    return contentsMatch[1].trim()
  }

  return null
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/u, '')
}

function normalizeArtifactName(reference: string): string {
  const cleaned = reference.trim().replace(/^`|`$/g, '')
  if (!cleaned) {
    return 'unknown'
  }

  const segments = cleaned.split('/').filter(Boolean)
  const lowerSegments = segments.map((segment) => segment.toLowerCase())
  const categoryFolders = [
    'skills',
    'plugins',
    'disabled-plugins',
    'commands',
    'command',
    'agents',
    'agent',
    'themes',
    'tools',
    'rules',
    'modes',
    'prompts',
  ]

  const categoryIndex = lowerSegments.findIndex((segment) => categoryFolders.includes(segment))
  if (categoryIndex >= 0 && categoryIndex + 1 < segments.length) {
    const candidate = segments[categoryIndex + 1]
    if (!candidate.includes('.')) {
      return candidate
    }
    return stripExtension(candidate)
  }

  const last = segments[segments.length - 1] ?? cleaned
  if (/^(agents?|skill|readme|claude)\.md$/i.test(last) && segments.length > 1) {
    return stripExtension(segments[segments.length - 2])
  }

  return stripExtension(last)
}

function parseOverviewSections(sectionContent: string): OverviewSection[] {
  const lines = sectionContent.split('\n')
  const sections: OverviewSection[] = []
  let currentSection: OverviewSection | null = null

  for (const line of lines) {
    const sectionMatch = line.match(/^\s*-\s+\*\*(.+?)\*\*/)
    if (sectionMatch) {
      const title = sectionMatch[1].trim()
      currentSection = {
        id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title,
        items: [],
      }
      sections.push(currentSection)
      continue
    }

    if (!currentSection) {
      continue
    }

    const itemMatch = line.match(/^\s*-\s+(?:`([^`]+)`|([^`-][^-]*?))\s*-\s*(.+)$/)
    if (!itemMatch) {
      continue
    }

    const rawReference = (itemMatch[1] ?? itemMatch[2] ?? '').trim()
    const summary = itemMatch[3]?.trim() ?? ''
    if (!rawReference) {
      continue
    }

    const name = normalizeArtifactName(rawReference)
    currentSection.items.push({
      id: `${currentSection.id}:${rawReference}:${currentSection.items.length}`,
      name,
      summary,
    })
  }

  return sections
    .map((section) => {
      const deduped = new Map<string, OverviewItem>()
      for (const item of section.items) {
        const key = item.name.toLowerCase()
        if (!deduped.has(key)) {
          deduped.set(key, item)
        }
      }
      return {
        ...section,
        items: Array.from(deduped.values()),
      }
    })
    .filter((section) => section.items.length > 0)
}

function buildFallbackOverviewSections(files: DetailLayoutProps['bundle']['fileIndex']): OverviewSection[] {
  const labels: Record<DetailLayoutProps['bundle']['fileIndex'][number]['kind'], string> = {
    config: 'Configuration',
    theme: 'Themes',
    skill: 'Skills',
    agent: 'Agents',
    command: 'Commands',
    plugin: 'Plugins',
    tool: 'Tools',
    prompt: 'Prompts',
    mode: 'Modes',
    rules: 'Rules',
    script: 'Scripts',
    other: 'Other files',
  }

  const filesByKind = new Map<string, string[]>()
  for (const file of files) {
    const label = labels[file.kind] ?? labels.other
    const current = filesByKind.get(label) ?? []
    current.push(file.path)
    filesByKind.set(label, current)
  }

  const orderedKinds = Array.from(filesByKind.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))

  return orderedKinds.map(([label, paths]) => {
    const byName = new Map<string, number>()
    for (const path of paths) {
      const name = normalizeArtifactName(path)
      byName.set(name, (byName.get(name) ?? 0) + 1)
    }

    const items = Array.from(byName.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count], index) => ({
        id: `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${index}:${name}`,
        name,
        summary: count > 1
          ? `${count} related files detected in this bundle.`
          : 'Detected in this bundle.',
      }))

    return {
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: label,
      items,
    }
  })
}

export default function DetailLayoutB({ bundle, prefersReducedMotion }: DetailLayoutProps) {
  const [showValidation, setShowValidation] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  const [installPromptCopied, setInstallPromptCopied] = useState(false)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<OverviewTab>('overview')
  const [overviewMarkdown, setOverviewMarkdown] = useState<string>('')
  const [overviewSections, setOverviewSections] = useState<OverviewSection[]>([])
  const [overviewVisibleCounts, setOverviewVisibleCounts] = useState<Record<string, number>>({})
  const [overviewSearch, setOverviewSearch] = useState('')
  const [collapsedOverviewSections, setCollapsedOverviewSections] = useState<Set<string>>(new Set())
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewError, setOverviewError] = useState<string | null>(null)

  const v = (variants: import('motion/react').Variants) =>
    prefersReducedMotion ? undefined : variants

  const safety = bundle.safetyResults
  const hasRiskFlags = safety?.riskFlags && safety.riskFlags.length > 0
  const hasSecretWarnings = safety?.secretWarnings && safety.secretWarnings.length > 0
  const hasValidationErrors = (safety?.validation?.config?.errors?.length ?? 0) > 0 ||
    safety?.validation?.themes?.some(t => !t.valid) ||
    safety?.validation?.skills?.some(s => !s.valid)

  const configValid = safety?.validation?.config?.valid ?? null
  const themesValid = safety?.validation?.themes?.every(t => t.valid) ?? null
  const skillsValid = safety?.validation?.skills?.every(s => s.valid) ?? null

  const themedStyle = buildThemedStyle(bundle)
  const author = bundle.owner || bundle.githubFullName.split('/')[0]
  const repoName = bundle.githubFullName.split('/')[1] || bundle.name
  const customDisplayName = bundle.name
  const avatarUrl = bundle.ownerAvatarUrl || `https://github.com/${author}.png`
  const bundleUrl = siteUrl(`/${bundle.shareCode || bundle.id}`)
  const projectDownloadUrl = apiUrl(`/api/bundles/${bundle.id}/download?variant=project`)
  const globalDownloadUrl = apiUrl(`/api/bundles/${bundle.id}/download?variant=global`)
  const installPrompt = `Fetch and follow ${siteUrl('/INSTALL.md')} for bundle URL: ${bundleUrl}`
  const lastImportedAtMs = bundle.lastImport ? new Date(bundle.lastImport.importedAt).getTime() : Number.NaN
  const importAgeDays = Number.isFinite(lastImportedAtMs)
    ? Math.floor((Date.now() - lastImportedAtMs) / (24 * 60 * 60 * 1000))
    : null
  const isImportStale = !bundle.lastImport || bundle.lastImport.status !== 'success' || (importAgeDays !== null && importAgeDays >= 21)
  const overviewReadmePath = useMemo(() => pickReadmePath(bundle.fileIndex), [bundle.fileIndex])
  const heroSurfaceRef = useReactiveSurfaceVars<HTMLDivElement>(!prefersReducedMotion, {
    shiftX: 20,
    shiftY: 14,
    spotRange: 16,
    basePulseOpacity: 0.2,
    energyPulseOpacity: 0.24,
    energyScale: 0.14,
    maxEnergy: 1.5,
  })

  const handleCopyInstallPrompt = async () => {
    try {
      await navigator.clipboard.writeText(installPrompt)
      setInstallPromptCopied(true)
      window.setTimeout(() => setInstallPromptCopied(false), 1800)
    } catch {
      setInstallPromptCopied(false)
    }
  }

  const copyTextWithToast = async (text: string, onComplete: (ok: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text)
      onComplete(true)
      window.setTimeout(() => onComplete(false), 1800)
    } catch {
      onComplete(false)
    }
  }

  const handleCopyShareLink = async () => {
    await copyTextWithToast(bundleUrl, setShareLinkCopied)
  }

  useEffect(() => {
    let cancelled = false
    const abortController = new AbortController()

    const loadOverview = async () => {
      if (!overviewReadmePath) {
        setOverviewLoading(false)
        setOverviewMarkdown('')
        setOverviewSections(buildFallbackOverviewSections(bundle.fileIndex))
        setOverviewError(null)
        return
      }

      setOverviewLoading(true)
      setOverviewError(null)

      try {
        let sectionContent = ''

        const overviewResponse = await fetch(
          apiUrl(`/api/bundles/${bundle.id}/overview`),
          { signal: abortController.signal },
        )

        if (overviewResponse.ok) {
          const payload = await overviewResponse.json() as OverviewResponse
          sectionContent = payload.markdown || ''
        } else {
          // Backward-compatible fallback for older deployments.
          const response = await fetch(
            apiUrl(`/api/bundles/${bundle.id}/file?path=${encodeURIComponent(overviewReadmePath)}`),
            { signal: abortController.signal },
          )

          if (!response.ok) {
            throw new Error('Failed to load README overview')
          }

          const readmeContent = await response.text()
          sectionContent = extractOverviewSection(readmeContent) ?? ''
        }

        if (cancelled) {
          return
        }

        if (sectionContent) {
          const parsedSections = parseOverviewSections(sectionContent)
          if (parsedSections.length > 0) {
            setOverviewSections(parsedSections)
            setOverviewMarkdown('')
            setOverviewError(null)
            return
          }

          setOverviewMarkdown(`## Overview\n\n${sectionContent}`)
          setOverviewSections([])
          setOverviewError(null)
          return
        }

        setOverviewMarkdown('')
        setOverviewSections(buildFallbackOverviewSections(bundle.fileIndex))
        setOverviewError(null)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        if (cancelled) {
          return
        }

        setOverviewMarkdown('')
        setOverviewSections(buildFallbackOverviewSections(bundle.fileIndex))
        setOverviewError('Unable to read bundle README overview. Showing fallback inventory.')
      } finally {
        if (!cancelled) {
          setOverviewLoading(false)
        }
      }
    }

    void loadOverview()

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [bundle.fileIndex, bundle.id, overviewReadmePath])

  useEffect(() => {
    if (overviewSections.length === 0) {
      setOverviewVisibleCounts({})
      return
    }

    const next: Record<string, number> = {}
    for (const section of overviewSections) {
      next[section.id] = Math.min(OVERVIEW_PAGE_SIZE, section.items.length)
    }
    setOverviewVisibleCounts(next)
    setCollapsedOverviewSections(new Set())
  }, [overviewSections])

  const handleLoadMoreOverview = (sectionId: string) => {
    setOverviewVisibleCounts((prev) => ({
      ...prev,
      [sectionId]: Math.min(
        (prev[sectionId] ?? OVERVIEW_PAGE_SIZE) + OVERVIEW_PAGE_SIZE,
        overviewSections.find((section) => section.id === sectionId)?.items.length ?? OVERVIEW_PAGE_SIZE,
      ),
    }))
  }

  const handleLoadAllOverview = (sectionId: string) => {
    const total = overviewSections.find((section) => section.id === sectionId)?.items.length
    if (!total) {
      return
    }

    setOverviewVisibleCounts((prev) => ({
      ...prev,
      [sectionId]: total,
    }))
  }

  const toggleOverviewSection = (sectionId: string) => {
    setCollapsedOverviewSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const normalizedOverviewSearch = overviewSearch.trim().toLowerCase()
  const hasOverviewMatches = overviewSections.some((section) => {
    if (normalizedOverviewSearch.length === 0) {
      return section.items.length > 0
    }

    return section.items.some((item) => `${item.name} ${item.summary}`.toLowerCase().includes(normalizedOverviewSearch))
  })

  return (
    <div className={styles.page} style={themedStyle}>
      {/* ── Hero ── */}
      <motion.div
        ref={heroSurfaceRef}
        className={styles.hero}
        variants={v(staggerContainer)}
        initial="hidden"
        animate="visible"
      >
        <div className={styles.heroBlueprint} aria-hidden />

        <div className="container">
          {/* Author row with avatar */}
          <motion.div className={styles.authorRow} variants={v(fadeInLeft)}>
            <img
              src={avatarUrl}
              alt={`${author} avatar`}
              className={styles.authorAvatar}
              loading="lazy"
            />
            <span className={styles.authorHandle}>@{author}</span>
            <span className={styles.authorSep} aria-hidden>/</span>
            <span className={styles.authorRepo}>{repoName}</span>
          </motion.div>

          <motion.h1 className={styles.heroTitle} variants={v(fadeInDown)}>
            {repoName.toUpperCase()}
          </motion.h1>

          {customDisplayName && customDisplayName.toLowerCase() !== repoName.toLowerCase() && (
            <motion.p className={styles.heroAlias} variants={v(fadeInUp)}>
              Display name: {customDisplayName}
            </motion.p>
          )}

          <motion.p className={styles.heroSummary} variants={v(fadeInUp)}>
            {bundle.summary || bundle.description || 'No description available'}
          </motion.p>

          {/* Tags + stats row */}
          <motion.div className={styles.heroBottom} variants={v(staggerFast)}>
            {bundle.tags.length > 0 && (
              <motion.div className={styles.heroTags} variants={v(fadeInUp)}>
                {bundle.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </motion.div>
            )}

            <motion.div className={styles.heroStats} variants={v(fadeInRight)}>
              <span className={styles.statItem}>
                <Star size={14} weight="fill" aria-label="Stars" />
                {formatCount(bundle.stars)}
              </span>
              <span className={styles.statItem}>
                <GitFork size={14} weight="bold" aria-label="Forks" />
                {formatCount(bundle.forks)}
              </span>
              <span className={styles.statItem}>
                <Files size={14} weight="bold" aria-label="Files" />
                {bundle.fileIndex.length}
              </span>
              {bundle.latestSnapshot && (
                <span className={styles.statItem}>
                  {formatSize(bundle.latestSnapshot.byteSize)}
                </span>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Animated rule */}
        <div className="container">
          <motion.div variants={v(drawLine)} style={{ transformOrigin: 'left center' }}>
            <div className={styles.heroRule} />
          </motion.div>
        </div>
      </motion.div>

      {/* ── Two-column body ── */}
      <div className="container">
        <div className={styles.bodyGrid}>
          {/* ── Main column ── */}
          <div className={styles.mainCol}>
            {/* Safety */}
            {safety && (
              <motion.section
                className={styles.safetyCard}
                variants={v(sectionReveal)}
                initial="hidden"
                whileInView="visible"
                viewport={scrollViewports.once}
              >
                <div className={styles.safetyRow}>
                  <ShieldCheck size={20} weight="bold" aria-hidden />
                  <h3 className={styles.cardHeading}>Safety Assessment</h3>
                  {hasRiskFlags && (
                    <div className={styles.riskBadges}>
                      {safety.riskFlags.map((f) => (
                        <span key={f.flag} className={styles.badgeRisk} title={f.description}>{f.flag}</span>
                      ))}
                    </div>
                  )}
                </div>

                <motion.div
                  className={styles.validRow}
                  variants={v(staggerFast)}
                  initial="hidden"
                  whileInView="visible"
                  viewport={scrollViewports.once}
                >
                  {[
                    { label: 'Config', ok: configValid },
                    { label: 'Themes', ok: themesValid },
                    { label: 'Skills', ok: skillsValid },
                  ].map(({ label, ok }) => (
                    <motion.div key={label} className={styles.validChip} variants={v(staggerItemBlur)}>
                      <span className={styles.validLabel}>{label}</span>
                      <span className={ok === null ? styles.vNA : ok ? styles.vOk : styles.vFail}>
                        {ok === null ? 'N/A' : ok ? 'Valid' : 'Invalid'}
                      </span>
                    </motion.div>
                  ))}
                  {safety.secretWarnings && (
                    <motion.div className={styles.validChip} variants={v(staggerItemBlur)}>
                      <span className={styles.validLabel}>Secrets</span>
                      <span className={hasSecretWarnings ? styles.vWarn : styles.vOk}>
                        {safety.secretWarnings.length} warnings
                      </span>
                    </motion.div>
                  )}
                </motion.div>

                {(hasValidationErrors || hasSecretWarnings) && (
                  <div className={styles.expandArea}>
                    {hasValidationErrors && (
                      <>
                        <button className={styles.expandBtn} onClick={() => setShowValidation(!showValidation)}>
                          {showValidation ? '\u25BC' : '\u25B6'} Validation errors
                        </button>
                        {showValidation && (
                          <motion.div
                            className={styles.errorBlock}
                            initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                          >
                            {safety.validation.config?.errors.map((err, i) => (
                              <div key={`c-${i}`} className={styles.errLine}><strong>Config:</strong> {err}</div>
                            ))}
                            {safety.validation.themes?.filter(t => !t.valid).map((t, i) => (
                              <div key={`t-${i}`} className={styles.errLine}><strong>{t.file}:</strong> {t.errors.join(', ')}</div>
                            ))}
                            {safety.validation.skills?.filter(s => !s.valid).map((sk, i) => (
                              <div key={`s-${i}`} className={styles.errLine}><strong>{sk.file}:</strong> {sk.errors.join(', ')}</div>
                            ))}
                          </motion.div>
                        )}
                      </>
                    )}
                    {hasSecretWarnings && (
                      <>
                        <button className={styles.expandBtn} onClick={() => setShowSecrets(!showSecrets)}>
                          {showSecrets ? '\u25BC' : '\u25B6'} Secret warnings ({safety.secretWarnings.length})
                        </button>
                        {showSecrets && (
                          <motion.div
                            className={styles.errorBlock}
                            initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                          >
                            {safety.secretWarnings.map((w, i) => (
                              <div key={`sw-${i}`} className={styles.errLine}>
                                <code>{w.file}:{w.line}</code> {w.pattern}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className={styles.disclaimer}>
                  <Warning size={16} weight="bold" aria-hidden />
                  <span>
                    OpenDots performs best-effort scanning. <strong>You are responsible for reviewing what you install.</strong>
                  </span>
                </div>
              </motion.section>
            )}

            {/* File Explorer */}
            <motion.section
              className={styles.explorerCard}
              variants={v(sectionReveal)}
              initial="hidden"
              whileInView="visible"
              viewport={scrollViewports.once}
            >
              <div className={styles.explorerHeader}>
                <div className={styles.explorerTabs} role="tablist" aria-label="Bundle panel tabs">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'overview'}
                    className={`${styles.explorerTab} ${activeTab === 'overview' ? styles.explorerTabActive : ''}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'files'}
                    className={`${styles.explorerTab} ${activeTab === 'files' ? styles.explorerTabActive : ''}`}
                    onClick={() => setActiveTab('files')}
                  >
                    Files
                  </button>
                </div>
                {activeTab === 'overview' && overviewSections.length > 0 ? (
                  <input
                    type="search"
                    className={styles.overviewSearchInput}
                    value={overviewSearch}
                    onChange={(event) => setOverviewSearch(event.target.value)}
                    placeholder="Search skills, plugins, MCPs..."
                    aria-label="Search overview items"
                  />
                ) : (
                  <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {activeTab === 'files'
                      ? `${bundle.fileIndex.length} files`
                      : overviewReadmePath
                        ? `source: ${overviewReadmePath}`
                        : 'source: generated fallback'}
                    {' '} &middot; {' '}
                    {bundle.latestSnapshot ? formatSize(bundle.latestSnapshot.byteSize) : 'Unknown'}
                  </span>
                )}
              </div>

              {activeTab === 'overview' ? (
                <div className={styles.overviewPanel} role="tabpanel" aria-label="Bundle overview">
                  {overviewLoading ? (
                    <div className={styles.overviewState}>Loading overview...</div>
                  ) : (
                    <>
                      {overviewError && <div className={styles.overviewWarning}>{overviewError}</div>}
                      {overviewSections.length > 0 ? (
                        <div className={styles.overviewSections}>
                          {overviewSections.map((section) => {
                            const filteredItems = normalizedOverviewSearch.length > 0
                              ? section.items.filter((item) => {
                                const haystack = `${item.name} ${item.summary}`.toLowerCase()
                                return haystack.includes(normalizedOverviewSearch)
                              })
                              : section.items

                            if (filteredItems.length === 0) {
                              return null
                            }

                            const visibleCount = overviewVisibleCounts[section.id] ?? Math.min(OVERVIEW_PAGE_SIZE, filteredItems.length)
                            const hasMore = visibleCount < filteredItems.length
                            const visibleItems = filteredItems.slice(0, visibleCount)
                            const collapsed = collapsedOverviewSections.has(section.id)

                            return (
                              <section key={section.id} className={styles.overviewSectionBlock}>
                                <header className={styles.overviewSectionHeader}>
                                  <button
                                    type="button"
                                    className={styles.overviewSectionToggle}
                                    onClick={() => toggleOverviewSection(section.id)}
                                    aria-expanded={!collapsed}
                                  >
                                    <span className={styles.overviewSectionChevron} aria-hidden>{collapsed ? '>' : 'v'}</span>
                                    <h3 className={styles.overviewSectionTitle}>{section.title}</h3>
                                  </button>
                                  <span className={styles.overviewSectionCount}>
                                    {filteredItems.length}
                                    {filteredItems.length !== section.items.length ? ` / ${section.items.length}` : ''}
                                  </span>
                                </header>

                                {!collapsed && (
                                  <>
                                    <ul className={styles.overviewList}>
                                      {visibleItems.map((item) => (
                                        <li key={item.id} className={styles.overviewListItem}>
                                          <div className={styles.overviewItemName}>{item.name}</div>
                                          <p className={styles.overviewItemSummary}>{item.summary}</p>
                                        </li>
                                      ))}
                                    </ul>

                                    {hasMore && (
                                      <div className={styles.overviewActions}>
                                        <button
                                          type="button"
                                          className={styles.overviewActionButton}
                                          onClick={() => handleLoadMoreOverview(section.id)}
                                        >
                                          Load more
                                        </button>
                                        <button
                                          type="button"
                                          className={styles.overviewActionButton}
                                          onClick={() => handleLoadAllOverview(section.id)}
                                        >
                                          Load all
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </section>
                            )
                          })}

                          {!hasOverviewMatches && (
                            <div className={styles.overviewEmptyState}>No overview items match this search.</div>
                          )}
                        </div>
                      ) : (
                        <Suspense fallback={<div className={styles.overviewState}>Rendering overview...</div>}>
                          <CodeContentRenderer
                            content={overviewMarkdown}
                            isMarkdown={true}
                            language="markdown"
                          />
                        </Suspense>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div role="tabpanel" aria-label="Bundle files">
                  <CodeExplorer bundleId={bundle.id} files={bundle.fileIndex} />
                </div>
              )}
            </motion.section>

            {bundle.changeSummary && (
              <motion.section
                className={styles.changeCard}
                variants={v(sectionReveal)}
                initial="hidden"
                whileInView="visible"
                viewport={scrollViewports.once}
              >
                <div className={styles.changeHeader}>
                  <h3 className={styles.cardHeading}>What Changed</h3>
                  <span className={styles.changeMeta}>Latest {bundle.changeSummary.latestCommitSha.slice(0, 7)}</span>
                </div>

                {bundle.changeSummary.previousCommitSha ? (
                  <p className={styles.changeDescription}>
                    Compared against {bundle.changeSummary.previousCommitSha.slice(0, 7)}.
                  </p>
                ) : (
                  <p className={styles.changeDescription}>
                    First imported snapshot for this bundle.
                  </p>
                )}

                <div className={styles.changeCounts}>
                  <span className={styles.changeCountAdd}>+{bundle.changeSummary.addedCount} added</span>
                  <span className={styles.changeCountRemove}>-{bundle.changeSummary.removedCount} removed</span>
                  <span className={styles.changeCountChange}>~{bundle.changeSummary.changedCount} changed</span>
                </div>

                <div className={styles.changeLists}>
                  {bundle.changeSummary.addedPaths.length > 0 && (
                    <div className={styles.changeListBlock}>
                      <h4>Added</h4>
                      <ul>
                        {bundle.changeSummary.addedPaths.map((path) => <li key={`a:${path}`}>{path}</li>)}
                      </ul>
                    </div>
                  )}

                  {bundle.changeSummary.changedPaths.length > 0 && (
                    <div className={styles.changeListBlock}>
                      <h4>Changed</h4>
                      <ul>
                        {bundle.changeSummary.changedPaths.map((path) => <li key={`c:${path}`}>{path}</li>)}
                      </ul>
                    </div>
                  )}

                  {bundle.changeSummary.removedPaths.length > 0 && (
                    <div className={styles.changeListBlock}>
                      <h4>Removed</h4>
                      <ul>
                        {bundle.changeSummary.removedPaths.map((path) => <li key={`r:${path}`}>{path}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {isImportStale && (
              <motion.div
                className={styles.staleBanner}
                variants={v(fadeIn)}
                initial="hidden"
                whileInView="visible"
                viewport={scrollViewports.once}
              >
                <Warning size={14} weight="bold" aria-hidden />
                <span>
                  {bundle.lastImport?.status !== 'success'
                    ? 'Last import did not complete successfully. This bundle may be stale.'
                    : importAgeDays !== null
                      ? `Last import is ${importAgeDays} days old. Consider refreshing before install.`
                      : 'Import freshness is unknown. Review carefully before install.'}
                </span>
              </motion.div>
            )}

            {/* Import footer */}
            <motion.div
              className={styles.importFooter}
              variants={v(fadeIn)}
              initial="hidden"
              whileInView="visible"
              viewport={scrollViewports.once}
            >
              <span className="text-dim">
                <Clock size={12} weight="bold" aria-hidden style={{ marginRight: 4, verticalAlign: '-1px' }} />
                Last imported: {bundle.lastImport ? formatDate(bundle.lastImport.importedAt) : 'Never'}
              </span>
              {bundle.lastImport?.errorMessage && (
                <span className={styles.importError}>Import failed: {bundle.lastImport.errorMessage}</span>
              )}
            </motion.div>
          </div>

          {/* ── Sidebar ── */}
          <motion.aside
            className={styles.sidebar}
            variants={v(staggerContainer)}
            initial="hidden"
            animate="visible"
          >
            {/* Download card */}
            <motion.div
              className={styles.sideCard}
              variants={v(cardEntrance)}
              whileHover={prefersReducedMotion ? undefined : 'hover'}
              initial="rest"
              animate="rest"
            >
              <h3 className={styles.cardHeading}>Install</h3>

              <div className={styles.aiInstallCard}>
                <p className={styles.aiInstallLabel}>Recommended: AI install flow</p>
                <p className={styles.aiInstallText}>
                  Let your coding agent run the official installation protocol with safety review.
                  The copied prompt includes this exact bundle URL.
                </p>
                <ClickSpark sparkColor="rgba(255,255,255,0.9)" sparkSize={9} sparkRadius={11}>
                  <button
                    type="button"
                    className={styles.aiInstallCopyButton}
                    onClick={() => void handleCopyInstallPrompt()}
                  >
                    <CopySimple size={14} weight="bold" aria-hidden />
                    {installPromptCopied ? 'COPIED' : 'COPY PROMPT'}
                  </button>
                </ClickSpark>
              </div>

              <div className={styles.installDivider} />

              <ClickSpark sparkColor="rgba(255,255,255,0.9)" sparkSize={9} sparkRadius={11}>
                <a
                  href={projectDownloadUrl}
                  className={styles.btnPrimary}
                  download
                >
                  <FolderSimple size={18} weight="bold" aria-hidden /> Download Project ZIP
                </a>
              </ClickSpark>
              <p className={styles.installHint}>Manual fallback: extract to project root</p>

              <ClickSpark sparkColor="rgba(255,255,255,0.9)" sparkSize={9} sparkRadius={11}>
                <a
                  href={globalDownloadUrl}
                  className={styles.btnSecondary}
                  download
                >
                  <Globe size={18} weight="bold" aria-hidden /> Download Global ZIP
                </a>
              </ClickSpark>
              <p className={styles.installHint}>
                Extract to <code>~/.config/opencode/</code>
              </p>
            </motion.div>

            {/* Meta card */}
            <motion.div className={styles.sideCard} variants={v(cardEntrance)}>
              <h3 className={styles.cardHeading}>Details</h3>
              <dl className={styles.metaList}>
                <dt>Author</dt>
                <dd>
                  <img src={avatarUrl} alt="" className={styles.metaAvatar} loading="lazy" />
                  @{author}
                </dd>
                <dt>License</dt>
                <dd>{bundle.license || 'Unknown'}</dd>
                <dt>Compatibility</dt>
                <dd>{bundle.compatibility?.opencode || 'OpenCode v1.0+'}</dd>
                <dt>Version</dt>
                <dd>{bundle.latestSnapshot ? bundle.latestSnapshot.commitSha.slice(0, 7) : 'N/A'}</dd>
                <dt>Stars</dt>
                <dd><Star size={12} weight="fill" aria-hidden style={{ marginRight: 4 }} />{formatCount(bundle.stars)}</dd>
                <dt>Forks</dt>
                <dd><GitFork size={12} weight="bold" aria-hidden style={{ marginRight: 4 }} />{formatCount(bundle.forks)}</dd>
                <dt>Published</dt>
                <dd><CalendarBlank size={12} weight="bold" aria-hidden style={{ marginRight: 4 }} />{formatDate(bundle.createdAt)}</dd>
              </dl>
            </motion.div>

            {/* Links card */}
            <motion.div className={styles.sideCard} variants={v(cardEntrance)}>
              <div className={styles.aiInstallCard}>
                <p className={styles.aiInstallLabel}>Share Link</p>
                <p className={styles.aiInstallText}>
                  Use this short URL for social posts and direct sharing.
                </p>
                <ClickSpark sparkColor="rgba(255,255,255,0.9)" sparkSize={9} sparkRadius={11}>
                  <button
                    type="button"
                    className={styles.aiInstallCopyButton}
                    onClick={() => void handleCopyShareLink()}
                  >
                    <CopySimple size={14} weight="bold" aria-hidden />
                    {shareLinkCopied ? 'LINK COPIED' : 'COPY SHARE LINK'}
                  </button>
                </ClickSpark>
              </div>
              <div className={styles.installDivider} />
              <a
                href={bundle.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.repoLink}
              >
                View on GitHub <ArrowSquareOut size={14} weight="bold" aria-label="External link" />
              </a>
            </motion.div>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}
