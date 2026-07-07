import { motion } from 'framer-motion'
import { Truck, CheckCircle2 } from 'lucide-react'
import Conector from './Conector'

const TRACKING_ESTADOS = [
  { key: null,         label: 'Orden creada' },
  { key: 'preparando', label: 'Preparando envío' },
  { key: 'en_camino',  label: 'En camino' },
  { key: 'entregado',  label: 'Entregado' },
  { key: 'confirmado', label: 'Confirmado' },
]

function trackingDone(envioEstado, escrowEstado, step) {
  if (step === null) return true
  if (step === 'confirmado') return escrowEstado === 'liberado'
  if (!envioEstado) return false
  const order = ['preparando', 'en_camino', 'entregado', 'confirmado']
  return order.indexOf(envioEstado) >= order.indexOf(step)
}

export default function TrackingCard({ envio, escrow, esVendedor, actualizarEstadoEnvio }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Truck size={14} color="var(--text3)" />
        <span className="label" style={{ margin: 0 }}>Seguimiento del envío</span>
      </div>

      {envio && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
            <div className="label" style={{ fontSize: '9.5px', marginBottom: '3px' }}>Empresa</div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{envio.empresa}</div>
          </div>
          <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
            <div className="label" style={{ fontSize: '9.5px', marginBottom: '3px' }}>N° de guía</div>
            <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.03em' }}>{envio.numero_guia}</div>
          </div>
        </div>
      )}

      {!envio && (
        <div style={{ textAlign: 'center', padding: '12px 0 16px', color: 'var(--text3)', fontSize: '12.5px' }}>
          {esVendedor ? 'Registra el envío para que el comprador pueda seguirlo' : 'El vendedor aún no ha registrado el envío'}
        </div>
      )}

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {TRACKING_ESTADOS.map((step, i) => {
          const done    = trackingDone(envio?.estado, escrow?.estado, step.key)
          const current = envio?.estado === step.key && escrow?.estado !== 'liberado'
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <motion.div
                  initial={false}
                  animate={{ scale: done || current ? [1, 1.35, 1] : 1 }}
                  transition={{ duration: 0.35 }}
                  style={{
                    width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                    background: done ? 'var(--green)' : current ? 'var(--amber)' : 'var(--border2)',
                    animation: current ? 'pulse-ring 1.6s ease-out infinite' : 'none',
                  }} />
                <span style={{
                  fontSize: '12.5px',
                  color: done ? 'var(--text)' : current ? 'var(--amber)' : 'var(--text3)',
                  fontWeight: done || current ? 500 : 400,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  {step.label}
                  {current && (
                    <span style={{ fontSize: '10px', color: 'var(--amber)', background: 'var(--amber-bg)', padding: '1px 6px', borderRadius: '4px' }}>
                      ahora
                    </span>
                  )}
                </span>
              </div>
              {i < TRACKING_ESTADOS.length - 1 && <Conector done={done} left="4.5px" />}
            </motion.div>
          )
        })}
      </div>

      {/* Seller update buttons */}
      {esVendedor && envio && escrow?.estado === 'retenido' && (
        <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {envio.estado !== 'en_camino' && (
            <button onClick={() => actualizarEstadoEnvio('en_camino')} className="btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: '11.5px' }}>
              <Truck size={12} /> En camino
            </button>
          )}
          {envio.estado !== 'entregado' && (
            <button onClick={() => actualizarEstadoEnvio('entregado')} className="btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: '11.5px' }}>
              <CheckCircle2 size={12} /> Marcar entregado
            </button>
          )}
        </div>
      )}
    </div>
  )
}
