import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'
import styles from './Detail.module.css'

interface ShareResolveResponse {
  bundleId: string
}

export default function ShortShareRedirect() {
  const { shareCode } = useParams<{ shareCode: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shareCode) return

    const abortController = new AbortController()

    const resolve = async () => {
      try {
        const response = await fetch(apiUrl(`/api/share/${encodeURIComponent(shareCode)}`), {
          signal: abortController.signal,
        })

        if (!response.ok) {
          setError(response.status === 404 ? 'Bundle not found' : 'Failed to resolve share link')
          return
        }

        const payload = await response.json() as ShareResolveResponse
        if (!payload?.bundleId) {
          setError('Invalid share response')
          return
        }

        navigate(`/bundle/${payload.bundleId}`, { replace: true })
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          return
        }
        setError('Failed to resolve share link')
      }
    }

    void resolve()

    return () => {
      abortController.abort()
    }
  }, [navigate, shareCode])

  if (!shareCode) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.error}>
            <h2>Share link error</h2>
            <p>Invalid share link</p>
            <p><Link to="/browse">Browse available bundles</Link></p>
          </div>
        </div>
      </div>
    )
  }

  if (!error) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.loading}>Resolving share link...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.error}>
          <h2>Share link error</h2>
          <p>{error}</p>
          <p><Link to="/browse">Browse available bundles</Link></p>
        </div>
      </div>
    </div>
  )
}
