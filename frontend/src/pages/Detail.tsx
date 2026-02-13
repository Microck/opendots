import CodeExplorer from '../components/CodeExplorer'
import styles from './Detail.module.css'

const files = [
  {
    name: 'opencode.json',
    path: 'opencode.json',
    indent: 0,
    content: `{
  "$schema": "https://opencode.ai/config.json",
  "theme": "react-neon",
  "model": "anthropic/claude-sonnet-4-20250514"
}`,
  },
  {
    name: '.opencode/',
    path: '.opencode/',
    indent: 0,
    content: '// directory',
  },
  {
    name: 'theme.json',
    path: '.opencode/theme.json',
    indent: 20,
    content: `// .opencode/theme.json
{
  "name": "React Neon",
  "type": "dark",
  "colors": {
    "editor.background": "#0a0a0a",
    "activityBar.background": "#000000",
    "primary": "#61dafb"
  },
  "tokenColors": [
    {
      "scope": "keyword",
      "settings": {
        "foreground": "#ff79c6"
      }
    }
  ]
}`,
  },
  {
    name: 'snippets.json',
    path: '.opencode/snippets.json',
    indent: 20,
    content: `{
  "React Component": {
    "prefix": "rfc",
    "body": ["export default function $1() {", "  return <div>$2</div>", "}"]
  }
}`,
  },
  {
    name: 'scripts/',
    path: '.opencode/scripts/',
    indent: 20,
    content: '// directory',
  },
  {
    name: 'setup.js',
    path: '.opencode/scripts/setup.js',
    indent: 36,
    content: `// setup.js
import { exec } from 'child_process'

exec('npm install prettier eslint', (err) => {
  if (err) console.error(err)
  else console.log('Setup complete')
})`,
  },
]

export default function Detail() {
  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.detailHeader}>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.title}>REACT-DEV-PACK</h1>
              <p className={styles.subtitle}>
                Essential tools, snippets and linters for React development. Includes custom theme and Prettier config.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <a href="#" className={styles.btnOutline}>View on GitHub &#8599;</a>
            </div>
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>AUTHOR</span>
              <strong>@frontend_wizard</strong>
            </div>
            <div className={styles.metaItem}>
              <span>LICENSE</span>
              <strong>MIT</strong>
            </div>
            <div className={styles.metaItem}>
              <span>COMPATIBILITY</span>
              <strong>OpenCode v1.2+</strong>
            </div>
            <div className={styles.metaItem}>
              <span>VERSION</span>
              <strong>v1.0.4 (hash: a1b2c3d)</strong>
            </div>
          </div>
        </header>

        <div className={styles.safetyNotice}>
          <div>
            <span className={styles.badgeRisk}>EXEC</span>
            <span className={styles.badgeRisk}>NETWORK</span>
          </div>
          <div style={{ flexGrow: 1 }}>
            <h4 className={styles.safetyTitle}>Safety Notice</h4>
            <p className={styles.safetyText}>
              This bundle contains executable code and remote fetch capabilities.
              <br />Validation Status: <span style={{ color: '#4caf50' }}>Schema OK</span>, <span style={{ color: '#ff9800' }}>Scan Warning</span>.
            </p>
          </div>
        </div>

        <div className={styles.explorerSection}>
          <div className={styles.explorerHeader}>
            <span className="text-label">BUNDLE CONTENTS</span>
            <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>SIZE: 42KB</span>
          </div>
          <CodeExplorer files={files} />
        </div>

        <div className={styles.downloadGrid}>
          <div className={styles.downloadCard}>
            <h3 className={styles.downloadTitle}>Project Install</h3>
            <p className={styles.downloadDesc}>
              Install into current project. Config lives alongside code.
            </p>
            <button className={styles.btnPrimary}>Download ZIP</button>
            <div className={styles.downloadPath}>
              Extract to: ./
            </div>
          </div>
          <div className={styles.downloadCard}>
            <h3 className={styles.downloadTitle}>Global Install</h3>
            <p className={styles.downloadDesc}>
              Install to user home. Applies to all projects.
            </p>
            <button className={styles.btnOutline} style={{ width: '100%' }}>Download ZIP</button>
            <div className={styles.downloadPath}>
              Extract to: ~/.config/opencode/
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
