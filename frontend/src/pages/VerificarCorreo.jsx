import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { MailCheck, Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

export default function VerificarCorreo() {
  const [enviando, setEnviando] = useState(false)
  const [revisando, setRevisando] = useState(false)
  const [reenviado, setReenviado] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { user, emailVerified, resendVerification, refreshEmailVerified, logout } = useAuth()

  if (!user) return <Navigate to="/login" />
  if (emailVerified) return <Navigate to="/dashboard" />

  const handleReenviar = async () => {
    setError('')
    setEnviando(true)
    try {
      await resendVerification()
      setReenviado(true)
    } catch {
      setError('No se pudo reenviar el correo. Intenta de nuevo en unos minutos.')
    }
    setEnviando(false)
  }

  const handleYaVerifique = async () => {
    setError('')
    setRevisando(true)
    const verificado = await refreshEmailVerified()
    if (verificado) {
      navigate('/dashboard')
    } else {
      setError('Todavía no detectamos la verificación. Revisa tu bandeja (y spam) y vuelve a intentar.')
    }
    setRevisando(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      position: 'relative',
      padding: '24px',
    }}>
      <button
        onClick={toggle}
        className="btn-ghost"
        style={{ position: 'absolute', top: '20px', right: '20px', padding: '8px', color: 'var(--text3)' }}
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <div className="card fade-up" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '40px 32px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <MailCheck size={26} color="var(--green)" />
        </div>

        <h2 style={{ fontFamily: 'Syne', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '10px' }}>
          Verifica tu correo
        </h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text2)', lineHeight: 1.6, marginBottom: '24px' }}>
          Te enviamos un enlace de verificación a <strong>{user.email}</strong>.
          Ábrelo y luego vuelve aquí para continuar.
        </p>

        {error && <p className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</p>}
        {reenviado && !error && <p className="alert alert-success" style={{ marginBottom: '16px' }}>Correo reenviado.</p>}

        <button
          className="btn-primary"
          onClick={handleYaVerifique}
          disabled={revisando}
          style={{ width: '100%', height: '42px', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}
        >
          {revisando ? 'Comprobando...' : 'Ya verifiqué, continuar'}
        </button>

        <button
          className="btn-ghost"
          onClick={handleReenviar}
          disabled={enviando}
          style={{ width: '100%', height: '38px', fontSize: '13px', marginBottom: '12px' }}
        >
          {enviando ? 'Enviando...' : 'Reenviar correo de verificación'}
        </button>

        <button
          className="btn-ghost"
          onClick={logout}
          style={{ width: '100%', height: '34px', fontSize: '12.5px', color: 'var(--text3)' }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
