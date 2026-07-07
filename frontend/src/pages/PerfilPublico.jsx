import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Star, ShieldCheck, Package, MessageSquare } from 'lucide-react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

const COLORS = ['#22C55E', '#06B6D4', '#818CF8', '#F59E0B', '#A78BFA', '#F87171', '#34D399', '#60A5FA']

function Avatar({ name = '', size = 64 }) {
  const c = COLORS[(name.charCodeAt(0) || 0) % COLORS.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${c}18`, border: `2px solid ${c}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Syne', fontSize: size * 0.34, fontWeight: 700, color: c,
    }}>
      {name.slice(0, 2).toUpperCase() || '??'}
    </div>
  )
}

function Estrellas({ valor, size = 13 }) {
  return (
    <span style={{ display: 'inline-flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n} size={size} color="var(--amber)"
          fill={n <= Math.round(valor) ? 'var(--amber)' : 'none'}
          opacity={n <= Math.round(valor) ? 1 : 0.35}
        />
      ))}
    </span>
  )
}

export default function PerfilPublico() {
  const { email } = useParams()
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelado = false
    api.get(`/perfil/publico/${encodeURIComponent(email)}`)
      .then(res => { if (!cancelado) setPerfil(res.data) })
      .catch(() => { if (!cancelado) setError(true) })
    return () => { cancelado = true }
  }, [email])

  const total = perfil?.cantidad || 0

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content" style={{ padding: '28px 32px' }}>
        <div style={{ maxWidth: '640px' }}>

          <button onClick={() => navigate(-1)} className="btn-ghost" style={{ padding: '7px', marginBottom: '16px', color: 'var(--text2)' }}>
            <ArrowLeft size={18} />
          </button>

          {error && (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)', fontSize: '13px' }}>
              No se encontró este usuario
            </div>
          )}

          {!perfil && !error && (
            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 16, width: '45%', marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 11, width: '65%' }} />
              </div>
            </div>
          )}

          {perfil && (
            <>
              {/* ── Cabecera ── */}
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                style={{ marginBottom: '14px' }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '18px' }}>
                  <Avatar name={perfil.nombre} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h1 style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em' }}>
                        {perfil.nombre}
                      </h1>
                      {perfil.verificado === 'verificado' && (
                        <span className="badge" style={{ background: 'var(--green-bg)', color: 'var(--green)', gap: '4px', display: 'inline-flex', alignItems: 'center' }}>
                          <BadgeCheck size={11} /> Verificado
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>
                      {perfil.email} · miembro desde {new Date(perfil.miembro_desde).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {[
                    { icon: Star, valor: perfil.promedio ?? '—', label: 'Promedio', color: 'var(--amber)' },
                    { icon: MessageSquare, valor: perfil.cantidad, label: 'Valoraciones', color: 'var(--blue)' },
                    { icon: Package, valor: perfil.operaciones_completadas, label: 'Operaciones', color: 'var(--green)' },
                  ].map((s, i) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + i * 0.07 }}
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px', textAlign: 'center' }}
                    >
                      <s.icon size={14} color={s.color} style={{ marginBottom: '5px' }} />
                      <div style={{ fontFamily: 'Syne', fontSize: '19px', fontWeight: 800, letterSpacing: '-0.03em' }}>{s.valor}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* ── Distribución de estrellas ── */}
              {total > 0 && (
                <motion.div
                  className="card"
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  style={{ marginBottom: '14px' }}
                >
                  <p className="label" style={{ marginBottom: '12px' }}>Distribución</p>
                  {[5, 4, 3, 2, 1].map((n, i) => {
                    const cant = perfil.distribucion?.[n] || 0
                    const pct = total > 0 ? (cant / total) * 100 : 0
                    return (
                      <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' }}>
                        <span style={{ fontSize: '11.5px', color: 'var(--text2)', width: '28px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          {n} <Star size={10} color="var(--amber)" fill="var(--amber)" />
                        </span>
                        <div style={{ flex: 1, height: '6px', background: 'var(--surface2)', borderRadius: '99px', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                            style={{ height: '100%', width: `${pct}%`, background: 'var(--amber)', borderRadius: '99px', transformOrigin: 'left' }}
                          />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text3)', width: '22px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {cant}
                        </span>
                      </div>
                    )
                  })}
                </motion.div>
              )}

              {/* ── Valoraciones con descripción ── */}
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="label" style={{ marginBottom: '14px' }}>
                  Valoraciones ({perfil.cantidad})
                </p>

                {perfil.calificaciones.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: '12.5px' }}>
                    <ShieldCheck size={22} color="var(--border2)" style={{ marginBottom: '8px' }} />
                    <p>Aún no tiene valoraciones</p>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {perfil.calificaciones.map((c, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + Math.min(i, 8) * 0.05 }}
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: c.comentario ? '7px' : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Avatar name={c.autor} size={26} />
                          <span style={{ fontSize: '12.5px', fontWeight: 500 }}>{c.autor}</span>
                          <Estrellas valor={c.puntuacion} size={11} />
                        </div>
                        <span style={{ fontSize: '10.5px', color: 'var(--text3)' }}>
                          {new Date(c.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {c.comentario && (
                        <p style={{ fontSize: '12.5px', color: 'var(--text2)', lineHeight: 1.6 }}>
                          “{c.comentario}”
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
