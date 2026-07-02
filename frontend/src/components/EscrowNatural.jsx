import { useState, useRef, useEffect, useCallback } from 'react'
import { BadgeCheck, Search, Loader2, Star } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import api from '../services/api'

/* ── Glass avatar — monochrome, no color, encaja en el cristal ── */
function GlassAvatar({ iniciales, isDark, size = 38 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.09)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Syne', fontSize: size * 0.34, fontWeight: 700,
      color: isDark ? 'rgba(235,235,245,0.88)' : 'rgba(18,18,24,0.78)',
    }}>
      {iniciales}
    </div>
  )
}

/* ── Liquid Glass dropdown ── */
function Dropdown({ sugerencias, onSelect, visible, isDark }) {
  if (!visible || sugerencias.length === 0) return null

  const textPrimary   = isDark ? 'rgba(235,235,245,0.92)' : 'rgba(18,18,24,0.88)'
  const textSecondary = isDark ? 'rgba(235,235,245,0.42)' : 'rgba(18,18,24,0.42)'
  const divider       = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const hoverBg       = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)'

  return (
    <div style={{
      position: 'absolute',
      top: 'calc(100% + 8px)',
      left: 0, right: 0,
      borderRadius: '18px',
      overflow: 'hidden',
      zIndex: 200,
      animation: 'fadeUp 0.22s cubic-bezier(0.34,1.46,0.64,1) both',

      /* ── Liquid Glass core ── */
      background: isDark
        ? 'rgba(255,255,255,0.035)'
        : 'rgba(255,255,255,0.6)',
      backdropFilter:         'blur(52px) saturate(200%) brightness(118%)',
      WebkitBackdropFilter:   'blur(52px) saturate(200%) brightness(118%)',

      /* border + inner glow */
      border: isDark
        ? '1px solid rgba(255,255,255,0.07)'
        : '1px solid rgba(255,255,255,0.72)',
      boxShadow: isDark
        ? [
            '0 24px 72px rgba(0,0,0,0.75)',
            'inset 0 1px 0 rgba(255,255,255,0.13)',   /* top specular edge */
            'inset 0 -1px 0 rgba(0,0,0,0.25)',
          ].join(', ')
        : [
            '0 24px 72px rgba(0,0,0,0.10)',
            'inset 0 1px 0 rgba(255,255,255,0.98)',
            'inset 0 -1px 0 rgba(0,0,0,0.04)',
          ].join(', '),

      /* fade out last items */
      WebkitMaskImage: 'linear-gradient(to bottom, black 58%, transparent 100%)',
      maskImage:       'linear-gradient(to bottom, black 58%, transparent 100%)',
    }}>

      {/* Specular highlight strip — the key of liquid glass */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: isDark
          ? 'linear-gradient(90deg, transparent 4%, rgba(255,255,255,0.38) 28%, rgba(255,255,255,0.58) 50%, rgba(255,255,255,0.38) 72%, transparent 96%)'
          : 'linear-gradient(90deg, transparent 4%, rgba(255,255,255,0.96) 28%, white 50%, rgba(255,255,255,0.96) 72%, transparent 96%)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {sugerencias.map((u, i) => (
        <div
          key={u.email}
          onClick={() => onSelect(u)}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '13px 16px',
            cursor: 'pointer',
            opacity: Math.max(0.25, 1 - i * 0.16),
            borderBottom: i < sugerencias.length - 1 ? `1px solid ${divider}` : 'none',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = hoverBg}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <GlassAvatar iniciales={u.iniciales} isDark={isDark} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '14px', fontWeight: 600, fontFamily: 'Syne',
              color: textPrimary,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              @{u.nombre}
            </div>
            <div style={{ fontSize: '11px', color: textSecondary, marginTop: '1px' }}>
              {u.email}
            </div>
          </div>

          {u.calificacion_cantidad > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: textSecondary, flexShrink: 0 }}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              {u.calificacion_promedio}
            </div>
          )}

          {u.verificado === 'verificado' && (
            <BadgeCheck size={15} color={textSecondary} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Avatar colorido para el formulario (fuera del glass) ── */
function ColorAvatar({ iniciales, size = 18 }) {
  const COLORS = ['#22C55E','#06B6D4','#818CF8','#F59E0B','#A78BFA','#F87171']
  const c = COLORS[iniciales.charCodeAt(0) % COLORS.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${c}28`, border: `1.5px solid ${c}60`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, color: c, fontFamily: 'Syne',
    }}>
      {iniciales.charAt(0)}
    </div>
  )
}

/* ══════════════════════════════════════════════
   Main component
══════════════════════════════════════════════ */
export default function EscrowNatural({ onSubmit, saldoDisponible }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [monto,       setMonto]       = useState('')
  const [query,       setQuery]       = useState('')
  const [usuario,     setUsuario]     = useState(null)
  const [descripcion, setDescripcion] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [showDrop,    setShowDrop]    = useState(false)
  const [searching,   setSearching]   = useState(false)
  const [error,       setError]       = useState('')

  const debounceRef = useRef(null)
  const wrapRef     = useRef(null)

  /* Cierra al hacer click fuera */
  useEffect(() => {
    const fn = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const buscar = useCallback((q) => {
    clearTimeout(debounceRef.current)
    if (!q.trim()) { setSugerencias([]); setShowDrop(false); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/perfil/buscar?q=${encodeURIComponent(q)}`)
        setSugerencias(res.data)
        setShowDrop(res.data.length > 0)
      } catch {}
      setSearching(false)
    }, 220)
  }, [])

  const handleQueryChange = (e) => {
    setQuery(e.target.value)
    setUsuario(null)
    buscar(e.target.value)
  }

  const seleccionar = (u) => {
    setUsuario(u)
    setQuery(u.nombre)
    setShowDrop(false)
    setSugerencias([])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
      setError('Ingresa un monto válido'); return
    }
    if (!usuario) {
      setError('Selecciona un destinatario de la lista'); return
    }
    if (saldoDisponible !== undefined && Number(monto) > saldoDisponible) {
      setError(`Saldo insuficiente — disponible: S/ ${Number(saldoDisponible).toFixed(2)}`); return
    }
    onSubmit({ monto: Number(monto), email_destino: usuario.email, descripcion })
  }

  const listo = Boolean(monto && Number(monto) > 0 && usuario)

  /* ── Color del preview de monto ── */
  const montoColor  = monto && Number(monto) > 0 ? 'var(--green)' : 'var(--border2)'
  const usuarioColor = usuario ? 'var(--green)' : 'var(--border2)'

  return (
    <div ref={wrapRef}>

      {/* ── Preview grande ── */}
      <div style={{ marginBottom: '22px', userSelect: 'none' }}>
        <p style={{
          fontSize: '11px', fontWeight: 500, color: 'var(--text3)',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px',
        }}>
          Quiero...
        </p>
        <p style={{
          fontFamily: 'Syne',
          fontSize: 'clamp(26px, 4.5vw, 38px)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          color: 'var(--text)',
          lineHeight: 1.18,
        }}>
          Enviar{' '}
          <span style={{
            color: montoColor,
            transition: 'color 0.2s',
          }}>
            {monto && Number(monto) > 0 ? `S/ ${monto}` : 'S/ —'}
          </span>
        </p>
        <p style={{
          fontFamily: 'Syne',
          fontSize: 'clamp(26px, 4.5vw, 38px)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          color: 'var(--text)',
          lineHeight: 1.18,
        }}>
          a{' '}
          <span style={{
            color: usuarioColor,
            transition: 'color 0.2s',
            borderBottom: usuario ? '3px solid var(--green)' : '3px solid transparent',
            paddingBottom: '1px',
          }}>
            {usuario ? `@${usuario.nombre}` : '@—'}
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Monto */}
        <div className="form-group">
          <label className="label">Monto (S/)</label>
          <input
            type="number"
            placeholder="0.00"
            value={monto}
            onChange={e => setMonto(e.target.value)}
            min="1" step="0.01" required
            style={{ fontFamily: 'Syne', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}
          />
        </div>

        {/* Buscar destinatario */}
        <div className="form-group" style={{ position: 'relative' }}>
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {searching
              ? <><Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> Buscando...</>
              : usuario
                ? <span style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <BadgeCheck size={12} /> {usuario.nombre} · {usuario.email}
                  </span>
                : 'Destinatario'
            }
          </label>
          <div className="input-icon-wrap">
            <span className="input-icon">
              {usuario
                ? <ColorAvatar iniciales={usuario.iniciales} size={16} />
                : <Search size={15} />
              }
            </span>
            <input
              type="text"
              placeholder="Busca por nombre..."
              value={query}
              onChange={handleQueryChange}
              onFocus={() => sugerencias.length > 0 && setShowDrop(true)}
              autoComplete="off"
              style={{
                borderColor: usuario ? 'var(--green)' : undefined,
                boxShadow: usuario ? 'var(--glow)' : undefined,
              }}
            />
          </div>

          {/* ── Liquid Glass dropdown ── */}
          <Dropdown
            sugerencias={sugerencias}
            onSelect={seleccionar}
            visible={showDrop}
            isDark={isDark}
          />
        </div>

        {/* Descripción */}
        <div className="form-group">
          <label className="label">Descripción del producto</label>
          <textarea
            placeholder="Ej: iPhone 14 Pro 256GB negro..."
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            style={{ height: '66px', resize: 'none' }}
          />
        </div>

        {error && <p className="alert alert-error">{error}</p>}

        <div className="alert alert-warning" style={{ fontSize: '11.5px', marginBottom: '12px' }}>
          El dinero queda retenido hasta que confirmes recibir el producto. Auto-liberación en 24h.
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={!listo}
          style={{ fontSize: '14px', fontWeight: 600, height: '42px' }}
        >
          {listo
            ? `Pagar S/ ${Number(monto).toFixed(2)} a @${usuario.nombre}`
            : 'Pagar con escrow'}
        </button>
      </form>
    </div>
  )
}
