import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { fetchBundles, type BrowseSort } from '../api/bundles'
import BundleCard, { type BundleCardData } from '../components/BundleCard'
import useDebouncedValue from '../hooks/useDebouncedValue'
import { useReducedMotion } from '../hooks/useReducedMotion'
import useReactiveSurfaceVars from '../hooks/useReactiveSurfaceVars'
import {
  fadeInDown,
  staggerGrid,
  staggerItemBlur,
  sectionReveal,
  drawLine,
  scrollViewports,
} from '../styles/animations'
import styles from './Browse.module.css'
import ClickSpark from '../reactbits/ClickSpark'

const ARTIFACT_TYPE_OPTIONS = [
  'themes',
  'commands',
  'agents',
  'modes',
  'skills',
  'plugins',
  'tools',
  'rules',
  'config',
]

const SEARCH_DEBOUNCE_DELAY_MS = 300

function normalizeValues(values: string[]): string[] {
  const normalized = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  return Array.from(new Set(normalized))
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value]
}

function updateListParam(searchParams: URLSearchParams, key: string, values: string[]) {
  searchParams.delete(key)

  for (const value of values) {
    searchParams.append(key, value)
  }
}

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [bundles, setBundles] = useState<BundleCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '')
  const prefersReducedMotion = useReducedMotion()
  const mastheadRef = useReactiveSurfaceVars<HTMLDivElement>(!prefersReducedMotion, {
    shiftX: 18,
    shiftY: 12,
    spotRange: 14,
    basePulseOpacity: 0.18,
    energyPulseOpacity: 0.22,
    energyScale: 0.12,
    maxEnergy: 1.4,
  })

  const qFromUrl = searchParams.get('q') ?? ''
  const selectedArtifactTypes = useMemo(
    () => normalizeValues(searchParams.getAll('type')),
    [searchParams],
  )
  const sort: BrowseSort = searchParams.get('sort') === 'newest' ? 'newest' : 'newest'

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_DELAY_MS)

  const selectedArtifactTypeSet = useMemo(() => new Set(selectedArtifactTypes), [selectedArtifactTypes])

  const selectedArtifactTypesKey = selectedArtifactTypes.join('|')
  const activeFilterCount = (qFromUrl.trim().length > 0 ? 1 : 0) + selectedArtifactTypes.length

  const statusText = `INDEX STATUS: ONLINE | BUNDLES: ${bundles.length} | FILTERS: ${activeFilterCount}`

  useEffect(() => {
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams)

      // Tags + version filtering were removed from Browse.
      nextParams.delete('tag')
      nextParams.delete('opencode')

      if (nextParams.get('sort')) {
        return nextParams
      }
      nextParams.set('sort', 'newest')
      return nextParams
    }, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    setSearchInput(qFromUrl)
  }, [qFromUrl])

  useEffect(() => {
    const nextSearch = debouncedSearch.trim()
    const currentSearch = qFromUrl.trim()

    if (nextSearch === currentSearch) {
      return
    }

    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams)

      if (nextSearch.length > 0) {
        nextParams.set('q', nextSearch)
      } else {
        nextParams.delete('q')
      }

      return nextParams
    })
  }, [debouncedSearch, qFromUrl, setSearchParams])

  useEffect(() => {
    const abortController = new AbortController()

    const loadBundles = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchBundles(
          {
            q: qFromUrl,
            artifactTypes: selectedArtifactTypes,
            sort,
          },
          abortController.signal,
        )

        setBundles(data)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }

        setBundles([])
        setError(err instanceof Error ? err.message : 'Failed to load bundles')
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadBundles()

    return () => {
      abortController.abort()
    }
  }, [qFromUrl, selectedArtifactTypes, sort, selectedArtifactTypesKey, setSearchParams])

  const handleToggleArtifactType = (artifactType: string) => {
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams)
      const nextTypes = toggleValue(normalizeValues(previousParams.getAll('type')), artifactType)
      updateListParam(nextParams, 'type', nextTypes)
      return nextParams
    })
  }

  const handleSortChange = (value: BrowseSort) => {
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams)
      nextParams.set('sort', value)
      return nextParams
    })
  }

  const handleClearFilters = () => {
    setSearchInput('')

    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams)
      nextParams.delete('q')
      nextParams.delete('type')
      nextParams.set('sort', 'newest')
      return nextParams
    })
  }

  // Helper: returns variants only when motion is allowed
  const v = (variants: import('motion/react').Variants) =>
    prefersReducedMotion ? undefined : variants

  return (
    <div className={styles.page}>
      <div className="container">
        <section className={styles.masthead} ref={mastheadRef}>
          <div className={styles.mastheadBlueprint} aria-hidden />

          {/* Header with line draw */}
          <motion.div
            className={styles.headerRow}
            variants={v(fadeInDown)}
            initial="hidden"
            animate="visible"
          >
            <h2 style={{ marginBottom: 0 }}>BROWSE BUNDLES</h2>
            <span className={styles.statusText}>{statusText}</span>
          </motion.div>

          <motion.div
            className={styles.headerRule}
            variants={v(drawLine)}
            initial="hidden"
            animate="visible"
            style={{ transformOrigin: 'left center' }}
          />
        </section>

        {/* Controls panel with blur-in */}
        <motion.section
          className={styles.controlsPanel}
          variants={v(sectionReveal)}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
        >
          <div className={styles.controlGroup}>
            <label htmlFor="bundle-search" className={styles.controlLabel} data-gsap="text">TEXT SEARCH</label>
            <input
              id="bundle-search"
              className={styles.controlInput}
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="name or summary"
            />
          </div>

          <div className={styles.controlRow}>
            <div className={styles.controlGroup}>
              <label htmlFor="sort-filter" className={styles.controlLabel} data-gsap="text">SORT</label>
              <select
                id="sort-filter"
                className={styles.controlSelect}
                value={sort}
                onChange={(event) => handleSortChange(event.target.value as BrowseSort)}
              >
                <option value="newest">Newest</option>
              </select>
            </div>

            <div className={styles.controlActions}>
              <ClickSpark sparkColor="rgba(255,255,255,0.9)" sparkSize={8} sparkRadius={10}>
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={handleClearFilters}
                >
                  Clear all filters
                </button>
              </ClickSpark>
            </div>
          </div>

          <div className={styles.filterGrid}>
            <fieldset className={styles.filterGroup}>
              <legend className={styles.controlLabel} data-gsap="text">ARTIFACT TYPES</legend>
              <div className={styles.optionGrid}>
                {ARTIFACT_TYPE_OPTIONS.map((artifactType) => (
                  <label key={artifactType} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkboxInput}
                      checked={selectedArtifactTypeSet.has(artifactType)}
                      onChange={() => handleToggleArtifactType(artifactType)}
                    />
                    <span>{artifactType}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </motion.section>

        {loading && (
          <motion.div
            className={styles.statePanel}
            initial={prefersReducedMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            Loading bundles...
          </motion.div>
        )}

        {!loading && error && (
          <motion.div
            className={styles.statePanel}
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Error: {error}
          </motion.div>
        )}

        {!loading && !error && bundles.length === 0 && (
          <motion.div
            className={styles.statePanel}
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            No bundles found for the current query.
          </motion.div>
        )}

        {!loading && !error && bundles.length > 0 && (
          <motion.div
            className={styles.bundleGrid}
            variants={v(staggerGrid)}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewports.once}
          >
            {bundles.map((bundle) => (
              <motion.div
                key={bundle.id}
                variants={v(staggerItemBlur)}
              >
                <BundleCard bundle={bundle} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
