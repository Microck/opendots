import type { CSSProperties, KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Star, GitFork } from '@phosphor-icons/react'
import { getDeterministicAccent, hexToRgbString } from '../lib/colors'
import { useReducedMotion } from '../hooks/useReducedMotion'
import styles from './BundleCard.module.css'

export interface BundleCardData {
  id: string
  shareCode: string
  slug: string
  name: string
  summary: string
  owner: string
  ownerAvatarUrl: string
  tags: string[]
  artifactTypes: string[]
  riskBadges: string[]
  accentColor: string | null
  cardTheme: {
    background?: string
    backgroundHover?: string
    border?: string
    borderHover?: string
    title?: string
    text?: string
    mutedText?: string
    chipBackground?: string
    chipBorder?: string
    chipText?: string
  } | null
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

const DEFAULT_GRAY_CARD_THEME = {
  background: '#141414',
  backgroundHover: '#1b1b1b',
  border: '#3f3f3f',
  borderHover: '#525252',
  title: '#f5f5f5',
  text: '#d4d4d4',
  mutedText: '#a3a3a3',
  chipBackground: '#262626',
  chipBorder: '#3f3f3f',
  chipText: '#d4d4d4',
}

function hasCardTheme(theme: BundleCardData['cardTheme']): boolean {
  return Boolean(theme && Object.values(theme).some(Boolean))
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

  const useGrayFallback = !hasCardTheme(bundle.cardTheme) && !bundle.accentColor
  const effectiveTheme = useGrayFallback ? DEFAULT_GRAY_CARD_THEME : bundle.cardTheme

  // Use theme accent or deterministic fallback
  const accentColor = useGrayFallback
    ? DEFAULT_GRAY_CARD_THEME.border
    : bundle.accentColor ?? getDeterministicAccent(bundle.id)
  const rgbAccent = hexToRgbString(accentColor)

  const cardStyle = {
    '--card-accent': accentColor,
    '--card-accent-rgb': rgbAccent,
    '--card-bg-custom': effectiveTheme?.background ?? undefined,
    '--card-bg-hover-custom': effectiveTheme?.backgroundHover ?? undefined,
    '--card-border-custom': effectiveTheme?.border ?? undefined,
    '--card-border-hover-custom': effectiveTheme?.borderHover ?? undefined,
    '--card-title-custom': effectiveTheme?.title ?? undefined,
    '--card-text-custom': effectiveTheme?.text ?? undefined,
    '--card-muted-custom': effectiveTheme?.mutedText ?? undefined,
    '--card-chip-bg-custom': effectiveTheme?.chipBackground ?? undefined,
    '--card-chip-border-custom': effectiveTheme?.chipBorder ?? undefined,
    '--card-chip-text-custom': effectiveTheme?.chipText ?? undefined,
  } as CSSProperties

  return (
    <motion.div
      className={styles.card}
      style={cardStyle}
      onClick={handleOpenDetail}
      role="link"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      whileHover={prefersReducedMotion ? undefined : { y: -2 }}
      whileTap={prefersReducedMotion ? undefined : { y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
    >
      <div className={styles.cardAccent} />
      <div className={styles.creatorRow}>
        <img
          src={bundle.ownerAvatarUrl}
          alt={`${bundle.owner} avatar`}
          className={styles.creatorAvatar}
          loading="lazy"
        />
        <span className={styles.creatorHandle}>@{bundle.owner}</span>
      </div>
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
          <span className={styles.metaItem}><Star size={12} weight="fill" aria-label="Stars" /> {formatCount(bundle.stars)}</span>
          <span className={styles.metaItem}><GitFork size={12} weight="bold" aria-label="Forks" /> {formatCount(bundle.forks)}</span>
          </div>
          <span className={styles.metaItem}>Upd: {formatRelativeTime(bundle.updatedAt)}</span>
        </div>
    </motion.div>
  )
}
