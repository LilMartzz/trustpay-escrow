import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight,
  RefreshCw, Plus, ChevronRight, Copy, Check, ArrowUpFromLine,
} from 'lucide-react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import EscrowNatural from '../components/EscrowNatural'
import DepositoModal from '../components/DepositoModal'
import RetiroModal from '../components/RetiroModal'
import { useToast } from '../contexts/toast-context'
import useCountUp from '../hooks/useCountUp'
import usePollingAdaptativo from '../hooks/usePollingAdaptativo'
import { useAuth } from '../hooks/useAuth'
import { activarNotificaciones } from '../notifications'

/* ── helpers historial ── */
function labelH(t) {
  if (t.tipo === 'escrow') {
    if (t.estado === 'pendiente') return 'Escrow retenido'
    return t.es_salida ? 'Pago escrow' : 'Cobro escrow'
  }
  if (t.tipo === 'deposito_mercadopago') return 'Depósito con tarjeta'
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
      result.push({ nombre: t.contraparte, email: t.contraparte_email })
    }
  }
  return result.slice(0, 8)
}

export default function Dashboard() {
  const [saldo,    setSaldo]    = useState(null)
  const [historial, setHistorial] = useState([])
  const [usuario,  setUsuario]  = useState('')
  const [deposito, setDeposito] = useState('')
  const [copied, setCopied]    = useState(false)
  const [mostrarDeposito, setMostrarDeposito] = useState(false)
  const [mostrarRetiro, setMostrarRetiro] = useState(false)
  const [saldoPulso, setSaldoPulso] = useState(false)
  const [barraLista, setBarraLista] = useState(false)
  const [hoverBarra, setHoverBarra] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const toast = useToast()
  const saldoPrevRef = useRef(null)
  // Firma del último estado cargado, para que el polling detecte si algo
  // cambió (saldo o historial) y ajuste el backoff en consecuencia.
  const firmaRef = useRef(null)

  const cargar = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        api.get('/billetera/saldo'),
        api.get('/billetera/historial'),
      ])
      setSaldo(s.data)
      setUsuario(s.data.usuario)
      setHistorial(h.data)
      const firma = `${s.data.saldo}|${s.data.saldo_retenido}|${h.data.length}`
      const huboCambio = firma !== firmaRef.current
      firmaRef.current = firma
      return huboCambio
    } catch {
      logout()
      navigate('/login')
      return false
    }
  }, [logout, navigate])

  // Carga inicial y al volver a navegar al dashboard (location.key cambia).
  useEffect(() => { (async () => { await cargar() })() }, [cargar, location.key])
  useEffect(() => { activarNotificaciones() }, [])

  // Saldo e historial con backoff; se pausa si la pestaña está oculta.
  usePollingAdaptativo(cargar, { base: 5000, max: 20000 })

  const abrirDeposito = (e) => {
    e.preventDefault()
    setMostrarDeposito(true)
  }

  const handleDepositoExitoso = async () => {
    setMostrarDeposito(false)
    setDeposito('')
    toast.success('¡Depósito exitoso!')
    await cargar()
  }

  const handleRetiroExitoso = async () => {
    setMostrarRetiro(false)
    toast.success('Retiro en camino')
    await cargar()
  }

  const handleEscrow = async ({ monto, email_destino, descripcion }) => {
    try {
      const res = await api.post('/escrow/iniciar', { email_destino, monto, descripcion })
      await cargar()
      navigate(`/operacion/${res.data.escrow_id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar escrow')
    }
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

  const animTotal      = useCountUp(saldo !== null ? saldoTotal      : null)
  const animDisponible = useCountUp(saldo !== null ? saldoDisponible : null)
  const animRetenido   = useCountUp(saldo !== null ? saldoRetenido   : null)

  /* pulso verde cuando el saldo sube (ej. tras una recarga) */
  useEffect(() => {
    if (saldo === null) return
    const prev = saldoPrevRef.current
    saldoPrevRef.current = saldoTotal
    if (prev !== null && saldoTotal > prev) {
      setSaldoPulso(true)
      const t = setTimeout(() => setSaldoPulso(false), 1300)
      return () => clearTimeout(t)
    }
  }, [saldoTotal, saldo])

  /* la barra disponible/retenido crece de 0 a su valor al montar */
  useEffect(() => {
    if (saldo !== null) requestAnimationFrame(() => setBarraLista(true))
  }, [saldo])

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

        {/* ══════════════════════════════════════
            ROW 1 — Saldo  |  Nueva operación
        ══════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px', animation: 'fadeUp 0.38s cubic-bezier(0.22,1,0.36,1) both', animationDelay: '0ms' }} className="grid-1-mobile">

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
              <p className={saldoPulso ? 'saldo-pulso' : ''} style={{ fontFamily: 'Syne', fontSize: '42px', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--text)', transformOrigin: 'left center' }}>
                S/ {animTotal.toFixed(2)}
              </p>
            </div>

            {/* Barra disponible/retenido */}
            <div style={{ marginBottom: '18px' }}>
              <div
                onMouseEnter={() => setHoverBarra(true)}
                onMouseLeave={() => setHoverBarra(false)}
                style={{ position: 'relative', padding: '4px 0', margin: '-4px 0 4px', cursor: 'default' }}
              >
                {hoverBarra && (
                  <div className="barra-tooltip">
                    <span style={{ color: 'var(--green)' }}>● S/ {saldoDisponible.toFixed(2)} disponible</span>
                    <span style={{ color: 'var(--amber)' }}>● S/ {saldoRetenido.toFixed(2)} retenido</span>
                  </div>
                )}
                <div style={{ height: '5px', background: 'var(--amber-bg)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: barraLista ? `${pctDisp}%` : '0%',
                    background: 'var(--green)', borderRadius: '99px',
                    transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green)' }} />
                  <span style={{ fontSize: '11.5px', color: 'var(--text2)' }}>Disponible</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)', fontFamily: 'Syne' }}>S/ {animDisponible.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--amber)' }} />
                  <span style={{ fontSize: '11.5px', color: 'var(--text2)' }}>Retenido</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--amber)', fontFamily: 'Syne' }}>S/ {animRetenido.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Depositar */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: 'auto' }}>
              <p className="label" style={{ marginBottom: '10px' }}>Depositar saldo</p>
              <form onSubmit={abrirDeposito} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number" placeholder="0.00"
                  value={deposito} onChange={e => setDeposito(e.target.value)}
                  min="1" step="0.01" required
                  style={{ flex: 1, fontFamily: 'Syne', fontWeight: 600 }}
                />
                <button type="submit" className="btn-primary"
                  style={{ width: 'auto', padding: '9px 16px', flexShrink: 0 }}>
                  <Plus size={14} />
                  Depositar
                </button>
              </form>
              <button
                type="button"
                onClick={() => setMostrarRetiro(true)}
                disabled={saldo === null}
                className="btn-ghost"
                style={{ width: '100%', marginTop: '10px', padding: '8px', gap: '6px', color: 'var(--text2)', justifyContent: 'center' }}
              >
                <ArrowUpFromLine size={13} />
                Retirar a mi banco
              </button>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '14px', animation: 'fadeUp 0.38s cubic-bezier(0.22,1,0.36,1) both', animationDelay: '90ms' }} className="grid-1-mobile">

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
                {contrapartes.map((c, i) => (
                  <div
                    key={c.nombre}
                    className="avatar-hover stagger"
                    title={`Ver perfil de ${c.nombre}`}
                    onClick={() => c.email && navigate(`/usuario/${encodeURIComponent(c.email)}`)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', animationDelay: `${i * 50}ms`, cursor: c.email ? 'pointer' : 'default' }}
                  >
                    <Avatar name={c.nombre} size={50} />
                    <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 500, textAlign: 'center', lineHeight: 1.3, maxWidth: '56px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.nombre.split(' ')[0]}
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
                      className="hist-row stagger"
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 90px 100px 80px',
                        alignItems: 'center',
                        padding: '11px 4px',
                        borderBottom: i < Math.min(historial.length, 7) - 1 ? '1px solid var(--border)' : 'none',
                        borderRadius: '6px',
                        animationDelay: `${i * 40}ms`,
                      }}
                    >
                      {/* Tipo */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <div className="hist-icon" style={{
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

      <AnimatePresence>
        {mostrarDeposito && (
          <DepositoModal
            montoInicial={deposito}
            onClose={() => setMostrarDeposito(false)}
            onSuccess={handleDepositoExitoso}
          />
        )}
        {mostrarRetiro && (
          <RetiroModal
            saldoDisponible={saldoDisponible}
            verificado={saldo?.verificado}
            onClose={() => setMostrarRetiro(false)}
            onSuccess={handleRetiroExitoso}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
