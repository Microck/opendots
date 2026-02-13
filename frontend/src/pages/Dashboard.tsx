import { useNavigate } from 'react-router-dom'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h2>PUBLISHER DASHBOARD</h2>
          <button onClick={() => navigate('/register')} className={styles.btnPrimary}>
            REGISTER NEW BUNDLE
          </button>
        </div>

        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span className="text-label">BUNDLE</span>
            <span className="text-label">LAST IMPORT</span>
            <span className="text-label">STATUS</span>
            <span className="text-label">ACTIONS</span>
          </div>

          <div className={styles.tableRow}>
            <div>
              <strong className={styles.bundleName}>react-dev-pack</strong>
              <a href="#" className={styles.repoLink}>github.com/frontend_wizard/opendots-react</a>
            </div>
            <div className="text-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              a1b2c3d <br /> 2h ago
            </div>
            <div>
              <span className={styles.chipSuccess}>SUCCESS</span>
            </div>
            <div>
              <button className={styles.actionBtn}>REFRESH</button>
            </div>
          </div>

          <div className={`${styles.tableRow} ${styles.tableRowLast}`}>
            <div>
              <strong className={styles.bundleName}>personal-dotfiles</strong>
              <a href="#" className={styles.repoLink}>github.com/frontend_wizard/opendots-personal</a>
            </div>
            <div className="text-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              --
            </div>
            <div>
              <span className={styles.chipPending}>PENDING</span>
            </div>
            <div>
              <button className={styles.actionBtn}>CHECK</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
