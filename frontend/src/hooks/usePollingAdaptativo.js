import { useEffect, useRef } from 'react'

/**
 * Polling adaptativo y consciente de la visibilidad de la pestaña.
 *
 * - Visibilidad: se pausa mientras la pestaña está oculta y refresca de
 *   inmediato al volver a ella (no gasta requests si nadie está mirando).
 * - Backoff: si la tarea no reporta cambios, va espaciando el intervalo
 *   (base → base*factor → … → max) y vuelve a `base` en cuanto hay novedad.
 *
 * La carga inicial la hace el componente; aquí el primer sondeo ocurre tras
 * `base` (o de inmediato al volver a una pestaña que estaba oculta).
 *
 * @param {() => Promise<boolean>} tarea  Devuelve true si detectó un cambio.
 * @param {{ base?: number, max?: number, factor?: number }} opciones  En ms.
 */
export default function usePollingAdaptativo(tarea, { base = 3000, max = 15000, factor = 1.5 } = {}) {
  // Ref para llamar siempre a la última versión de la tarea sin reiniciar el
  // efecto en cada render (evita recrear el temporizador continuamente).
  const tareaRef = useRef(tarea)
  useEffect(() => { tareaRef.current = tarea }, [tarea])

  useEffect(() => {
    let activo = true
    let intervalo = base
    let timeoutId = null
    // "Generación": cada arranque/pausa la incrementa; un ciclo que quedó en
    // vuelo (o un timer viejo) al cambiar la visibilidad ya no coincide y se
    // descarta, evitando reprogramaciones fantasma o temporizadores duplicados.
    let gen = 0

    const programar = (ms, g) => { timeoutId = setTimeout(() => ciclo(g), ms) }

    async function ciclo(g) {
      if (!activo || g !== gen) return
      let huboCambio = false
      try {
        huboCambio = await tareaRef.current()
      } catch {
        // Fallo puntual (red intermitente): se reintenta en el próximo ciclo.
      }
      if (!activo || g !== gen) return
      intervalo = huboCambio ? base : Math.min(intervalo * factor, max)
      programar(intervalo, g)
    }

    const onVisibility = () => {
      clearTimeout(timeoutId)
      gen += 1                 // invalida cualquier ciclo/timer anterior
      if (document.visibilityState === 'visible') {
        intervalo = base       // al volver, refresca ya y reanuda rápido
        ciclo(gen)
      }
    }

    if (document.visibilityState === 'visible') {
      gen += 1
      programar(base, gen)     // primer sondeo tras `base`
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      activo = false
      clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [base, max, factor])
}
