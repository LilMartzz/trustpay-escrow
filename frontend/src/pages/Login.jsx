import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Mail, Lock, ArrowRight, Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import api from '../services/api'

export default function Login() {
  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      localStorage.setItem('token', res.data.access_token)
      navigate('/dashboard')
    } catch {
      setError('Email o contraseña incorrectos')
    }
    setLoading(false)
  }

  return (
    <div className="auth-layout">

      {/* ── BRAND PANEL ── */}
      <div className="auth-brand" style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Orbs */}
        <div className="orb" style={{
          width: '360px', height: '360px',
          background: 'var(--green)', opacity: 0.07,
          top: '-120px', left: '-80px',
        }} />
        <div className="orb" style={{
          width: '280px', height: '280px',
          background: '#06B6D4', opacity: 0.05,
          bottom: '60px', right: '-60px',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'auto' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} color="var(--green)" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Trust<span style={{ color: 'var(--green)' }}>Pay</span>
          </span>
        </div>

        {/* Headline */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: 'Syne', fontSize: '36px', fontWeight: 700,
            lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '16px',
          }}>
            Compra y vende<br />
            <span className="gradient-text">con total confianza</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.7, maxWidth: '380px', marginBottom: '40px' }}>
            TrustPay retiene el pago hasta que ambas partes confirmen la operación.
            Sin riesgo de estafas, con respaldo digital.
          </p>

          {/* Feature list */}
          {[
            'Fondos retenidos de forma segura en escrow',
            'Chat integrado entre comprador y vendedor',
            'Seguimiento de envío con número de guía',
          ].map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '48px', position: 'relative', zIndex: 1 }}>
          © 2026 TrustPay — Escrow digital para Perú
        </p>
      </div>

      {/* ── FORM PANEL ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'var(--bg)',
        position: 'relative',
      }}>
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="btn-ghost"
          style={{ position: 'absolute', top: '20px', right: '20px', padding: '8px', color: 'var(--text3)' }}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div style={{ width: '100%', maxWidth: '380px' }} className="fade-up">
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontFamily: 'Syne', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
              Bienvenido de vuelta
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text2)' }}>
              Ingresa a tu cuenta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email</label>
              <div className="input-icon-wrap">
                <span className="input-icon"><Mail size={15} /></span>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Contraseña</label>
              <div className="input-icon-wrap">
                <span className="input-icon"><Lock size={15} /></span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && <p className="alert alert-error">{error}</p>}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '8px', height: '42px', fontSize: '14px', fontWeight: 600 }}
            >
              {loading ? 'Ingresando...' : (
                <>Entrar <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text3)', marginTop: '20px' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" style={{ color: 'var(--green)', fontWeight: 500 }}>
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>

    </div>
  )
}
