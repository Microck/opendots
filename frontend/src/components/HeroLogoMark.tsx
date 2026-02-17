import styles from './HeroLogoMark.module.css'

type HeroLogoMarkProps = {
  className?: string
}

export default function HeroLogoMark({ className }: HeroLogoMarkProps) {
  return (
    <div className={`${styles.wrap}${className ? ` ${className}` : ''}`} aria-hidden>
      <div className={styles.stage}>
        <div className={`${styles.layer} ${styles.layerBack}`} />
        <div className={`${styles.layer} ${styles.layerExtrude}`} />
        <div className={`${styles.layer} ${styles.layerFront}`} />
        <div className={styles.spark} />
      </div>
    </div>
  )
}
