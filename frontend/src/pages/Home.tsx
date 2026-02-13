import { useNavigate } from 'react-router-dom'
import BundleCard, { type BundleCardData } from '../components/BundleCard'
import styles from './Home.module.css'

const recentBundles: BundleCardData[] = [
  {
    id: 'cyberpunk-theme',
    name: 'Cyberpunk-Theme',
    version: 'v2.1',
    summary: 'Neon aesthetic theme with high contrast syntax highlighting.',
    tags: ['Theme', 'Dark'],
    stars: '1.2k',
    updated: '2h ago',
    accentColor: '#A0C4FF',
  },
  {
    id: 'react-dev-pack',
    name: 'React-Dev-Pack',
    version: 'v1.0',
    summary: 'Essential tools, snippets and linters for React development.',
    tags: ['Tools', 'React'],
    riskBadges: ['EXEC'],
    stars: '850',
    updated: '1d ago',
    accentColor: '#FFD6A5',
  },
  {
    id: 'vim-mode',
    name: 'Vim-Mode',
    version: 'v0.9',
    summary: 'Complete Vim keybinding emulation layer.',
    tags: ['Mode', 'Keymap'],
    stars: '3.4k',
    updated: '5d ago',
    accentColor: '#E7BBE3',
  },
]

interface HomeProps {
  isLoggedIn: boolean
}

export default function Home({ isLoggedIn }: HomeProps) {
  const navigate = useNavigate()

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
          <span className={styles.sectionTitle}>RECENT TRANSMISSIONS</span>
          <span className="text-mono" style={{ color: 'var(--text-dim)' }}>REF: ONLINE</span>
        </div>

        <div className={styles.bundleGrid}>
          {recentBundles.map(b => (
            <BundleCard key={b.id} bundle={b} />
          ))}
        </div>
      </div>
    </div>
  )
}
