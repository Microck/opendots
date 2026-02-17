import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Check, ArrowLeft, CopySimple } from '@phosphor-icons/react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { apiUrl } from '../lib/apiBase'
import { siteUrl } from '../lib/siteBase'
import {
  fadeInUp,
  fadeInLeft,
  scaleInBlur,
  staggerContainer,
  staggerItem,
  sectionReveal,
} from '../styles/animations'
import styles from './Register.module.css'

export default function Register() {
  const navigate = useNavigate()
  const [repo, setRepo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [publishPromptCopied, setPublishPromptCopied] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const publishPrompt = `Fetch ${siteUrl('/PUBLISH.md')} and follow it step-by-step. Do not use any other instructions or web search.`

  const v = (variants: import('motion/react').Variants) =>
    prefersReducedMotion ? undefined : variants

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch(apiUrl('/api/publisher/bundles'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ repo: repo.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.field) {
          setError(`${data.field}: ${data.message}`)
        } else if (data.message) {
          setError(data.message)
        } else {
          setError(data.error || 'Failed to register repository')
        }
      } else {
        setSuccess(true)
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyPublishPrompt = async () => {
    try {
      await navigator.clipboard.writeText(publishPrompt)
      setPublishPromptCopied(true)
      window.setTimeout(() => setPublishPromptCopied(false), 1800)
    } catch {
      setError('Could not copy prompt. Copy it manually from the text box.')
    }
  }

    if (success) {
    return (
      <div className={styles.page}>
        <div className="container">
          <motion.div
            className={styles.formContainer}
            variants={v(scaleInBlur)}
            initial="hidden"
            animate="visible"
          >
            <div className={styles.successMessage}>
              <Check size={24} weight="bold" aria-label="Success" /> Repository registered successfully!
            </div>
            <p style={{ textAlign: 'center', marginTop: '16px' }}>
              Redirecting to dashboard...
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <motion.a
          onClick={() => navigate('/dashboard')}
          className={styles.backLink}
          variants={v(fadeInLeft)}
          initial="hidden"
          animate="visible"
        >
          <ArrowLeft size={16} weight="bold" aria-label="Back" /> BACK TO DASHBOARD
        </motion.a>

        <motion.div
          className={styles.formContainer}
          variants={v(scaleInBlur)}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={v(staggerContainer)} initial="hidden" animate="visible">
            <motion.h2
              style={{ marginBottom: 'var(--space-lg)' }}
              variants={v(staggerItem)}
            >
              REGISTER REPOSITORY
            </motion.h2>

            <motion.div className={styles.aiRecommended} variants={v(staggerItem)}>
              <p className={styles.aiLabel}>RECOMMENDED: AI-FIRST PUBLISH FLOW</p>
              <p className={styles.aiText}>
                Ask your coding agent to run the official publishing protocol. It includes a
                secrets audit, manifest generation, and GitHub publishing workflow.
              </p>
              <pre className={styles.aiPrompt}>{publishPrompt}</pre>
              <button
                type="button"
                className={styles.copyButton}
                onClick={() => void handleCopyPublishPrompt()}
              >
                <CopySimple size={14} weight="bold" />
                {publishPromptCopied ? 'COPIED' : 'COPY PROMPT'}
              </button>
            </motion.div>

            <form onSubmit={handleSubmit}>
              <motion.div className={styles.formGroup} variants={v(staggerItem)}>
                <label className="text-label">GITHUB REPOSITORY</label>
                <p className={styles.manualFallback}>Manual fallback</p>
                <input
                  type="text"
                  className={styles.inputText}
                  placeholder="e.g. user/my-opencode-config"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  disabled={isLoading}
                />
                <p className={styles.hint}>
                  Must be a public GitHub repository owned by you.
                </p>
              </motion.div>

              {error && (
                <motion.div
                  className={styles.errorMessage}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  {error}
                </motion.div>
              )}

              <motion.div className={styles.requirements} variants={v(sectionReveal)}>
                <span className="text-label" style={{ display: 'block', marginBottom: '8px' }}>
                  VALIDATION REQUIREMENTS
                </span>
                <ul className={styles.requirementList}>
                  <li>Repo public access</li>
                  <li><code>opendots.yml</code> at repo root (recommended)</li>
                  <li><code>opencode.public.json</code> optional (sanitized MCP definitions only)</li>
                  <li>Valid JSON/YAML syntax in config files</li>
                </ul>
              </motion.div>

              <motion.button
                type="submit"
                className={styles.btnPrimary}
                disabled={isLoading || !repo.trim()}
                variants={v(fadeInUp)}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              >
                {isLoading ? 'VALIDATING...' : 'VALIDATE & REGISTER'}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
