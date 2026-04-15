import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <span className="navbar-brand" onClick={() => navigate('/')}>לילה של פוקר</span>
      {user && (
        <div className="navbar-right">
          <span className="navbar-user">{user.username}</span>
          <button className="navbar-logout" onClick={handleLogout}>התנתק</button>
        </div>
      )}
    </nav>
  )
}
