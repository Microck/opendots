import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BundleCard, { type BundleCardData } from '../components/BundleCard'
import styles from './Home.module.css'

interface HomeProps {
  isLoggedIn: boolean
}

export default function Home({ isLoggedIn }: HomeProps) {
  const navigate = useNavigate()
  const [recentBundles, setRecentBundles] = useState<BundleCardData[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchRecent = async () => {
      try {
        const response = await fetch('/api/bundles?sort=newest&limit=6')
        if (!response.ok) {
          throw new Error('Failed to load recent bundles')
        }

        const data: unknown = await response.json()
        if (!cancelled) {
          setRecentBundles(Array.isArray(data) ? (data as BundleCardData[]) : [])
        }
      } catch {
        if (!cancelled) {
          setRecentBundles([])
        }
      } finally {
        if (!cancelled) {
          setLoadingRecent(false)
        }
      }
    }

    fetchRecent()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.hero}>
          <div className={`${styles.verticalDeco} ${styles.leftDeco}`}>091 - DISCOVER</div>
          <div className={`${styles.verticalDeco} ${styles.rightDeco}`}>SYSTEM_CFG</div>

          <div className={styles.archWindow}>
            <div className={styles.archStar}>&#10022;</div>
          </div>

          <h1 className={styles.heroTitle}>
            THE ABSENCE
            <span className={styles.heroSubtitle}>OF CONFIGURATION CHAOS</span>
          </h1>

          <p className={styles.heroDescription}>
            Opendots is a community portal to discover, share, and verify OpenCode configuration bundles.
          </p>

          <div className={styles.heroCtas}>
            <button onClick={() => navigate('/browse')} className={styles.btnPrimary}>
              BROWSE BUNDLES
            </button>
            <button
              onClick={() => navigate(isLoggedIn ? '/register' : '/signin')}
              className={styles.btnOutline}
            >
              PUBLISH BUNDLE
            </button>
          </div>
        </div>

        <div className={styles.decoLine} />

        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrap}>
            <span className={styles.sectionTitle}>RECENT TRANSMISSIONS</span>
            <span className="text-mono" style={{ color: 'var(--text-dim)' }}>REF: ONLINE</span>
          </div>
          <Link to="/browse" className={styles.browseAllLink}>
            BROWSE ALL
          </Link>
        </div>

        {loadingRecent && (
          <div className={styles.statePanel}>Loading recent bundles...</div>
        )}

        {!loadingRecent && recentBundles.length === 0 && (
          <div className={styles.statePanel}>No recent bundles yet.</div>
        )}

        {!loadingRecent && recentBundles.length > 0 && (
          <div className={styles.bundleGrid}>
            {recentBundles.map(b => (
              <BundleCard key={b.id} bundle={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
