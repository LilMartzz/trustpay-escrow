/**
 * EscrowNatural — input de lenguaje natural estilo Cash App
 *
 * Uso:
 *   <EscrowNatural onSubmit={({ monto, email_destino, descripcion }) => { ... }} />
 *
 * El usuario escribe algo como:
 *   "Enviar S/ 150 a @juan descripcion del producto"
 * o simplemente llena monto + selecciona usuario con @autocomplete.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { BadgeCheck, Search } from 'lucide-react'
import api from '../services/api'

/* ── Avatar circle ── */
function Avatar({ iniciales, size = 32 }) {
  const COLORS = ['#22C55E', '#06B6D4', '#818CF8', '#F59E0B', '#F87171', '#A78BFA']
  const color = COLORS[iniciales.charCodeAt(0) % COLORS.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}22`, border: `1.5px solid ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color, flexShrink: 0,
      fontFamily: 'Syne',
    }}>
      {iniciales}
    </div>
  )
}

/* ── Gradient autocomplete dropdown ── */
function Dropdown({ sugerencias, onSelect, visible }) {
  if (!visible || sugerencias.length === 0) return null
  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: '8px',
      width: 'min(320px, 90vw)',
      borderRadius: '20px',
      overflow: 'hidden',
      zIndex: 100,
      /* Gradient glass */
      background: 'linear-gradient(155deg, rgba(99,218,218,0.82) 0%, rgba(240,168,150,0.78) 45%, rgba(184,169,232,0.85) 100%)',
      backdropFilter: 'blur(28px)',
      WebkitBackdropFilter: 'blur(28px)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.15)',
      /* Fade out bottom */
      WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
      maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
    }}>
      {sugerencias.map((u, i) => (
        <div
          key={u.email}
          onClick={() => onSelect(u)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            cursor: 'pointer',
            opacity: 1 - i * 0.12,
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Avatar iniciales={u.iniciales} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '15px', fontWeight: 600,
              color: 'rgba(30,30,40,0.92)',
              fontFamily: 'Syne',
            }}>
              @{u.nombre}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(30,30,40,0.6)', marginTop: '1px' }}>
              {u.email}
            </div>
          </div>
          {u.verificado === 'verificado' && (
            <BadgeCheck size={16} color="rgba(30,30,40,0.7)" />
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Main component ── */
export default function EscrowNatural({ onSubmit, saldoDisponible }) {
  const [monto,      setMonto]      = useState('')
  const [query,      setQuery]      = useState('')          // texto tras @
  const [usuario,    setUsuario]    = useState(null)        // usuario seleccionado
  const [descripcion, setDescripcion] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [showDrop,   setShowDrop]   = useState(false)
  const [searching,  setSearching]  = useState(false)
  const [error,      setError]      = useState('')

  const debounceRef = useRef(null)
  const wrapRef     = useRef(null)

  /* Cerrar dropdown al click fuera */
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* Buscar usuarios con debounce */
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
    const val = e.target.value
    setQuery(val)
    setUsuario(null)
    buscar(val)
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
      setError('Selecciona un destinatario escribiendo su nombre'); return
    }
    if (saldoDisponible !== undefined && Number(monto) > saldoDisponible) {
      setError(`Saldo insuficiente (disponible: S/ ${saldoDisponible.toFixed(2)})`); return
    }
    onSubmit({ monto: Number(monto), email_destino: usuario.email, descripcion })
  }

  const listo = monto && usuario

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>

      {/* ── Big visual display ── */}
      <div style={{ marginBottom: '20px', lineHeight: 1.15 }}>
        <div style={{
          fontSize: '12px', fontWeight: 500, color: 'var(--text3)',
          letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px',
        }}>
          Quiero...
        </div>
        <div style={{ fontFamily: 'Syne', fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1.2 }}>
          Enviar{' '}
          <span style={{ color: monto ? 'var(--green)' : 'var(--border2)' }}>
            {monto ? `S/ ${monto}` : 'S/ ?'}
          </span>
        </div>
        <div style={{ fontFamily: 'Syne', fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1.2 }}>
          a{' '}
          {usuario ? (
            <span style={{
              color: 'var(--green)',
              borderBottom: '2px solid var(--green)',
              paddingBottom: '2px',
            }}>
              @{usuario.nombre}
            </span>
          ) : (
            <span style={{ color: 'var(--border2)' }}>@?</span>
          )}
        </div>
      </div>

      {/* ── Form ── */}
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
            style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'Syne' }}
          />
        </div>

        {/* Buscar usuario */}
        <div className="form-group" style={{ position: 'relative' }}>
          <label className="label">
            {searching
              ? 'Buscando...'
              : usuario
                ? <span style={{ color: 'var(--green)' }}>✓ {usuario.nombre} ({usuario.email})</span>
                : 'Destinatario (nombre o email)'
            }
          </label>
          <div className="input-icon-wrap">
            <span className="input-icon">
              {usuario
                ? <Avatar iniciales={usuario.iniciales} size={16} />
                : <Search size={15} />
              }
            </span>
            <input
              type="text"
              placeholder="Escribe un nombre..."
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

          {/* Gradient dropdown */}
          <Dropdown
            sugerencias={sugerencias}
            onSelect={seleccionar}
            visible={showDrop}
          />
        </div>

        {/* Descripción */}
        <div className="form-group">
          <label className="label">Descripción del producto</label>
          <textarea
            placeholder="Ej: iPhone 14 Pro 256GB negro..."
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            style={{ height: '68px', resize: 'none' }}
          />
        </div>

        {error && <p className="alert alert-error">{error}</p>}

        {/* Warning */}
        <div className="alert alert-warning" style={{ fontSize: '11.5px', marginBottom: '12px' }}>
          El dinero queda retenido hasta que confirmes recibir el producto. Auto-liberación en 24h.
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={!listo}
          style={{ fontSize: '14px', fontWeight: 600, height: '42px' }}
        >
          Pagar con escrow{listo ? ` · S/ ${Number(monto).toFixed(2)}` : ''}
        </button>
      </form>
    </div>
  )
}
