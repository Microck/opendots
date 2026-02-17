import { useMemo } from 'react'

import { useReducedMotion } from '../hooks/useReducedMotion'
import Squares from '../reactbits/Squares'
import Noise from '../reactbits/Noise'
import styles from './ReactBitsBackdrop.module.css'

export default function ReactBitsBackdrop() {
  const prefersReducedMotion = useReducedMotion()

  const squares = useMemo(
    () => (
      <Squares
        direction="diagonal"
        speed={prefersReducedMotion ? 0 : 0.25}
        squareSize={64}
        borderColor="rgba(255,255,255,0.12)"
        hoverFillColor="rgba(128,220,255,0.09)"
        interactive={!prefersReducedMotion}
        className={styles.squares}
      />
    ),
    [prefersReducedMotion]
  )

  return (
    <div className={`appBackdrop ${styles.backdrop}`} aria-hidden>
      <div className={styles.layers}>
        {squares}
        <Noise patternRefreshInterval={prefersReducedMotion ? 6 : 2} patternAlpha={36} />
      </div>
    </div>
  )
}
