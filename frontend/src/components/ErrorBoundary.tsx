import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    // Here you could also log to an error tracking service
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.content}>
            <h1 className={styles.code}>500</h1>
            <h2 className={styles.title}>INTERNAL SERVER ERROR</h2>
            <p className={styles.description}>
              Something went wrong on our end. Please try again or contact support if the problem persists.
            </p>
            <button onClick={this.handleReload} className={styles.reloadButton}>
              RELOAD PAGE
            </button>
            <Link to="/" className={styles.homeLink}>
              RETURN TO HOME
            </Link>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
