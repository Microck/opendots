import styles from './Docs.module.css'

export default function Docs() {
  return (
    <div className={styles.page}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <h1 style={{ marginBottom: 'var(--space-xl)' }}>DOCUMENTATION</h1>

        <article className={styles.article}>
          {/* What is a bundle? */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>What is a bundle?</h2>
            <p className={styles.paragraph}>
              A bundle is a collection of OpenCode configuration artifacts that customize and extend 
              your AI coding assistant. Bundles can contain themes, custom commands, specialized agents, 
              skill definitions, plugins, tools, rules, and configuration files.
            </p>
            <p className={styles.paragraph}>
              Bundles are distributed as GitHub repositories containing OpenCode configuration.
              Any public GitHub repo with OpenCode artifacts can be registered as a bundle.
              An optional <code>opendots.yml</code> manifest can provide rich metadata, but is not required —
              metadata can also be derived from the repository itself.
            </p>
            
            <div className={styles.infoCard}>
              <strong className="text-mono">Bundle Structure</strong>
              <pre className={styles.codeBlock}>
{`my-opencode-config/
├── opencode.json         # OpenCode configuration (JSONC)
├── AGENTS.md             # Agent instructions/rules
├── agent/                # Agent definitions (.md files)
├── command/              # Slash commands (.md files)
├── plugins/              # TypeScript plugins
├── skills/               # Skill definitions (SKILL.md)
├── tools/                # Custom tools
├── prompts/              # Prompt templates
├── themes/               # Color themes (.json)
├── scripts/              # Utility scripts
└── package.json          # Plugin dependencies (if needed)`}
              </pre>
            </div>
          </section>

          {/* Install Destinations */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Install Destinations</h2>
            <p className={styles.paragraph}>
              Bundles can be installed in two scopes: <strong>Project</strong> or <strong>Global</strong>. 
              Choose the scope based on whether you want the configuration to apply to a single project 
              or all your projects.
            </p>

            <div className={styles.infoCard}>
              <strong className="text-mono">Project Scope</strong>
              <p className={styles.infoText}>
                Extract the <strong>Project ZIP</strong> to your project root directory. 
                This creates the bundle's configuration files (e.g., <code>opencode.json</code>,{' '}
                <code>agent/</code>, <code>plugins/</code>, etc.) in your project directory.
              </p>
              <pre className={styles.codeBlock}>
{`# Install project-scoped bundle
cd my-project
curl -L https://opendots.dev/api/bundles/xyz/download?variant=project -o bundle.zip
unzip bundle.zip
rm bundle.zip`}
              </pre>
              <p className={styles.infoText} style={{ marginTop: 'var(--space-sm)' }}>
                <strong>Use when:</strong> Team-specific conventions, project-specific tools, 
                or repository-specific configurations.
              </p>
            </div>

            <div className={styles.infoCard}>
              <strong className="text-mono">Global Scope</strong>
              <p className={styles.infoText}>
                Extract the <strong>Global ZIP</strong> to your OpenCode config directory 
                (typically <code>~/.config/opencode/</code>). These settings apply to all projects 
                on your machine.
              </p>
              <pre className={styles.codeBlock}>
{`# Install global bundle
curl -L https://opendots.dev/api/bundles/xyz/download?variant=global -o bundle.zip
unzip bundle.zip -d ~/.config/opencode/
rm bundle.zip`}
              </pre>
              <p className={styles.infoText} style={{ marginTop: 'var(--space-sm)' }}>
                <strong>Use when:</strong> Personal preferences, frequently used tools, 
                or organization-wide standards you want everywhere.
              </p>
            </div>

            <div className={styles.infoCard}>
              <strong className="text-mono">Configuration Directory Override</strong>
              <p className={styles.infoText}>
                You can override the default config location by setting the{' '}
                <code>OPENCODE_CONFIG_DIR</code> environment variable. This is useful for 
                testing or when you need multiple isolated OpenCode configurations.
              </p>
              <pre className={styles.codeBlock}>
{`# Use custom config directory
export OPENCODE_CONFIG_DIR=/path/to/custom/config
opencode`}
              </pre>
            </div>
          </section>

          {/* Safety Model */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Safety Model</h2>
            
            <div className={styles.warningCard}>
              <svg className={styles.warningIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <strong>You are the final firewall.</strong> Always review bundle contents 
                before installing. Bundles can contain executable code that runs on your machine.
              </div>
            </div>

            <p className={styles.paragraph}>
              Bundles are powerful—they can execute arbitrary code through plugins, tools, shell 
              commands, and scripts. While Opendots performs best-effort scanning to help you 
              evaluate bundles, <strong>we do not guarantee safety</strong>.
            </p>

            <h3 className={styles.subsectionTitle}>What Opendots Scans</h3>
            <ul className={styles.list}>
              <li>
                <strong>Schema Validation:</strong> Verifies that configuration files follow 
                the expected structure for opencode.json, themes, and SKILL.md files.
              </li>
              <li>
                <strong>Risk Flag Detection:</strong> Identifies potentially risky patterns 
                like process execution, shell commands, remote URLs, and dynamic code evaluation.
              </li>
              <li>
                <strong>Secret Scanning:</strong> Best-effort detection of API keys, tokens, 
                and private keys (with redaction).
              </li>
            </ul>

            <h3 className={styles.subsectionTitle}>Risk Badges Explained</h3>
            <div className={styles.riskTable}>
              <div className={styles.riskRow}>
                <span className={styles.riskBadgeHigh}>EXEC</span>
                <span>Process execution calls (exec, spawn, child_process)</span>
              </div>
              <div className={styles.riskRow}>
                <span className={styles.riskBadgeMedium}>SHELL</span>
                <span>Shell commands or shell scripts</span>
              </div>
              <div className={styles.riskRow}>
                <span className={styles.riskBadgeLow}>REMOTE</span>
                <span>Remote URLs and network requests</span>
              </div>
              <div className={styles.riskRow}>
                <span className={styles.riskBadgeHigh}>EVAL</span>
                <span>Dynamic code evaluation (eval, Function constructor)</span>
              </div>
            </div>

            <p className={styles.paragraph}>
              <strong>Best Practices:</strong> Always review the bundle contents using the file 
              explorer before installing. Check the bundle's GitHub repository for community 
              feedback, recent activity, and the author's reputation. When in doubt, install 
              in a project scope first before promoting to global.
            </p>
          </section>

          {/* How to Publish */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>How to Publish</h2>
            <p className={styles.paragraph}>
              Sharing your OpenCode configuration with the community is easy. Follow these steps 
              to publish your bundle on Opendots:
            </p>

            <ol className={styles.numberedList}>
              <li>
                <strong>Sign in with GitHub</strong> — Click the Sign In button on Opendots 
                to authenticate with your GitHub account.
              </li>
              <li>
                <strong>Create your repository</strong> — Create a new public GitHub repository
                with your OpenCode configuration (any name works).
              </li>
              <li>
                <strong>Add your configuration</strong> — Add your <code>opencode.json</code>, 
                themes, skills, and other artifacts to the repository.
              </li>
              <li>
                <strong>Add metadata (optional)</strong> — Adding an <code>opendots.yml</code> manifest
                at the root is recommended but not required. It provides rich metadata for your bundle page:
                <pre className={styles.codeBlock}>
{`name: Python Dev Bundle
summary: Complete Python development environment for OpenCode
description: |
  Includes linting configs, Python-specific agents, 
  and handy snippets for Django and Flask.
tags: [python, django, flask, linting]
license: MIT
compatibility:
  opencode: ">=1.0.0"`}
                </pre>
              </li>
              <li>
                <strong>Register on Opendots</strong> — Visit your Dashboard, click "Register Bundle", 
                and paste your GitHub repository URL.
              </li>
              <li>
                <strong>System validates and imports</strong> — Opendots will clone your repo, 
                validate the structure, scan for safety issues, and create your bundle page.
              </li>
            </ol>

            <div className={styles.infoCard}>
              <strong className="text-mono">Tips for Success</strong>
              <ul className={styles.list}>
                <li>Keep your bundle focused on a specific use case or tech stack</li>
                <li>Write a clear, compelling summary in your manifest</li>
                <li>Include helpful tags so users can discover your bundle</li>
                <li>Test your configuration locally before publishing</li>
                <li>Keep sensitive data out of your repository</li>
                <li>Update your bundle regularly to keep it relevant</li>
              </ul>
            </div>
          </section>

          {/* Getting Help */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Getting Help</h2>
            <p className={styles.paragraph}>
              Have questions or need assistance? Here are some resources:
            </p>
            <ul className={styles.list}>
              <li>
                <strong>Bundle Issues:</strong> Report problems with a specific bundle to its 
                GitHub repository via the "View on GitHub" link on the bundle page.
              </li>
              <li>
                <strong>Opendots Platform:</strong> For issues with the Opendots platform itself, 
                visit our GitHub repository to open an issue.
              </li>
              <li>
                <strong>OpenCode Documentation:</strong> Learn more about configuring OpenCode 
                in the official documentation.
              </li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  )
}
