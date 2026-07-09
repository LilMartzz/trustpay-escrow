import { useCallback, useRef, useState } from 'react'

const STALL_MS = 4000

/**
 * Progreso de subida honesto: porcentaje real (bytes enviados / total) y
 * tiempo estimado restante a partir de la velocidad medida, no un spinner
 * que oculta si realmente avanza. También detecta estancamiento (sin
 * eventos de progreso por varios segundos) para avisar sin nunca reiniciar
 * la carga.
 */
export default function useUploadProgress() {
  const [progress, setProgress] = useState(null)
  const startRef = useRef(0)
  const stallTimerRef = useRef(null)

  const clearStallTimer = () => {
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current)
    stallTimerRef.current = null
  }

  const armStallTimer = useCallback(() => {
    clearStallTimer()
    stallTimerRef.current = setTimeout(() => {
      setProgress(p => (p ? { ...p, stalled: true } : p))
    }, STALL_MS)
  }, [])

  const start = useCallback(() => {
    startRef.current = Date.now()
    setProgress({ percent: 0, etaSeconds: null, stalled: false })
    armStallTimer()
  }, [armStallTimer])

  const onUploadProgress = useCallback((evt) => {
    if (!evt.total) return
    const percent = Math.min(99, Math.round((evt.loaded / evt.total) * 100))
    const elapsedSec = (Date.now() - startRef.current) / 1000
    const speed = evt.loaded / Math.max(elapsedSec, 0.001)
    const remainingBytes = evt.total - evt.loaded
    const etaSeconds = speed > 0 ? remainingBytes / speed : null
    setProgress({ percent, etaSeconds, stalled: false })
    armStallTimer()
  }, [armStallTimer])

  const finish = useCallback(() => {
    clearStallTimer()
    setProgress(null)
  }, [])

  return { progress, start, onUploadProgress, finish }
}
