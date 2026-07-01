import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin, register as apiRegister } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser  = localStorage.getItem('user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const decodeRole = (jwt) => {
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]))
      return payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role || 'User'
    } catch { return 'User' }
  }

  const login = async (email, password) => {
    const res = await apiLogin({ emailOrMob: email, password })
    const { token: t, userID, email: userEmail, apiKey, role, level } = res.data
    const userData = { userId: userID, email: userEmail, apiKey, role: role || decodeRole(t), level: level || 'Beginner' }
    setToken(t)
    setUser(userData)
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(userData))
    return userData
  }

  const register = async (email, mobile, password, extra = {}) => {
    await apiRegister({ email, mobnumber: mobile, password, ...extra })
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
