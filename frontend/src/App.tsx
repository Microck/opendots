import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { IconContext } from '@phosphor-icons/react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
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
      <Routes>
        <Route path="/" element={<Home isLoggedIn={isLoggedIn} />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/bundle/:id" element={<Detail />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>
      <Footer />
    </IconContext.Provider>
  )
}

