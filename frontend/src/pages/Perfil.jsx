import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Perfil() {
  const [perfil, setPerfil] = useState(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [dni, setDni] = useState(null)
  const [selfie, setSelfie] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const dniRef = useRef()
  const selfieRef = useRef()

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      const res = await api.get('/perfil/')
      setPerfil(res.data)
      setNombre(res.data.nombre)
      setTelefono(res.data.telefono || '')
    } catch {
      navigate('/dashboard')
    }
  }

  const actualizar = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/perfil/actualizar?nombre=${encodeURIComponent(nombre)}&telefono=${encodeURIComponent(telefono)}`)
      setMsg('Perfil actualizado')
      cargar()
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setError('Error al actualizar perfil')
    }
  }

  const verificar = async (e) => {
    e.preventDefault()
    if (!dni || !selfie) {
      setError('Debes subir ambas imágenes')
      return
    }
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('dni', dni)
      formData.append('selfie', selfie)
      await api.post('/perfil/verificar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMsg('Identidad verificada correctamente')
      setDni(null)
      setSelfie(null)
      cargar()
      setTimeout(() => setMsg(''), 4000)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al verificar identidad')
    }
    setLoading(false)
  }

  const estadoVerif = {
    no_verificado: { label: 'No verificado', color: 'var(--red)', bg: 'rgba(248,113,113,0.08)' },
    pendiente: { label: 'Pendiente', color: 'var(--amber)', bg: 'var(--amber-bg)' },
    verificado: { label: 'Verificado', color: 'var(--green)', bg: 'var(--green-bg)' },
  }

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Mis operaciones', path: '/operaciones' },
    { label: 'Perfil', path: '/perfil' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ width: '190px', background: 'var(--surface)', borderRight: '0.5px solid var(--border)', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne', fontSize: '17px', fontWeight: 700, color: '#E8F4FF', padding: '4px 10px 18px', marginBottom: '6px', borderBottom: '0.5px solid var(--border)', letterSpacing: '-0.01em' }}>
          Trust<span style={{ color: 'var(--green)' }}>Pay</span>
          <div style={{ fontSize: '9px', fontWeight: 400, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '2px', fontFamily: 'Inter' }}>escrow digital</div>
        </div>
        {navItems.map(item => (
          <div key={item.label} onClick={() => navigate(item.path)}
            style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '12.5px', cursor: 'pointer', color: window.location.pathname === item.path ? 'var(--text)' : 'var(--muted)', background: window.location.pathname === item.path ? 'var(--surface2)' : 'transparent', fontWeight: window.location.pathname === item.path ? 500 : 400 }}>
            {item.label}
          </div>
        ))}
        <div onClick={() => { localStorage.removeItem('token'); navigate('/login') }}
          style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '12.5px', color: 'var(--red)', cursor: 'pointer', marginTop: 'auto' }}>
          Cerrar sesión
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '700px' }}>
          <h1 style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '4px' }}>Mi perfil</h1>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '24px' }}>Gestiona tu información y verificación de identidad</p>

          {msg && <div style={{ background: 'var(--green-bg)', border: '0.5px solid rgba(46,204,138,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--green)', marginBottom: '16px' }}>{msg}</div>}
          {error && <div style={{ background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--red)', marginBottom: '16px' }}>{error}</div>}

          {perfil && (
            <>
              <div className="card" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--surface2)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 500, color: '#A8CDEE', flexShrink: 0 }}>
                    {perfil.nombre.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 500 }}>{perfil.nombre}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{perfil.email}</div>
                  </div>
                  <div style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', background: estadoVerif[perfil.verificado]?.bg, color: estadoVerif[perfil.verificado]?.color }}>
                    {estadoVerif[perfil.verificado]?.label}
                  </div>
                </div>

                <div className="label" style={{ marginBottom: '14px' }}>Información personal</div>
                <form onSubmit={actualizar}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="label">Nombre</label>
                      <input value={nombre} onChange={e => setNombre(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="label">Teléfono</label>
                      <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="987654321" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label">Email</label>
                    <input value={perfil.email} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                  </div>
                  <button type="submit" className="btn-secondary" style={{ width: 'auto', padding: '8px 20px' }}>
                    Guardar cambios
                  </button>
                </form>
              </div>

              {perfil.verificado !== 'verificado' ? (
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div className="label" style={{ margin: 0 }}>Verificación de identidad</div>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '18px', lineHeight: 1.6 }}>
                    Verifica tu identidad para generar más confianza en tus operaciones. Necesitas una foto de tu DNI y una selfie sosteniendo el DNI.
                  </p>

                  <form onSubmit={verificar}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <div className="label" style={{ marginBottom: '8px' }}>Foto del DNI</div>
                        <div onClick={() => dniRef.current.click()}
                          style={{ background: 'var(--surface2)', border: `0.5px solid ${dni ? 'var(--green)' : 'var(--border)'}`, borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                          <div style={{ fontSize: '24px', marginBottom: '6px' }}>🪪</div>
                          <div style={{ fontSize: '12px', color: dni ? 'var(--green)' : 'var(--muted)' }}>
                            {dni ? dni.name : 'Haz clic para subir'}
                          </div>
                        </div>
                        <input ref={dniRef} type="file" accept="image/*" onChange={e => setDni(e.target.files[0])} style={{ display: 'none' }} />
                      </div>

                      <div>
                        <div className="label" style={{ marginBottom: '8px' }}>Selfie con DNI</div>
                        <div onClick={() => selfieRef.current.click()}
                          style={{ background: 'var(--surface2)', border: `0.5px solid ${selfie ? 'var(--green)' : 'var(--border)'}`, borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                          <div style={{ fontSize: '24px', marginBottom: '6px' }}>🤳</div>
                          <div style={{ fontSize: '12px', color: selfie ? 'var(--green)' : 'var(--muted)' }}>
                            {selfie ? selfie.name : 'Haz clic para subir'}
                          </div>
                        </div>
                        <input ref={selfieRef} type="file" accept="image/*" onChange={e => setSelfie(e.target.files[0])} style={{ display: 'none' }} />
                      </div>
                    </div>

                    <div style={{ background: 'var(--amber-bg)', border: '0.5px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--amber)', lineHeight: 1.5 }}>
                        Tus documentos se almacenan de forma segura y solo son visibles para el equipo de verificación.
                      </p>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary">
                      {loading ? 'Verificando...' : 'Verificar identidad'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>✓</div>
                  <div style={{ fontFamily: 'Syne', fontSize: '16px', fontWeight: 600, color: 'var(--green)', marginBottom: '6px' }}>Identidad verificada</div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Tu cuenta está verificada. Los compradores y vendedores pueden confiar en ti.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}