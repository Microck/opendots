import type { CSSProperties, KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { getDeterministicAccent, hexToRgbString } from '../lib/colors'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { hoverLift } from '../styles/animations'
import styles from './BundleCard.module.css'

export interface BundleCardData {
  id: string
  slug: string
  name: string
  summary: string
  tags: string[]
  artifactTypes: string[]
  riskBadges: string[]
  accentColor: string | null
  stars: number
  forks: number
  updatedAt: string
}

interface BundleCardProps {
  bundle: BundleCardData
}

function formatRelativeTime(updatedAt: string): string {
  const updatedMs = new Date(updatedAt).getTime()
  if (Number.isNaN(updatedMs)) {
    return '--'
  }

  const diffMs = Date.now() - updatedMs
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) {
    return 'just now'
  }

  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)}m ago`
  }

  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}h ago`
  }

  return `${Math.floor(diffMs / day)}d ago`
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export default function BundleCard({ bundle }: BundleCardProps) {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()

  const handleOpenDetail = () => {
    navigate(`/bundle/${bundle.id}`)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpenDetail()
    }
  }

  // Use theme accent or deterministic fallback
  const accentColor = bundle.accentColor ?? getDeterministicAccent(bundle.id)
  const rgbAccent = hexToRgbString(accentColor)

  const cardStyle = {
    '--card-accent': accentColor,
    '--card-accent-rgb': rgbAccent,
  } as CSSProperties

  return (
    <motion.div
      className={styles.card}
      style={cardStyle}
      onClick={handleOpenDetail}
      role="link"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      whileHover={prefersReducedMotion ? undefined : "hover"}
      whileTap={prefersReducedMotion ? undefined : "tap"}
      variants={prefersReducedMotion ? undefined : hoverLift}
      initial="rest"
      animate="rest"
    >
      <div className={styles.cardAccent} />
      <div className={styles.header}>
        <h3 className={styles.name}>{bundle.name}</h3>
      </div>
      <p className={styles.summary}>{bundle.summary}</p>
      <div className={styles.tags}>
        {bundle.tags.map(tag => (
          <span key={tag} className={styles.chip}>{tag}</span>
        ))}
        {bundle.riskBadges.map(badge => (
          <span key={badge} className={styles.badgeRisk}>{badge}</span>
        ))}
      </div>
      <div className={styles.footer}>
        <div className={styles.stats}>
          <span className={styles.metaItem}>Stars {formatCount(bundle.stars)}</span>
          <span className={styles.metaItem}>Forks {formatCount(bundle.forks)}</span>
        </div>
        <span className={styles.metaItem}>Upd: {formatRelativeTime(bundle.updatedAt)}</span>
      </div>
    </motion.div>
  )
}
