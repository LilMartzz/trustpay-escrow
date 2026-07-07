import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import ToastProvider from './components/ToastProvider'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import VerificarCorreo from './pages/VerificarCorreo'
import Dashboard from './pages/Dashboard'
import Operacion from './pages/Operacion'
import MisOperaciones from './pages/MisOperaciones'
import Perfil from './pages/Perfil'
import PerfilPublico from './pages/PerfilPublico'
import Admin from './pages/Admin'

const PrivateRoute = ({ children }) => {
  const { user, loading, emailVerified } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" />
  if (!emailVerified) return <Navigate to="/verificar-correo" />
  return children
}

/* Transición entre páginas: fade + leve desplazamiento, con salida animada */
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verificar-correo" element={<VerificarCorreo />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/operaciones" element={<PrivateRoute><MisOperaciones /></PrivateRoute>} />
          <Route path="/operacion/:escrowId" element={<PrivateRoute><Operacion /></PrivateRoute>} />
          <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
          <Route path="/usuario/:email" element={<PrivateRoute><PerfilPublico /></PrivateRoute>} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
