import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { FolderSimple, Globe, ArrowSquareOut } from '@phosphor-icons/react'
import CodeExplorer from '../components/CodeExplorer'
import styles from './Detail.module.css'

interface SafetyResults {
  validation: {
    config: {
      valid: boolean
      errors: string[]
      warnings: string[]
    } | null
    themes: Array<{
      file: string
      valid: boolean
      errors: string[]
    }>
    skills: Array<{
      file: string
      valid: boolean
      errors: string[]
    }>
  }
  riskFlags: Array<{
    flag: string
    description: string
    files: string[]
    severity: 'high' | 'medium' | 'low'
  }>
  secretWarnings: Array<{
    file: string
    line: number
    pattern: string
    snippet: string
  }>
}

interface BundleData {
  id: string
  name: string
  summary: string
  description: string
  tags: string[]
  license: string
  compatibility?: {
    opencode?: string
    os?: string[]
    node?: string
  }
  repoUrl: string
  githubFullName: string
  status: string
  createdAt: string | Date
  latestSnapshot: {
    commitSha: string
    createdAt: string | Date
    byteSize: number
  } | null
  fileIndex: Array<{
    path: string
    size: number
    kind: 'config' | 'theme' | 'skill' | 'agent' | 'command' | 'plugin' | 'tool' | 'prompt' | 'mode' | 'rules' | 'script' | 'other'
    isBinary: boolean
    isPreviewable: boolean
  }>
  lastImport: {
    commitSha: string
    status: string
    importedAt: string | Date
    errorCode?: string
    errorMessage?: string
  } | null
  safetyResults: SafetyResults | null
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const [bundle, setBundle] = useState<BundleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showValidationDetails, setShowValidationDetails] = useState(false)
  const [showSecretWarnings, setShowSecretWarnings] = useState(false)

  useEffect(() => {
    if (!id) return

    const fetchBundle = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/bundles/${id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Bundle not found')
          }
          throw new Error('Failed to load bundle')
        }

        const data = await response.json()
        setBundle(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchBundle()
  }, [id])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.loading}>Loading bundle...</div>
        </div>
      </div>
    )
  }

  if (error || !bundle) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.error}>
            <h2>Error loading bundle</h2>
            <p>{error || 'Bundle not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  const safety = bundle.safetyResults
  const hasValidationErrors = (safety?.validation?.config?.errors?.length ?? 0) > 0 ||
    safety?.validation?.themes?.some(t => !t.valid) ||
    safety?.validation?.skills?.some(s => !s.valid)
  const hasRiskFlags = safety?.riskFlags && safety.riskFlags.length > 0
  const hasSecretWarnings = safety?.secretWarnings && safety.secretWarnings.length > 0

  // Calculate overall validation status
  const configValid = safety?.validation?.config?.valid ?? null
  const themesValid = safety?.validation?.themes?.every(t => t.valid) ?? null
  const skillsValid = safety?.validation?.skills?.every(s => s.valid) ?? null

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.detailHeader}>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.title}>{bundle.name.toUpperCase()}</h1>
              <p className={styles.subtitle}>
                {bundle.summary || bundle.description || 'No description available'}
              </p>
              {bundle.tags.length > 0 && (
                <div className={styles.tags}>
                  {bundle.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <a 
                href={bundle.repoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.btnOutline}
              >
                View on GitHub <ArrowSquareOut size={16} weight="bold" aria-label="External link" />
              </a>
            </div>
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>AUTHOR</span>
              <strong>@{bundle.githubFullName.split('/')[0]}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>LICENSE</span>
              <strong>{bundle.license || 'Unknown'}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>COMPATIBILITY</span>
              <strong>{bundle.compatibility?.opencode || 'OpenCode v1.0+'}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>VERSION</span>
              <strong>
                {bundle.latestSnapshot 
                  ? `${bundle.latestSnapshot.commitSha.slice(0, 7)}` 
                  : 'Not imported'}
              </strong>
            </div>
          </div>
        </header>

        {/* Safety Section */}
        {safety && (
          <section className={styles.safetySection}>
            <div className={styles.safetyHeader}>
              <div className={styles.safetyTitleRow}>
                <svg className={styles.safetyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <h2 className={styles.safetyHeading}>Safety Assessment</h2>
              </div>
              
              {/* Risk Flags */}
              {hasRiskFlags && (
                <div className={styles.riskFlagsRow}>
                  {safety.riskFlags.map((flag) => (
                    <span 
                      key={flag.flag} 
                      className={styles.badgeRisk}
                      title={`${flag.description} (${flag.severity} severity)`}
                    >
                      {flag.flag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Validation Summary */}
            <div className={styles.validationGrid}>
              <div className={styles.validationItem}>
                <span className={styles.validationLabel}>Config</span>
                <span className={configValid === null ? styles.validationUnknown : configValid ? styles.validationValid : styles.validationInvalid}>
                  {configValid === null ? 'N/A' : configValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
              <div className={styles.validationItem}>
                <span className={styles.validationLabel}>Themes</span>
                <span className={themesValid === null ? styles.validationUnknown : themesValid ? styles.validationValid : styles.validationInvalid}>
                  {themesValid === null ? 'N/A' : themesValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
              <div className={styles.validationItem}>
                <span className={styles.validationLabel}>Skills</span>
                <span className={skillsValid === null ? styles.validationUnknown : skillsValid ? styles.validationValid : styles.validationInvalid}>
                  {skillsValid === null ? 'N/A' : skillsValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
              {safety.secretWarnings && (
                <div className={styles.validationItem}>
                  <span className={styles.validationLabel}>Secrets</span>
                  <span className={hasSecretWarnings ? styles.validationWarning : styles.validationValid}>
                    {safety.secretWarnings.length} warnings
                  </span>
                </div>
              )}
            </div>

            {/* Expandable Validation Details */}
            {(hasValidationErrors || hasSecretWarnings) && (
              <div className={styles.validationDetails}>
                {hasValidationErrors && (
                  <button 
                    className={styles.expandButton}
                    onClick={() => setShowValidationDetails(!showValidationDetails)}
                  >
                    {showValidationDetails ? '▼' : '▶'} Validation errors
                  </button>
                )}
                {showValidationDetails && hasValidationErrors && (
                  <div className={styles.errorsList}>
                    {safety.validation.config?.errors.map((err, i) => (
                      <div key={`config-${i}`} className={styles.errorItem}>
                        <span className={styles.errorSource}>Config:</span> {err}
                      </div>
                    ))}
                    {safety.validation.themes?.filter(t => !t.valid).map((theme, i) => (
                      <div key={`theme-${i}`} className={styles.errorItem}>
                        <span className={styles.errorSource}>{theme.file}:</span> {theme.errors.join(', ')}
                      </div>
                    ))}
                    {safety.validation.skills?.filter(s => !s.valid).map((skill, i) => (
                      <div key={`skill-${i}`} className={styles.errorItem}>
                        <span className={styles.errorSource}>{skill.file}:</span> {skill.errors.join(', ')}
                      </div>
                    ))}
                  </div>
                )}

                {hasSecretWarnings && (
                  <button 
                    className={styles.expandButton}
                    onClick={() => setShowSecretWarnings(!showSecretWarnings)}
                  >
                    {showSecretWarnings ? '▼' : '▶'} Secret warnings ({safety.secretWarnings.length})
                  </button>
                )}
                {showSecretWarnings && hasSecretWarnings && (
                  <div className={styles.warningsList}>
                    {safety.secretWarnings.map((warning, i) => (
                      <div key={`secret-${i}`} className={styles.warningItem}>
                        <span className={styles.warningFile}>{warning.file}:{warning.line}</span>
                        <span className={styles.warningPattern}>{warning.pattern}</span>
                        <code className={styles.warningSnippet}>{warning.snippet}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <div className={styles.disclaimer}>
              <svg className={styles.disclaimerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p>
                Opendots performs best-effort scanning. Bundles may contain executable code.{" "}
                <strong>You are responsible for reviewing what you install.</strong>
              </p>
            </div>
          </section>
        )}

        {/* Download Section */}
        <section className={styles.downloadSection}>
          <h2 className={styles.sectionHeading}>Download</h2>
          <div className={styles.downloadGrid}>
            <div className={styles.downloadCard}>
              <div className={styles.downloadIcon}>
                <FolderSimple size={32} weight="bold" aria-label="Project ZIP" />
              </div>
              <h3 className={styles.downloadTitle}>Project ZIP</h3>
              <p className={styles.downloadDesc}>
                Install into current project. Config lives alongside code and applies only to this directory.
              </p>
              <a 
                href={`/api/bundles/${bundle.id}/download?variant=project`}
                className={styles.btnPrimary}
                download
              >
                Download Project ZIP
              </a>
              <div className={styles.downloadInstructions}>
                <strong>Install:</strong> Extract to your project root.
                Bundle files (config, agents, plugins, etc.) will be created in your project.
              </div>
            </div>
            
            <div className={styles.downloadCard}>
              <div className={styles.downloadIcon}>
                <Globe size={32} weight="bold" aria-label="Global ZIP" />
              </div>
              <h3 className={styles.downloadTitle}>Global ZIP</h3>
              <p className={styles.downloadDesc}>
                Install to user home. Config applies to all OpenCode projects on your machine.
              </p>
              <a 
                href={`/api/bundles/${bundle.id}/download?variant=global`}
                className={styles.btnOutline}
                download
              >
                Download Global ZIP
              </a>
              <div className={styles.downloadInstructions}>
                <strong>Install:</strong> Extract to <code>~/.config/opencode/</code>. Config will be available globally.
              </div>
            </div>
          </div>
        </section>

        {/* Bundle Contents */}
        <section className={styles.explorerSection}>
          <div className={styles.explorerHeader}>
            <span className="text-label">BUNDLE CONTENTS</span>
            <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              SIZE: {bundle.latestSnapshot ? formatSize(bundle.latestSnapshot.byteSize) : 'Unknown'}
            </span>
          </div>
          <CodeExplorer bundleId={bundle.id} files={bundle.fileIndex} />
        </section>

        <div className={styles.importInfo}>
          <span className="text-dim">
            Last imported: {bundle.lastImport ? formatDate(bundle.lastImport.importedAt) : 'Never'}
          </span>
          {bundle.lastImport?.errorMessage && (
            <span className={styles.importError}>
              Import failed: {bundle.lastImport.errorMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
