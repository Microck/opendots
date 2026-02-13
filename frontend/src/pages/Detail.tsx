import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import CodeExplorer from '../components/CodeExplorer'
import styles from './Detail.module.css'

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
    kind: 'config' | 'theme' | 'skill' | 'snippet' | 'script' | 'other'
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

  const hasSafetyWarnings = false // Will be implemented in 02-02

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
                View on GitHub &#8599;
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

        {hasSafetyWarnings && (
          <div className={styles.safetyNotice}>
            <div>
              <span className={styles.badgeRisk}>EXEC</span>
              <span className={styles.badgeRisk}>NETWORK</span>
            </div>
            <div style={{ flexGrow: 1 }}>
              <h4 className={styles.safetyTitle}>Safety Notice</h4>
              <p className={styles.safetyText}>
                This bundle contains executable code and remote fetch capabilities.
                <br />Validation Status: <span style={{ color: '#4caf50' }}>Schema OK</span>, <span style={{ color: '#ff9800' }}>Scan Warning</span>.
              </p>
            </div>
          </div>
        )}

        <div className={styles.explorerSection}>
          <div className={styles.explorerHeader}>
            <span className="text-label">BUNDLE CONTENTS</span>
            <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              SIZE: {bundle.latestSnapshot ? formatSize(bundle.latestSnapshot.byteSize) : 'Unknown'}
            </span>
          </div>
          <CodeExplorer bundleId={bundle.id} files={bundle.fileIndex} />
        </div>

        <div className={styles.downloadGrid}>
          <div className={styles.downloadCard}>
            <h3 className={styles.downloadTitle}>Project Install</h3>
            <p className={styles.downloadDesc}>
              Install into current project. Config lives alongside code.
            </p>
            <button className={styles.btnPrimary}>Download ZIP</button>
            <div className={styles.downloadPath}>
              Extract to: ./
            </div>
          </div>
          <div className={styles.downloadCard}>
            <h3 className={styles.downloadTitle}>Global Install</h3>
            <p className={styles.downloadDesc}>
              Install to user home. Applies to all projects.
            </p>
            <button className={styles.btnOutline} style={{ width: '100%' }}>Download ZIP</button>
            <div className={styles.downloadPath}>
              Extract to: ~/.config/opencode/
            </div>
          </div>
        </div>

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
