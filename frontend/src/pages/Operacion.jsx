import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ShieldCheck, Truck, MessageSquare,
  CheckCircle2, Circle, Send, ExternalLink, Paperclip,
  Link2, Package, ChevronRight,
} from 'lucide-react'
import api from '../services/api'

/* ── constants ── */
const ESTADO_MAP = {
  retenido:  { color: 'var(--amber)', bg: 'var(--amber-bg)',       label: 'Retenido' },
  liberado:  { color: 'var(--green)', bg: 'var(--green-bg)',       label: 'Liberado' },
  cancelado: { color: 'var(--red)',   bg: 'rgba(248,113,113,0.1)', label: 'Cancelado' },
  expirado:  { color: 'var(--text3)', bg: 'rgba(82,82,91,0.15)',   label: 'Expirado' },
}

const EMPRESAS = [
  'Serpost', 'Olva Courier', 'Shalom', 'Cruz del Sur',
  'DHL', 'FedEx', 'GLS', 'Motorizado propio', 'Otro',
]

const TRACKING_ESTADOS = [
  { key: null,         label: 'Orden creada' },
  { key: 'preparando', label: 'Preparando envío' },
  { key: 'en_camino',  label: 'En camino' },
  { key: 'entregado',  label: 'Entregado' },
  { key: 'confirmado', label: 'Confirmado' },
]

function trackingDone(envioEstado, escrowEstado, step) {
  if (step === null) return true
  if (step === 'confirmado') return escrowEstado === 'liberado'
  if (!envioEstado) return false
  const order = ['preparando', 'en_camino', 'entregado', 'confirmado']
  return order.indexOf(envioEstado) >= order.indexOf(step)
}

