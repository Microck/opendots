import { useState } from 'react'
import styles from './CodeExplorer.module.css'

interface FileEntry {
  name: string
  path: string
  content: string
  indent?: number
}

interface CodeExplorerProps {
  files: FileEntry[]
}

export default function CodeExplorer({ files }: CodeExplorerProps) {
  const [activeFile, setActiveFile] = useState(0)

  return (
    <div className={styles.explorer}>
      <div className={styles.fileTree}>
        {files.map((file, i) => (
          <div
            key={file.path}
            className={`${styles.fileItem} text-mono ${i === activeFile ? styles.active : ''}`}
            style={{ paddingLeft: file.indent ? `${file.indent}px` : '8px' }}
            onClick={() => setActiveFile(i)}
          >
            {file.name}
          </div>
        ))}
      </div>
      <div className={styles.codeView}>
        <pre>{files[activeFile]?.content}</pre>
      </div>
    </div>
  )
}
