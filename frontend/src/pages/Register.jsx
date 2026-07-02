import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Mail, Lock, User, Phone, ArrowRight, Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const [form, setForm]   = useState({ nombre: '', email: '', password: '', telefono: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { register } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form.nombre, form.email, form.password, form.telefono)
      navigate('/verificar-correo')
    } catch {
      setError('Error al registrarse. El email puede estar en uso.')
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
        <div className="orb" style={{
          width: '400px', height: '400px',
          background: 'var(--green)', opacity: 0.06,
          top: '-140px', left: '-100px',
        }} />
        <div className="orb" style={{
          width: '300px', height: '300px',
          background: '#818CF8', opacity: 0.05,
          bottom: '40px', right: '-80px',
        }} />

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

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: 'Syne', fontSize: '34px', fontWeight: 700,
            lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '16px',
          }}>
            Tu dinero,<br />
            <span className="gradient-text">siempre protegido</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.7, maxWidth: '380px', marginBottom: '40px' }}>
            Crea tu cuenta gratuita en segundos y empieza a realizar operaciones
            de compra/venta con escrow hoy mismo.
          </p>

          <div style={{
            background: 'var(--green-bg)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 'var(--radius)',
            padding: '16px 20px',
            maxWidth: '380px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ¿Cómo funciona?
            </div>
            {[
              ['01', 'Comprador deposita fondos en TrustPay'],
              ['02', 'Vendedor envía el producto con número de guía'],
              ['03', 'Comprador confirma y el vendedor recibe el pago'],
            ].map(([n, t]) => (
              <div key={n} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--green)', minWidth: '18px', paddingTop: '1px' }}>{n}</span>
                <span style={{ fontSize: '12.5px', color: 'var(--text2)', lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

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
        <button
          onClick={toggle}
          className="btn-ghost"
          style={{ position: 'absolute', top: '20px', right: '20px', padding: '8px', color: 'var(--text3)' }}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div style={{ width: '100%', maxWidth: '380px' }} className="fade-up">
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontFamily: 'Syne', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
              Crea tu cuenta
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text2)' }}>
              Gratis, sin tarjeta de crédito requerida
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Nombre completo</label>
              <div className="input-icon-wrap">
                <span className="input-icon"><User size={15} /></span>
                <input
                  type="text"
                  placeholder="Juan Pérez"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  required
                  autoComplete="name"
                />
              </div>
            </div>

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
              <label className="label">Teléfono <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(opcional)</span></label>
              <div className="input-icon-wrap">
                <span className="input-icon"><Phone size={15} /></span>
                <input
                  type="tel"
                  placeholder="987 654 321"
                  value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Contraseña</label>
              <div className="input-icon-wrap">
                <span className="input-icon"><Lock size={15} /></span>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  autoComplete="new-password"
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
              {loading ? 'Creando cuenta...' : (
                <>Crear cuenta gratis <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text3)', marginTop: '20px' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: 'var(--green)', fontWeight: 500 }}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>

    </div>
  )
}
