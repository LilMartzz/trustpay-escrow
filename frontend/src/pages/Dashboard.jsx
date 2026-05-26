import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Wallet, TrendingUp, Clock, ArrowUpRight, ArrowDownRight,
  RefreshCw, Plus, ShieldCheck, Info,
} from 'lucide-react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

/* ── helpers ── */
function labelHistorial(t) {
  if (t.tipo === 'escrow') {
    if (t.estado === 'pendiente') return 'Escrow retenido'
    return t.es_salida ? 'Pago escrow' : 'Cobro escrow'
  }
  return t.es_salida ? 'Transferencia enviada' : 'Transferencia recibida'
}
function colorHistorial(t) {
  if (t.tipo === 'escrow' && t.estado === 'pendiente') return 'var(--amber)'
  return t.es_salida ? 'var(--red)' : 'var(--green)'
}
function prefijoHistorial(t) {
  if (t.tipo === 'escrow' && t.estado === 'pendiente') return ''
  return t.es_salida ? '−' : '+'
}
function IconHistorial({ t }) {
  const isPending = t.tipo === 'escrow' && t.estado === 'pendiente'
  if (isPending) return <RefreshCw size={13} />
  if (t.es_salida) return <ArrowUpRight size={13} />
  return <ArrowDownRight size={13} />
}

export default function Dashboard() {
  const [saldo, setSaldo]       = useState(null)
  const [historial, setHistorial] = useState([])
  const [usuario, setUsuario]   = useState('')
  const [form, setForm]         = useState({ email_destino: '', monto: '', descripcion: '' })
  const [deposito, setDeposito] = useState('')
  const [msg, setMsg]           = useState('')
  const [error, setError]       = useState('')
  const [loadingDep, setLoadingDep] = useState(false)
  const [loadingEsc, setLoadingEsc] = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => {
    cargarDatos()
    const id = setInterval(cargarDatos, 5000)
    return () => clearInterval(id)
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
    setLoadingDep(true)
    try {
      await api.post(`/billetera/depositar?monto=${deposito}`)
      setDeposito('')
      setMsg('¡Depósito exitoso!')
      await cargarDatos()
      setTimeout(() => setMsg(''), 3500)
    } catch {
      setError('Error al depositar')
    }
    setLoadingDep(false)
  }

  const handleEscrow = async (e) => {
    e.preventDefault()
    setError('')
    setLoadingEsc(true)
    try {
      const params = new URLSearchParams({
        email_destino: form.email_destino,
        monto: form.monto,
        descripcion: form.descripcion,
      })
      const res = await api.post(`/escrow/iniciar?${params}`)
      await cargarDatos()
      navigate(`/operacion/${res.data.escrow_id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar escrow')
    }
    setLoadingEsc(false)
  }

  const stats = [
    {
      label: 'Saldo total',
      value: `S/ ${Number(saldo?.saldo ?? 0).toFixed(2)}`,
      icon: Wallet,
      color: 'var(--text)',
      bg: 'var(--surface2)',
    },
    {
      label: 'Disponible',
      value: `S/ ${Number(saldo?.saldo_disponible ?? 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'var(--green)',
      bg: 'var(--green-bg)',
    },
    {
      label: 'Retenido en escrow',
      value: `S/ ${Number(saldo?.saldo_retenido ?? 0).toFixed(2)}`,
      icon: Clock,
      color: 'var(--amber)',
      bg: 'var(--amber-bg)',
    },
  ]

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content" style={{ padding: '28px 32px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '26px' }}>
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '3px' }}>
              Bienvenido, {usuario} 👋
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text3)' }}>Panel principal · TrustPay</p>
          </div>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: 'var(--green-bg)',
            border: '1px solid rgba(34,197,94,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne', fontSize: '13px', fontWeight: 700,
            color: 'var(--green)',
          }}>
            {usuario.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* ── Alerts ── */}
        {msg   && <div className="alert alert-success" style={{ marginBottom: '20px' }}>{msg}</div>}
        {error && <div className="alert alert-error"   style={{ marginBottom: '20px' }}>{error}</div>}

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }} className="grid-1-mobile">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="card stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <span className="label">{s.label}</span>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={15} color={s.color} />
                  </div>
                </div>
                <div style={{
                  fontFamily: 'Syne', fontSize: '26px', fontWeight: 700,
                  color: s.color, letterSpacing: '-0.03em', lineHeight: 1,
                }}>
                  {s.value}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Main grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-1-mobile">

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Depositar */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px',
                  background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Plus size={15} color="var(--green)" />
                </div>
                <span className="label" style={{ margin: 0 }}>Depositar saldo</span>
              </div>
              <form onSubmit={handleDeposito}>
                <div className="form-group">
                  <label className="label">Monto (S/)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={deposito}
                    onChange={e => setDeposito(e.target.value)}
                    required min="1" step="0.01"
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loadingDep}>
                  {loadingDep ? 'Depositando...' : 'Depositar'}
                </button>
              </form>
            </div>

            {/* Historial */}
            <div className="card" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="label" style={{ margin: 0 }}>Historial reciente</span>
                <button
                  onClick={() => navigate('/operaciones')}
                  className="btn-ghost"
                  style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--green)' }}
                >
                  Ver todo
                </button>
              </div>

              {historial.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Wallet size={28} color="var(--border2)" style={{ marginBottom: '10px' }} />
                  <p style={{ fontSize: '12.5px', color: 'var(--text3)' }}>Sin movimientos aún</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {historial.slice(0, 8).map((t, idx) => {
                    const color   = colorHistorial(t)
                    const prefijo = prefijoHistorial(t)
                    const isPending = t.tipo === 'escrow' && t.estado === 'pendiente'
                    const bgIcon = isPending ? 'var(--amber-bg)' : t.es_salida ? 'rgba(248,113,113,0.1)' : 'var(--green-bg)'
                    return (
                      <div key={t.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 0',
                        borderBottom: idx < historial.slice(0,8).length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '9px',
                          background: bgIcon, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color, flexShrink: 0,
                        }}>
                          <IconHistorial t={t} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 500, marginBottom: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {labelHistorial(t)}
                          </div>
                          {t.contraparte && (
                            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                              {t.es_salida ? 'Para' : 'De'}: {t.contraparte}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color, flexShrink: 0 }}>
                          {prefijo}S/ {Number(t.monto).toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column — Escrow */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px',
                background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldCheck size={15} color="var(--green)" />
              </div>
              <span className="label" style={{ margin: 0 }}>Compra segura con escrow</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text3)', marginBottom: '20px', lineHeight: 1.6 }}>
              El vendedor solo recibe el dinero cuando confirmas que recibiste el producto.
            </p>

            <form onSubmit={handleEscrow} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                  required min="1" step="0.01"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="label">Descripción del producto</label>
                <textarea
                  placeholder="Ej: iPhone 14 Pro 256GB color negro..."
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  style={{ height: '80px', resize: 'none' }}
                />
              </div>

              <div className="alert alert-warning" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <Info size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>El dinero queda retenido hasta que confirmes recibir el producto. Auto-liberación en 24h.</span>
              </div>

              <button type="submit" className="btn-primary" disabled={loadingEsc} style={{ marginTop: '4px' }}>
                {loadingEsc ? 'Procesando...' : 'Pagar con escrow'}
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  )
}
