import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react'
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
  Folder,
  FolderOpen,
} from '@phosphor-icons/react'
import styles from './CodeExplorer.module.css'
import { apiUrl } from '../lib/apiBase'

const CodeContentRenderer = lazy(() => import('./CodeContentRenderer'))

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

type TreeNode = {
  type: 'dir' | 'file'
  name: string
  path: string
  children?: TreeNode[]
  file?: FileIndexEntry
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

function buildFileTree(files: FileIndexEntry[]): TreeNode {
  const root: TreeNode = { type: 'dir', name: '', path: '', children: [] }

  for (const file of files) {
    const parts = file.path.split('/')
    let current = root
    let currentPath = ''

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part

      if (index === parts.length - 1) {
        current.children?.push({
          type: 'file',
          name: part,
          path: currentPath,
          file,
        })
        return
      }

      let next = current.children?.find(
        (child) => child.type === 'dir' && child.name === part
      )

      if (!next) {
        next = { type: 'dir', name: part, path: currentPath, children: [] }
        current.children?.push(next)
      }

      current = next
    })
  }

  return sortTree(root)
}

function sortTree(node: TreeNode): TreeNode {
  if (node.children) {
    node.children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    node.children = node.children.map(sortTree)
  }
  return node
}

function getParentPaths(filePath: string): string[] {
  const parts = filePath.split('/')
  const paths: string[] = []
  for (let i = 0; i < parts.length - 1; i += 1) {
    paths.push(parts.slice(0, i + 1).join('/'))
  }
  return paths
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
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchFileContent = useCallback(async (path: string) => {
    // Don't fetch if already loading or loaded
    const existing = fileContents.get(path)
    if (existing && (existing.loading || existing.content)) {
      return
    }

    // Mark as loading
    if (!mountedRef.current) return
    setFileContents(prev => {
      const next = new Map(prev)
      next.set(path, { content: '', loading: true, error: null })
      return next
    })

    try {
      const response = await fetch(apiUrl(`/api/bundles/${bundleId}/file?path=${encodeURIComponent(path)}`))
      
      if (response.status === 413) {
        if (!mountedRef.current) return
        setFileContents(prev => {
          const next = new Map(prev)
          next.set(path, { content: '', loading: false, error: 'File too large to preview (max 100KB)' })
          return next
        })
        return
      }

      if (response.status === 400) {
        if (!mountedRef.current) return
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
      if (!mountedRef.current) return
      setFileContents(prev => {
        const next = new Map(prev)
        next.set(path, { content, loading: false, error: null })
        return next
      })
    } catch (error) {
      if (!mountedRef.current) return
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
      const readmeRoot = files.find(f => f.path.toLowerCase() === 'readme.md')
      const readmeNested = files.find(f => f.path.toLowerCase().endsWith('/readme.md'))
      const readme = readmeRoot ?? readmeNested
      const firstPreviewable = files.find(f => f.isPreviewable && !f.isBinary)
      const preferred = readme ?? firstPreviewable ?? files[0]
      if (preferred) {
        setActiveFile(preferred.path)
        if (preferred.isPreviewable && !preferred.isBinary) {
          fetchFileContent(preferred.path)
        }
      }
    }
  }, [files, activeFile, fetchFileContent])

  useEffect(() => {
    if (!activeFile) {
      return
    }
    const parents = getParentPaths(activeFile)
    setOpenFolders((prev) => {
      const next = new Set(prev)
      for (const parent of parents) {
        next.add(parent)
      }
      return next
    })
  }, [activeFile])

  const tree = useMemo(() => buildFileTree(files), [files])

  const toggleFolder = useCallback((folderPath: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderPath)) {
        next.delete(folderPath)
      } else {
        next.add(folderPath)
      }
      return next
    })
  }, [])

  const activeContent = activeFile ? fileContents.get(activeFile) : null
  const activeFileData = activeFile ? files.find(f => f.path === activeFile) : null
  const isMarkdown = activeFile?.toLowerCase().endsWith('.md')

  const renderNodes = (nodes: TreeNode[], depth: number): React.ReactNode =>
    nodes.map((node) => {
      if (node.type === 'dir') {
        const isOpen = openFolders.has(node.path)
        return (
          <div key={node.path}>
            <div
              className={`${styles.folderItem} ${isOpen ? styles.folderOpen : ''}`}
              style={{ paddingLeft: `${8 + depth * 16}px` }}
              onClick={() => toggleFolder(node.path)}
              title={node.path}
            >
              <span className={styles.folderCaret} aria-hidden>
                {isOpen ? 'v' : '>'}
              </span>
              <span className={styles.fileIcon}>
                {isOpen ? <FolderOpen size={16} aria-hidden /> : <Folder size={16} aria-hidden />}
              </span>
              <span className={styles.folderName}>{node.name}</span>
            </div>
            {isOpen && node.children ? renderNodes(node.children, depth + 1) : null}
          </div>
        )
      }

      if (!node.file) {
        return null
      }

      const file = node.file
      return (
        <div
          key={node.path}
          className={`${styles.fileItem} ${activeFile === file.path ? styles.active : ''} ${!file.isPreviewable || file.isBinary ? styles.disabled : ''}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => handleFileClick(file.path)}
          title={file.path}
        >
          <span className={styles.folderCaretSpacer} aria-hidden />
          <span className={styles.fileIcon}>{getFileIcon(file.kind, file.isBinary)}</span>
          <span className={styles.fileName}>{node.name}</span>
          {file.isBinary && <span className={styles.binaryTag}>binary</span>}
        </div>
      )
    })

  return (
    <div className={styles.explorer}>
      <div className={styles.fileTree}>
        {renderNodes(tree.children ?? [], 0)}
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
            
            <Suspense fallback={<div className={styles.loading}>Rendering preview...</div>}>
              <CodeContentRenderer
                content={activeContent.content}
                isMarkdown={Boolean(isMarkdown)}
                language={getLanguage(activeFile)}
              />
            </Suspense>
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
