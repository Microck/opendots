import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Register.module.css'

export default function Register() {
  const navigate = useNavigate()
  const [repo, setRepo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/publisher/bundles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ repo: repo.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.field) {
          setError(`${data.field}: ${data.message}`)
        } else if (data.message) {
          setError(data.message)
        } else {
          setError(data.error || 'Failed to register repository')
        }
      } else {
        setSuccess(true)
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.formContainer}>
            <div className={styles.successMessage}>
              ✓ Repository registered successfully!
            </div>
            <p style={{ textAlign: 'center', marginTop: '16px' }}>
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <a onClick={() => navigate('/dashboard')} className={styles.backLink}>
          &larr; BACK TO DASHBOARD
        </a>
        <div className={styles.formContainer}>
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>REGISTER REPOSITORY</h2>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className="text-label">GITHUB REPOSITORY</label>
              <input
                type="text"
                className={styles.inputText}
                placeholder="e.g. user/my-opencode-config"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                disabled={isLoading}
              />
              <p className={styles.hint}>
                Must be a public GitHub repository owned by you.
              </p>
            </div>

            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}

            <div className={styles.requirements}>
              <span className="text-label" style={{ display: 'block', marginBottom: '8px' }}>
                VALIDATION REQUIREMENTS
              </span>
              <ul className={styles.requirementList}>
                <li>Repo public access</li>
                <li>You must have admin or maintain permissions on the repo</li>
                <li>No special naming or manifest file required</li>
              </ul>
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={isLoading || !repo.trim()}>
              {isLoading ? 'VALIDATING...' : 'VALIDATE & REGISTER'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
