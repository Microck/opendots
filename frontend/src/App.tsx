import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { IconContext } from '@phosphor-icons/react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import PageTransition from './components/PageTransition'
import Home from './pages/Home'
import Browse from './pages/Browse'
import Detail from './pages/Detail'
import SignIn from './pages/SignIn'
import Dashboard from './pages/Dashboard'
import Register from './pages/Register'
import Docs from './pages/Docs'

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
        const response = await fetch('/api/auth/session', {
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
  }, [])

  if (loading) {
    return null
  }

  return (
    <IconContext.Provider value={{ weight: 'bold', size: 20 }}>
      <Navbar isLoggedIn={isLoggedIn} user={user} />
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location}>
          <Route path="/" element={<PageTransition><Home isLoggedIn={isLoggedIn} /></PageTransition>} />
          <Route path="/browse" element={<PageTransition><Browse /></PageTransition>} />
          <Route path="/bundle/:id" element={<PageTransition><Detail /></PageTransition>} />
          <Route path="/signin" element={<PageTransition><SignIn /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
          <Route path="/docs" element={<PageTransition><Docs /></PageTransition>} />
        </Routes>
      </AnimatePresence>
      <Footer />
    </IconContext.Provider>
  )
}

