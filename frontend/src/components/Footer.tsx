import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.content}`}>
        <div>
          <span className={styles.logo}>OPENDOTS</span>
          <span className={styles.copy}>
            &copy; 2026 OPENCODE REGISTRY<br />
            DESIGNED FOR FUNCTION
          </span>
        </div>
        <div className={styles.links}>
          <a href="https://github.com" className={styles.link}>GitHub</a>
          <a href="#" className={styles.link}>API</a>
          <a href="#" className={styles.link}>Status</a>
        </div>
      </div>
    </footer>
  )
}
