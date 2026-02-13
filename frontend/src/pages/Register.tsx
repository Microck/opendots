import { useNavigate } from 'react-router-dom'
import styles from './Register.module.css'

export default function Register() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className="container">
        <a onClick={() => navigate('/dashboard')} className={styles.backLink}>
          &larr; BACK TO DASHBOARD
        </a>
        <div className={styles.formContainer}>
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>REGISTER REPOSITORY</h2>

          <div className={styles.formGroup}>
            <label className="text-label">GITHUB REPOSITORY URL</label>
            <input
              type="text"
              className={styles.inputText}
              placeholder="e.g. user/opendots-my-bundle"
            />
            <p className={styles.hint}>
              Must be owned by you. Must adhere to naming convention <code>opendots-*</code>.
            </p>
          </div>

          <div className={styles.requirements}>
            <span className="text-label" style={{ display: 'block', marginBottom: '8px' }}>
              VALIDATION REQUIREMENTS
            </span>
            <ul className={styles.requirementList}>
              <li>Repo public access</li>
              <li><code>opendots.yml</code> manifest at root</li>
              <li>Valid JSON/YAML syntax in config files</li>
            </ul>
          </div>

          <button onClick={() => navigate('/dashboard')} className={styles.btnPrimary}>
            VALIDATE &amp; REGISTER
          </button>
        </div>
      </div>
    </div>
  )
}