/* ── Tab button ── */
function Tab({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        padding: '7px',
        background: active ? 'var(--surface)' : 'transparent',
        border: active ? '1px solid var(--border)' : '1px solid transparent',
        borderRadius: '6px',
        fontSize: '12px',
        color: active ? 'var(--text)' : 'var(--text3)',
        fontWeight: active ? 500 : 400,
        transition: 'all 0.15s',
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

export default function Operacion() {
  const { escrowId } = useParams()
  const navigate = useNavigate()

  const [escrow,    setEscrow]    = useState(null)
  const [evidencias, setEvidencias] = useState([])
  const [envio,     setEnvio]     = useState(null)
  const [mensajes,  setMensajes]  = useState([])

  const [link, setLink]           = useState('')
  const [descLink, setDescLink]   = useState('')
  const [archivo, setArchivo]     = useState(null)
  const [descArchivo, setDescArchivo] = useState('')

  const [envioForm, setEnvioForm] = useState({ empresa: 'Serpost', numero_guia: '', descripcion_producto: '' })
  const [chatInput, setChatInput] = useState('')
  const [tab, setTab]             = useState('evidencia')

  const [msg,   setMsg]   = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const chatRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    cargarDatos()
    pollRef.current = setInterval(cargarChat, 3000)
    return () => clearInterval(pollRef.current)
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [mensajes])

  const cargarDatos = async () => {
    try {
      const [e, ev, en, ch] = await Promise.all([
        api.get(`/escrow/estado/${escrowId}`),
        api.get(`/evidencia/ver/${escrowId}`),
        api.get(`/envio/${escrowId}`).catch(() => ({ data: null })),
        api.get(`/chat/${escrowId}`).catch(() => ({ data: [] })),
      ])
      setEscrow(e.data)
      setEvidencias(ev.data)
      setEnvio(en.data)
      setMensajes(ch.data)
    } catch {
      navigate('/operaciones')
    }
  }

  const cargarChat = async () => {
    try {
      const res = await api.get(`/chat/${escrowId}`)
      setMensajes(res.data)
    } catch {}
  }

  const flash = (m, isError = false) => {
    if (isError) setError(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 3500)
  }

  const confirmar = async () => {
    setLoading(true)
    try {
      await api.post(`/escrow/confirmar/${escrowId}`)
      flash('Fondos liberados al vendedor exitosamente')
      cargarDatos()
    } catch (e) {
      flash(e.response?.data?.detail || 'Error al confirmar', true)
    }
    setLoading(false)
  }

  const cancelar = async () => {
    if (!window.confirm('¿Seguro que deseas cancelar y devolver los fondos?')) return
    setLoading(true)
    try {
      await api.post(`/escrow/cancelar/${escrowId}`)
      flash('Escrow cancelado. Fondos devueltos.')
      cargarDatos()
    } catch (e) {
      flash(e.response?.data?.detail || 'Error al cancelar', true)
    }
    setLoading(false)
  }

  const subirLink = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/evidencia/subir-link/${escrowId}?link=${encodeURIComponent(link)}&descripcion=${encodeURIComponent(descLink)}`)
      setLink(''); setDescLink('')
      flash('Evidencia registrada')
      cargarDatos()
    } catch { flash('Error al registrar evidencia', true) }
  }

  const subirArchivo = async (e) => {
    e.preventDefault()
    if (!archivo) return
    const fd = new FormData()
    fd.append('archivo', archivo)
    fd.append('descripcion', descArchivo || 'Evidencia del producto')
    try {
      await api.post(`/evidencia/subir-archivo/${escrowId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setArchivo(null); setDescArchivo('')
      flash('Archivo subido correctamente')
      cargarDatos()
    } catch { flash('Error al subir archivo', true) }
  }

  const registrarEnvio = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/envio/${escrowId}`, envioForm)
      flash('Envío registrado correctamente')
      cargarDatos()
      setTab('evidencia')
    } catch (e) { flash(e.response?.data?.detail || 'Error al registrar envío', true) }
  }

  const actualizarEstadoEnvio = async (nuevoEstado) => {
    try {
      await api.put(`/envio/${escrowId}/estado?estado=${nuevoEstado}`)
      flash(`Estado actualizado: ${nuevoEstado}`)
      cargarDatos()
    } catch (e) { flash(e.response?.data?.detail || 'Error al actualizar estado', true) }
  }

  const enviarMensaje = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const texto = chatInput
    setChatInput('')
    try {
      await api.post(`/chat/${escrowId}`, { contenido: texto })
      cargarChat()
    } catch { setChatInput(texto) }
  }

  const esComprador = escrow?.rol === 'comprador'
  const esVendedor  = escrow?.rol === 'vendedor'
  const estadoInfo  = escrow ? (ESTADO_MAP[escrow.estado] || ESTADO_MAP.expirado) : null

  /* progress steps */
  const pasos = [
    { label: 'Pago iniciado',                 done: true },
    { label: 'Fondos retenidos',              done: true },
    { label: 'Evidencia subida',              done: evidencias.length > 0 },
    { label: 'Comprador confirma recepción',  done: escrow?.estado === 'liberado' },
    { label: 'Fondos liberados al vendedor',  done: escrow?.estado === 'liberado' },
  ]

  const tabs = [
    { key: 'evidencia', label: 'Evidencia',       icon: Package },
    ...(esVendedor && escrow?.estado === 'retenido' ? [{ key: 'envio', label: 'Envío', icon: Truck }] : []),
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px' }}>
      <div style={{ maxWidth: '1020px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
          <button
            onClick={() => navigate('/operaciones')}
            className="btn-ghost"
            style={{ padding: '7px', color: 'var(--text2)' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{
                fontFamily: 'Syne', fontSize: '18px', fontWeight: 700,
                letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {escrow?.descripcion || 'Operación escrow'}
              </h1>
              {escrow && (
                <span className="badge" style={{
                  background: esComprador ? 'var(--green-bg)' : 'var(--amber-bg)',
                  color: esComprador ? 'var(--green)' : 'var(--amber)',
                  fontSize: '9.5px', flexShrink: 0,
                }}>
                  {esComprador ? 'Comprador' : 'Vendedor'}
                </span>
              )}
            </div>
            {escrow?.contraparte && (
              <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                {esComprador ? 'Vendedor' : 'Comprador'}: {escrow.contraparte}
              </p>
            )}
          </div>
        </div>

        {/* ── Alerts ── */}
        {msg   && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {/* ── Two-column layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="grid-1-mobile">

          {/* ───── LEFT ───── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Estado card */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <span className="label" style={{ margin: 0 }}>Estado de la operación</span>
                {estadoInfo && (
                  <span className="badge" style={{ background: estadoInfo.bg, color: estadoInfo.color, fontSize: '9.5px' }}>
                    {estadoInfo.label}
                  </span>
                )}
              </div>

              {escrow && (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '22px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: 500 }}>S/</span>
                    <span style={{
                      fontFamily: 'Syne', fontSize: '38px', fontWeight: 800,
                      color: estadoInfo.color, letterSpacing: '-0.04em', lineHeight: 1,
                    }}>
                      {Number(escrow.monto_retenido).toFixed(2)}
                    </span>
                  </div>

                  {/* Progress steps */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {pasos.map((paso, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {paso.done
                            ? <CheckCircle2 size={15} color="var(--green)" style={{ flexShrink: 0 }} />
                            : <Circle size={15} color="var(--border2)" style={{ flexShrink: 0 }} />
                          }
                          <span style={{
                            fontSize: '12.5px',
                            color: paso.done ? 'var(--text)' : 'var(--text3)',
                            fontWeight: paso.done ? 500 : 400,
                          }}>
                            {paso.label}
                          </span>
                        </div>
                        {i < pasos.length - 1 && (
                          <div style={{ width: '1px', height: '12px', background: paso.done ? 'rgba(34,197,94,0.3)' : 'var(--border)', marginLeft: '7px' }} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  {escrow.estado === 'retenido' && (
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="alert alert-warning" style={{ margin: 0, fontSize: '11.5px' }}>
                        Auto-liberación: {new Date(escrow.expira_en).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {esComprador && (
                        <>
                          <button onClick={confirmar} disabled={loading} className="btn-primary">
                            {loading ? 'Procesando...' : <><CheckCircle2 size={14} /> Confirmar que recibí el producto</>}
                          </button>
                          <button onClick={cancelar} disabled={loading} className="btn-danger">
                            Cancelar y devolver fondos
                          </button>
                        </>
                      )}
                      {esVendedor && (
                        <div className="card" style={{
                          background: 'var(--surface2)', border: '1px solid var(--border)',
                          padding: '12px 14px', textAlign: 'center', fontSize: '12.5px', color: 'var(--text2)',
                        }}>
                          Esperando confirmación del comprador
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Tracking card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Truck size={14} color="var(--text3)" />
                <span className="label" style={{ margin: 0 }}>Seguimiento del envío</span>
              </div>

              {envio && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                    <div className="label" style={{ fontSize: '9.5px', marginBottom: '3px' }}>Empresa</div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{envio.empresa}</div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                    <div className="label" style={{ fontSize: '9.5px', marginBottom: '3px' }}>N° de guía</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.03em' }}>{envio.numero_guia}</div>
                  </div>
                </div>
              )}

              {!envio && (
                <div style={{ textAlign: 'center', padding: '12px 0 16px', color: 'var(--text3)', fontSize: '12.5px' }}>
                  {esVendedor ? 'Registra el envío para que el comprador pueda seguirlo' : 'El vendedor aún no ha registrado el envío'}
                </div>
              )}

              {/* Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {TRACKING_ESTADOS.map((step, i) => {
                  const done    = trackingDone(envio?.estado, escrow?.estado, step.key)
                  const current = envio?.estado === step.key && escrow?.estado !== 'liberado'
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                          background: done ? 'var(--green)' : current ? 'var(--amber)' : 'var(--border2)',
                          boxShadow: current ? '0 0 0 3px var(--amber-bg)' : 'none',
                        }} />
                        <span style={{
                          fontSize: '12.5px',
                          color: done ? 'var(--text)' : current ? 'var(--amber)' : 'var(--text3)',
                          fontWeight: done || current ? 500 : 400,
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          {step.label}
                          {current && (
                            <span style={{ fontSize: '10px', color: 'var(--amber)', background: 'var(--amber-bg)', padding: '1px 6px', borderRadius: '4px' }}>
                              ahora
                            </span>
                          )}
                        </span>
                      </div>
                      {i < TRACKING_ESTADOS.length - 1 && (
                        <div style={{ width: '1px', height: '12px', background: done ? 'rgba(34,197,94,0.3)' : 'var(--border)', marginLeft: '4.5px' }} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Seller update buttons */}
              {esVendedor && envio && escrow?.estado === 'retenido' && (
                <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {envio.estado !== 'en_camino' && (
                    <button onClick={() => actualizarEstadoEnvio('en_camino')} className="btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: '11.5px' }}>
                      <Truck size={12} /> En camino
                    </button>
                  )}
                  {envio.estado !== 'entregado' && (
                    <button onClick={() => actualizarEstadoEnvio('entregado')} className="btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: '11.5px' }}>
                      <CheckCircle2 size={12} /> Marcar entregado
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* ───── RIGHT ───── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Tabs card */}
            <div className="card" style={{ flex: 1 }}>
              {/* Tab bar */}
              <div style={{
                display: 'flex', gap: '3px',
                background: 'var(--surface2)', borderRadius: '8px',
                padding: '3px', marginBottom: '18px',
              }}>
                {tabs.map(t => (
                  <Tab key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} icon={t.icon} label={t.label} />
                ))}
              </div>

              {/* Evidencia tab */}
              {tab === 'evidencia' && (
                <>
                  {esVendedor && (
                    <>
                      <p className="label" style={{ marginBottom: '14px' }}>Subir evidencia del producto</p>

                      <form onSubmit={subirLink} style={{ marginBottom: '18px' }}>
                        <div className="form-group">
                          <label className="label">
                            <Link2 size={11} style={{ display: 'inline', marginRight: '4px' }} />
                            Link (YouTube, Drive, etc.)
                          </label>
                          <input placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="label">Descripción</label>
                          <input placeholder="Video del empaque" value={descLink} onChange={e => setDescLink(e.target.value)} />
                        </div>
                        <button type="submit" className="btn-secondary" style={{ width: 'auto', padding: '7px 14px', fontSize: '12px' }}>
                          <Link2 size={12} /> Registrar link
                        </button>
                      </form>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                        <form onSubmit={subirArchivo}>
                          <div className="form-group">
                            <label className="label">
                              <Paperclip size={11} style={{ display: 'inline', marginRight: '4px' }} />
                              Subir archivo
                            </label>
                            <input type="file" accept="image/*,video/*" onChange={e => setArchivo(e.target.files[0])} style={{ padding: '6px 10px' }} />
                          </div>
                          <div className="form-group">
                            <label className="label">Descripción</label>
                            <input placeholder="Descripción del archivo" value={descArchivo} onChange={e => setDescArchivo(e.target.value)} />
                          </div>
                          <button type="submit" className="btn-secondary" style={{ width: 'auto', padding: '7px 14px', fontSize: '12px' }}>
                            <Paperclip size={12} /> Subir archivo
                          </button>
                        </form>
                      </div>
                    </>
                  )}

                  {esComprador && evidencias.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)', fontSize: '12.5px' }}>
                      <Package size={28} color="var(--border2)" style={{ marginBottom: '10px' }} />
                      <p>El vendedor aún no ha subido evidencia</p>
                    </div>
                  )}

                  {evidencias.length > 0 && (
                    <div style={{ marginTop: esVendedor ? '16px' : '0' }}>
                      {esVendedor && <p className="label" style={{ marginBottom: '10px' }}>Evidencias subidas</p>}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {evidencias.map(ev => (
                          <div key={ev.id} style={{
                            background: 'var(--surface2)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                          }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 500, marginBottom: '5px' }}>
                              {ev.descripcion || 'Sin descripción'}
                            </div>
                            <a href={ev.url} target="_blank" rel="noreferrer" style={{
                              fontSize: '11.5px', color: 'var(--green)', wordBreak: 'break-all',
                              display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                              {ev.tipo === 'archivo' ? <><Paperclip size={11} /> Archivo adjunto</> : <><ExternalLink size={11} /> {ev.url.substring(0, 40)}{ev.url.length > 40 ? '…' : ''}</>}
                            </a>
                            <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '5px' }}>
                              {new Date(ev.fecha).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Envio tab */}
              {tab === 'envio' && esVendedor && (
                <>
                  {envio && (
                    <div className="alert alert-success" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <Truck size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <div>
                        <span style={{ fontWeight: 600 }}>Envío ya registrado: </span>
                        {envio.empresa} · <span style={{ fontFamily: 'monospace' }}>{envio.numero_guia}</span>
                        <p style={{ fontSize: '11px', marginTop: '4px', color: 'var(--green)' }}>
                          Puedes actualizar los datos si hubo un error.
                        </p>
                      </div>
                    </div>
                  )}

                  {!envio && (
                    <p style={{ fontSize: '12.5px', color: 'var(--text2)', marginBottom: '16px', lineHeight: 1.6 }}>
                      Registra la empresa de courier y número de guía para que el comprador pueda hacer seguimiento.
                    </p>
                  )}

                  <form onSubmit={registrarEnvio}>
                    <div className="form-group">
                      <label className="label">Empresa de envío</label>
                      <select value={envioForm.empresa} onChange={e => setEnvioForm({ ...envioForm, empresa: e.target.value })}>
                        {EMPRESAS.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="label">Número de guía / tracking</label>
                      <input placeholder="Ej: SP0123456789" value={envioForm.numero_guia} onChange={e => setEnvioForm({ ...envioForm, numero_guia: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="label">Descripción del producto <span style={{ color: 'var(--text3)' }}>(opcional)</span></label>
                      <input placeholder="iPhone 14 Pro 256GB negro" value={envioForm.descripcion_producto} onChange={e => setEnvioForm({ ...envioForm, descripcion_producto: e.target.value })} />
                    </div>
                    <button type="submit" className="btn-primary">
                      <Truck size={14} /> {envio ? 'Actualizar envío' : 'Registrar envío'}
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Chat card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <MessageSquare size={14} color="var(--text3)" />
                <span className="label" style={{ margin: 0 }}>
                  Chat con {esComprador ? 'el vendedor' : 'el comprador'}
                </span>
              </div>

              {/* Messages */}
              <div ref={chatRef} style={{
                height: '220px', overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: '8px',
                marginBottom: '10px',
              }}>
                {mensajes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)', fontSize: '12.5px' }}>
                    <MessageSquare size={22} color="var(--border2)" style={{ marginBottom: '8px' }} />
                    <p>No hay mensajes aún</p>
                  </div>
                ) : (
                  mensajes.map(m => (
                    <div key={m.id} style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: m.es_propio ? 'flex-end' : 'flex-start',
                    }}>
                      <div className={`chat-bubble ${m.es_propio ? 'own' : 'other'}`}>
                        {m.contenido}
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text3)', marginTop: '3px', padding: '0 4px' }}>
                        {m.remitente_nombre} · {new Date(m.creado_en).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <form onSubmit={enviarMensaje} style={{ display: 'flex', gap: '8px' }}>
                <input
                  placeholder="Escribe un mensaje..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '9px 14px', flexShrink: 0 }}
                  disabled={!chatInput.trim()}
                >
                  <Send size={14} />
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
