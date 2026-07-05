import { useState, useEffect } from 'react'

/* Contador animado 0 → target con easing; arranca cuando `go` pasa a true. */
export default function useCounter(target, ms, go) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!go) return
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min((now - t0) / ms, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setV(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [go, target, ms])
  return v
}
