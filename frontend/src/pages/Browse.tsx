import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchBundles, type BrowseSort } from '../api/bundles'
import BundleCard, { type BundleCardData } from '../components/BundleCard'
import useDebouncedValue from '../hooks/useDebouncedValue'
import styles from './Browse.module.css'

const DEFAULT_TAG_OPTIONS = ['minimal', 'theme', 'productivity', 'terminal', 'workflow', 'ai']

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

  const qFromUrl = searchParams.get('q') ?? ''
  const selectedTags = normalizeValues(searchParams.getAll('tag'))
  const selectedArtifactTypes = normalizeValues(searchParams.getAll('type'))
  const opencode = searchParams.get('opencode') ?? ''
  const sort: BrowseSort = searchParams.get('sort') === 'newest' ? 'newest' : 'newest'

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_DELAY_MS)

  const tagOptions = useMemo(
    () => Array.from(new Set([...DEFAULT_TAG_OPTIONS, ...selectedTags])).sort(),
    [selectedTags],
  )
  const selectedTagSet = useMemo(() => new Set(selectedTags), [selectedTags])
  const selectedArtifactTypeSet = useMemo(() => new Set(selectedArtifactTypes), [selectedArtifactTypes])

  const selectedTagsKey = selectedTags.join('|')
  const selectedArtifactTypesKey = selectedArtifactTypes.join('|')
  const activeFilterCount = selectedTags.length + selectedArtifactTypes.length + (opencode ? 1 : 0)

  const statusText = `INDEX STATUS: ONLINE | BUNDLES: ${bundles.length} | FILTERS: ${activeFilterCount}`

  useEffect(() => {
    if (searchParams.get('sort')) {
      return
    }

    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams)
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
            tags: selectedTags,
            artifactTypes: selectedArtifactTypes,
            opencode,
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
  }, [qFromUrl, selectedTagsKey, selectedArtifactTypesKey, opencode, sort])

  const handleToggleTag = (tag: string) => {
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams)
      const nextTags = toggleValue(normalizeValues(previousParams.getAll('tag')), tag)
      updateListParam(nextParams, 'tag', nextTags)
      return nextParams
    })
  }

  const handleToggleArtifactType = (artifactType: string) => {
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams)
      const nextTypes = toggleValue(normalizeValues(previousParams.getAll('type')), artifactType)
      updateListParam(nextParams, 'type', nextTypes)
      return nextParams
    })
  }

  const handleOpencodeChange = (value: string) => {
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams)
      const nextValue = value.trim()

      if (nextValue.length > 0) {
        nextParams.set('opencode', nextValue)
      } else {
        nextParams.delete('opencode')
      }

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
      nextParams.delete('tag')
      nextParams.delete('type')
      nextParams.delete('opencode')
      nextParams.set('sort', 'newest')
      return nextParams
    })
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.headerRow}>
          <h2 style={{ marginBottom: 0 }}>BROWSE BUNDLES</h2>
          <span className={styles.statusText}>{statusText}</span>
        </div>

        <section className={styles.controlsPanel}>
          <div className={styles.controlGroup}>
            <label htmlFor="bundle-search" className={styles.controlLabel}>TEXT SEARCH</label>
            <input
              id="bundle-search"
              className={styles.controlInput}
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="name, summary, or tag"
            />
          </div>

          <div className={styles.controlRow}>
            <div className={styles.controlGroup}>
              <label htmlFor="opencode-filter" className={styles.controlLabel}>OPENCODE COMPAT</label>
              <input
                id="opencode-filter"
                className={styles.controlInput}
                type="text"
                value={opencode}
                onChange={(event) => handleOpencodeChange(event.target.value)}
                placeholder="e.g. 1.0 or >=1.0"
              />
            </div>

            <div className={styles.controlGroup}>
              <label htmlFor="sort-filter" className={styles.controlLabel}>SORT</label>
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
              <button
                type="button"
                className={styles.clearButton}
                onClick={handleClearFilters}
              >
                Clear all filters
              </button>
            </div>
          </div>

          <div className={styles.filterGrid}>
            <fieldset className={styles.filterGroup}>
              <legend className={styles.controlLabel}>TAGS</legend>
              <div className={styles.optionGrid}>
                {tagOptions.map((tag) => (
                  <label key={tag} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkboxInput}
                      checked={selectedTagSet.has(tag)}
                      onChange={() => handleToggleTag(tag)}
                    />
                    <span>{tag}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.filterGroup}>
              <legend className={styles.controlLabel}>ARTIFACT TYPES</legend>
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
        </section>

        {loading && (
          <div className={styles.statePanel}>Loading bundles...</div>
        )}

        {!loading && error && (
          <div className={styles.statePanel}>Error: {error}</div>
        )}

        {!loading && !error && bundles.length === 0 && (
          <div className={styles.statePanel}>No bundles found for the current query.</div>
        )}

        {!loading && !error && bundles.length > 0 && (
          <div className={styles.bundleGrid}>
            {bundles.map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
