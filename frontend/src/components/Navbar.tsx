import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useState, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, SplitText } from '../lib/gsap'
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

function AnimatedNavLink({ 
  children, 
  to, 
  disabled 
}: { 
  children: string
  to: string
  disabled?: boolean 
}) {
  const linkRef = useRef<HTMLAnchorElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useGSAP(() => {
    if (prefersReducedMotion || disabled) return
    if (!linkRef.current) return

    const link = linkRef.current
    const split = new SplitText(link, { type: 'chars' })
    const chars = split.chars

    const handleEnter = () => {
      gsap.to(chars, {
        y: -3,
        duration: 0.2,
        ease: 'power2.out',
        stagger: { each: 0.015, from: 'start' },
      })
    }

    const handleLeave = () => {
      gsap.to(chars, {
        y: 0,
        duration: 0.2,
        ease: 'power2.out',
        stagger: { each: 0.01, from: 'end' },
      })
    }

    link.addEventListener('mouseenter', handleEnter)
    link.addEventListener('mouseleave', handleLeave)

    return () => {
      link.removeEventListener('mouseenter', handleEnter)
      link.removeEventListener('mouseleave', handleLeave)
      split.revert()
    }
  }, { scope: linkRef, dependencies: [children, prefersReducedMotion, disabled] })

  return (
    <Link ref={linkRef} to={to} className={styles.navItem}>
      {children}
    </Link>
  )
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
            <AnimatedNavLink to="/">Home</AnimatedNavLink>
          </motion.div>
          <motion.div variants={prefersReducedMotion ? undefined : navItem}>
            <AnimatedNavLink to="/browse">Browse</AnimatedNavLink>
          </motion.div>
          <motion.div variants={prefersReducedMotion ? undefined : navItem}>
            <AnimatedNavLink to="/docs">Docs</AnimatedNavLink>
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
