import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import styles from './Dashboard.module.css'

interface Bundle {
  id: string
  githubFullName: string
  githubRepo: string
  repoHtmlUrl: string
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

export default function Dashboard() {
  const navigate = useNavigate()
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshingBundles, setRefreshingBundles] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchBundles()
  }, [])

  const fetchBundles = async () => {
    try {
      const response = await fetch('/api/publisher/bundles')
      if (response.ok) {
        const data = await response.json()
        setBundles(data.bundles || [])
      }
    } catch (error) {
      console.error('Failed to fetch bundles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async (bundleId: string) => {
    setRefreshingBundles(prev => new Set(prev).add(bundleId))
    try {
      const response = await fetch(`/api/publisher/bundles/${bundleId}/refresh`, {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          await fetchBundles()
        } else {
          alert(data.error?.message || 'Refresh failed')
        }
      } else {
        alert('Refresh failed')
      }
    } catch (error) {
      console.error('Refresh error:', error)
      alert('Refresh failed')
    } finally {
      setRefreshingBundles(prev => {
        const next = new Set(prev)
        next.delete(bundleId)
        return next
      })
    }
  }

  const formatCommit = (sha: string) => sha.substring(0, 7)

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return '--'
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'success':
        return <span className={styles.chipSuccess}>SUCCESS</span>
      case 'pending':
        return <span className={styles.chipPending}>PENDING</span>
      case 'failure':
        return <span className={styles.chipFailure}>FAILURE</span>
      default:
        return <span className={styles.chipPending}>{status.toUpperCase()}</span>
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.header}>
            <h2>PUBLISHER DASHBOARD</h2>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h2>PUBLISHER DASHBOARD</h2>
          <button onClick={() => navigate('/register')} className={styles.btnPrimary}>
            REGISTER NEW BUNDLE
          </button>
        </div>

        {bundles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              No bundles registered yet.
            </p>
            <button onClick={() => navigate('/register')} className={styles.btnPrimary}>
              Register Your First Bundle
            </button>
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span className="text-label">BUNDLE</span>
              <span className="text-label">LAST IMPORT</span>
              <span className="text-label">STATUS</span>
              <span className="text-label">ACTIONS</span>
            </div>

            {bundles.map((bundle, index) => (
              <div
                key={bundle.id}
                className={`${styles.tableRow} ${index === bundles.length - 1 ? styles.tableRowLast : ''}`}
              >
                <div>
                  <strong className={styles.bundleName}>{bundle.githubRepo}</strong>
                  <a href={bundle.repoHtmlUrl} target="_blank" rel="noopener noreferrer" className={styles.repoLink}>
                    {bundle.githubFullName}
                  </a>
                </div>
                <div className="text-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {bundle.lastImport ? (
                    <>
                      {formatCommit(bundle.lastImport.commitSha)}
                      <br />
                      {formatTimestamp(bundle.lastImport.finishedAt)}
                    </>
                  ) : (
                    '--'
                  )}
                </div>
                <div>
                  {bundle.lastImport ? getStatusChip(bundle.lastImport.status) : (
                    <span className={styles.chipPending}>NOT IMPORTED</span>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => handleRefresh(bundle.id)}
                    disabled={refreshingBundles.has(bundle.id)}
                    className={styles.actionBtn}
                  >
                    {refreshingBundles.has(bundle.id) ? 'REFRESHING...' : 'REFRESH'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
