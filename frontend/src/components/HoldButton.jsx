import { useState, useEffect, useRef } from 'react'

/* Botón "mantener presionado para confirmar": fricción deliberada para
   acciones irreversibles. Se llena de izquierda a derecha mientras se
   mantiene presionado; al soltar antes de tiempo, retrocede.
   Accesible por teclado: mantener Espacio o Enter equivale a mantener
   presionado el puntero. */
export default function HoldButton({ onComplete, disabled, ms = 1500, children }) {
  const [prog, setProg] = useState(0)
  const rafRef = useRef(null)
  const doneRef = useRef(false)
  const activoRef = useRef(false)

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const empezar = () => {
    if (disabled || activoRef.current) return
    activoRef.current = true
    doneRef.current = false
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min((now - t0) / ms, 1)
      setProg(p)
      if (p >= 1) {
        if (!doneRef.current) { doneRef.current = true; onComplete() }
        activoRef.current = false
        setTimeout(() => setProg(0), 400)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const soltar = () => {
    activoRef.current = false
    cancelAnimationFrame(rafRef.current)
    if (!doneRef.current) setProg(0)
  }

  const onKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault() // evita el click sintético al soltar
      if (!e.repeat) empezar()
    }
  }

  const onKeyUp = (e) => {
    if (e.key === ' ' || e.key === 'Enter') soltar()
  }

  return (
    <button
      type="button"
      className="btn-primary"
      disabled={disabled}
      onPointerDown={empezar}
      onPointerUp={soltar}
      onPointerLeave={soltar}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={soltar}
      onContextMenu={e => e.preventDefault()}
      aria-label="Mantén presionado (o mantén Espacio) para confirmar"
      style={{ position: 'relative', overflow: 'hidden', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, background: 'rgba(5,41,18,0.3)',
          transformOrigin: 'left', transform: `scaleX(${prog})`,
          transition: prog === 0 ? 'transform 0.3s ease' : 'none',
        }} />
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
        {children}
      </span>
    </button>
  )
}
