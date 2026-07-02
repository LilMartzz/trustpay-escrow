import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import VerificarCorreo from './pages/VerificarCorreo'
import Dashboard from './pages/Dashboard'
import Operacion from './pages/Operacion'
import MisOperaciones from './pages/MisOperaciones'
import Perfil from './pages/Perfil'

const PrivateRoute = ({ children }) => {
  const { user, loading, emailVerified } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" />
  if (!emailVerified) return <Navigate to="/verificar-correo" />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verificar-correo" element={<VerificarCorreo />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/operaciones" element={<PrivateRoute><MisOperaciones /></PrivateRoute>} />
            <Route path="/operacion/:escrowId" element={<PrivateRoute><Operacion /></PrivateRoute>} />
            <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
