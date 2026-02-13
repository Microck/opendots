import { Link, useNavigate } from 'react-router-dom'
import { authClient } from '../lib/authClient'
import styles from './Navbar.module.css'

interface SessionUser {
  id: string
  name: string
  email: string
  image: string | null
}

interface NavbarProps {
  isLoggedIn: boolean
  user: SessionUser | null
}

export default function Navbar({ isLoggedIn, user }: NavbarProps) {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await authClient.signOut()
    navigate('/')
  }

  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.navInner}`}>
        <Link to="/" className={styles.navLogo}>OPENDOTS</Link>
        <div className={styles.navLinks}>
          <Link to="/" className={styles.navItem}>Home</Link>
          <Link to="/browse" className={styles.navItem}>Browse</Link>
          <Link to="/docs" className={styles.navItem}>Docs</Link>
          {isLoggedIn ? (
            <>
              <button
                className={styles.authBtn}
                onClick={() => navigate('/dashboard')}
              >
                {user?.name || 'Dashboard'}
              </button>
              <button
                className={styles.authBtnOutline}
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              className={styles.authBtnOutline}
              onClick={() => navigate('/signin')}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
