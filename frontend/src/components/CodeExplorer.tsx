import { useState, useEffect, useCallback } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Gear,
  Palette,
  BookOpen,
  Robot,
  Keyboard,
  Plug,
  Wrench,
  ChatCircle,
  GitBranch,
  Ruler,
  Play,
  File,
  FileArchive,
} from '@phosphor-icons/react'
import styles from './CodeExplorer.module.css'

interface FileIndexEntry {
  path: string
  size: number
  kind: 'config' | 'theme' | 'skill' | 'agent' | 'command' | 'plugin' | 'tool' | 'prompt' | 'mode' | 'rules' | 'script' | 'other'
  isBinary: boolean
  isPreviewable: boolean
}

interface CodeExplorerProps {
  bundleId: string
  files: FileIndexEntry[]
}

interface FileContent {
  content: string
  loading: boolean
  error: string | null
}

// Get file extension for language detection
function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'tsx',
    'js': 'javascript',
    'jsx': 'jsx',
    'json': 'json',
    'jsonc': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'mdx': 'markdown',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'html': 'html',
    'htm': 'html',
    'sh': 'bash',
    'bash': 'bash',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
  }
  return langMap[ext] || 'text'
}

// Get display name from path
function getDisplayName(path: string): string {
  return path.split('/').pop() || path
}

// Get indentation level based on path depth
function getIndentLevel(path: string): number {
  const depth = path.split('/').length - 1
  return depth * 16 // 16px per level
}

// Get icon based on file kind
function getFileIcon(kind: FileIndexEntry['kind'], isBinary: boolean): React.ReactNode {
  const iconProps = { size: 16, 'aria-hidden': true }
  
  if (isBinary) return <FileArchive {...iconProps} aria-label="Binary file" />
  
  switch (kind) {
    case 'config': 
      return <Gear {...iconProps} aria-label="Config file" />
    case 'theme': 
      return <Palette {...iconProps} aria-label="Theme file" />
    case 'skill': 
      return <BookOpen {...iconProps} aria-label="Skill file" />
    case 'agent': 
      return <Robot {...iconProps} aria-label="Agent file" />
    case 'command': 
      return <Keyboard {...iconProps} aria-label="Command file" />
    case 'plugin': 
      return <Plug {...iconProps} aria-label="Plugin file" />
    case 'tool': 
      return <Wrench {...iconProps} aria-label="Tool file" />
    case 'prompt': 
      return <ChatCircle {...iconProps} aria-label="Prompt file" />
    case 'mode': 
      return <GitBranch {...iconProps} aria-label="Mode file" />
    case 'rules': 
      return <Ruler {...iconProps} aria-label="Rules file" />
    case 'script': 
      return <Play {...iconProps} aria-label="Script file" />
    default: 
      return <File {...iconProps} aria-label="File" />
  }
}

export default function CodeExplorer({ bundleId, files }: CodeExplorerProps) {
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [fileContents, setFileContents] = useState<Map<string, FileContent>>(new Map())

  const fetchFileContent = useCallback(async (path: string) => {
    // Don't fetch if already loading or loaded
    const existing = fileContents.get(path)
    if (existing && (existing.loading || existing.content)) {
      return
    }

    // Mark as loading
    setFileContents(prev => {
      const next = new Map(prev)
      next.set(path, { content: '', loading: true, error: null })
      return next
    })

    try {
      const response = await fetch(`/api/bundles/${bundleId}/file?path=${encodeURIComponent(path)}`)
      
      if (response.status === 413) {
        setFileContents(prev => {
          const next = new Map(prev)
          next.set(path, { content: '', loading: false, error: 'File too large to preview (max 100KB)' })
          return next
        })
        return
      }

      if (response.status === 400) {
        setFileContents(prev => {
          const next = new Map(prev)
          next.set(path, { content: '', loading: false, error: 'Binary file - not previewable' })
          return next
        })
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.statusText}`)
      }

      const content = await response.text()
      setFileContents(prev => {
        const next = new Map(prev)
        next.set(path, { content, loading: false, error: null })
        return next
      })
    } catch (error) {
      setFileContents(prev => {
        const next = new Map(prev)
        next.set(path, { 
          content: '', 
          loading: false, 
          error: error instanceof Error ? error.message : 'Failed to load file' 
        })
        return next
      })
    }
  }, [bundleId, fileContents])

  const handleFileClick = useCallback((path: string) => {
    setActiveFile(path)
    const file = files.find(f => f.path === path)
    if (file && file.isPreviewable && !file.isBinary) {
      fetchFileContent(path)
    }
  }, [files, fetchFileContent])

  // Set first previewable file as active on mount
  useEffect(() => {
    if (!activeFile && files.length > 0) {
      const firstPreviewable = files.find(f => f.isPreviewable && !f.isBinary)
      if (firstPreviewable) {
        setActiveFile(firstPreviewable.path)
        fetchFileContent(firstPreviewable.path)
      } else {
        setActiveFile(files[0].path)
      }
    }
  }, [files, activeFile, fetchFileContent])

  const activeContent = activeFile ? fileContents.get(activeFile) : null
  const activeFileData = activeFile ? files.find(f => f.path === activeFile) : null
  const isMarkdown = activeFile?.toLowerCase().endsWith('.md')

  return (
    <div className={styles.explorer}>
      <div className={styles.fileTree}>
        {files.map((file) => (
          <div
            key={file.path}
            className={`${styles.fileItem} ${activeFile === file.path ? styles.active : ''} ${!file.isPreviewable || file.isBinary ? styles.disabled : ''}`}
            style={{ paddingLeft: `${8 + getIndentLevel(file.path)}px` }}
            onClick={() => handleFileClick(file.path)}
            title={file.path}
          >
            <span className={styles.fileIcon}>{getFileIcon(file.kind, file.isBinary)}</span>
            <span className={styles.fileName}>{getDisplayName(file.path)}</span>
            {file.isBinary && <span className={styles.binaryTag}>binary</span>}
          </div>
        ))}
      </div>
      <div className={styles.codeView}>
        {activeFile && activeContent?.loading && (
          <div className={styles.loading}>Loading...</div>
        )}
        
        {activeFile && activeContent?.error && (
          <div className={styles.error}>{activeContent.error}</div>
        )}
        
        {activeFile && activeContent?.content && !activeContent.error && (
          <>
            <div className={styles.fileHeader}>
              <span className={styles.filePath}>{activeFile}</span>
              <span className={styles.fileSize}>
                {activeFileData?.size ? `${(activeFileData.size / 1024).toFixed(1)} KB` : ''}
              </span>
            </div>
            
            {isMarkdown ? (
              <div className={styles.markdownContent}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                  {activeContent.content}
                </ReactMarkdown>
              </div>
            ) : (
              <Highlight
                theme={themes.dracula}
                code={activeContent.content}
                language={getLanguage(activeFile)}
              >
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <pre className={`${className} ${styles.codePre}`} style={style}>
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        <span className={styles.lineNumber}>{i + 1}</span>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            )}
          </>
        )}
        
        {activeFile && !activeContent && (
          <div className={styles.selectFile}>
            Select a file to view its contents
          </div>
        )}
        
        {!activeFile && (
          <div className={styles.selectFile}>
            No previewable files in this bundle
          </div>
        )}
      </div>
    </div>
  )
}
