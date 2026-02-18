import { motion } from 'motion/react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import {
  fadeInDown,
  fadeInUp,
  sectionReveal,
  staggerContainer,
  staggerItem,
  drawLine,
  scrollViewports,
} from '../styles/animations'
import styles from './Docs.module.css'
import { SITE_BASE_URL, siteUrl } from '../lib/siteBase'

export default function Docs() {
  const prefersReducedMotion = useReducedMotion()

  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || SITE_BASE_URL
  const url = (base: string, pathname: string) =>
    `${base.replace(/\/$/, '')}${pathname}`

  const v = (variants: import('motion/react').Variants) =>
    prefersReducedMotion ? undefined : variants

  return (
    <div className={styles.page}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <motion.h1
          className={styles.docsTitle}
          style={{ marginBottom: 'var(--space-xl)' }}
          variants={v(fadeInDown)}
          initial="hidden"
          animate="visible"
        >
          DOCUMENTATION
        </motion.h1>

        <motion.div
          className={styles.titleRule}
          variants={v(drawLine)}
          initial="hidden"
          animate="visible"
          style={{ transformOrigin: 'left center' }}
        />

        <article className={styles.article}>
          {/* What is a bundle? */}
          <motion.section
            className={styles.section}
            variants={v(sectionReveal)}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewports.once}
          >
            <h2 className={styles.sectionTitle}>What is a bundle?</h2>
            <p className={styles.paragraph} data-gsap="text">
              A bundle is a collection of OpenCode configuration artifacts that customize and extend 
              your AI coding assistant. Bundles can contain themes, custom commands, specialized agents, 
              skill definitions, plugins, tools, rules, and configuration files.
            </p>
            <p className={styles.paragraph} data-gsap="text">
              Bundles are distributed as GitHub repositories containing OpenCode configuration.
              Any public GitHub repo with OpenCode artifacts can be registered as a bundle.
              An optional <code>opendots.yml</code> manifest can provide rich metadata, but is not required —
              metadata can also be derived from the repository itself.
            </p>
            
            <div className={styles.infoCard}>
              <strong className="text-mono">Bundle Structure</strong>
              <pre className={styles.codeBlock}>
{`my-opencode-config/
├── opencode.public.json  # Sanitized MCP definitions (no secrets)
├── opendots.yml          # Bundle manifest (recommended)
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
          </motion.section>

          {/* Install Destinations */}
          <motion.section
            className={styles.section}
            variants={v(sectionReveal)}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewports.once}
          >
            <h2 className={styles.sectionTitle}>Install Destinations</h2>
            <p className={styles.paragraph}>
              <strong>Recommended:</strong> use the AI install protocol first. It forces a safety review,
              conflict checks, and explicit scope selection before any files are written.
            </p>

            <div className={styles.infoCard}>
              <strong className="text-mono">AI-First Install (Recommended)</strong>
              <p className={styles.infoText}>
                Copy this prompt into OpenCode (or any coding agent). It fetches the official
                installation protocol and applies it to a specific bundle ID:
              </p>
              <pre className={styles.codeBlock}>
{`Fetch and follow ${siteUrl('/INSTALL.md')} for bundle URL: ${siteUrl('/bundle/<bundle-id>')}`}
              </pre>
              <p className={styles.infoText} style={{ marginTop: 'var(--space-sm)' }}>
                This is the safest default because it includes risk badge review, secret warning checks,
                and overwrite confirmation.
              </p>
            </div>

            <div className={styles.infoCard}>
              <strong className="text-mono">Project Scope</strong>
              <p className={styles.infoText}>
                Extract the <strong>Project ZIP</strong> to your project root directory. 
                This creates the bundle's configuration files (e.g., <code>opendots.yml</code>,{' '}
                <code>agent/</code>, <code>plugins/</code>, etc.) in your project directory.
              </p>
              <pre className={styles.codeBlock}>
{`# Install project-scoped bundle
 cd my-project
 curl -L ${url(apiBase, '/api/bundles/xyz/download?variant=project')} -o bundle.zip
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
 curl -L ${url(apiBase, '/api/bundles/xyz/download?variant=global')} -o bundle.zip
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
          </motion.section>

          {/* Safety Model */}
          <motion.section
            className={styles.section}
            variants={v(sectionReveal)}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewports.once}
          >
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
              commands, and scripts. While OpenDots performs best-effort scanning to help you 
              evaluate bundles, <strong>we do not guarantee safety</strong>.
            </p>

            <h3 className={styles.subsectionTitle}>What OpenDots Scans</h3>
            <ul className={styles.list}>
              <li>
                <strong>Schema Validation:</strong> Verifies that configuration files follow 
                the expected structure for manifests, themes, and SKILL.md files.
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
            <motion.div
              className={styles.riskTable}
              variants={v(staggerContainer)}
              initial="hidden"
              whileInView="visible"
              viewport={scrollViewports.once}
            >
              <motion.div className={styles.riskRow} variants={v(staggerItem)}>
                <span className={styles.riskBadgeHigh}>EXEC</span>
                <span>Process execution calls (exec, spawn, child_process)</span>
              </motion.div>
              <motion.div className={styles.riskRow} variants={v(staggerItem)}>
                <span className={styles.riskBadgeMedium}>SHELL</span>
                <span>Shell commands or shell scripts</span>
              </motion.div>
              <motion.div className={styles.riskRow} variants={v(staggerItem)}>
                <span className={styles.riskBadgeLow}>REMOTE</span>
                <span>Remote URLs and network requests</span>
              </motion.div>
              <motion.div className={styles.riskRow} variants={v(staggerItem)}>
                <span className={styles.riskBadgeHigh}>EVAL</span>
                <span>Dynamic code evaluation (eval, Function constructor)</span>
              </motion.div>
            </motion.div>

            <p className={styles.paragraph}>
              <strong>Best Practices:</strong> Always review the bundle contents using the file 
              explorer before installing. Check the bundle's GitHub repository for community 
              feedback, recent activity, and the author's reputation. When in doubt, install 
              in a project scope first before promoting to global.
            </p>
          </motion.section>

          {/* How to Publish */}
          <motion.section
            className={styles.section}
            variants={v(sectionReveal)}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewports.once}
          >
            <h2 className={styles.sectionTitle}>How to Publish</h2>
            <p className={styles.paragraph}>
              <strong>Recommended:</strong> use the AI publish protocol so your agent handles secret
              sanitization, bundle structure validation, manifest creation, and GitHub push safely.
            </p>

            <div className={styles.infoCard}>
              <strong className="text-mono">AI-First Publish (Recommended)</strong>
              <p className={styles.infoText}>
                Copy this prompt into OpenCode (or any coding agent):
              </p>
              <pre className={styles.codeBlock}>
{`Fetch ${siteUrl('/PUBLISH.md')} and follow it step-by-step. Do not use any other instructions or web search.`}
              </pre>
              <p className={styles.infoText} style={{ marginTop: 'var(--space-sm)' }}>
                This protocol includes mandatory secret checks and a canonical publishing workflow.
              </p>
            </div>

            <motion.ol
              className={styles.numberedList}
              variants={v(staggerContainer)}
              initial="hidden"
              whileInView="visible"
              viewport={scrollViewports.once}
            >
              <motion.li variants={v(staggerItem)}>
                <strong>Run the AI publish protocol</strong> — Use
                <code> Fetch {siteUrl('/PUBLISH.md')} and follow it step-by-step. Do not use any other instructions or web search. </code>
                as your default path.
              </motion.li>
              <motion.li variants={v(staggerItem)}>
                <strong>Sign in with GitHub</strong> — Click the Sign In button on OpenDots 
                to authenticate with your GitHub account.
              </motion.li>
              <motion.li variants={v(staggerItem)}>
                <strong>Create your repository</strong> — Create a new public GitHub repository 
                named <code>opendots-&lt;your-github-username&gt;</code>. This is the canonical naming convention.
              </motion.li>
              <motion.li variants={v(staggerItem)}>
                <strong>Manifest is optional</strong> — If your repository does not include an
                <code> opendots.yml </code> file, OpenDots auto-generates one from your detected files:
                <pre className={styles.codeBlock}>
{`id: my-bundle
name: My Bundle Name
summary: Brief description of your bundle
license: MIT`}
                </pre>
              </motion.li>
              <motion.li variants={v(staggerItem)}>
                <strong>Add your configuration</strong> — Add your themes, skills, commands, and other artifacts to the repository.
                If you want to include MCP definitions, include a sanitized <code>opencode.public.json</code> (never publish raw <code>opencode.json</code>).
              </motion.li>
              <motion.li variants={v(staggerItem)}>
                <strong>Register on OpenDots</strong> — Visit your Dashboard and use one-click publish.
                OpenDots auto-detects <code>opendots-&lt;your-github-username&gt;</code> after sign-in.
              </motion.li>
              <motion.li variants={v(staggerItem)}>
                <strong>System validates and imports</strong> — OpenDots will clone your repo, 
                validate the naming convention and manifest, scan for safety issues, and create your bundle page.
              </motion.li>
            </motion.ol>

            <div className={styles.infoCard}>
              <strong className="text-mono">Tips for Success</strong>
              <ul className={styles.list}>
                <li>Keep your bundle focused on a specific use case or tech stack</li>
                <li>Write a clear, compelling summary in your manifest</li>
                <li>Keep your bundle metadata accurate (name, summary, compatibility)</li>
                <li>Test your configuration locally before publishing</li>
                <li>Keep sensitive data out of your repository</li>
                <li>Update your bundle regularly to keep it relevant</li>
              </ul>
            </div>
          </motion.section>

          {/* How to Update */}
          <motion.section
            className={styles.section}
            variants={v(sectionReveal)}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewports.once}
          >
            <h2 className={styles.sectionTitle}>How to Update</h2>
            <p className={styles.paragraph}>
              Bundles are GitHub repos. Updates are just commits: change files, regenerate the README inventory,
              push, then trigger a refresh import.
            </p>

            <div className={styles.infoCard}>
              <strong className="text-mono">AI-First Update (Recommended)</strong>
              <p className={styles.infoText}>
                Copy this prompt into OpenCode (or any coding agent). It fetches the official update protocol:
              </p>
              <pre className={styles.codeBlock}>
{`Fetch ${siteUrl('/UPDATE.md')} and follow it step-by-step. Do not use any other instructions or web search.`}
              </pre>
              <p className={styles.infoText} style={{ marginTop: 'var(--space-sm)' }}>
                Tip: after pushing changes, the protocol can use <code>opendots-refresh.sh</code> to reimport.
              </p>
            </div>
          </motion.section>

          {/* Getting Help */}
          <motion.section
            className={styles.section}
            variants={v(fadeInUp)}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewports.once}
          >
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
                <strong>OpenDots Platform:</strong> For issues with the OpenDots platform itself, 
                visit our GitHub repository to open an issue.
              </li>
              <li>
                <strong>OpenCode Documentation:</strong> Learn more about configuring OpenCode 
                in the official documentation.
              </li>
            </ul>
          </motion.section>
        </article>
      </div>
    </div>
  )
}
