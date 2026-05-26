import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

const ESTADO_VERIF = {
  no_verificado: { label: 'No verificado', color: 'var(--red)', bg: 'rgba(248,113,113,0.08)' },
  pendiente: { label: 'En revisión', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  verificado: { label: 'Verificado', color: 'var(--green)', bg: 'var(--green-bg)' },
}

export default function Perfil() {
  const [perfil, setPerfil] = useState(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [dniNumero, setDniNumero] = useState('')
  const [dniFile, setDniFile] = useState(null)
  const [selfieFile, setSelfieFile] = useState(null)
  const [dniValido, setDniValido] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [validandoDni, setValidandoDni] = useState(false)
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
      setDniNumero(res.data.dni_numero || '')
    } catch {
      navigate('/dashboard')
    }
  }

  const actualizar = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.put(`/perfil/actualizar?nombre=${encodeURIComponent(nombre)}&telefono=${encodeURIComponent(telefono)}`)
      setMsg('Perfil actualizado')
      cargar()
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setError('Error al actualizar perfil')
    }
  }

  const validarDni = async () => {
    if (!/^\d{8}$/.test(dniNumero)) {
      setError('El DNI debe tener exactamente 8 dígitos')
      return
    }
    setValidandoDni(true)
    setError('')
    try {
      const res = await api.post(`/perfil/validar-dni?numero_dni=${dniNumero}`)
      setDniValido(res.data)
      setMsg(res.data.verificado_reniec
        ? `DNI verificado en RENIEC: ${res.data.nombre_reniec}`
        : 'Formato de DNI válido — guardado correctamente')
      setTimeout(() => setMsg(''), 5000)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al validar DNI')
    }
    setValidandoDni(false)
  }

  const verificar = async (e) => {
    e.preventDefault()
    if (!dniFile || !selfieFile) {
      setError('Debes subir ambas imágenes')
      return
    }
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('dni', dniFile)
      formData.append('selfie', selfieFile)
      await api.post('/perfil/verificar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMsg('Documentos recibidos. Tu identidad será verificada en breve.')
      setDniFile(null)
      setSelfieFile(null)
      cargar()
      setTimeout(() => setMsg(''), 5000)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al enviar documentos')
    }
    setLoading(false)
  }

  const ev = perfil ? ESTADO_VERIF[perfil.verificado] : null

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '700px' }}>
          <h1 style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Mi perfil
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '24px' }}>
            Gestiona tu información y verificación de identidad
          </p>

          {msg && (
            <div style={{ background: 'var(--green-bg)', border: '0.5px solid rgba(46,204,138,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--green)', marginBottom: '16px' }}>
              {msg}
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--red)', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {perfil && (
            <>
              <div className="card" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'var(--surface2)', border: '0.5px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 500, color: '#A8CDEE', flexShrink: 0,
                  }}>
                    {perfil.nombre.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 500 }}>{perfil.nombre}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{perfil.email}</div>
                  </div>
                  {ev && (
                    <div style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '11px',
                      fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em',
                      background: ev.bg, color: ev.color,
                    }}>
                      {ev.label}
                    </div>
                  )}
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

              {perfil.verificado === 'verificado' ? (
                <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px', color: 'var(--green)' }}>✓</div>
                  <div style={{ fontFamily: 'Syne', fontSize: '16px', fontWeight: 600, color: 'var(--green)', marginBottom: '6px' }}>
                    Identidad verificada
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Tu cuenta está verificada. Los compradores y vendedores pueden confiar en ti.
                  </p>
                </div>
              ) : perfil.verificado === 'pendiente' ? (
                <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{ fontSize: '28px', marginBottom: '10px' }}>⏳</div>
                  <div style={{ fontFamily: 'Syne', fontSize: '15px', fontWeight: 600, color: 'var(--amber)', marginBottom: '6px' }}>
                    Verificación en proceso
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Tus documentos están siendo revisados. Te notificaremos cuando tu cuenta sea verificada.
                  </p>
                </div>
              ) : (
                <div className="card">
                  <div className="label" style={{ marginBottom: '6px' }}>Verificación de identidad</div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px', lineHeight: 1.6 }}>
                    Verifica tu identidad para generar más confianza. Necesitas tu número de DNI, una foto del DNI y una selfie sosteniéndolo.
                  </p>

                  {/* DNI Number Validation */}
                  <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '0.5px solid var(--border)' }}>
                    <div className="label" style={{ marginBottom: '8px' }}>Paso 1 — Número de DNI</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="12345678"
                        value={dniNumero}
                        onChange={e => setDniNumero(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        maxLength={8}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={validarDni}
                        disabled={validandoDni || dniNumero.length !== 8}
                        className="btn-secondary"
                        style={{ width: 'auto', padding: '10px 16px', flexShrink: 0 }}
                      >
                        {validandoDni ? 'Validando...' : 'Validar DNI'}
                      </button>
                    </div>
                    {dniValido && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--green)' }}>
                        ✓ DNI válido{dniValido.nombre_reniec ? ` · ${dniValido.nombre_reniec}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Document Upload */}
                  <div className="label" style={{ marginBottom: '12px' }}>Paso 2 — Documentos fotográficos</div>
                  <form onSubmit={verificar}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <div className="label" style={{ marginBottom: '8px' }}>Foto del DNI</div>
                        <div
                          onClick={() => dniRef.current.click()}
                          style={{
                            background: 'var(--surface2)',
                            border: `0.5px solid ${dniFile ? 'var(--green)' : 'var(--border)'}`,
                            borderRadius: '8px',
                            padding: '20px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s',
                          }}
                        >
                          <div style={{ fontSize: '24px', marginBottom: '6px' }}>🪪</div>
                          <div style={{ fontSize: '11px', color: dniFile ? 'var(--green)' : 'var(--muted)' }}>
                            {dniFile ? dniFile.name : 'Haz clic para subir'}
                          </div>
                        </div>
                        <input
                          ref={dniRef}
                          type="file"
                          accept="image/*"
                          onChange={e => setDniFile(e.target.files[0])}
                          style={{ display: 'none' }}
                        />
                      </div>

                      <div>
                        <div className="label" style={{ marginBottom: '8px' }}>Selfie con DNI</div>
                        <div
                          onClick={() => selfieRef.current.click()}
                          style={{
                            background: 'var(--surface2)',
                            border: `0.5px solid ${selfieFile ? 'var(--green)' : 'var(--border)'}`,
                            borderRadius: '8px',
                            padding: '20px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s',
                          }}
                        >
                          <div style={{ fontSize: '24px', marginBottom: '6px' }}>🤳</div>
                          <div style={{ fontSize: '11px', color: selfieFile ? 'var(--green)' : 'var(--muted)' }}>
                            {selfieFile ? selfieFile.name : 'Haz clic para subir'}
                          </div>
                        </div>
                        <input
                          ref={selfieRef}
                          type="file"
                          accept="image/*"
                          onChange={e => setSelfieFile(e.target.files[0])}
                          style={{ display: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{
                      background: 'var(--amber-bg)',
                      border: '0.5px solid rgba(245,158,11,0.2)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      marginBottom: '14px',
                    }}>
                      <p style={{ fontSize: '11px', color: 'var(--amber)', lineHeight: 1.5 }}>
                        Tus documentos se almacenan de forma segura y solo son visibles para el equipo de verificación. La revisión tarda máximo 24 horas.
                      </p>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary">
                      {loading ? 'Enviando...' : 'Enviar documentos para verificación'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
