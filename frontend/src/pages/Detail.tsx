import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { motion } from 'motion/react'
import { applyBundleThemeToRoot } from '../lib/bundleTheme'
import { apiUrl } from '../lib/apiBase'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { scaleInBlur } from '../styles/animations'
import type { BundleData } from './detailTypes'
import DetailLayoutB from './DetailLayoutB'
import styles from './Detail.module.css'

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const [bundle, setBundle] = useState<BundleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const v = (variants: import('motion/react').Variants) =>
    prefersReducedMotion ? undefined : variants

  useEffect(() => {
    if (!id) return

    const fetchBundle = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(apiUrl(`/api/bundles/${id}`))

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

  useEffect(() => {
    if (!bundle) return
    return applyBundleThemeToRoot(bundle.cardTheme, bundle.accentColor)
  }, [bundle])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className="container">
          <motion.div
            className={styles.loading}
            initial={prefersReducedMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Loading bundle...
          </motion.div>
        </div>
      </div>
    )
  }

  if (error || !bundle) {
    return (
      <div className={styles.page}>
        <div className="container">
          <motion.div
            className={styles.error}
            variants={v(scaleInBlur)}
            initial="hidden"
            animate="visible"
          >
            <h2>Error loading bundle</h2>
            <p>{error || 'Bundle not found'}</p>
          </motion.div>
        </div>
      </div>
    )
  }

  return <DetailLayoutB bundle={bundle} prefersReducedMotion={prefersReducedMotion} />
}
