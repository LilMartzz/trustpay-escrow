import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Wallet, TrendingUp, Lock, ArrowUpRight, ArrowDownRight,
  RefreshCw, Plus, ChevronRight, Copy, Check,
} from 'lucide-react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import EscrowNatural from '../components/EscrowNatural'

/* ── helpers historial ── */
function labelH(t) {
  if (t.tipo === 'escrow') {
    if (t.estado === 'pendiente') return 'Escrow retenido'
    return t.es_salida ? 'Pago escrow' : 'Cobro escrow'
  }
  return t.es_salida ? 'Transferencia enviada' : 'Transferencia recibida'
}
function colorH(t) {
  if (t.tipo === 'escrow' && t.estado === 'pendiente') return 'var(--amber)'
  return t.es_salida ? 'var(--red)' : 'var(--green)'
}
function prefijoH(t) {
  if (t.tipo === 'escrow' && t.estado === 'pendiente') return ''
  return t.es_salida ? '−' : '+'
}
function IconH({ t }) {
  if (t.tipo === 'escrow' && t.estado === 'pendiente') return <RefreshCw size={12} />
  return t.es_salida ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />
}

/* ── Avatar circular con inicial ── */
function Avatar({ name = '', size = 52 }) {
  const COLORS = ['#22C55E','#06B6D4','#818CF8','#F59E0B','#A78BFA','#F87171','#34D399','#60A5FA']
  const c = COLORS[(name.charCodeAt(0) || 0) % COLORS.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${c}18`, border: `2px solid ${c}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Syne', fontSize: size * 0.36, fontWeight: 700, color: c,
    }}>
      {name.slice(0, 2).toUpperCase() || '??'}
    </div>
  )
}

/* ── Extraer contrapartes únicas del historial ── */
function getContrapartes(historial) {
  const seen = new Set()
  const result = []
  for (const t of historial) {
    if (t.contraparte && !seen.has(t.contraparte)) {
      seen.add(t.contraparte)
      result.push(t.contraparte)
    }
  }
  return result.slice(0, 8)
}

