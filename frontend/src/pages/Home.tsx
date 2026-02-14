import { useEffect, useState, useMemo, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import BundleCard, { type BundleCardData } from '../components/BundleCard'
import { useReducedMotion } from '../hooks/useReducedMotion'
import {
  fadeInUp,
  staggerGrid,
  staggerItem,
  scrollViewports,
  hoverScale,
} from '../styles/animations'
import styles from './Home.module.css'

// Lazy-load AsciiHero for code splitting (Three.js bundle isolation)
const AsciiHero = lazy(() => import('../components/AsciiHero'))

interface HomeProps {
  isLoggedIn: boolean
}

export default function Home({ isLoggedIn }: HomeProps) {
  const navigate = useNavigate()
  const [recentBundles, setRecentBundles] = useState<BundleCardData[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const prefersReducedMotion = useReducedMotion()

  // Split hero title into characters for staggered reveal
  const heroTitleChars = useMemo(() => 'THE ABSENCE'.split(''), [])

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
        <motion.div
          className={styles.hero}
          initial="hidden"
          animate="visible"
          variants={prefersReducedMotion ? undefined : fadeInUp}
          viewport={{ once: true }}
        >
          <div className={`${styles.verticalDeco} ${styles.leftDeco}`}>091 - DISCOVER</div>
          <div className={`${styles.verticalDeco} ${styles.rightDeco}`}>SYSTEM_CFG</div>

          <motion.div
            className={styles.archWindow}
            variants={prefersReducedMotion ? undefined : {
              hidden: { opacity: 0, scale: 0.8 },
              visible: { opacity: 1, scale: 1, transition: { delay: 0.1, duration: 0.5 } },
            }}
          >
            <Suspense fallback={
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              }}>
                LOADING_3D...
              </div>
            }>
              <AsciiHero />
            </Suspense>
          </motion.div>

          <h1 className={styles.heroTitle}>
            <motion.span
              style={{ display: 'inline-block' }}
              aria-label="THE ABSENCE"
            >
              {heroTitleChars.map((char, i) => (
                <motion.span
                  key={i}
                  style={{ display: 'inline-block' }}
                  variants={prefersReducedMotion ? undefined : {
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { delay: 0.3 + i * 0.02, duration: 0.03 } },
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.span>
            <motion.span
              className={styles.heroSubtitle}
              variants={prefersReducedMotion ? undefined : {
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { delay: 0.6, duration: 0.4 } },
              }}
            >
              OF CONFIGURATION CHAOS
            </motion.span>
          </h1>

          <motion.p
            className={styles.heroDescription}
            variants={prefersReducedMotion ? undefined : {
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { delay: 0.8, duration: 0.4 } },
            }}
          >
            Opendots is a community portal to discover, share, and verify OpenCode configuration bundles.
          </motion.p>

          <motion.div
            className={styles.heroCtas}
            variants={prefersReducedMotion ? undefined : {
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0, transition: { delay: 1, duration: 0.4 } },
            }}
          >
            <motion.button
              onClick={() => navigate('/browse')}
              className={styles.btnPrimary}
              whileHover={prefersReducedMotion ? undefined : "hover"}
              whileTap={prefersReducedMotion ? undefined : "tap"}
              variants={prefersReducedMotion ? undefined : hoverScale}
            >
              BROWSE BUNDLES
            </motion.button>
            <motion.button
              onClick={() => navigate(isLoggedIn ? '/register' : '/signin')}
              className={styles.btnOutline}
              whileHover={prefersReducedMotion ? undefined : "hover"}
              whileTap={prefersReducedMotion ? undefined : "tap"}
              variants={prefersReducedMotion ? undefined : hoverScale}
            >
              PUBLISH BUNDLE
            </motion.button>
          </motion.div>
        </motion.div>

        <motion.div
          className={styles.decoLine}
          variants={prefersReducedMotion ? undefined : {
            hidden: { scaleX: 0 },
            visible: { scaleX: 1, transition: { delay: 1.2, duration: 0.6 } },
          }}
          initial="hidden"
          whileInView="visible"
          viewport={scrollViewports.once}
        />

        <motion.div
          className={styles.sectionHeader}
          variants={prefersReducedMotion ? undefined : fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={scrollViewports.once}
        >
          <div className={styles.sectionTitleWrap}>
            <span className={styles.sectionTitle}>RECENT TRANSMISSIONS</span>
            <span className="text-mono" style={{ color: 'var(--text-dim)' }}>REF: ONLINE</span>
          </div>
          <motion.div
            whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
          >
            <Link to="/browse" className={styles.browseAllLink}>
              BROWSE ALL
            </Link>
          </motion.div>
        </motion.div>

        {loadingRecent && (
          <div className={styles.statePanel}>Loading recent bundles...</div>
        )}

        {!loadingRecent && recentBundles.length === 0 && (
          <div className={styles.statePanel}>No recent bundles yet.</div>
        )}

        {!loadingRecent && recentBundles.length > 0 && (
          <motion.div
            className={styles.bundleGrid}
            variants={prefersReducedMotion ? undefined : staggerGrid}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewports.once}
          >
            {recentBundles.map(b => (
              <motion.div
                key={b.id}
                variants={prefersReducedMotion ? undefined : staggerItem}
              >
                <BundleCard bundle={b} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
