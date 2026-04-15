import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api'

const AuthContext = createContext(null)

function restoreTableAccess(meData) {
  meData.hosted_tables.forEach(t => {
    localStorage.setItem(`admin_secret_${t.code}`, t.admin_secret)
  })
  meData.player_tables.forEach(t => {
    localStorage.setItem(`player_id_${t.code}`, t.player_id)
    localStorage.setItem(`player_token_${t.code}`, t.player_token)
  })
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [myTables, setMyTables] = useState({ hosted: [], playing: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setLoading(false)
      return
    }
    getMe()
      .then(data => {
        setUser(data.user)
        setMyTables({ hosted: data.hosted_tables, playing: data.player_tables })
        restoreTableAccess(data)
      })
      .catch(() => {
        localStorage.removeItem('auth_token')
      })
      .finally(() => setLoading(false))
  }, [])

  const loginUser = (token, meData) => {
    localStorage.setItem('auth_token', token)
    setUser(meData.user)
    setMyTables({ hosted: meData.hosted_tables, playing: meData.player_tables })
    restoreTableAccess(meData)
  }

  const refreshMyTables = () => {
    getMe().then(data => {
      setMyTables({ hosted: data.hosted_tables, playing: data.player_tables })
      restoreTableAccess(data)
    }).catch(() => {})
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    setMyTables({ hosted: [], playing: [] })
  }

  return (
    <AuthContext.Provider value={{ user, myTables, loading, loginUser, logout, refreshMyTables }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
