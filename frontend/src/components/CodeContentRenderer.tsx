import { Highlight, themes } from 'prism-react-renderer'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styles from './CodeExplorer.module.css'

interface CodeContentRendererProps {
  content: string
  isMarkdown: boolean
  language: string
}

export default function CodeContentRenderer({
  content,
  isMarkdown,
  language,
}: CodeContentRendererProps) {
  if (isMarkdown) {
    return (
      <div className={styles.markdownContent}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
          {content}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <Highlight
      theme={themes.dracula}
      code={content}
      language={language}
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
  )
}