export default function Dashboard() {
  const [saldo,    setSaldo]    = useState(null)
  const [historial, setHistorial] = useState([])
  const [usuario,  setUsuario]  = useState('')
  const [deposito, setDeposito] = useState('')
  const [msg,   setMsg]   = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied]    = useState(false)
  const [loadingDep, setLoadingDep] = useState(false)
  const [loadingEsc, setLoadingEsc] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 5000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => { cargar() }, [location.key])

  const cargar = async () => {
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

  const flash = (m, isErr = false) => {
    if (isErr) { setError(m); setMsg('') } else { setMsg(m); setError('') }
    setTimeout(() => { setMsg(''); setError('') }, 3500)
  }

  const handleDeposito = async (e) => {
    e.preventDefault()
    setLoadingDep(true)
    try {
      await api.post(`/billetera/depositar?monto=${deposito}`)
      setDeposito('')
      flash('¡Depósito exitoso!')
      await cargar()
    } catch { flash('Error al depositar', true) }
    setLoadingDep(false)
  }

  const handleEscrow = async ({ monto, email_destino, descripcion }) => {
    setLoadingEsc(true)
    try {
      const params = new URLSearchParams({ email_destino, monto, descripcion })
      const res = await api.post(`/escrow/iniciar?${params}`)
      await cargar()
      navigate(`/operacion/${res.data.escrow_id}`)
    } catch (err) {
      flash(err.response?.data?.detail || 'Error al iniciar escrow', true)
    }
    setLoadingEsc(false)
  }

  const copyEmail = () => {
    navigator.clipboard.writeText(usuario)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const contrapartes = getContrapartes(historial)

  const saldoTotal      = Number(saldo?.saldo ?? 0)
  const saldoDisponible = Number(saldo?.saldo_disponible ?? 0)
  const saldoRetenido   = Number(saldo?.saldo_retenido ?? 0)

  /* ── barra de disponibilidad ── */
  const pctDisp = saldoTotal > 0 ? (saldoDisponible / saldoTotal) * 100 : 100

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content" style={{ padding: '28px 28px 40px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '2px' }}>
              Bienvenido, {usuario} 👋
            </h1>
            <p style={{ fontSize: '12.5px', color: 'var(--text3)' }}>Panel principal · TrustPay</p>
          </div>
          <Avatar name={usuario} size={38} />
        </div>

        {msg   && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {/* ══════════════════════════════════════
            ROW 1 — Saldo  |  Nueva operación
        ══════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }} className="grid-1-mobile">

          {/* ── Saldo card (estilo Handstamp) ── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

            {/* Email identificador + copy */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'var(--surface2)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={13} color="var(--text3)" />
                <span style={{ fontSize: '11.5px', color: 'var(--text3)', fontWeight: 500 }}>Tu cuenta</span>
                <span style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'monospace' }}>{usuario}</span>
              </div>
              <button onClick={copyEmail} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '11px', gap: '4px', color: copied ? 'var(--green)' : 'var(--text3)' }}>
                {copied ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
              </button>
            </div>

            {/* Saldo principal */}
            <div style={{ marginBottom: '6px' }}>
              <p className="label" style={{ marginBottom: '4px' }}>Saldo total</p>
              <p style={{ fontFamily: 'Syne', fontSize: '42px', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--text)' }}>
                S/ {saldoTotal.toFixed(2)}
              </p>
            </div>

            {/* Barra disponible/retenido */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ height: '5px', background: 'var(--surface2)', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', width: `${pctDisp}%`, background: 'var(--green)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green)' }} />
                  <span style={{ fontSize: '11.5px', color: 'var(--text2)' }}>Disponible</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)', fontFamily: 'Syne' }}>S/ {saldoDisponible.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--amber)' }} />
                  <span style={{ fontSize: '11.5px', color: 'var(--text2)' }}>Retenido</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--amber)', fontFamily: 'Syne' }}>S/ {saldoRetenido.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Depositar */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: 'auto' }}>
              <p className="label" style={{ marginBottom: '10px' }}>Depositar saldo</p>
              <form onSubmit={handleDeposito} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number" placeholder="0.00"
                  value={deposito} onChange={e => setDeposito(e.target.value)}
                  min="1" step="0.01" required
                  style={{ flex: 1, fontFamily: 'Syne', fontWeight: 600 }}
                />
                <button type="submit" className="btn-primary" disabled={loadingDep}
                  style={{ width: 'auto', padding: '9px 16px', flexShrink: 0 }}>
                  <Plus size={14} />
                  {loadingDep ? '...' : 'Depositar'}
                </button>
              </form>
            </div>
          </div>

          {/* ── Nueva operación escrow ── */}
          <div className="card">
            <EscrowNatural
              saldoDisponible={saldoDisponible}
              onSubmit={handleEscrow}
            />
          </div>
        </div>

        {/* ══════════════════════════════════════
            ROW 2 — Contrapartes  |  Historial
        ══════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '14px' }} className="grid-1-mobile">

          {/* ── Contrapartes (estilo "Hosts") ── */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: 'Syne', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  Vendedores / Compradores
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                  Personas con las que has operado
                </p>
              </div>
              <button onClick={() => navigate('/operaciones')} className="btn-ghost"
                style={{ fontSize: '11.5px', gap: '3px', color: 'var(--green)', padding: '5px 8px' }}>
                Ver todas <ChevronRight size={13} />
              </button>
            </div>

            {contrapartes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'var(--surface2)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 12px',
                }}>
                  <TrendingUp size={20} color="var(--text3)" />
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '14px' }}>
                  Aún no tienes operaciones
                </p>
                <button onClick={() => navigate('/operaciones')} className="btn-secondary"
                  style={{ width: 'auto', padding: '7px 16px', fontSize: '12px' }}>
                  Ver operaciones
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                {contrapartes.map(nombre => (
                  <div key={nombre} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px' }}>
                    <Avatar name={nombre} size={50} />
                    <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 500, textAlign: 'center', lineHeight: 1.3, maxWidth: '56px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nombre.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Historial (estilo "Earnings") ── */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: 'Syne', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  Historial
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                  Últimos movimientos de tu cuenta
                </p>
              </div>
              <button onClick={() => navigate('/operaciones')} className="btn-ghost"
                style={{ fontSize: '11.5px', gap: '3px', color: 'var(--green)', padding: '5px 8px' }}>
                Ver todo <ChevronRight size={13} />
              </button>
            </div>

            {historial.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: '13px' }}>
                Sin movimientos aún
              </div>
            ) : (
              <div>
                {/* Cabecera tabla */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 90px 100px 80px',
                  padding: '0 4px 10px',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: '2px',
                }}>
                  {['Movimiento', 'Contraparte', 'Monto', 'Estado'].map(h => (
                    <span key={h} style={{ fontSize: '10.5px', color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      {h}
                    </span>
                  ))}
                </div>

                {/* Filas */}
                {historial.slice(0, 7).map((t, i) => {
                  const color   = colorH(t)
                  const prefijo = prefijoH(t)
                  const isPend  = t.tipo === 'escrow' && t.estado === 'pendiente'
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 90px 100px 80px',
                        alignItems: 'center',
                        padding: '11px 4px',
                        borderBottom: i < Math.min(historial.length, 7) - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background 0.12s',
                        borderRadius: '6px',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Tipo */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                          background: isPend ? 'var(--amber-bg)' : t.es_salida ? 'rgba(248,113,113,0.1)' : 'var(--green-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
                        }}>
                          <IconH t={t} />
                        </div>
                        <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text)' }}>
                          {labelH(t)}
                        </span>
                      </div>

                      {/* Contraparte */}
                      <span style={{ fontSize: '12px', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.contraparte || '—'}
                      </span>

                      {/* Monto */}
                      <span style={{ fontSize: '13px', fontWeight: 700, color, fontFamily: 'Syne', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                        {prefijo}S/ {Number(t.monto).toFixed(2)}
                      </span>

                      {/* Estado */}
                      <span className="badge" style={{
                        background: isPend ? 'var(--amber-bg)' : t.estado === 'completada' ? 'var(--green-bg)' : 'var(--surface2)',
                        color: isPend ? 'var(--amber)' : t.estado === 'completada' ? 'var(--green)' : 'var(--text3)',
                        fontSize: '9.5px', padding: '3px 8px', width: 'fit-content',
                      }}>
                        {isPend ? 'Retenido' : t.estado === 'completada' ? 'Completado' : t.estado}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  )
}
