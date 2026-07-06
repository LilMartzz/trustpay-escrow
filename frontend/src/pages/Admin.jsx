import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, KeyRound, Users, Lock, Timer, ArrowDownToLine,
  RefreshCw, LogOut, Check, X, UserCheck, Inbox,
} from 'lucide-react'
import api from '../services/api'

const KEY_STORAGE = 'tp_admin_key'

const ESTADO_ESCROW = {
  retenido:  { color: 'var(--amber)', label: 'Retenidos' },
  liberado:  { color: 'var(--green)', label: 'Liberados' },
  cancelado: { color: 'var(--red)',   label: 'Cancelados' },
  expirado:  { color: 'var(--text3)', label: 'Expirados' },
}

const ESTADO_DEPOSITO = {
  completada: { color: 'var(--green)', label: 'Completadas' },
  pendiente:  { color: 'var(--amber)', label: 'Pendientes' },
  rechazada:  { color: 'var(--red)',   label: 'Rechazadas' },
}

const fmtMonto = (n) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/* ── Card de métrica ── */
function StatCard({ icon: Icon, color, bg, titulo, valor, detalle, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      className="card stat-card"
      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '9px', background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={15} color={color} />
        </div>
        <span className="label" style={{ marginBottom: 0 }}>{titulo}</span>
      </div>
      <div style={{ fontFamily: 'Syne', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em' }}>
        {valor}
      </div>
      {detalle && <div style={{ fontSize: '11.5px', color: 'var(--text3)' }}>{detalle}</div>}
    </motion.div>
  )
}

/* ── Gráfico de barras horizontales simple ── */
function BarChart({ titulo, filas }) {
  const max = Math.max(...filas.map(f => f.valor), 1)
  return (
    <div className="card">
      <span className="label" style={{ marginBottom: '14px' }}>{titulo}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
        {filas.map((f, i) => (
          <div key={f.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text2)' }}>{f.label}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {f.valor}{f.extra ? ` · ${f.extra}` : ''}
              </span>
            </div>
            <div style={{ height: '7px', background: 'var(--surface2)', borderRadius: '99px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(f.valor / max) * 100}%` }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: '100%', background: f.color, borderRadius: '99px' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Admin() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) || '')
  const [autenticado, setAutenticado] = useState(false)
  const [claveInput, setClaveInput] = useState('')
  const [errorClave, setErrorClave] = useState('')
  const [validando, setValidando] = useState(false)

  const [metricas, setMetricas] = useState(null)
  const [pendientes, setPendientes] = useState([])
  const [cargando, setCargando] = useState(false)
  const [errorPanel, setErrorPanel] = useState('')
  const [resolviendo, setResolviendo] = useState(null) // usuario_id en curso
  const [avisos, setAvisos] = useState([]) // resultados de aprobar/rechazar

  const headers = useCallback((clave) => ({ 'X-Admin-Key': clave }), [])

  const cargarDatos = useCallback(async (clave) => {
    setCargando(true)
    setErrorPanel('')
    try {
      const [m, p] = await Promise.all([
        api.get('/admin/metricas', { headers: headers(clave) }),
        api.get('/perfil/admin/verificaciones-pendientes', { headers: headers(clave) }),
      ])
      setMetricas(m.data)
      setPendientes(p.data)
      setAutenticado(true)
      return true
    } catch (err) {
      if (err.response?.status === 403) {
        sessionStorage.removeItem(KEY_STORAGE)
        setAutenticado(false)
        setAdminKey('')
        setErrorClave('Clave de administrador inválida')
      } else {
        setErrorPanel(err.response?.data?.detail || 'No se pudo conectar con el servidor')
      }
      return false
    } finally {
      setCargando(false)
    }
  }, [headers])

  // Si ya hay clave en sessionStorage, entrar directo
  useEffect(() => {
    if (adminKey) cargarDatos(adminKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enviarClave = async (e) => {
    e.preventDefault()
    const clave = claveInput.trim()
    if (!clave) return
    setValidando(true)
    setErrorClave('')
    const ok = await cargarDatos(clave)
    if (ok) {
      sessionStorage.setItem(KEY_STORAGE, clave)
      setAdminKey(clave)
      setClaveInput('')
    } else if (!errorPanel) {
      // cargarDatos ya puso el mensaje para 403; para otros errores lo mostramos aquí
      setErrorClave(prev => prev || 'No se pudo validar la clave')
    }
    setValidando(false)
  }

  const salir = () => {
    sessionStorage.removeItem(KEY_STORAGE)
    setAdminKey('')
    setAutenticado(false)
    setMetricas(null)
    setPendientes([])
  }

  const resolver = async (usuarioId, decision) => {
    setResolviendo(usuarioId)
    try {
      const res = await api.post(
        `/perfil/admin/resolver-verificacion/${usuarioId}`,
        null,
        { params: { decision }, headers: headers(adminKey) },
      )
      setPendientes(prev => prev.filter(p => p.usuario_id !== usuarioId))
      setAvisos(prev => [...prev, { id: usuarioId, ok: true, texto: res.data.mensaje }])
      // refrescar métricas (cambia el conteo de verificados/pendientes)
      const m = await api.get('/admin/metricas', { headers: headers(adminKey) })
      setMetricas(m.data)
    } catch (err) {
      setAvisos(prev => [...prev, {
        id: usuarioId, ok: false,
        texto: err.response?.data?.detail || 'No se pudo resolver la verificación',
      }])
    }
    setResolviendo(null)
    setTimeout(() => setAvisos(prev => prev.slice(1)), 4500)
  }

  /* ── Pantalla de clave ── */
  if (!autenticado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <motion.form
          onSubmit={enviarClave}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="card"
          style={{ width: '100%', maxWidth: '360px', padding: '28px' }}
        >
          <div style={{
            width: '46px', height: '46px', borderRadius: '13px', background: 'var(--green-bg)',
            border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <ShieldCheck size={21} color="var(--green)" />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Panel de administración
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text3)', textAlign: 'center', marginBottom: '20px' }}>
            Ingresa la clave de administrador para continuar
          </p>

          {errorClave && <div className="alert alert-error shake">{errorClave}</div>}

          <div className="input-icon-wrap" style={{ marginBottom: '14px' }}>
            <span className="input-icon"><KeyRound size={15} /></span>
            <input
              type="password"
              placeholder="Clave de administrador"
              value={claveInput}
              onChange={e => setClaveInput(e.target.value)}
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary" disabled={validando || !claveInput.trim()}>
            {validando ? <><span className="spinner" /> Verificando…</> : 'Entrar'}
          </button>
        </motion.form>
      </div>
    )
  }

  /* ── Panel ── */
  const u = metricas?.usuarios
  const esc = metricas?.escrows
  const depEstados = metricas?.depositos_mercadopago || {}
  const totalEscrows = Object.values(esc?.por_estado || {}).reduce((a, b) => a + b, 0)
  const totalDepositos = Object.values(depEstados).reduce((a, b) => a + b, 0)

  return (
    <div style={{ minHeight: '100vh', maxWidth: '1060px', margin: '0 auto', padding: '28px 32px 60px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '26px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '9px' }}>
            <ShieldCheck size={20} color="var(--green)" />
            Panel de administración
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text3)' }}>
            Métricas de la plataforma y revisión de verificaciones
            {metricas?.generado_en && ` · ${new Date(metricas.generado_en).toLocaleTimeString('es-PE')}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => cargarDatos(adminKey)}
            className="btn-secondary"
            disabled={cargando}
            style={{ width: 'auto', padding: '8px 14px', fontSize: '12.5px' }}
          >
            <RefreshCw size={13} style={cargando ? { animation: 'spin 0.8s linear infinite' } : undefined} />
            Actualizar
          </button>
          <button onClick={salir} className="btn-danger" style={{ width: 'auto', padding: '8px 14px', fontSize: '12.5px' }}>
            <LogOut size={13} />
            Salir
          </button>
        </div>
      </div>

      {errorPanel && <div className="alert alert-error">{errorPanel}</div>}

      {/* ── Cards de métricas ── */}
      {!metricas ? (
        <div className="grid-1-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: '110px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : (
        <div className="grid-1-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
          <StatCard
            icon={Users} color="var(--green)" bg="var(--green-bg)"
            titulo="Usuarios" valor={u.total}
            detalle={`${u.verificados} verificados${u.tasa_verificacion != null ? ` (${Math.round(u.tasa_verificacion * 100)}%)` : ''}`}
          />
          <StatCard
            icon={Lock} color="var(--amber)" bg="var(--amber-bg)"
            titulo="Escrows" valor={totalEscrows}
            detalle={`${fmtMonto(esc.monto_protegido_total)} protegidos en total`}
            delay={0.05}
          />
          <StatCard
            icon={ArrowDownToLine} color="var(--blue)" bg="var(--blue-bg)"
            titulo="Depósitos MP" valor={totalDepositos}
            detalle={`${depEstados.completada || 0} completadas`}
            delay={0.1}
          />
          <StatCard
            icon={Timer} color="var(--green)" bg="var(--green-bg)"
            titulo="Liberación promedio"
            valor={esc.horas_promedio_hasta_liberacion != null ? `${esc.horas_promedio_hasta_liberacion} h` : '—'}
            detalle={`${esc.cancelados_con_envio_registrado} cancelaciones con envío registrado`}
            delay={0.15}
          />
        </div>
      )}

      {/* ── Gráficos simples ── */}
      {metricas && (
        <div className="grid-1-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '26px' }}>
          <BarChart
            titulo="Escrows por estado"
            filas={Object.entries(ESTADO_ESCROW).map(([estado, cfg]) => ({
              label: cfg.label,
              valor: esc.por_estado[estado] || 0,
              extra: fmtMonto(esc.monto_por_estado[estado] || 0),
              color: cfg.color,
            }))}
          />
          <BarChart
            titulo="Depósitos Mercado Pago por estado"
            filas={
              totalDepositos === 0
                ? Object.values(ESTADO_DEPOSITO).map(cfg => ({ label: cfg.label, valor: 0, color: cfg.color }))
                : Object.entries(depEstados).map(([estado, cantidad]) => ({
                    label: ESTADO_DEPOSITO[estado]?.label || estado,
                    valor: cantidad,
                    color: ESTADO_DEPOSITO[estado]?.color || 'var(--text3)',
                  }))
            }
          />
        </div>
      )}

      {/* ── Verificaciones pendientes ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '13px' }}>
        <UserCheck size={16} color="var(--amber)" />
        <h2 style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Verificaciones pendientes
        </h2>
        {pendientes.length > 0 && (
          <span className="badge" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
            {pendientes.length}
          </span>
        )}
      </div>

      <AnimatePresence>
        {avisos.map(a => (
          <motion.div
            key={`${a.id}-${a.texto}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`alert ${a.ok ? 'alert-success' : 'alert-error'}`}
          >
            {a.texto}
          </motion.div>
        ))}
      </AnimatePresence>

      {pendientes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '44px 24px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '13px', background: 'var(--surface2)',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <Inbox size={20} color="var(--text3)" />
          </div>
          <p style={{ fontSize: '13.5px', fontWeight: 500, marginBottom: '4px' }}>Sin verificaciones pendientes</p>
          <p style={{ fontSize: '12px', color: 'var(--text3)' }}>Cuando un usuario quede en revisión manual aparecerá aquí</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <AnimatePresence mode="popLayout">
            {pendientes.map((p, i) => (
              <motion.div
                key={p.usuario_id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32, delay: i * 0.04 }}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', flexWrap: 'wrap' }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', background: 'var(--amber-bg)',
                  color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '13px', flexShrink: 0, fontFamily: 'Syne',
                }}>
                  {(p.nombre || '??').slice(0, 2).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '2px' }}>{p.nombre}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{p.email}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px' }}>
                    DNI {p.dni_numero || '—'}
                    {p.nombre_reniec && <> · RENIEC: {p.nombre_reniec}</>}
                    {!p.documentos_subidos && <> · <span style={{ color: 'var(--amber)' }}>sin documentos completos</span></>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => resolver(p.usuario_id, 'aprobar')}
                    disabled={resolviendo === p.usuario_id}
                    className="btn-primary"
                    style={{ width: 'auto', padding: '7px 14px', fontSize: '12.5px' }}
                  >
                    <Check size={13} />
                    Aprobar
                  </button>
                  <button
                    onClick={() => resolver(p.usuario_id, 'rechazar')}
                    disabled={resolviendo === p.usuario_id}
                    className="btn-danger"
                    style={{ width: 'auto', padding: '7px 14px', fontSize: '12.5px' }}
                  >
                    <X size={13} />
                    Rechazar
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
