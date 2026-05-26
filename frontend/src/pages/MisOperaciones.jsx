import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, ShoppingBag, ChevronRight, Plus, Inbox } from 'lucide-react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

const ESTADO_MAP = {
  retenido:  { color: 'var(--amber)', bg: 'var(--amber-bg)',               label: 'Retenido' },
  liberado:  { color: 'var(--green)', bg: 'var(--green-bg)',               label: 'Liberado' },
  cancelado: { color: 'var(--red)',   bg: 'rgba(248,113,113,0.1)',         label: 'Cancelado' },
  expirado:  { color: 'var(--text3)', bg: 'rgba(82,82,91,0.15)',           label: 'Expirado' },
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
    <div className="app-layout">
      <Sidebar />

      <main className="main-content" style={{ padding: '28px 32px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '26px' }}>
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '3px' }}>
              Mis operaciones
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text3)' }}>
              Todas tus compras y ventas con escrow
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
            style={{ width: 'auto', padding: '8px 16px', fontSize: '13px', gap: '6px' }}
          >
            <Plus size={14} />
            Nueva operación
          </button>
        </div>

        {/* ── List ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="card" style={{ height: '72px', opacity: 0.4 }}>
                <div style={{ height: '12px', width: '40%', background: 'var(--surface2)', borderRadius: '4px', marginBottom: '8px' }} />
                <div style={{ height: '10px', width: '25%', background: 'var(--surface2)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        ) : operaciones.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Inbox size={22} color="var(--text3)" />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>No tienes operaciones aún</p>
            <p style={{ fontSize: '12.5px', color: 'var(--text3)', marginBottom: '20px' }}>
              Inicia una compra segura desde el dashboard
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
              style={{ width: 'auto', padding: '9px 22px' }}
            >
              Hacer una compra segura
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {operaciones.map(op => {
              const estado = ESTADO_MAP[op.estado] || ESTADO_MAP.expirado
              const isComprador = op.rol === 'comprador'
              const Icon = isComprador ? ShoppingBag : Package

              return (
                <div
                  key={op.escrow_id}
                  onClick={() => navigate(`/operacion/${op.escrow_id}`)}
                  className="card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    cursor: 'pointer', padding: '14px 18px',
                    transition: 'border-color 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {/* Role icon */}
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: isComprador ? 'var(--green-bg)' : 'var(--amber-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={18} color={isComprador ? 'var(--green)' : 'var(--amber)'} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isComprador ? `Compra a ${op.contraparte}` : `Venta a ${op.contraparte}`}
                      </span>
                      <span className="badge" style={{
                        background: isComprador ? 'var(--green-bg)' : 'var(--amber-bg)',
                        color: isComprador ? 'var(--green)' : 'var(--amber)',
                        flexShrink: 0, padding: '2px 8px', fontSize: '9.5px',
                      }}>
                        {op.rol}
                      </span>
                    </div>
                    {op.descripcion && (
                      <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {op.descripcion}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                      {new Date(op.fecha).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Amount + status */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontFamily: 'Syne', fontSize: '17px', fontWeight: 700,
                      color: estado.color, marginBottom: '5px', letterSpacing: '-0.02em',
                    }}>
                      S/ {Number(op.monto).toFixed(2)}
                    </div>
                    <span className="badge" style={{
                      background: estado.bg, color: estado.color,
                      padding: '2px 9px', fontSize: '9.5px',
                    }}>
                      {estado.label}
                    </span>
                  </div>

                  <ChevronRight size={16} color="var(--text3)" style={{ flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
