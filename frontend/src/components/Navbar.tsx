import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useState } from 'react'
import { authClient } from '../lib/authClient'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { navSlideDown, navStagger, navItem } from '../styles/animations'
import ClickSpark from '../reactbits/ClickSpark'
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
  const prefersReducedMotion = useReducedMotion()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await authClient.signOut()
    } finally {
      window.location.assign('/signin?signed_out=1')
    }
  }

  return (
    <motion.nav
      className={styles.navbar}
      variants={prefersReducedMotion ? undefined : navSlideDown}
      initial="hidden"
      animate="visible"
    >
      <div className={`container ${styles.navInner}`}>
        <Link
          to="/"
          className={styles.navLogo}
        >
          OPENDOTS
        </Link>
        <motion.div
          className={styles.navLinks}
          variants={prefersReducedMotion ? undefined : navStagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={prefersReducedMotion ? undefined : navItem}>
            <Link to="/" className={styles.navItem}>Home</Link>
          </motion.div>
          <motion.div variants={prefersReducedMotion ? undefined : navItem}>
            <Link to="/browse" className={styles.navItem}>Browse</Link>
          </motion.div>
          <motion.div variants={prefersReducedMotion ? undefined : navItem}>
            <Link to="/docs" className={styles.navItem}>Docs</Link>
          </motion.div>
          {isLoggedIn ? (
            <>
              <motion.button
                className={styles.authBtn}
                onClick={() => navigate('/dashboard')}
                variants={prefersReducedMotion ? undefined : navItem}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              >
                <ClickSpark disabled={prefersReducedMotion} sparkColor="rgba(255,255,255,0.9)" sparkSize={10} sparkRadius={12}>
                  <span>{user?.name || 'Dashboard'}</span>
                </ClickSpark>
              </motion.button>
              <motion.button
                className={styles.authBtnOutline}
                onClick={handleSignOut}
                disabled={signingOut}
                variants={prefersReducedMotion ? undefined : navItem}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              >
                <ClickSpark disabled={prefersReducedMotion || signingOut} sparkColor="rgba(255,255,255,0.9)" sparkSize={10} sparkRadius={12}>
                  <span>{signingOut ? 'Signing Out...' : 'Sign Out'}</span>
                </ClickSpark>
              </motion.button>
            </>
          ) : (
            <motion.button
              className={styles.authBtnOutline}
              onClick={() => navigate('/signin')}
              variants={prefersReducedMotion ? undefined : navItem}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
            >
              <ClickSpark disabled={prefersReducedMotion} sparkColor="rgba(255,255,255,0.9)" sparkSize={10} sparkRadius={12}>
                <span>Sign In</span>
              </ClickSpark>
            </motion.button>
          )}
        </motion.div>
      </div>
    </motion.nav>
  )
}
