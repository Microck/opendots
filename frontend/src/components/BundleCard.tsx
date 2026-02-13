import { useNavigate } from 'react-router-dom'
import styles from './BundleCard.module.css'

export interface BundleCardData {
  id: string
  name: string
  version: string
  summary: string
  tags: string[]
  riskBadges?: string[]
  stars: string
  updated: string
  accentColor?: string
}

interface BundleCardProps {
  bundle: BundleCardData
}

export default function BundleCard({ bundle }: BundleCardProps) {
  const navigate = useNavigate()

  return (
    <div className={styles.card} onClick={() => navigate(`/bundle/${bundle.id}`)}>
      <div className={styles.cardAccent} />
      <div className={styles.header}>
        <h3 className={styles.name}>{bundle.name}</h3>
        <span className="text-mono" style={{ fontSize: '0.7rem' }}>{bundle.version}</span>
      </div>
      <p className={styles.summary}>{bundle.summary}</p>
      <div className={styles.tags}>
        {bundle.tags.map(tag => (
          <span key={tag} className={styles.chip}>{tag}</span>
        ))}
        {bundle.riskBadges?.map(badge => (
          <span key={badge} className={styles.badgeRisk}>{badge}</span>
        ))}
      </div>
      <div className={styles.footer}>
        <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          ★ {bundle.stars}
        </span>
        <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          UPD: {bundle.updated}
        </span>
      </div>
    </div>
  )
}
