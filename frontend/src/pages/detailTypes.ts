import type { CSSProperties } from 'react'
import type { BundleCardTheme } from '../lib/bundleTheme'

export interface SafetyResults {
  validation: {
    config: {
      valid: boolean
      errors: string[]
      warnings: string[]
    } | null
    themes: Array<{
      file: string
      valid: boolean
      errors: string[]
    }>
    skills: Array<{
      file: string
      valid: boolean
      errors: string[]
    }>
  }
  riskFlags: Array<{
    flag: string
    description: string
    files: string[]
    severity: 'high' | 'medium' | 'low'
  }>
  secretWarnings: Array<{
    file: string
    line: number
    pattern: string
    snippet: string
  }>
}

export interface BundleData {
  id: string
  name: string
  summary: string
  description: string
  tags: string[]
  license: string
  compatibility?: {
    opencode?: string
    os?: string[]
    node?: string
  }
  repoUrl: string
  githubFullName: string
  owner: string
  ownerAvatarUrl: string
  stars: number
  forks: number
  status: string
  createdAt: string | Date
  updatedAt: string | Date
  latestSnapshot: {
    commitSha: string
    createdAt: string | Date
    byteSize: number
  } | null
  fileIndex: Array<{
    path: string
    size: number
    kind: 'config' | 'theme' | 'skill' | 'agent' | 'command' | 'plugin' | 'tool' | 'prompt' | 'mode' | 'rules' | 'script' | 'other'
    isBinary: boolean
    isPreviewable: boolean
  }>
  accentColor: string | null
  cardTheme: BundleCardTheme | null
  lastImport: {
    commitSha: string
    status: string
    importedAt: string | Date
    errorCode?: string
    errorMessage?: string
  } | null
  safetyResults: SafetyResults | null
}

export interface DetailLayoutProps {
  bundle: BundleData
  prefersReducedMotion: boolean
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return new Intl.NumberFormat('en-US').format(value)
}

export function buildThemedStyle(bundle: BundleData): CSSProperties {
  return {
    '--bundle-surface-bg': bundle.cardTheme?.background ?? undefined,
    '--bundle-surface-hover-bg': bundle.cardTheme?.backgroundHover ?? undefined,
    '--bundle-surface-border': bundle.cardTheme?.border ?? undefined,
    '--bundle-surface-border-hover': bundle.cardTheme?.borderHover ?? undefined,
    '--bundle-title-color': bundle.cardTheme?.title ?? undefined,
    '--bundle-text-color': bundle.cardTheme?.text ?? undefined,
    '--bundle-muted-color': bundle.cardTheme?.mutedText ?? undefined,
    '--bundle-chip-bg': bundle.cardTheme?.chipBackground ?? undefined,
    '--bundle-chip-border': bundle.cardTheme?.chipBorder ?? undefined,
    '--bundle-chip-text': bundle.cardTheme?.chipText ?? undefined,
  } as CSSProperties
}
