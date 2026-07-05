import { useState, useEffect, useRef } from 'react'

/* Anima un número desde su valor anterior hasta `target` con easing cúbico. */
export default function useCountUp(target, duration = 750) {
  const [display, setDisplay] = useState(0)
  const animRef = useRef(null)
  const fromRef = useRef(0)
  useEffect(() => {
    if (target === null || target === undefined) return
    const from = fromRef.current
    const diff = target - from
    const start = performance.now()
    cancelAnimationFrame(animRef.current)
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + diff * eased)
      if (t < 1) animRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [target, duration])
  return display
}
