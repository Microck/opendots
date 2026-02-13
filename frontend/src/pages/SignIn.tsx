import { useNavigate } from 'react-router-dom'
import { authClient } from '../lib/authClient'
import styles from './SignIn.module.css'

export default function SignIn() {
  const navigate = useNavigate()

  const handleGitHubSignIn = async () => {
    await authClient.signIn.social({
      provider: 'github',
      callbackURL: '/dashboard',
    })
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.authContainer}>
          <h2 style={{ marginBottom: 'var(--space-md)' }}>PUBLISHER ACCESS</h2>
          <p className={styles.description}>
            Sign in to manage and publish your configuration bundles.
          </p>
          <button onClick={handleGitHubSignIn} className={styles.btnPrimary}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.05-.015-2.055-3.33.72-4.035-1.605-4.035-1.605-.54-1.38-1.335-1.755-1.335-1.755-1.087-.735.084-.72.084-.72 1.2.09 1.83 1.23 1.83 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.765.42-1.305.765-1.605-2.655-.3-5.445-1.32-5.445-5.88 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405 1.02 0 2.04.135 3 .405 2.28-1.545 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.56-2.805 5.565-5.475 5.865.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Sign in with GitHub
          </button>
        </div>
      </div>
    </div>
  )
}


export default function SignIn({ onLogin }: SignInProps) {
  const navigate = useNavigate()

  const handleLogin = () => {
    onLogin()
    navigate('/dashboard')
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.authContainer}>
          <h2 style={{ marginBottom: 'var(--space-md)' }}>PUBLISHER ACCESS</h2>
          <p className={styles.description}>
            Sign in to manage and publish your configuration bundles.
          </p>
          <button onClick={handleLogin} className={styles.btnPrimary}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.05-.015-2.055-3.33.72-4.035-1.605-4.035-1.605-.54-1.38-1.335-1.755-1.335-1.755-1.087-.735.084-.72.084-.72 1.2.09 1.83 1.23 1.83 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.765.42-1.305.765-1.605-2.655-.3-5.445-1.32-5.445-5.88 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405 1.02 0 2.04.135 3 .405 2.28-1.545 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.56-2.805 5.565-5.475 5.865.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Sign in with GitHub
          </button>
        </div>
      </div>
    </div>
  )
}
