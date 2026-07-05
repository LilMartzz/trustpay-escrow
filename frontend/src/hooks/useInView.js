import { useState, useEffect, useRef } from 'react'

/* Devuelve [ref, visible]: `visible` pasa a true (una sola vez) cuando el
   elemento entra al viewport. Para scroll-reveal. */
export default function useInView(threshold = 0.12) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); obs.unobserve(el) } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, on]
}
