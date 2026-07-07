import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Truck, Package } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../components/ToastProvider'
import EstadoCard, { ESTADO_MAP } from '../components/operacion/EstadoCard'
import TrackingCard from '../components/operacion/TrackingCard'
import EvidenciasTab from '../components/operacion/EvidenciasTab'
import EnvioTab from '../components/operacion/EnvioTab'
import ChatPanel from '../components/operacion/ChatPanel'

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

  const [puntuacion,  setPuntuacion]  = useState(0)
  const [comentario,  setComentario]  = useState('')
  const [calificando, setCalificando] = useState(false)

  const [loading, setLoading] = useState(false)

  const toast = useToast()
  const pollRef = useRef(null)

  useEffect(() => {
    cargarDatos()
    pollRef.current = setInterval(cargarChat, 3000)
    return () => clearInterval(pollRef.current)
  }, [])

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
    if (isError) toast.error(m); else toast.success(m)
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

  const calificar = async () => {
    if (puntuacion < 1) { flash('Selecciona una puntuación', true); return }
    setCalificando(true)
    try {
      await api.post(`/calificacion/${escrowId}`, { puntuacion, comentario: comentario || null })
      flash('¡Gracias por tu calificación!')
      cargarDatos()
    } catch (e) {
      flash(e.response?.data?.detail || 'Error al calificar', true)
    }
    setCalificando(false)
  }

  const subirLink = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/evidencia/subir-link/${escrowId}`, { link, descripcion: descLink })
      setLink(''); setDescLink('')
      flash('Evidencia registrada')
      cargarDatos()
    } catch (err) {
      flash(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Error al registrar evidencia', true)
    }
  }

  // Los archivos ya no son públicos: se descargan con el token de sesión
  // y se abren como blob (un <a href> no puede mandar el header Authorization).
  const abrirArchivo = async (ev) => {
    try {
      const res = await api.get(ev.url, { responseType: 'blob' })
      window.open(URL.createObjectURL(res.data), '_blank', 'noopener')
    } catch { flash('No se pudo abrir el archivo', true) }
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

  // El generador (jsPDF + fuente Syne) se carga bajo demanda para no engordar el bundle inicial.
  const descargarPdf = async () => {
    if (!escrow) return
    const estadoInfo = ESTADO_MAP[escrow.estado] || ESTADO_MAP.expirado
    try {
      const { descargarComprobantePDF } = await import('../utils/comprobantePdf')
      await descargarComprobantePDF({
        titulo: 'Comprobante de operación',
        subtitulo: escrow.descripcion || 'Operación escrow',
        filas: [
          { label: 'N° de operación', valor: String(escrowId) },
          { label: 'Tu rol', valor: escrow.rol === 'comprador' ? 'Comprador' : 'Vendedor' },
          ...(escrow.contraparte ? [{ label: escrow.rol === 'comprador' ? 'Vendedor' : 'Comprador', valor: escrow.contraparte }] : []),
          { label: 'Estado', valor: estadoInfo.label },
          ...(envio ? [{ label: 'Envío', valor: `${envio.empresa} · ${envio.numero_guia}` }] : []),
          ...(escrow.estado === 'retenido' && escrow.expira_en
            ? [{ label: 'Auto-liberación', valor: new Date(escrow.expira_en).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) }]
            : []),
        ],
        total: { label: 'Monto en custodia', valor: `S/ ${Number(escrow.monto_retenido).toFixed(2)}` },
        nota: 'Fondos protegidos por el sistema de custodia de TrustPay',
        nombreArchivo: `TrustPay-operacion-${escrowId}.pdf`,
      })
    } catch {
      flash('No se pudo generar el PDF', true)
    }
  }

  const esComprador = escrow?.rol === 'comprador'
  const esVendedor  = escrow?.rol === 'vendedor'

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
                {esComprador ? 'Vendedor' : 'Comprador'}:{' '}
                <span
                  onClick={() => escrow.contraparte_email && navigate(`/usuario/${encodeURIComponent(escrow.contraparte_email)}`)}
                  style={{ color: 'var(--green)', cursor: escrow.contraparte_email ? 'pointer' : 'default', fontWeight: 500 }}
                  title="Ver perfil y calificaciones"
                >
                  {escrow.contraparte}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="grid-1-mobile">

          {/* ───── LEFT ───── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <EstadoCard
              escrow={escrow}
              evidencias={evidencias}
              esComprador={esComprador}
              esVendedor={esVendedor}
              loading={loading}
              confirmar={confirmar}
              cancelar={cancelar}
              puntuacion={puntuacion}
              setPuntuacion={setPuntuacion}
              comentario={comentario}
              setComentario={setComentario}
              calificando={calificando}
              calificar={calificar}
              descargarPdf={descargarPdf}
            />
            <TrackingCard
              envio={envio}
              escrow={escrow}
              esVendedor={esVendedor}
              actualizarEstadoEnvio={actualizarEstadoEnvio}
            />
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

              {tab === 'evidencia' && (
                <EvidenciasTab
                  esComprador={esComprador}
                  esVendedor={esVendedor}
                  evidencias={evidencias}
                  link={link}
                  setLink={setLink}
                  descLink={descLink}
                  setDescLink={setDescLink}
                  setArchivo={setArchivo}
                  descArchivo={descArchivo}
                  setDescArchivo={setDescArchivo}
                  subirLink={subirLink}
                  subirArchivo={subirArchivo}
                  abrirArchivo={abrirArchivo}
                />
              )}

              {tab === 'envio' && esVendedor && (
                <EnvioTab
                  envio={envio}
                  envioForm={envioForm}
                  setEnvioForm={setEnvioForm}
                  registrarEnvio={registrarEnvio}
                />
              )}
            </div>

            <ChatPanel
              mensajes={mensajes}
              esComprador={esComprador}
              chatInput={chatInput}
              setChatInput={setChatInput}
              enviarMensaje={enviarMensaje}
            />

          </div>
        </div>
      </div>
    </div>
  )
}
