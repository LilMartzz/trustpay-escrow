import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

export default function Register() {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', telefono: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/auth/registro', form)
      localStorage.setItem('token', res.data.access_token)
      navigate('/dashboard')
    } catch {
      setError('Error al registrarse. El email puede estar en uso.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '360px', padding: '0 16px' }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 700, marginBottom: '4px', letterSpacing: '-0.02em' }}>
          Trust<span style={{ color: 'var(--green)' }}>Pay</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '32px' }}>Crea tu cuenta segura</p>

        <div className="card">
          <p className="label" style={{ marginBottom: '18px' }}>Registro</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Nombre</label>
              <input placeholder="Tu nombre" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input type="email" placeholder="tu@email.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="label">Teléfono (opcional)</label>
              <input placeholder="987654321" value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Contraseña</label>
              <input type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
              Crear cuenta
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', marginTop: '16px' }}>
            ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--green)', textDecoration: 'none' }}>Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}