import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

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

  const estadoColor = {
    retenido: 'var(--amber)',
    liberado: 'var(--green)',
    cancelado: 'var(--red)',
    expirado: 'var(--muted)'
  }

  const estadoBg = {
    retenido: 'var(--amber-bg)',
    liberado: 'var(--green-bg)',
    cancelado: 'rgba(248,113,113,0.08)',
    expirado: 'rgba(107,114,128,0.08)'
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

      <div style={{ flex: 1, padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em' }}>Mis operaciones</h1>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Todas tus compras y ventas con escrow</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: '13px' }}>Cargando...</div>
        ) : operaciones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>No tienes operaciones aún</p>
            <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>
              Hacer una compra segura
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {operaciones.map(op => (
              <div key={op.escrow_id} onClick={() => navigate(`/operacion/${op.escrow_id}`)}
                style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: op.rol === 'comprador' ? 'var(--green-bg)' : 'var(--amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  {op.rol === 'comprador' ? '🛒' : '📦'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>
                      {op.rol === 'comprador' ? `Compra a ${op.contraparte}` : `Venta a ${op.contraparte}`}
                    </span>
                    <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', background: op.rol === 'comprador' ? 'var(--green-bg)' : 'var(--amber-bg)', color: op.rol === 'comprador' ? 'var(--green)' : 'var(--amber)' }}>
                      {op.rol}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    {new Date(op.fecha).toLocaleString('es-PE')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Syne', fontSize: '16px', fontWeight: 600, color: estadoColor[op.estado], marginBottom: '4px' }}>
                    S/ {op.monto}
                  </div>
                  <div style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: estadoBg[op.estado], color: estadoColor[op.estado], fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-block' }}>
                    {op.estado}
                  </div>
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '16px', marginLeft: '4px' }}>→</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}