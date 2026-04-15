import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Home from './pages/Home'
import TableView from './pages/TableView'
import Settlement from './pages/Settlement'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="center">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return <div className="center">Loading...</div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/table/:code" element={<ProtectedRoute><TableView /></ProtectedRoute>} />
      <Route path="/table/:code/settlement" element={<ProtectedRoute><Settlement /></ProtectedRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
