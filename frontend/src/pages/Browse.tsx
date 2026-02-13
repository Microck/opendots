import { useState } from 'react'
import BundleCard, { type BundleCardData } from '../components/BundleCard'
import styles from './Browse.module.css'

const allBundles: BundleCardData[] = [
  {
    id: 'data-sci-kit',
    name: 'Data-Sci-Kit',
    version: 'v1.4',
    summary: 'Python data science configuration with Jupyter integration.',
    tags: ['Config', 'Python'],
    riskBadges: ['SHELL'],
    stars: '210',
    updated: '3h ago',
  },
  {
    id: 'minimal-writer',
    name: 'Minimal-Writer',
    version: 'v0.2',
    summary: 'Distraction free mode for markdown editing.',
    tags: ['Mode', 'Writing'],
    stars: '45',
    updated: '1w ago',
  },
  {
    id: 'auto-format',
    name: 'Auto-Format',
    version: 'v3.0',
    summary: 'Prettier and ESLint distinct configuration.',
    tags: ['Tool', 'JS'],
    stars: '890',
    updated: '2d ago',
  },
]

const artifactTypes = ['Themes', 'Commands', 'Agents', 'Tools']

export default function Browse() {
  const [search, setSearch] = useState('')
  const [checkedTypes, setCheckedTypes] = useState<Record<string, boolean>>({})

  const toggleType = (type: string) => {
    setCheckedTypes(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const filtered = allBundles.filter(b => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !b.summary.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className={styles.page}>
      <div className="container">
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>BROWSE BUNDLES</h2>
        <div className={styles.browseLayout}>
          <aside className={styles.filters}>
            <input
              type="text"
              placeholder="Search bundles..."
              className={styles.searchInput}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <div>
              <span className={styles.filterGroupTitle}>Artifact Type</span>
              {artifactTypes.map(type => (
                <label key={type} className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={!!checkedTypes[type]}
                    onChange={() => toggleType(type)}
                  />
                  {type}
                </label>
              ))}
            </div>

            <div>
              <span className={styles.filterGroupTitle}>Sort</span>
              <select className={styles.sortSelect}>
                <option>Newest</option>
                <option>Most Stars</option>
              </select>
            </div>

            <div className={styles.statusBar}>
              <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                INDEX STATUS: ONLINE
              </span>
            </div>
          </aside>

          <div className={styles.bundleGrid}>
            {filtered.map(b => (
              <BundleCard key={b.id} bundle={b} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
