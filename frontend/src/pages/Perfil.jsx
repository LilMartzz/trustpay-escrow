import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Phone, Shield, CheckCircle2,
  Clock, Upload, Camera, BadgeCheck, AlertCircle, Star,
} from 'lucide-react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

function DocDropzone({ label, file, onPick, Icon }) {
  const inputRef = useRef()
  return (
    <div>
      <div className="label" style={{ marginBottom: '8px' }}>{label}</div>
      <div
        onClick={() => inputRef.current.click()}
        style={{
          background: file ? 'var(--green-bg)' : 'var(--surface2)',
          border: `1px dashed ${file ? 'var(--green)' : 'var(--border2)'}`,
          borderRadius: 'var(--radius)',
          padding: '22px 12px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        {file
          ? <CheckCircle2 size={24} color="var(--green)" style={{ margin: '0 auto 8px' }} />
          : <Icon size={22} color="var(--text3)" style={{ margin: '0 auto 8px' }} />
        }
        <div style={{ fontSize: '11.5px', color: file ? 'var(--green)' : 'var(--text3)' }}>
          {file ? file.name.substring(0, 20) + (file.name.length > 20 ? '…' : '') : 'Clic para subir'}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={e => onPick(e.target.files[0])} style={{ display: 'none' }} />
    </div>
  )
}

const ESTADO_VERIF = {
  no_verificado: { label: 'No verificado', color: 'var(--red)',   bg: 'rgba(248,113,113,0.1)', icon: AlertCircle },
  pendiente:     { label: 'En revisión',   color: 'var(--amber)', bg: 'var(--amber-bg)',       icon: Clock },
  verificado:    { label: 'Verificado',    color: 'var(--green)', bg: 'var(--green-bg)',       icon: BadgeCheck },
}

export default function Perfil() {
  const [perfil,      setPerfil]      = useState(null)
  const [nombre,      setNombre]      = useState('')
  const [telefono,    setTelefono]    = useState('')
  const [dniNumero,   setDniNumero]   = useState('')
  const [dniFrontalFile, setDniFrontalFile] = useState(null)
  const [dniReversoFile, setDniReversoFile] = useState(null)
  const [selfieFile,  setSelfieFile]  = useState(null)
  const [dniValido,   setDniValido]   = useState(null)
  const [msg,   setMsg]   = useState('')
  const [error, setError] = useState('')
  const [loading,       setLoading]       = useState(false)
  const [validandoDni,  setValidandoDni]  = useState(false)
  const navigate   = useNavigate()

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

  const flash = (m, isError = false) => {
    if (isError) { setError(m); setMsg('') } else { setMsg(m); setError('') }
    setTimeout(() => { setMsg(''); setError('') }, 4000)
  }

  const actualizar = async (e) => {
    e.preventDefault()
    try {
      await api.put('/perfil/actualizar', { nombre, telefono })
      flash('Perfil actualizado correctamente')
      cargar()
    } catch (e) { flash(e.response?.data?.detail || 'Error al actualizar perfil', true) }
  }

  const validarDni = async () => {
    if (!/^\d{8}$/.test(dniNumero)) { flash('El DNI debe tener exactamente 8 dígitos', true); return }
    setValidandoDni(true)
    try {
      const res = await api.post('/perfil/validar-dni', { numero_dni: dniNumero })
      setDniValido(res.data)
      flash(res.data.verificado_reniec
        ? `DNI verificado en RENIEC: ${res.data.nombre_reniec}`
        : 'Formato de DNI válido — guardado correctamente')
    } catch (e) { flash(e.response?.data?.detail || 'Error al validar DNI', true) }
    setValidandoDni(false)
  }

  const verificar = async (e) => {
    e.preventDefault()
    if (!perfil?.dni_numero && !dniValido) {
      flash('Primero valida tu número de DNI (paso 1)', true)
      return
    }
    if (!dniFrontalFile || !dniReversoFile || !selfieFile) { flash('Debes subir las 3 imágenes', true); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('dni_frontal', dniFrontalFile)
      fd.append('dni_reverso', dniReversoFile)
      fd.append('selfie', selfieFile)
      const res = await api.post('/perfil/verificar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      flash(res.data.mensaje)
      setDniFrontalFile(null); setDniReversoFile(null); setSelfieFile(null)
      cargar()
    } catch (e) { flash(e.response?.data?.detail || 'Error al enviar documentos', true) }
    setLoading(false)
  }

  const ev = perfil ? ESTADO_VERIF[perfil.verificado] : null

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content" style={{ padding: '28px 32px' }}>
        <div style={{ maxWidth: '720px' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: '26px' }}>
            <h1 style={{ fontFamily: 'Syne', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '3px' }}>
              Mi perfil
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text3)' }}>
              Gestiona tu información y verificación de identidad
            </p>
          </div>

          {msg   && <div className="alert alert-success">{msg}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {perfil && (
            <>
              {/* ── Profile card ── */}
              <div className="card" style={{ marginBottom: '14px' }}>

                {/* Avatar row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Syne', fontSize: '18px', fontWeight: 700, color: 'var(--green)',
                    flexShrink: 0,
                  }}>
                    {perfil.nombre.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>{perfil.nombre}</div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text3)' }}>{perfil.email}</div>
                    {perfil.calificacion_cantidad > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '12px', color: 'var(--text2)' }}>
                        <Star size={12} color="var(--amber)" fill="var(--amber)" />
                        {perfil.calificacion_promedio} ({perfil.calificacion_cantidad})
                      </div>
                    )}
                  </div>
                  {ev && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 12px', borderRadius: '99px', fontSize: '11px',
                      fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em',
                      background: ev.bg, color: ev.color, flexShrink: 0,
                    }}>
                      <ev.icon size={12} />
                      {ev.label}
                    </div>
                  )}
                </div>

                {/* Edit form */}
                <p className="label" style={{ marginBottom: '16px' }}>Información personal</p>
                <form onSubmit={actualizar}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="grid-1-mobile">
                    <div className="form-group">
                      <label className="label">
                        <User size={10} style={{ display: 'inline', marginRight: '4px' }} />
                        Nombre
                      </label>
                      <input value={nombre} onChange={e => setNombre(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="label">
                        <Phone size={10} style={{ display: 'inline', marginRight: '4px' }} />
                        Teléfono
                      </label>
                      <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="987 654 321" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label">
                      <Mail size={10} style={{ display: 'inline', marginRight: '4px' }} />
                      Email
                    </label>
                    <input value={perfil.email} disabled />
                  </div>
                  <button type="submit" className="btn-secondary" style={{ width: 'auto', padding: '8px 20px' }}>
                    Guardar cambios
                  </button>
                </form>
              </div>

              {/* ── Verification card ── */}
              {perfil.verificado === 'verificado' ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '16px',
                    background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                  }}>
                    <CheckCircle2 size={26} color="var(--green)" />
                  </div>
                  <h3 style={{ fontFamily: 'Syne', fontSize: '17px', fontWeight: 700, color: 'var(--green)', marginBottom: '8px' }}>
                    Identidad verificada
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text3)', maxWidth: '360px', margin: '0 auto', lineHeight: 1.6 }}>
                    Tu cuenta está verificada. Los compradores y vendedores pueden confiar plenamente en ti.
                  </p>
                </div>

              ) : perfil.verificado === 'pendiente' ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '16px',
                    background: 'var(--amber-bg)', border: '1px solid rgba(245,158,11,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                  }}>
                    <Clock size={26} color="var(--amber)" />
                  </div>
                  <h3 style={{ fontFamily: 'Syne', fontSize: '17px', fontWeight: 700, color: 'var(--amber)', marginBottom: '8px' }}>
                    Verificación en proceso
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text3)', maxWidth: '360px', margin: '0 auto', lineHeight: 1.6 }}>
                    Tus documentos están siendo revisados. Te notificaremos cuando tu cuenta sea verificada (máx. 24h).
                  </p>
                </div>

              ) : (
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Shield size={14} color="var(--text3)" />
                    <span className="label" style={{ margin: 0 }}>Verificación de identidad</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text2)', marginBottom: '22px', lineHeight: 1.65 }}>
                    Verifica tu identidad con tu DNI para generar más confianza en las operaciones.
                    Solo necesitas tu número de DNI, una foto del documento y una selfie sosteniéndolo.
                  </p>

                  {/* Step 1 — DNI number */}
                  <div style={{ marginBottom: '22px', paddingBottom: '22px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%',
                        background: dniValido ? 'var(--green-bg)' : 'var(--surface2)',
                        border: `1px solid ${dniValido ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 700,
                        color: dniValido ? 'var(--green)' : 'var(--text3)',
                      }}>
                        {dniValido ? <CheckCircle2 size={12} /> : '1'}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>Número de DNI</span>
                    </div>
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
                        style={{ width: 'auto', padding: '9px 16px', flexShrink: 0, fontSize: '12.5px' }}
                      >
                        {validandoDni ? 'Validando...' : 'Validar'}
                      </button>
                    </div>
                    {dniValido && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--green)' }}>
                        <CheckCircle2 size={13} />
                        DNI válido{dniValido.nombre_reniec ? ` · ${dniValido.nombre_reniec}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Step 2 — Photos */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: (dniFrontalFile && dniReversoFile && selfieFile) ? 'var(--green-bg)' : 'var(--surface2)',
                      border: `1px solid ${(dniFrontalFile && dniReversoFile && selfieFile) ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 700,
                      color: (dniFrontalFile && dniReversoFile && selfieFile) ? 'var(--green)' : 'var(--text3)',
                    }}>
                      {(dniFrontalFile && dniReversoFile && selfieFile) ? <CheckCircle2 size={12} /> : '2'}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Documentos fotográficos</span>
                  </div>

                  <form onSubmit={verificar}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }} className="grid-1-mobile">
                      <DocDropzone label="DNI - Anverso" file={dniFrontalFile} onPick={setDniFrontalFile} Icon={Upload} />
                      <DocDropzone label="DNI - Reverso" file={dniReversoFile} onPick={setDniReversoFile} Icon={Upload} />
                      <DocDropzone label="Selfie con DNI" file={selfieFile} onPick={setSelfieFile} Icon={Camera} />
                    </div>

                    <div className="alert alert-warning" style={{ marginBottom: '14px', fontSize: '11.5px' }}>
                      Tus documentos se almacenan de forma segura y solo son visibles para el equipo de verificación. La revisión tarda máximo 24 horas.
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary">
                      {loading ? 'Enviando...' : <><Upload size={14} /> Enviar documentos para verificación</>}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
