import { motion } from 'motion/react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { fadeInUp, staggerContainer, staggerItem, drawLine } from '../styles/animations'
import styles from './Footer.module.css'

export default function Footer() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.footer
      className={styles.footer}
      initial="hidden"
      animate="visible"
      variants={prefersReducedMotion ? undefined : staggerContainer}
    >
      {/* Animated top rule */}
      <motion.div
        className={styles.topRule}
        variants={prefersReducedMotion ? undefined : drawLine}
        style={{ transformOrigin: 'left center' }}
      />

      <div className={`container ${styles.content}`}>
        <motion.div variants={prefersReducedMotion ? undefined : fadeInUp}>
          <span className={styles.logo}>OPENDOTS</span>
          <span className={styles.copy}>
            &copy; 2026 OPENDOTS<br />
            CONFIG BUNDLE REGISTRY
          </span>
        </motion.div>
        <motion.div
          className={styles.links}
          variants={prefersReducedMotion ? undefined : staggerContainer}
        >
          <motion.a href="/docs" className={styles.link} variants={prefersReducedMotion ? undefined : staggerItem}>
            Docs
          </motion.a>
          <motion.a href="/PUBLISH.md" className={styles.link} variants={prefersReducedMotion ? undefined : staggerItem}>
            Publish
          </motion.a>
          <motion.a href="/INSTALL.md" className={styles.link} variants={prefersReducedMotion ? undefined : staggerItem}>
            Install
          </motion.a>
          <motion.a href="/PRIVACY.md" className={styles.link} variants={prefersReducedMotion ? undefined : staggerItem}>
            Privacy
          </motion.a>
          <motion.a href="/TERMS.md" className={styles.link} variants={prefersReducedMotion ? undefined : staggerItem}>
            Terms
          </motion.a>
        </motion.div>
      </div>
      
      <div className={`container ${styles.bottom}`}>
        <span className={styles.contact}>
          <a href="mailto:contact@micr.dev">contact@micr.dev</a>
        </span>
        <span className={styles.github}>
          <a href="https://github.com/Microck/opendots" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </span>
      </div>
    </motion.footer>
  )
}
