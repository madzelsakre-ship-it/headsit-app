import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
const AuthContext = createContext()
export const useAuth = () => useContext(AuthContext)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [boutique, setBoutique] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const u = localStorage.getItem('headsit_user')
    const b = localStorage.getItem('headsit_boutique')
    if (u) { setUser(JSON.parse(u)); setBoutique(JSON.parse(b)) }
    setLoading(false)
  }, [])
  const login = async (email, mot_de_passe) => {
    const { data } = await api.post('/auth/login', { email, mot_de_passe })
    localStorage.setItem('headsit_token', data.token)
    localStorage.setItem('headsit_user', JSON.stringify(data.user))
    localStorage.setItem('headsit_boutique', JSON.stringify(data.boutique))
    setUser(data.user); setBoutique(data.boutique); return data
  }
  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    localStorage.setItem('headsit_token', data.token)
    localStorage.setItem('headsit_user', JSON.stringify(data.user))
    localStorage.setItem('headsit_boutique', JSON.stringify(data.boutique))
    setUser(data.user); setBoutique(data.boutique); return data
  }
  const logout = () => { localStorage.clear(); setUser(null); setBoutique(null); window.location.href = '/login' }
  return <AuthContext.Provider value={{ user, boutique, login, register, logout, loading }}>{children}</AuthContext.Provider>
}
