import { useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react'
import {
  readAsciiHeroDebugSettings,
  writeAsciiHeroDebugSettings,
  resetAsciiHeroDebugSettings,
  type AsciiHeroDebugSettings,
} from '../lib/heroDebug'

type FontRole = 'display' | 'accent' | 'body' | 'mono'
type FontCategory = 'display' | 'sans' | 'serif' | 'mono'
type FontSource = 'local' | 'google' | 'paid' | 'system' | 'custom'

interface FontOption {
  label: string
  value: string
  category: FontCategory
  source: FontSource
  google?: string
  weights?: string
}

const LOCAL_FONTS: FontOption[] = [
  { label: 'Fantasma', value: "'Fantasma', system-ui, sans-serif", category: 'display', source: 'local' },
  { label: 'Blotter', value: "'Blotter', system-ui, sans-serif", category: 'display', source: 'local' },
  { label: 'Ferrite Core DX', value: "'Ferrite Core DX', system-ui, sans-serif", category: 'sans', source: 'local' },
  { label: 'Space Mono', value: "'Space Mono', monospace", category: 'mono', source: 'local' },
]

const GOOGLE_FONTS: FontOption[] = [
  { label: 'Inter', value: "'Inter', sans-serif", google: 'Inter', weights: '300;400;500;600;700', category: 'sans', source: 'google' },
  { label: 'DM Sans', value: "'DM Sans', sans-serif", google: 'DM+Sans', weights: '300;400;500;600;700', category: 'sans', source: 'google' },
  { label: 'Manrope', value: "'Manrope', sans-serif", google: 'Manrope', weights: '300;400;500;600;700', category: 'sans', source: 'google' },
  { label: 'Outfit', value: "'Outfit', sans-serif", google: 'Outfit', weights: '300;400;500;600;700', category: 'display', source: 'google' },
  { label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif", google: 'Plus+Jakarta+Sans', weights: '300;400;500;600;700', category: 'sans', source: 'google' },
  { label: 'Work Sans', value: "'Work Sans', sans-serif", google: 'Work+Sans', weights: '300;400;500;600;700', category: 'sans', source: 'google' },
  { label: 'Rubik', value: "'Rubik', sans-serif", google: 'Rubik', weights: '300;400;500;600;700', category: 'sans', source: 'google' },
  { label: 'Nunito Sans', value: "'Nunito Sans', sans-serif", google: 'Nunito+Sans', weights: '300;400;500;600;700', category: 'sans', source: 'google' },
  { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif", google: 'Space+Grotesk', weights: '300;400;500;600;700', category: 'display', source: 'google' },
  { label: 'Instrument Sans', value: "'Instrument Sans', sans-serif", google: 'Instrument+Sans', weights: '400;500;600;700', category: 'sans', source: 'google' },
  { label: 'Archivo', value: "'Archivo', sans-serif", google: 'Archivo', weights: '300;400;500;600;700', category: 'sans', source: 'google' },
  { label: 'IBM Plex Sans', value: "'IBM Plex Sans', sans-serif", google: 'IBM+Plex+Sans', weights: '300;400;500;600;700', category: 'sans', source: 'google' },
  { label: 'Source Sans 3', value: "'Source Sans 3', sans-serif", google: 'Source+Sans+3', weights: '300;400;500;600;700', category: 'sans', source: 'google' },
  { label: 'Barlow', value: "'Barlow', sans-serif", google: 'Barlow', weights: '300;400;500;600;700', category: 'sans', source: 'google' },

  { label: 'Syne', value: "'Syne', sans-serif", google: 'Syne', weights: '400;500;600;700;800', category: 'display', source: 'google' },
  { label: 'Unbounded', value: "'Unbounded', sans-serif", google: 'Unbounded', weights: '300;400;500;600;700', category: 'display', source: 'google' },
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif", google: 'Bebas+Neue', weights: '400', category: 'display', source: 'google' },
  { label: 'Oswald', value: "'Oswald', sans-serif", google: 'Oswald', weights: '300;400;500;600;700', category: 'display', source: 'google' },
  { label: 'Rajdhani', value: "'Rajdhani', sans-serif", google: 'Rajdhani', weights: '300;400;500;600;700', category: 'display', source: 'google' },
  { label: 'Chakra Petch', value: "'Chakra Petch', sans-serif", google: 'Chakra+Petch', weights: '300;400;500;600;700', category: 'display', source: 'google' },
  { label: 'Orbitron', value: "'Orbitron', sans-serif", google: 'Orbitron', weights: '400;500;600;700', category: 'display', source: 'google' },
  { label: 'Exo 2', value: "'Exo 2', sans-serif", google: 'Exo+2', weights: '300;400;500;600;700', category: 'display', source: 'google' },
  { label: 'Audiowide', value: "'Audiowide', sans-serif", google: 'Audiowide', weights: '400', category: 'display', source: 'google' },
  { label: 'Oxanium', value: "'Oxanium', sans-serif", google: 'Oxanium', weights: '300;400;500;600;700', category: 'display', source: 'google' },
  { label: 'Saira', value: "'Saira', sans-serif", google: 'Saira', weights: '300;400;500;600;700', category: 'display', source: 'google' },
  { label: 'Big Shoulders Display', value: "'Big Shoulders Display', sans-serif", google: 'Big+Shoulders+Display', weights: '300;400;500;600;700', category: 'display', source: 'google' },

  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace", google: 'JetBrains+Mono', weights: '300;400;500;600;700', category: 'mono', source: 'google' },
  { label: 'Fira Code', value: "'Fira Code', monospace", google: 'Fira+Code', weights: '300;400;500;600;700', category: 'mono', source: 'google' },
  { label: 'IBM Plex Mono', value: "'IBM Plex Mono', monospace", google: 'IBM+Plex+Mono', weights: '300;400;500;600;700', category: 'mono', source: 'google' },
  { label: 'Source Code Pro', value: "'Source Code Pro', monospace", google: 'Source+Code+Pro', weights: '300;400;500;600;700', category: 'mono', source: 'google' },
  { label: 'Roboto Mono', value: "'Roboto Mono', monospace", google: 'Roboto+Mono', weights: '300;400;500;600;700', category: 'mono', source: 'google' },
  { label: 'Inconsolata', value: "'Inconsolata', monospace", google: 'Inconsolata', weights: '300;400;500;600;700', category: 'mono', source: 'google' },
  { label: 'Red Hat Mono', value: "'Red Hat Mono', monospace", google: 'Red+Hat+Mono', weights: '300;400;500;600;700', category: 'mono', source: 'google' },
]

const REDDIT_PAID_FONTS: FontOption[] = [
  { label: 'Akkurat', value: "'Akkurat', sans-serif", category: 'sans', source: 'paid' },
  { label: 'Akkurat Mono', value: "'Akkurat Mono', monospace", category: 'mono', source: 'paid' },
  { label: 'DIN 2014', value: "'DIN 2014', sans-serif", category: 'sans', source: 'paid' },
  { label: 'FF DIN', value: "'FF DIN', sans-serif", category: 'sans', source: 'paid' },
  { label: 'DIN Condensed', value: "'DIN Condensed', sans-serif", category: 'display', source: 'paid' },
  { label: 'Eurostile', value: "'Eurostile', sans-serif", category: 'display', source: 'paid' },
  { label: 'Bank Gothic', value: "'Bank Gothic', sans-serif", category: 'display', source: 'paid' },
  { label: 'Microgramma', value: "'Microgramma', sans-serif", category: 'display', source: 'paid' },
  { label: 'Klavika', value: "'Klavika', sans-serif", category: 'display', source: 'paid' },
  { label: 'The Future', value: "'The Future', sans-serif", category: 'display', source: 'paid' },
  { label: 'Kontrapunkt', value: "'Kontrapunkt', serif", category: 'serif', source: 'paid' },
  { label: 'Purista', value: "'Purista', sans-serif", category: 'display', source: 'paid' },
  { label: 'Vafle', value: "'Vafle', sans-serif", category: 'display', source: 'paid' },
  { label: 'Benchmark', value: "'Benchmark', sans-serif", category: 'display', source: 'paid' },
  { label: 'Beau Sans', value: "'Beau Sans', sans-serif", category: 'display', source: 'paid' },
  { label: 'Blender', value: "'Blender', sans-serif", category: 'display', source: 'paid' },
  { label: 'QType', value: "'QType', sans-serif", category: 'display', source: 'paid' },
  { label: 'T-Star Mono', value: "'T-Star Mono', monospace", category: 'mono', source: 'paid' },
  { label: 'Biome', value: "'Biome', sans-serif", category: 'display', source: 'paid' },
  { label: 'Input Mono', value: "'Input Mono', monospace", category: 'mono', source: 'paid' },
  { label: 'Ingram Mono', value: "'Ingram Mono', monospace", category: 'mono', source: 'paid' },
  { label: 'AOT Serial Mono', value: "'AOT Serial Mono', monospace", category: 'mono', source: 'paid' },
  { label: 'Fairline Mono', value: "'Fairline Mono', monospace", category: 'mono', source: 'paid' },
  { label: 'OCR-B', value: "'OCR-B', monospace", category: 'mono', source: 'paid' },
  { label: 'FF Meta', value: "'FF Meta', sans-serif", category: 'sans', source: 'paid' },
  { label: 'Quadraat Sans', value: "'Quadraat Sans', sans-serif", category: 'sans', source: 'paid' },
  { label: 'Museo Sans', value: "'Museo Sans', sans-serif", category: 'sans', source: 'paid' },
  { label: 'Intel Clear Sans', value: "'Intel Clear Sans', sans-serif", category: 'sans', source: 'paid' },
]

const SYSTEM_FONTS: FontOption[] = [
  { label: 'System UI', value: 'system-ui, -apple-system, sans-serif', category: 'sans', source: 'system' },
  { label: 'System Mono', value: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", category: 'mono', source: 'system' },
  { label: 'Consolas', value: "Consolas, ui-monospace, monospace", category: 'mono', source: 'system' },
  { label: 'Cascadia Code', value: "'Cascadia Code', ui-monospace, monospace", category: 'mono', source: 'system' },
]

const CSS_VAR_MAP: Record<FontRole, string> = {
  display: '--font-display',
  accent: '--font-accent',
  body: '--font-body',
  mono: '--font-mono',
}

const DEFAULTS: Record<FontRole, string> = {
  display: "'Ferrite Core DX', system-ui, sans-serif",
  accent: "'Chakra Petch', 'Ferrite Core DX', system-ui, sans-serif",
  body: "'Chakra Petch', 'Ferrite Core DX', system-ui, sans-serif",
  mono: "'OCR-B', 'Space Mono', monospace",
}

const STORAGE_KEY = 'opendots-font-debug'
const CUSTOM_KEY = 'opendots-font-debug-custom'
const CUSTOM_LIST_KEY = 'opendots-font-debug-custom-list'

const loadedFonts = new Set<string>()

function loadGoogleFont(option: FontOption) {
  if (!option.google || loadedFonts.has(option.google)) return
  loadedFonts.add(option.google)
  const weights = option.weights || '400'
  const url = `https://fonts.googleapis.com/css2?family=${option.google}:wght@${weights}&display=swap`
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

function loadCustomFontFace(family: string, url: string) {
  if (!family || !url) return
  const id = `font-debug-${family.replace(/\s+/g, '-').toLowerCase()}`
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = `@font-face {\n  font-family: '${family}';\n  src: url('${url}');\n  font-display: swap;\n}`
  document.head.appendChild(style)
}

function findOption(value: string, options: FontOption[]): FontOption | undefined {
  return options.find(o => o.value === value)
}

function buildFilteredOptions(
  options: FontOption[],
  search: string,
  categoryFilter: string,
  sourceFilter: string
): FontOption[] {
  const normalized = search.trim().toLowerCase()
  return options.filter(opt => {
    const categoryOk = categoryFilter === 'all' || opt.category === categoryFilter
    const sourceOk = sourceFilter === 'all' || opt.source === sourceFilter
    const searchOk = !normalized || opt.label.toLowerCase().includes(normalized)
    return categoryOk && sourceOk && searchOk
  })
}

export default function FontDebug() {
  const [open, setOpen] = useState(false)
  const [selections, setSelections] = useState<Record<FontRole, string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULTS, ...parsed }
      }
    } catch { /* ignore */ }
    return { ...DEFAULTS }
  })

  const [customFamily, setCustomFamily] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [customOptions, setCustomOptions] = useState<FontOption[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_LIST_KEY)
      if (stored) return JSON.parse(stored)
    } catch { /* ignore */ }
    return []
  })

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [asciiSettings, setAsciiSettings] = useState<AsciiHeroDebugSettings>(() => readAsciiHeroDebugSettings())

  const options = useMemo(
    () => [...LOCAL_FONTS, ...GOOGLE_FONTS, ...REDDIT_PAID_FONTS, ...SYSTEM_FONTS, ...customOptions],
    [customOptions],
  )
  const filteredOptions = useMemo(
    () => buildFilteredOptions(options, search, categoryFilter, sourceFilter),
    [options, search, categoryFilter, sourceFilter],
  )

  const applyFonts = useCallback((sel: Record<FontRole, string>) => {
    const root = document.documentElement
    for (const role of Object.keys(CSS_VAR_MAP) as FontRole[]) {
      root.style.setProperty(CSS_VAR_MAP[role], sel[role])
    }
  }, [])

  useEffect(() => {
    applyFonts(selections)
    for (const role of Object.keys(selections) as FontRole[]) {
      const opt = findOption(selections[role], options)
      if (opt) loadGoogleFont(opt)
    }
    try {
      const storedCustom = localStorage.getItem(CUSTOM_KEY)
      if (storedCustom) {
        const { family, url } = JSON.parse(storedCustom)
        if (family && url) loadCustomFontFace(family, url)
      }
    } catch { /* ignore */ }
  }, [applyFonts, options, selections])

  const handleChange = (role: FontRole, value: string) => {
    const opt = findOption(value, options)
    if (opt) loadGoogleFont(opt)
    const next = { ...selections, [role]: value }
    setSelections(next)
    applyFonts(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const handleReset = () => {
    setSelections({ ...DEFAULTS })
    applyFonts(DEFAULTS)
    localStorage.removeItem(STORAGE_KEY)
  }

  const copyConfig = () => {
    const lines = (Object.keys(selections) as FontRole[]).map(
      role => `${role}: ${selections[role]}`
    )
    navigator.clipboard.writeText(lines.join('\n'))
  }

  const copyAsciiConfig = () => {
    const lines = [
      `characters: ${asciiSettings.characters}`,
      `resolution: ${asciiSettings.resolution}`,
      `spinSpeed: ${asciiSettings.spinSpeed}`,
      `tiltX: ${asciiSettings.tiltX}`,
      `tiltZ: ${asciiSettings.tiltZ}`,
      `outer: ${asciiSettings.outer}`,
      `border: ${asciiSettings.border}`,
      `inner: ${asciiSettings.inner}`,
      `depth: ${asciiSettings.depth}`,
      `cameraZ: ${asciiSettings.cameraZ}`,
      `fov: ${asciiSettings.fov}`,
    ]
    navigator.clipboard.writeText(lines.join('\n'))
  }

  const updateAsciiNumber = (key: keyof AsciiHeroDebugSettings, value: number) => {
    const next = writeAsciiHeroDebugSettings({ [key]: value })
    setAsciiSettings(next)
  }

  const updateAsciiCharacters = (characters: string) => {
    const next = writeAsciiHeroDebugSettings({ characters })
    setAsciiSettings(next)
  }

  const resetAscii = () => {
    const next = resetAsciiHeroDebugSettings()
    setAsciiSettings(next)
  }

  const applyCustom = (role: FontRole) => {
    const family = customFamily.trim()
    if (!family) return
    const fallback = role === 'mono' ? 'monospace' : 'sans-serif'
    const value = `'${family}', ${fallback}`

    if (customUrl.trim()) {
      loadCustomFontFace(family, customUrl.trim())
      localStorage.setItem(CUSTOM_KEY, JSON.stringify({ family, url: customUrl.trim() }))
    }

    const customOption: FontOption = {
      label: `Custom: ${family}`,
      value,
      category: role === 'mono' ? 'mono' : 'sans',
      source: 'custom',
    }
    const nextOptions = [customOption, ...customOptions.filter(o => o.value !== value)]
    setCustomOptions(nextOptions)
    localStorage.setItem(CUSTOM_LIST_KEY, JSON.stringify(nextOptions))

    handleChange(role, value)
  }

  const s: Record<string, CSSProperties> = {
    toggle: {
      position: 'fixed',
      bottom: 16,
      right: 16,
      zIndex: 99999,
      background: '#1a1a2e',
      color: '#fff',
      border: '1px solid #444',
      padding: '8px 14px',
      fontSize: '11px',
      fontFamily: 'ui-monospace, monospace',
      cursor: 'pointer',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
    panel: {
      position: 'fixed',
      bottom: 52,
      right: 16,
      zIndex: 99999,
      background: '#0d0d1a',
      border: '1px solid #333',
      padding: '16px',
      width: 380,
      maxHeight: '80vh',
      overflowY: 'auto',
      fontFamily: 'ui-monospace, monospace',
      fontSize: '11px',
      color: '#ccc',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    },
    title: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#fff',
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      borderBottom: '1px solid #333',
      paddingBottom: 8,
    },
    group: {
      marginBottom: 12,
    },
    label: {
      display: 'block',
      fontSize: '10px',
      color: '#888',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      marginBottom: 4,
    },
    select: {
      width: '100%',
      background: '#111',
      color: '#fff',
      border: '1px solid #444',
      padding: '6px 8px',
      fontSize: '11px',
      fontFamily: 'ui-monospace, monospace',
    },
    input: {
      width: '100%',
      background: '#111',
      color: '#fff',
      border: '1px solid #444',
      padding: '6px 8px',
      fontSize: '11px',
      fontFamily: 'ui-monospace, monospace',
    },
    preview: {
      marginTop: 4,
      padding: '4px 0',
      fontSize: '14px',
      color: '#fff',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    actions: {
      display: 'flex',
      gap: 8,
      marginTop: 12,
      paddingTop: 8,
      borderTop: '1px solid #333',
    },
    btn: {
      flex: 1,
      background: '#1a1a2e',
      color: '#aaa',
      border: '1px solid #444',
      padding: '6px',
      fontSize: '10px',
      fontFamily: 'ui-monospace, monospace',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      cursor: 'pointer',
    },
    filterRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      marginBottom: 8,
    },
    hint: {
      color: '#666',
      fontSize: '10px',
      marginTop: 4,
    },
    customRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
    },
    roleRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      marginTop: 6,
    },
    asciiGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
    },
    asciiCell: {
      marginBottom: 6,
    },
    value: {
      color: '#aaa',
      fontSize: '10px',
      marginTop: 3,
    },
  }

  const roles: { role: FontRole; hint: string }[] = [
    { role: 'display', hint: 'Logo, h1-h4' },
    { role: 'accent', hint: 'Nav, buttons, labels, chips' },
    { role: 'body', hint: 'Paragraphs, descriptions' },
    { role: 'mono', hint: 'Code, data values, inputs' },
  ]

  return (
    <>
      <button style={s.toggle} onClick={() => setOpen(v => !v)}>
        {open ? 'x close' : 'Aa debug'}
      </button>

      {open && (
        <div style={s.panel}>
          <div style={s.title}>Font Debug</div>

          <div style={s.group}>
            <label style={s.label}>Search</label>
            <input
              style={s.input}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search fonts"
            />
          </div>

          <div style={s.group}>
            <label style={s.label}>Filters</label>
            <div style={s.filterRow}>
              <select
                style={s.select}
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="all">All types</option>
                <option value="display">Display</option>
                <option value="sans">Sans</option>
                <option value="serif">Serif</option>
                <option value="mono">Mono</option>
              </select>

              <select
                style={s.select}
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
              >
                <option value="all">All sources</option>
                <option value="local">Local</option>
                <option value="google">Google</option>
                <option value="paid">Paid</option>
                <option value="system">System</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {roles.map(({ role, hint }) => (
            <div key={role} style={s.group}>
              <label style={s.label}>
                {role} <span style={{ color: '#555' }}>({hint})</span>
              </label>
              <select
                style={s.select}
                value={selections[role]}
                onChange={e => handleChange(role, e.target.value)}
              >
                {filteredOptions.map(o => (
                  <option key={`${o.source}-${o.label}-${o.value}`} value={o.value}>
                    {o.label} ({o.category}, {o.source})
                  </option>
                ))}
              </select>
              <div style={{ ...s.preview, fontFamily: selections[role] }}>
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
          ))}

          <div style={s.group}>
            <label style={s.label}>Custom Font</label>
            <div style={s.customRow}>
              <input
                style={s.input}
                value={customFamily}
                onChange={e => setCustomFamily(e.target.value)}
                placeholder="Family name"
              />
              <input
                style={s.input}
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="Font file URL"
              />
            </div>
            <div style={s.hint}>If URL is empty, it uses installed fonts. URL can be woff2, woff, ttf, otf.</div>
            <div style={s.roleRow}>
              <button style={s.btn} onClick={() => applyCustom('display')}>Apply display</button>
              <button style={s.btn} onClick={() => applyCustom('accent')}>Apply accent</button>
              <button style={s.btn} onClick={() => applyCustom('body')}>Apply body</button>
              <button style={s.btn} onClick={() => applyCustom('mono')}>Apply mono</button>
            </div>
          </div>

          <div style={s.actions}>
            <button style={s.btn} onClick={handleReset}>Reset</button>
            <button style={s.btn} onClick={copyConfig}>Copy config</button>
          </div>

          <div style={s.group}>
            <label style={s.label}>3D ASCII Hero</label>
            <div style={s.asciiCell}>
              <label style={s.label}>Characters</label>
              <input
                style={s.input}
                value={asciiSettings.characters}
                onChange={e => updateAsciiCharacters(e.target.value)}
                placeholder=" .:-+*=%@#"
              />
            </div>

            <div style={s.asciiGrid}>
              <div style={s.asciiCell}>
                <label style={s.label}>Resolution</label>
                <input
                  style={s.input}
                  type="range"
                  min={0.08}
                  max={0.45}
                  step={0.01}
                  value={asciiSettings.resolution}
                  onChange={e => updateAsciiNumber('resolution', Number(e.target.value))}
                />
                <div style={s.value}>{asciiSettings.resolution.toFixed(2)}</div>
              </div>

              <div style={s.asciiCell}>
                <label style={s.label}>Spin Speed</label>
                <input
                  style={s.input}
                  type="range"
                  min={0}
                  max={1.6}
                  step={0.01}
                  value={asciiSettings.spinSpeed}
                  onChange={e => updateAsciiNumber('spinSpeed', Number(e.target.value))}
                />
                <div style={s.value}>{asciiSettings.spinSpeed.toFixed(2)}</div>
              </div>

              <div style={s.asciiCell}>
                <label style={s.label}>Tilt X</label>
                <input
                  style={s.input}
                  type="range"
                  min={0}
                  max={0.7}
                  step={0.01}
                  value={asciiSettings.tiltX}
                  onChange={e => updateAsciiNumber('tiltX', Number(e.target.value))}
                />
                <div style={s.value}>{asciiSettings.tiltX.toFixed(2)}</div>
              </div>

              <div style={s.asciiCell}>
                <label style={s.label}>Tilt Z</label>
                <input
                  style={s.input}
                  type="range"
                  min={0}
                  max={0.7}
                  step={0.01}
                  value={asciiSettings.tiltZ}
                  onChange={e => updateAsciiNumber('tiltZ', Number(e.target.value))}
                />
                <div style={s.value}>{asciiSettings.tiltZ.toFixed(2)}</div>
              </div>

              <div style={s.asciiCell}>
                <label style={s.label}>Outer Size</label>
                <input
                  style={s.input}
                  type="range"
                  min={1.2}
                  max={3.5}
                  step={0.01}
                  value={asciiSettings.outer}
                  onChange={e => updateAsciiNumber('outer', Number(e.target.value))}
                />
                <div style={s.value}>{asciiSettings.outer.toFixed(2)}</div>
              </div>

              <div style={s.asciiCell}>
                <label style={s.label}>Border</label>
                <input
                  style={s.input}
                  type="range"
                  min={0.15}
                  max={1.4}
                  step={0.01}
                  value={asciiSettings.border}
                  onChange={e => updateAsciiNumber('border', Number(e.target.value))}
                />
                <div style={s.value}>{asciiSettings.border.toFixed(2)}</div>
              </div>

              <div style={s.asciiCell}>
                <label style={s.label}>Inner Size</label>
                <input
                  style={s.input}
                  type="range"
                  min={0.12}
                  max={1.6}
                  step={0.01}
                  value={asciiSettings.inner}
                  onChange={e => updateAsciiNumber('inner', Number(e.target.value))}
                />
                <div style={s.value}>{asciiSettings.inner.toFixed(2)}</div>
              </div>

              <div style={s.asciiCell}>
                <label style={s.label}>Depth</label>
                <input
                  style={s.input}
                  type="range"
                  min={0.15}
                  max={1.4}
                  step={0.01}
                  value={asciiSettings.depth}
                  onChange={e => updateAsciiNumber('depth', Number(e.target.value))}
                />
                <div style={s.value}>{asciiSettings.depth.toFixed(2)}</div>
              </div>

              <div style={s.asciiCell}>
                <label style={s.label}>Camera Z</label>
                <input
                  style={s.input}
                  type="range"
                  min={4}
                  max={12}
                  step={0.1}
                  value={asciiSettings.cameraZ}
                  onChange={e => updateAsciiNumber('cameraZ', Number(e.target.value))}
                />
                <div style={s.value}>{asciiSettings.cameraZ.toFixed(1)}</div>
              </div>

              <div style={s.asciiCell}>
                <label style={s.label}>FOV</label>
                <input
                  style={s.input}
                  type="range"
                  min={25}
                  max={75}
                  step={1}
                  value={asciiSettings.fov}
                  onChange={e => updateAsciiNumber('fov', Number(e.target.value))}
                />
                <div style={s.value}>{asciiSettings.fov.toFixed(0)}</div>
              </div>
            </div>

            <div style={s.actions}>
              <button style={s.btn} onClick={resetAscii}>Reset ASCII</button>
              <button style={s.btn} onClick={copyAsciiConfig}>Copy ASCII config</button>
            </div>
          </div>

        </div>
      )}
    </>
  )
}
