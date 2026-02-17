import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import styles from './NotFound.module.css'

export default function NotFound() {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <div className={styles.container}>
      <motion.div
        className={styles.content}
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>PAGE NOT FOUND</h2>
        <p className={styles.description}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className={styles.homeLink}>
          RETURN TO HOME
        </Link>
      </motion.div>
    </div>
  )
}
