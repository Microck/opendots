import styles from './Docs.module.css'

export default function Docs() {
  return (
    <div className={styles.page}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <h1 style={{ marginBottom: 'var(--space-xl)' }}>DOCUMENTATION</h1>

        <article className={styles.article}>
          <h3 className={styles.sectionTitle}>What is a bundle?</h3>
          <p className={styles.paragraph}>
            A bundle is a cohesive collection of OpenCode artifacts. It can contain Themes, Tools,
            Commands, Agents, and Rules. Bundles are versioned, signed, and distributed via GitHub.
          </p>

          <h3 className={styles.sectionTitle}>Installation</h3>
          <div className={styles.infoCard}>
            <strong className="text-mono">Project Scope</strong>
            <p className={styles.infoText}>
              Extract contents to your project root. The configuration will only apply when
              OpenCode is running within that directory.
            </p>
          </div>
          <div className={styles.infoCard}>
            <strong className="text-mono">Global Scope</strong>
            <p className={styles.infoText}>
              Extract contents to <code>~/.config/opencode/</code>. The configuration will
              apply to all projects on your machine.
            </p>
          </div>

          <h3 className={styles.sectionTitle}>Safety &amp; Security</h3>
          <p className={styles.paragraph}>
            Bundles are powerful. They can execute code on your machine. Opendots performs static
            analysis on every imported commit, scanning for shell injection patterns and malicious
            URLs. However, <strong>you are the final firewall</strong>. Always review the code
            viewer before installing.
          </p>

          <h3 className={styles.sectionTitle}>How to Publish</h3>
          <p className={styles.paragraph}>
            Sign in with GitHub, create a repo named <code>opendots-&lt;slug&gt;</code>, add an{' '}
            <code>opendots.yml</code> manifest at the root, and register the repo on Opendots.
            The system will validate the manifest, import your files, and create your bundle page.
          </p>
        </article>
      </div>
    </div>
  )
}
