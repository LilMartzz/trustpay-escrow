import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

const ESTADO_COLOR = {
  retenido: 'var(--amber)',
  liberado: 'var(--green)',
  cancelado: 'var(--red)',
  expirado: 'var(--muted)',
}

const ESTADO_BG = {
  retenido: 'var(--amber-bg)',
  liberado: 'var(--green-bg)',
  cancelado: 'rgba(248,113,113,0.08)',
  expirado: 'rgba(107,114,128,0.08)',
}

export default function MisOperaciones() {
  const [operaciones, setOperaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      const res = await api.get('/escrow/mis-operaciones')
      setOperaciones(res.data)
    } catch {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <div style={{ flex: 1, padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Mis operaciones
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
            Todas tus compras y ventas con escrow
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: '13px' }}>
            Cargando...
          </div>
        ) : operaciones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
              No tienes operaciones aún
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 24px' }}
            >
              Hacer una compra segura
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {operaciones.map(op => (
              <div
                key={op.escrow_id}
                onClick={() => navigate(`/operacion/${op.escrow_id}`)}
                style={{
                  background: 'var(--surface)',
                  border: '0.5px solid var(--border)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: op.rol === 'comprador' ? 'var(--green-bg)' : 'var(--amber-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                }}>
                  {op.rol === 'comprador' ? '🛒' : '📦'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {op.rol === 'comprador' ? `Compra a ${op.contraparte}` : `Venta a ${op.contraparte}`}
                    </span>
                    <span style={{
                      fontSize: '9px',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      background: op.rol === 'comprador' ? 'var(--green-bg)' : 'var(--amber-bg)',
                      color: op.rol === 'comprador' ? 'var(--green)' : 'var(--amber)',
                      flexShrink: 0,
                    }}>
                      {op.rol}
                    </span>
                  </div>
                  {op.descripcion && (
                    <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {op.descripcion}
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                    {new Date(op.fecha).toLocaleString('es-PE')}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontFamily: 'Syne',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: ESTADO_COLOR[op.estado],
                    marginBottom: '4px',
                  }}>
                    S/ {Number(op.monto).toFixed(2)}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    background: ESTADO_BG[op.estado],
                    color: ESTADO_COLOR[op.estado],
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    display: 'inline-block',
                  }}>
                    {op.estado}
                  </div>
                </div>

                <div style={{ color: 'var(--muted)', fontSize: '14px', marginLeft: '4px' }}>›</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
