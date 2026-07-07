import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Star, Download } from 'lucide-react'
import HoldButton from '../HoldButton'
import Conector from './Conector'

/* ── Check SVG que se "dibuja" al completarse un paso ── */
function CheckAnimado({ done }) {
  if (!done) return <Circle size={15} color="var(--border2)" style={{ flexShrink: 0 }} />
  return (
    <motion.svg
      width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.circle
        cx="12" cy="12" r="10"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
      <motion.path
        d="M8 12.5l2.6 2.6L16.5 9.5"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
      />
    </motion.svg>
  )
}

export const ESTADO_MAP = {
  retenido:  { color: 'var(--amber)', bg: 'var(--amber-bg)',       label: 'Retenido' },
  liberado:  { color: 'var(--green)', bg: 'var(--green-bg)',       label: 'Liberado' },
  cancelado: { color: 'var(--red)',   bg: 'rgba(248,113,113,0.1)', label: 'Cancelado' },
  expirado:  { color: 'var(--text3)', bg: 'rgba(82,82,91,0.15)',   label: 'Expirado' },
}

export default function EstadoCard({
  escrow, evidencias, esComprador, esVendedor,
  loading, confirmar, cancelar,
  puntuacion, setPuntuacion, comentario, setComentario,
  calificando, calificar, descargarPdf,
}) {
  const estadoInfo = escrow ? (ESTADO_MAP[escrow.estado] || ESTADO_MAP.expirado) : null

  /* progress steps */
  const pasos = [
    { label: 'Pago iniciado',                 done: true },
    { label: 'Fondos retenidos',              done: true },
    { label: 'Evidencia subida',              done: evidencias.length > 0 },
    { label: 'Comprador confirma recepción',  done: escrow?.estado === 'liberado' },
    { label: 'Fondos liberados al vendedor',  done: escrow?.estado === 'liberado' },
  ]

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <span className="label" style={{ margin: 0 }}>Estado de la operación</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {estadoInfo && (
            <span className="badge" style={{ background: estadoInfo.bg, color: estadoInfo.color, fontSize: '9.5px' }}>
              {estadoInfo.label}
            </span>
          )}
          {escrow && descargarPdf && (
            <button
              type="button"
              onClick={descargarPdf}
              className="btn-ghost"
              title="Descargar comprobante en PDF"
              aria-label="Descargar comprobante en PDF"
              style={{ padding: '4px 6px', color: 'var(--text3)' }}
            >
              <Download size={13} />
            </button>
          )}
        </div>
      </div>

      {escrow && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '22px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: 500 }}>S/</span>
            <span style={{
              fontFamily: 'Syne', fontSize: '38px', fontWeight: 800,
              color: estadoInfo.color, letterSpacing: '-0.04em', lineHeight: 1,
            }}>
              {Number(escrow.monto_retenido).toFixed(2)}
            </span>
          </div>

          {/* Progress steps */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {pasos.map((paso, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckAnimado done={paso.done} />
                  <span style={{
                    fontSize: '12.5px',
                    color: paso.done ? 'var(--text)' : 'var(--text3)',
                    fontWeight: paso.done ? 500 : 400,
                  }}>
                    {paso.label}
                  </span>
                </div>
                {i < pasos.length - 1 && <Conector done={paso.done} left="7px" />}
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          {escrow.estado === 'retenido' && (
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="alert alert-warning" style={{ margin: 0, fontSize: '11.5px' }}>
                Auto-liberación: {new Date(escrow.expira_en).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              {esComprador && (
                <>
                  <HoldButton onComplete={confirmar} disabled={loading}>
                    <CheckCircle2 size={14} />
                    {loading ? 'Procesando...' : 'Mantén presionado para confirmar recepción'}
                  </HoldButton>
                  <p style={{ fontSize: '10.5px', color: 'var(--text3)', textAlign: 'center', margin: '-2px 0 0' }}>
                    Liberar los fondos es irreversible — mantén presionado 1.5 s
                  </p>
                  <button onClick={cancelar} disabled={loading} className="btn-danger">
                    Cancelar y devolver fondos
                  </button>
                </>
              )}
              {esVendedor && (
                <div className="card" style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  padding: '12px 14px', textAlign: 'center', fontSize: '12.5px', color: 'var(--text2)',
                }}>
                  Esperando confirmación del comprador
                </div>
              )}
            </div>
          )}

          {/* Calificación */}
          {escrow.estado === 'liberado' && (
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
              {escrow.ya_calificado ? (
                <div style={{ textAlign: 'center', padding: '4px 0', fontSize: '12.5px', color: 'var(--text2)' }}>
                  <Star size={18} color="var(--amber)" fill="var(--amber)" style={{ marginBottom: '6px' }} />
                  <p>Ya calificaste esta operación. ¡Gracias!</p>
                </div>
              ) : (
                <>
                  <p className="label" style={{ marginBottom: '10px' }}>
                    Califica a {escrow.contraparte || 'la contraparte'}
                  </p>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPuntuacion(n)}
                        className="btn-ghost"
                        style={{ padding: '4px' }}
                      >
                        <Star
                          size={22}
                          color="var(--amber)"
                          fill={n <= puntuacion ? 'var(--amber)' : 'none'}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Comentario (opcional)"
                    value={comentario}
                    onChange={e => setComentario(e.target.value)}
                    rows={2}
                    style={{ marginBottom: '10px', resize: 'none' }}
                  />
                  <button onClick={calificar} disabled={calificando} className="btn-primary">
                    {calificando ? 'Enviando...' : 'Enviar calificación'}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
