import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Operacion() {
  const { escrowId } = useParams()
  const navigate = useNavigate()
  const [escrow, setEscrow] = useState(null)
  const [evidencias, setEvidencias] = useState([])
  const [link, setLink] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { cargarDatos() }, [])

  const cargarDatos = async () => {
    try {
      const [e, ev] = await Promise.all([
        api.get(`/escrow/estado/${escrowId}`),
        api.get(`/evidencia/ver/${escrowId}`)
      ])
      setEscrow(e.data)
      setEvidencias(ev.data)
    } catch {
      navigate('/dashboard')
    }
  }

  const confirmar = async () => {
    setLoading(true)
    setError('')
    try {
      await api.post(`/escrow/confirmar/${escrowId}`)
      setMsg('Fondos liberados al vendedor exitosamente')
      cargarDatos()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al confirmar')
    }
    setLoading(false)
  }

  const cancelar = async () => {
    setLoading(true)
    setError('')
    try {
      await api.post(`/escrow/cancelar/${escrowId}`)
      setMsg('Escrow cancelado. Fondos devueltos.')
      cargarDatos()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cancelar')
    }
    setLoading(false)
  }

  const subirLink = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/evidencia/subir-link/${escrowId}?link=${encodeURIComponent(link)}&descripcion=${encodeURIComponent(descripcion)}`)
      setLink('')
      setDescripcion('')
      setMsg('Evidencia registrada')
      cargarDatos()
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setError('Error al subir evidencia')
    }
  }

  const subirArchivo = async (e) => {
    e.preventDefault()
    if (!archivo) return
    const formData = new FormData()
    formData.append('archivo', archivo)
    formData.append('descripcion', descripcion || 'Evidencia del producto')
    try {
      await api.post(`/evidencia/subir-archivo/${escrowId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setArchivo(null)
      setDescripcion('')
      setMsg('Archivo subido correctamente')
      cargarDatos()
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setError('Error al subir archivo')
    }
  }

  const estadoColor = {
    retenido: 'var(--amber)',
    liberado: 'var(--green)',
    cancelado: 'var(--red)',
    expirado: 'var(--muted)'
  }

  const pasos = [
    { label: 'Pago iniciado', done: true },
    { label: 'Fondos retenidos en escrow', done: true },
    { label: 'Vendedor sube evidencia', done: evidencias.length > 0 },
    { label: 'Comprador confirma recepción', done: escrow?.estado === 'liberado' },
    { label: 'Fondos liberados al vendedor', done: escrow?.estado === 'liberado' },
  ]

  const esComprador = escrow?.rol === 'comprador'
  const esVendedor = escrow?.rol === 'vendedor'

  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', fontSize: '12px' }}>
            ← Volver
          </button>
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em' }}>
              Operación escrow
              {escrow && (
                <span style={{ marginLeft: '10px', fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '20px', background: esComprador ? 'var(--green-bg)' : 'var(--amber-bg)', color: esComprador ? 'var(--green)' : 'var(--amber)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {esComprador ? 'Comprador' : 'Vendedor'}
                </span>
              )}
            </h1>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{escrowId}</p>
          </div>
        </div>

        {msg && <div style={{ background: 'var(--green-bg)', border: '0.5px solid rgba(46,204,138,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--green)', marginBottom: '16px' }}>{msg}</div>}
        {error && <div style={{ background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--red)', marginBottom: '16px' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div className="card">
            <div className="label" style={{ marginBottom: '14px' }}>Estado de la operación</div>
            {escrow && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 600, color: estadoColor[escrow.estado] }}>
                    S/ {escrow.monto_retenido}
                  </div>
                  <div style={{ background: escrow.estado === 'retenido' ? 'var(--amber-bg)' : escrow.estado === 'liberado' ? 'var(--green-bg)' : 'rgba(248,113,113,0.08)', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', color: estadoColor[escrow.estado], fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {escrow.estado}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {pasos.map((paso, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: paso.done ? 'var(--green)' : 'var(--border)', flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: paso.done ? 'var(--text)' : 'var(--muted)', fontWeight: paso.done ? 500 : 400 }}>{paso.label}</span>
                      </div>
                      {i < pasos.length - 1 && <div style={{ width: '0.5px', height: '16px', background: 'var(--border)', marginLeft: '4.5px' }} />}
                    </div>
                  ))}
                </div>

                {escrow.estado === 'retenido' && (
                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ background: 'var(--amber-bg)', border: '0.5px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: 'var(--amber)', marginBottom: '4px' }}>
                      Auto-liberación: {new Date(escrow.expira_en).toLocaleString('es-PE')}
                    </div>
                    {esComprador && (
                      <>
                        <button onClick={confirmar} disabled={loading} className="btn-primary">
                          {loading ? 'Procesando...' : 'Confirmar que recibí el producto'}
                        </button>
                        <button onClick={cancelar} disabled={loading} className="btn-danger">
                          Cancelar y devolver fondos
                        </button>
                      </>
                    )}
                    {esVendedor && (
                      <div style={{ background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--text2)', textAlign: 'center' }}>
                        Esperando que el comprador confirme la recepción
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card">
            {esVendedor ? (
              <>
                <div className="label" style={{ marginBottom: '4px' }}>Subir evidencia del producto</div>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '14px' }}>Sube un video o foto mostrando el producto y su empaque antes de enviarlo</p>
                <form onSubmit={subirLink} style={{ marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="label">Link (YouTube, Drive, etc.)</label>
                    <input placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Descripción</label>
                    <input placeholder="Video del empaque del producto" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
                  </div>
                  <button type="submit" className="btn-secondary">Registrar link</button>
                </form>
                <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '16px' }}>
                  <form onSubmit={subirArchivo}>
                    <div className="form-group">
                      <label className="label">O sube un archivo</label>
                      <input type="file" accept="image/*,video/*" onChange={e => setArchivo(e.target.files[0])} style={{ padding: '6px 10px' }} />
                    </div>
                    <button type="submit" className="btn-secondary">Subir archivo</button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <div className="label" style={{ marginBottom: '4px' }}>Evidencias del vendedor</div>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '14px' }}>Revisa las pruebas antes de confirmar la recepción</p>
                {evidencias.length === 0
                  ? <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: '12px' }}>
                      El vendedor aún no ha subido evidencia
                    </div>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {evidencias.map(ev => (
                      <div key={ev.id} style={{ background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>{ev.descripcion || 'Sin descripción'}</div>
                        <a href={ev.url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--green)' }}>{ev.url}</a>
                        <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>{new Date(ev.fecha).toLocaleString('es-PE')}</div>
                      </div>
                    ))}
                  </div>
                }
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}