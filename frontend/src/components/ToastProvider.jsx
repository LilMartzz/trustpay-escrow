import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Info } from 'lucide-react'
import { ToastContext } from '../contexts/toast-context'

const ICONOS = {
  success: { Icon: CheckCircle2, color: 'var(--green)' },
  error:   { Icon: XCircle,      color: 'var(--red)' },
  info:    { Icon: Info,         color: 'var(--blue)' },
}

const DURACION = 3500

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const quitar = useCallback((id) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const push = useCallback((tipo, mensaje) => {
    const id = ++idRef.current
    setToasts(ts => [...ts.slice(-3), { id, tipo, mensaje }])
    setTimeout(() => quitar(id), DURACION)
  }, [quitar])

  const api = {
    success: (m) => push('success', m),
    error:   (m) => push('error', m),
    info:    (m) => push('info', m),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={{
        position: 'fixed', bottom: '20px', right: '20px', zIndex: 2000,
        display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end',
        pointerEvents: 'none',
      }}>
        <AnimatePresence>
          {toasts.map(t => {
            const { Icon, color } = ICONOS[t.tipo] || ICONOS.info
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={() => quitar(t.id)}
                style={{
                  pointerEvents: 'auto', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '9px',
                  background: 'var(--surface)', border: '1px solid var(--border2)',
                  borderRadius: 'var(--radius)', padding: '11px 16px 13px 13px',
                  boxShadow: 'var(--shadow-lg)', maxWidth: '340px',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <Icon size={16} color={color} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12.5px', color: 'var(--text)', lineHeight: 1.45 }}>
                  {t.mensaje}
                </span>
                {/* barra de vida */}
                <motion.div
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: DURACION / 1000, ease: 'linear' }}
                  style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, height: '2px',
                    background: color, transformOrigin: 'left', opacity: 0.55,
                  }}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
