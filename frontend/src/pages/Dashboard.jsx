import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

function labelHistorial(t) {
  if (t.tipo === 'escrow') {
    if (t.estado === 'pendiente') return 'Escrow retenido'
    if (t.es_salida) return 'Pago escrow'
    return 'Cobro escrow'
  }
  return t.es_salida ? 'Transferencia enviada' : 'Transferencia recibida'
}

function colorHistorial(t) {
  if (t.tipo === 'escrow' && t.estado === 'pendiente') return 'var(--amber)'
  return t.es_salida ? 'var(--red)' : 'var(--green)'
}

function iconoHistorial(t) {
  if (t.tipo === 'escrow' && t.estado === 'pendiente') return '⟳'
  return t.es_salida ? '↑' : '↓'
}

function prefijoHistorial(t) {
  if (t.tipo === 'escrow' && t.estado === 'pendiente') return ''
  return t.es_salida ? '-' : '+'
}

export default function Dashboard() {
  const [saldo, setSaldo] = useState(null)
  const [historial, setHistorial] = useState([])
  const [usuario, setUsuario] = useState('')
  const [form, setForm] = useState({ email_destino: '', monto: '', descripcion: '' })
  const [deposito, setDeposito] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    cargarDatos()
    const intervalo = setInterval(cargarDatos, 5000)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => { cargarDatos() }, [location.key])

  const cargarDatos = async () => {
    try {
      const [s, h] = await Promise.all([
        api.get('/billetera/saldo'),
        api.get('/billetera/historial'),
      ])
      setSaldo(s.data)
      setUsuario(s.data.usuario)
      setHistorial(h.data)
    } catch {
      localStorage.removeItem('token')
      navigate('/login')
    }
  }

  const handleDeposito = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/billetera/depositar?monto=${deposito}`)
      setDeposito('')
      setMsg('Depósito exitoso')
      await cargarDatos()
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setError('Error al depositar')
    }
  }

  const handleEscrow = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const params = new URLSearchParams({
        email_destino: form.email_destino,
        monto: form.monto,
        descripcion: form.descripcion,
      })
      const res = await api.post(`/escrow/iniciar?${params}`)
      await cargarDatos()
      navigate(`/operacion/${res.data.escrow_id}`)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al iniciar escrow')
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em' }}>
              Bienvenido, {usuario}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Panel principal</p>
          </div>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'var(--surface2)', border: '0.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 500, color: '#A8CDEE',
          }}>
            {usuario.slice(0, 2).toUpperCase()}
          </div>
        </div>

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Saldo total', value: `S/ ${Number(saldo?.saldo ?? 0).toFixed(2)}`, color: 'var(--text)' },
            { label: 'Disponible', value: `S/ ${Number(saldo?.saldo_disponible ?? 0).toFixed(2)}`, color: 'var(--green)' },
            { label: 'Retenido en escrow', value: `S/ ${Number(saldo?.saldo_retenido ?? 0).toFixed(2)}`, color: 'var(--amber)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
              <div className="label">{s.label}</div>
              <div style={{ fontFamily: 'Syne', fontSize: '24px', fontWeight: 600, color: s.color, letterSpacing: '-0.02em' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <div className="card">
              <div className="label" style={{ marginBottom: '14px' }}>Depositar saldo</div>
              <form onSubmit={handleDeposito}>
                <div className="form-group">
                  <label className="label">Monto (S/)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={deposito}
                    onChange={e => setDeposito(e.target.value)}
                    required
                    min="1"
                    step="0.01"
                  />
                </div>
                <button type="submit" className="btn-primary">Depositar</button>
              </form>
            </div>

            <div className="card">
              <div className="label" style={{ marginBottom: '14px' }}>Historial reciente</div>
              {historial.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
                  Sin movimientos aún
                </p>
              ) : (
                historial.slice(0, 8).map(t => {
                  const color = colorHistorial(t)
                  const icono = iconoHistorial(t)
                  const prefijo = prefijoHistorial(t)
                  const isEscrowActivo = t.tipo === 'escrow' && t.estado === 'pendiente'

                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 0',
                        borderBottom: '0.5px solid var(--border)',
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '7px',
                        background: isEscrowActivo
                          ? 'var(--amber-bg)'
                          : t.es_salida
                            ? 'rgba(248,113,113,0.08)'
                            : 'var(--green-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        flexShrink: 0,
                        color,
                      }}>
                        {icono}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {labelHistorial(t)}
                        </div>
                        {t.contraparte && (
                          <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                            {t.es_salida ? 'Para' : 'De'}: {t.contraparte}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color, flexShrink: 0 }}>
                        {prefijo}S/ {Number(t.monto).toFixed(2)}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="card">
            <div className="label" style={{ marginBottom: '4px' }}>Compra segura con escrow</div>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              El vendedor solo recibe el dinero cuando confirmas que recibiste el producto.
            </p>
            <form onSubmit={handleEscrow}>
              <div className="form-group">
                <label className="label">Email del vendedor</label>
                <input
                  type="email"
                  placeholder="vendedor@email.com"
                  value={form.email_destino}
                  onChange={e => setForm({ ...form, email_destino: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Monto (S/)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={form.monto}
                  onChange={e => setForm({ ...form, monto: e.target.value })}
                  required
                  min="1"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label className="label">Descripción del producto</label>
                <textarea
                  placeholder="Ej: iPhone 14 Pro 256GB color negro..."
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  style={{ height: '72px', resize: 'none' }}
                />
              </div>
              <div style={{
                background: 'var(--amber-bg)',
                border: '0.5px solid rgba(245,158,11,0.2)',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '14px',
              }}>
                <p style={{ fontSize: '11px', color: 'var(--amber)', lineHeight: 1.5 }}>
                  El dinero queda retenido hasta que confirmes recibir el producto. Auto-liberación en 24h.
                </p>
              </div>
              <button type="submit" className="btn-primary">Pagar con escrow</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
