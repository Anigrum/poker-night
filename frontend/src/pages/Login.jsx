import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, getMe } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { loginUser } = useAuth()
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fn = tab === 'login' ? login : register
      const { token } = await fn(username.trim(), password)
      localStorage.setItem('auth_token', token)
      const meData = await getMe()
      loginUser(token, meData)
      navigate('/')
    } catch (err) {
      localStorage.removeItem('auth_token')
      setError(err.detail || 'משהו השתבש')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <h1>לילה של פוקר</h1>
      <p className="subtitle">ארגן את המשחק, סגור חשבונות</p>

      <div className="tabs">
        <button
          className={`tab${tab === 'login' ? ' active' : ''}`}
          onClick={() => { setTab('login'); setError('') }}
        >
          התחברות
        </button>
        <button
          className={`tab${tab === 'register' ? ' active' : ''}`}
          onClick={() => { setTab('register'); setError('') }}
        >
          הרשמה
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <form className="form" onSubmit={handleSubmit}>
        <label>
          שם משתמש
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="שם המשתמש שלך"
            autoComplete="username"
            required
          />
        </label>
        <label>
          סיסמה
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="הסיסמה שלך"
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            required
          />
        </label>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '...' : tab === 'login' ? 'התחבר' : 'צור חשבון'}
        </button>
      </form>
    </div>
  )
}
