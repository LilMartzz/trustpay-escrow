import { motion } from 'framer-motion'

/* ── Conector vertical que se "llena" de verde ── */
export default function Conector({ done, left }) {
  return (
    <div style={{ width: '1.5px', height: '12px', background: 'var(--border)', marginLeft: left, position: 'relative', overflow: 'hidden' }}>
      <motion.div
        initial={false}
        animate={{ scaleY: done ? 1 : 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ position: 'absolute', inset: 0, background: 'rgba(34,197,94,0.45)', transformOrigin: 'top' }}
      />
    </div>
  )
}
