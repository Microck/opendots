import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { IconContext } from '@phosphor-icons/react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import PageTransition from './components/PageTransition'
import ReactBitsBackdrop from './components/ReactBitsBackdrop'
import CustomCursor from './components/CustomCursor'
import ErrorBoundary from './components/ErrorBoundary'
import { apiUrl } from './lib/apiBase'

const Home = lazy(() => import('./pages/Home'))
const Browse = lazy(() => import('./pages/Browse'))
const Detail = lazy(() => import('./pages/Detail'))
const SignIn = lazy(() => import('./pages/SignIn'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Register = lazy(() => import('./pages/Register'))
const Docs = lazy(() => import('./pages/Docs'))
const NotFound = lazy(() => import('./pages/NotFound'))

interface SessionUser {
  id: string
  name: string
  email: string
  image: string | null
}

interface SessionResponse {
  signedIn: boolean
  user: SessionUser | null
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(apiUrl('/api/auth/session'), {
          credentials: 'include',
        })
        const data: SessionResponse = await response.json()
        setIsLoggedIn(data.signedIn)
        setUser(data.user)
        
        if (data.signedIn && window.location.pathname === '/signin') {
          navigate('/dashboard')
        }
      } catch (error) {
        console.error('Failed to check session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [navigate])

  if (loading) {
    return null
  }

  const routeFallback = (
    <div
      style={{
        width: '100%',
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-dim)',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        letterSpacing: '0.08em',
      }}
    >
      LOADING_ROUTE...
    </div>
  )

  return (
    <IconContext.Provider value={{ weight: 'bold', size: 20 }}>
      <ReactBitsBackdrop />
      <CustomCursor />
      <div className="appContent">
        <Navbar isLoggedIn={isLoggedIn} user={user} />
        <ErrorBoundary>
          <AnimatePresence mode="wait" initial={false}>
            <Suspense fallback={routeFallback}>
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<PageTransition><Home isLoggedIn={isLoggedIn} /></PageTransition>} />
                <Route path="/browse" element={<PageTransition><Browse /></PageTransition>} />
                <Route path="/bundle/:id" element={<PageTransition><Detail /></PageTransition>} />
                <Route path="/signin" element={<PageTransition><SignIn /></PageTransition>} />
                <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
                <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
                <Route path="/docs" element={<PageTransition><Docs /></PageTransition>} />
                <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </ErrorBoundary>
        <Footer />
      </div>
    </IconContext.Provider>
  )
}
