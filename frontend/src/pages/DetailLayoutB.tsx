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

type OverviewTab = 'overview' | 'files'

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

function extractOverviewMarkdown(readmeContent: string): string | null {
  const markerStart = readmeContent.indexOf(OVERVIEW_MARKER_START)
  const markerEnd = readmeContent.indexOf(OVERVIEW_MARKER_END)
  if (markerStart >= 0 && markerEnd > markerStart) {
    const section = readmeContent
      .slice(markerStart + OVERVIEW_MARKER_START.length, markerEnd)
      .trim()

    if (section.length > 0) {
      return `## Overview\n\n${section}`
    }
  }

  const contentsMatch = readmeContent.match(/(?:^|\n)##\s+Contents\s*\n([\s\S]*?)(?:\n##\s+|\n#\s+|$)/i)
  if (contentsMatch?.[1]?.trim()) {
    return `## Contents\n\n${contentsMatch[1].trim()}`
  }

  return null
}

function buildFallbackOverview(files: DetailLayoutProps['bundle']['fileIndex']): string {
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

  const lines = orderedKinds.flatMap(([label, paths]) => {
    const sortedPaths = [...paths].sort((a, b) => a.localeCompare(b))
    const topPaths = sortedPaths.slice(0, 8).map((path) => `  - \`${path}\``)
    const remaining = sortedPaths.length - topPaths.length
    if (remaining > 0) {
      topPaths.push(`  - ...and ${remaining} more`) 
    }

    return [`- **${label}** (${sortedPaths.length})`, ...topPaths]
  })

  return [
    '## Bundle Overview',
    '',
    'This bundle does not expose an auto-generated README overview block yet.',
    'Below is a fallback inventory grouped by artifact type:',
    '',
    ...lines,
  ].join('\n')
}

export default function DetailLayoutB({ bundle, prefersReducedMotion }: DetailLayoutProps) {
  const [showValidation, setShowValidation] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  const [installPromptCopied, setInstallPromptCopied] = useState(false)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<OverviewTab>('overview')
  const [overviewMarkdown, setOverviewMarkdown] = useState<string>('')
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
  const avatarUrl = bundle.ownerAvatarUrl || `https://github.com/${author}.png`
  const bundleUrl = siteUrl(`/${bundle.shareCode || bundle.id}`)
  const installPrompt = `Fetch and follow ${siteUrl('/INSTALL.md')} for bundle URL: ${bundleUrl}`
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

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(bundleUrl)
      setShareLinkCopied(true)
      window.setTimeout(() => setShareLinkCopied(false), 1800)
    } catch {
      setShareLinkCopied(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const abortController = new AbortController()

    const loadOverview = async () => {
      if (!overviewReadmePath) {
        setOverviewMarkdown(buildFallbackOverview(bundle.fileIndex))
        setOverviewError(null)
        return
      }

      setOverviewLoading(true)
      setOverviewError(null)

      try {
        const response = await fetch(
          apiUrl(`/api/bundles/${bundle.id}/file?path=${encodeURIComponent(overviewReadmePath)}`),
          { signal: abortController.signal },
        )

        if (!response.ok) {
          throw new Error('Failed to load README overview')
        }

        const readmeContent = await response.text()
        if (cancelled) {
          return
        }

        const extracted = extractOverviewMarkdown(readmeContent)
        if (extracted) {
          setOverviewMarkdown(extracted)
          setOverviewError(null)
          return
        }

        setOverviewMarkdown(buildFallbackOverview(bundle.fileIndex))
        setOverviewError(null)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        if (cancelled) {
          return
        }

        setOverviewMarkdown(buildFallbackOverview(bundle.fileIndex))
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
            <span className={styles.authorRepo}>{bundle.name}</span>
          </motion.div>

          <motion.h1 className={styles.heroTitle} variants={v(fadeInDown)}>
            {bundle.name.toUpperCase()}
          </motion.h1>

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
                <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  {activeTab === 'files'
                    ? `${bundle.fileIndex.length} files`
                    : overviewReadmePath
                      ? `source: ${overviewReadmePath}`
                      : 'source: generated fallback'}
                  {' '} &middot; {' '}
                  {bundle.latestSnapshot ? formatSize(bundle.latestSnapshot.byteSize) : 'Unknown'}
                </span>
              </div>

              {activeTab === 'overview' ? (
                <div className={styles.overviewPanel} role="tabpanel" aria-label="Bundle overview">
                  {overviewLoading ? (
                    <div className={styles.overviewState}>Loading overview...</div>
                  ) : (
                    <>
                      {overviewError && <div className={styles.overviewWarning}>{overviewError}</div>}
                      <Suspense fallback={<div className={styles.overviewState}>Rendering overview...</div>}>
                        <CodeContentRenderer
                          content={overviewMarkdown}
                          isMarkdown={true}
                          language="markdown"
                        />
                      </Suspense>
                    </>
                  )}
                </div>
              ) : (
                <div role="tabpanel" aria-label="Bundle files">
                  <CodeExplorer bundleId={bundle.id} files={bundle.fileIndex} />
                </div>
              )}
            </motion.section>

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
                  href={apiUrl(`/api/bundles/${bundle.id}/download?variant=project`)}
                  className={styles.btnPrimary}
                  download
                >
                  <FolderSimple size={18} weight="bold" aria-hidden /> Download Project ZIP
                </a>
              </ClickSpark>
              <p className={styles.installHint}>Manual fallback: extract to project root</p>

              <ClickSpark sparkColor="rgba(255,255,255,0.9)" sparkSize={9} sparkRadius={11}>
                <a
                  href={apiUrl(`/api/bundles/${bundle.id}/download?variant=global`)}
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
