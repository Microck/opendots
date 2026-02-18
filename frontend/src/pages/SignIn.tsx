import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { authClient } from '../lib/authClient'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { scaleInBlur, fadeInUp, staggerContainer } from '../styles/animations'
import styles from './SignIn.module.css'

export default function SignIn() {
  const prefersReducedMotion = useReducedMotion()
  const location = useLocation()
  const [signingIn, setSigningIn] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const oauthError = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('error')
  }, [location.search])

  const oauthMessage = useMemo(() => {
    if (!oauthError) return null
    if (oauthError === 'invalid_code') {
      return 'GitHub could not complete the OAuth handshake. Most commonly this means GitHub OAuth credentials (client ID/secret/callback URL) do not match. It can also be transient network instability. Please retry, and if it persists, verify OAuth app settings.'
    }
    return `GitHub sign-in failed (${oauthError}). Please try again.`
  }, [oauthError])

  const v = (variants: import('motion/react').Variants) =>
    prefersReducedMotion ? undefined : variants

  const handleGitHubSignIn = async () => {
    if (signingIn) return
    setSigningIn(true)
    setRequestError(null)
    try {
      const result = await Promise.race([
        authClient.signIn.social({
          provider: 'github',
          callbackURL: '/dashboard',
          scopes: ['read:user', 'public_repo'],
          disableRedirect: true,
        }),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('SIGN_IN_TIMEOUT')), 10000)
        }),
      ])

      const maybe = result as unknown
      const redirectUrl =
        typeof maybe === 'object' && maybe !== null
          ? ((maybe as { url?: unknown; data?: { url?: unknown } }).url as string | undefined) ||
            ((maybe as { data?: { url?: unknown } }).data?.url as string | undefined)
          : undefined

      if (redirectUrl) {
        window.location.assign(redirectUrl)
        return
      }

      setRequestError('GitHub sign-in could not start. Please retry in a few seconds.')
      setSigningIn(false)
    } catch (error) {
      const isTimeout = error instanceof Error && error.message === 'SIGN_IN_TIMEOUT'
      setRequestError(
        isTimeout
          ? 'GitHub sign-in request timed out. Please check your connection and try again.'
          : 'Could not start GitHub sign-in. Check your connection and try again.'
      )
      setSigningIn(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <motion.div
          className={styles.authContainer}
          variants={v(scaleInBlur)}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={v(staggerContainer)} initial="hidden" animate="visible">
            <motion.h2
              style={{ marginBottom: 'var(--space-md)' }}
              variants={v(fadeInUp)}
            >
              PUBLISHER ACCESS
            </motion.h2>
            <motion.p className={styles.description} variants={v(fadeInUp)}>
              Sign in to manage and publish your configuration bundles.
            </motion.p>
            {oauthMessage ? (
              <motion.div className={styles.errorCard} variants={v(fadeInUp)}>
                {oauthMessage}
              </motion.div>
            ) : null}
            {requestError ? (
              <motion.div className={styles.errorCard} variants={v(fadeInUp)}>
                {requestError}
              </motion.div>
            ) : null}
            <motion.button
              onClick={handleGitHubSignIn}
              className={styles.btnPrimary}
              disabled={signingIn}
              variants={v(fadeInUp)}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.05-.015-2.055-3.33.72-4.035-1.605-4.035-1.605-.54-1.38-1.335-1.755-1.335-1.755-1.087-.735.084-.72.084-.72 1.2.09 1.83 1.23 1.83 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.765.42-1.305.765-1.605-2.655-.3-5.445-1.32-5.445-5.88 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405 1.02 0 2.04.135 3 .405 2.28-1.545 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.56-2.805 5.565-5.475 5.865.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              {signingIn ? 'Redirecting to GitHub...' : 'Sign in with GitHub'}
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
