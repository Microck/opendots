import { useEffect, useState } from 'react'
import BundleCard, { type BundleCardData } from '../components/BundleCard'
import styles from './Browse.module.css'

export default function Browse() {
  const [bundles, setBundles] = useState<BundleCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchBundles = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/bundles')
        if (!response.ok) {
          throw new Error(`Failed to load bundles (${response.status})`)
        }

        const data: unknown = await response.json()
        if (!cancelled) {
          setBundles(Array.isArray(data) ? (data as BundleCardData[]) : [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load bundles')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchBundles()

    return () => {
      cancelled = true
    }
  }, [])

  const statusText = `INDEX STATUS: ONLINE | BUNDLES: ${bundles.length}`

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.headerRow}>
          <h2 style={{ marginBottom: 0 }}>BROWSE BUNDLES</h2>
          <span className={styles.statusText}>{statusText}</span>
        </div>

        {loading && (
          <div className={styles.statePanel}>Loading bundles...</div>
        )}

        {!loading && error && (
          <div className={styles.statePanel}>Error: {error}</div>
        )}

        {!loading && !error && bundles.length === 0 && (
          <div className={styles.statePanel}>No bundles available yet.</div>
        )}

        {!loading && !error && bundles.length > 0 && (
          <div className={styles.bundleGrid}>
            {bundles.map(b => (
              <BundleCard key={b.id} bundle={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
