import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowUpFromLine, Landmark, Check, ShieldAlert, ShieldCheck } from 'lucide-react'
import api from '../services/api'

function soloDigitos(valor, max) {
  return valor.replace(/\D/g, '').slice(0, max)
}

export default function RetiroModal({ saldoDisponible = 0, verificado, onClose, onSuccess }) {
  const montoRef = useRef(null)
  const navigate = useNavigate()

  const [monto, setMonto] = useState('')
  const [banco, setBanco] = useState('')
  const [cuenta, setCuenta] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [comprobante, setComprobante] = useState(null)
  // Bloqueo proactivo de KYC: si ya sabemos que no está verificado, evitamos
  // el viaje al backend; de todos modos el 403 se maneja como respaldo.
  const [sinKyc, setSinKyc] = useState(verificado != null && verificado !== 'verificado')

  const disponible = Number(saldoDisponible) || 0
  const montoNum = parseFloat(monto) || 0
  const excedeSaldo = montoNum > disponible
  const cuentaValida = cuenta.length >= 10
  const formValido = montoNum > 0 && !excedeSaldo && banco.trim().length >= 3 && cuentaValida

  // Accesibilidad del diálogo: cerrar con Escape y enfocar el primer campo.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', onKey)
    montoRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [loading, onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!formValido) return
    setLoading(true)
    try {
      const res = await api.post('/billetera/retirar', {
        monto: montoNum,
        banco: banco.trim(),
        cuenta_destino: cuenta,
      })
      setComprobante({
        referencia: res.data.referencia,
        fecha: res.data.fecha ? new Date(res.data.fecha) : new Date(),
        saldo: res.data.saldo,
        monto: montoNum,
        banco: banco.trim(),
        ultimos4: cuenta.slice(-4),
      })
    } catch (err) {
      if (err.response?.status === 403) {
        setSinKyc(true)
      } else {
        setError(err.response?.data?.detail || 'No se pudo procesar el retiro')
      }
    }
    setLoading(false)
  }

  return (
    <motion.div
      className="modal-overlay"
      style={{ animation: 'none' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="card modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Retirar saldo"
        style={{ maxWidth: '420px', width: '100%', position: 'relative', animation: 'none' }}
        initial={{ opacity: 0, y: 26, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          onClick={onClose}
          className="btn-ghost"
          aria-label="Cerrar"
          style={{ position: 'absolute', top: '14px', right: '14px', padding: '6px', zIndex: 2 }}
        >
          <X size={16} />
        </button>

        <AnimatePresence mode="wait" initial={false}>
          {sinKyc ? (
            /* ── Falta verificación de identidad (KYC) ── */
            <motion.div
              key="kyc"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: 'center' }}
            >
              <div style={{
                width: '52px', height: '52px', borderRadius: '15px', background: 'var(--amber-bg)',
                border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '4px auto 16px',
              }}>
                <ShieldAlert size={24} color="var(--amber)" />
              </div>
              <h3 style={{ fontFamily: 'Syne', fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>
                Verifica tu identidad
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text2)', marginBottom: '20px', lineHeight: 1.6 }}>
                Para retirar dinero de la plataforma necesitas verificar tu identidad
                con tu DNI y una selfie. Es un requisito de seguridad antifraude.
              </p>
              <button onClick={() => navigate('/perfil')} className="btn-primary" style={{ marginBottom: '8px' }}>
                <ShieldCheck size={13} /> Verificar mi identidad
              </button>
              <button onClick={onClose} className="btn-secondary">Ahora no</button>
            </motion.div>
          ) : comprobante ? (
            /* ── Retiro en camino ── */
            <motion.div
              key="ok"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: 'center' }}
            >
              <div className="check-circle"><Check size={28} strokeWidth={2.5} /></div>
              <h3 style={{ fontFamily: 'Syne', fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>
                Retiro en camino
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text2)', marginBottom: '18px' }}>
                Tu transferencia bancaria está en proceso.
              </p>

              <div className="detalle-box" style={{ textAlign: 'left' }}>
                <p className="label" style={{ marginBottom: '8px' }}>Detalle del retiro</p>
                <div className="detalle-row" style={{ alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0 }}>N° de operación</span>
                  <span style={{ fontSize: '10.5px', wordBreak: 'break-all', textAlign: 'right', maxWidth: '62%', lineHeight: 1.4 }}>{comprobante.referencia}</span>
                </div>
                <div className="detalle-row"><span>Fecha y hora</span><span>{comprobante.fecha.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                <div className="detalle-row"><span>Destino</span><span>{comprobante.banco} ••••{comprobante.ultimos4}</span></div>
                <div className="detalle-row"><span>Monto retirado</span><span>S/ {comprobante.monto.toFixed(2)}</span></div>
                <div className="detalle-row total"><span>Saldo restante</span><span>S/ {Number(comprobante.saldo).toFixed(2)}</span></div>
              </div>

              <button onClick={() => onSuccess()} className="btn-primary">
                <Check size={13} /> Listo
              </button>
            </motion.div>
          ) : (
            /* ── Formulario ── */
            <motion.div
              key="form"
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <ArrowUpFromLine size={16} color="var(--green)" />
                <h3 style={{ fontFamily: 'Syne', fontSize: '16px', fontWeight: 700 }}>Retirar saldo</h3>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' }}>
                Transfiere tu saldo disponible a una cuenta bancaria.
              </p>

              {/* Saldo disponible */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 14px', background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', marginBottom: '16px',
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Disponible para retirar</span>
                <span style={{ fontFamily: 'Syne', fontSize: '16px', fontWeight: 700, color: 'var(--green)' }}>
                  S/ {disponible.toFixed(2)}
                </span>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group stagger" style={{ animationDelay: '0.03s' }}>
                  <label className="label">Monto a retirar (S/)</label>
                  <input
                    ref={montoRef}
                    type="number" min="1" step="0.01" required
                    value={monto} onChange={e => setMonto(e.target.value)}
                  />
                  {excedeSaldo && (
                    <p style={{ fontSize: '11px', color: 'var(--red)', marginTop: '5px' }}>
                      Supera tu saldo disponible (S/ {disponible.toFixed(2)})
                    </p>
                  )}
                </div>

                <div className="form-group stagger" style={{ animationDelay: '0.06s' }}>
                  <label className="label">Banco</label>
                  <input
                    type="text" placeholder="BCP, Interbank, BBVA…" required
                    value={banco} onChange={e => setBanco(e.target.value)}
                    maxLength={40}
                  />
                </div>

                <div className="form-group stagger" style={{ animationDelay: '0.09s' }}>
                  <label className="label">
                    <Landmark size={10} style={{ display: 'inline', marginRight: '4px' }} />
                    Número de cuenta o CCI
                  </label>
                  <input
                    type="text" inputMode="numeric" placeholder="Solo dígitos (CCI: 20)" required
                    value={cuenta} onChange={e => setCuenta(soloDigitos(e.target.value, 20))}
                  />
                  {cuenta.length > 0 && !cuentaValida && (
                    <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '5px' }}>
                      Debe tener al menos 10 dígitos
                    </p>
                  )}
                </div>

                {montoNum > 0 && !excedeSaldo && (
                  <div className="detalle-box">
                    <p className="label" style={{ marginBottom: '8px' }}>Detalle del retiro</p>
                    <div className="detalle-row"><span>Monto a retirar</span><span>S/ {montoNum.toFixed(2)}</span></div>
                    <div className="detalle-row"><span>Comisión</span><span>S/ 0.00</span></div>
                    <div className="detalle-row total"><span>Saldo restante</span><span>S/ {(disponible - montoNum).toFixed(2)}</span></div>
                  </div>
                )}

                {error && <p key={error} className="alert alert-error shake">{error}</p>}

                <button type="submit" disabled={loading || !formValido} className="btn-primary">
                  {loading ? <span className="spinner" /> : <ArrowUpFromLine size={13} />}
                  {loading ? 'Procesando…' : `Retirar S/ ${montoNum.toFixed(2)}`}
                </button>

                <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  <ShieldCheck size={12} /> Requiere identidad verificada
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
