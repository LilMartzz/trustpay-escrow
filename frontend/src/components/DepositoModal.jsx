import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { X, CreditCard, Lock, Check, ShieldCheck } from 'lucide-react'
import api from '../services/api'

// Detección de marca por prefijo, como respaldo si la búsqueda por BIN de Mercado Pago falla.
function detectarMarcaPorPrefijo(numero) {
  if (/^4/.test(numero)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(numero)) return 'master'
  if (/^3[47]/.test(numero)) return 'amex'
  return null
}

const NOMBRE_MARCA = { visa: 'Visa', master: 'Mastercard', amex: 'Amex' }

function formatearNumero(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 16)
  return digitos.replace(/(.{4})/g, '$1 ').trim()
}

function soloDigitos(valor, max) {
  return valor.replace(/\D/g, '').slice(0, max)
}

function lanzarConfetti() {
  const comun = { zIndex: 2500, colors: ['#22C55E', '#16A34A', '#FDE68A', '#FAFAFA', '#06B6D4'] }
  confetti({ ...comun, particleCount: 80, spread: 70, origin: { y: 0.6 } })
  setTimeout(() => confetti({ ...comun, particleCount: 45, angle: 60,  spread: 55, origin: { x: 0 } }), 180)
  setTimeout(() => confetti({ ...comun, particleCount: 45, angle: 120, spread: 55, origin: { x: 1 } }), 320)
}

export default function DepositoModal({ montoInicial, onClose, onSuccess }) {
  const [monto, setMonto] = useState(montoInicial || '')
  const [numero, setNumero] = useState('')
  const [nombreTitular, setNombreTitular] = useState('')
  const [mes, setMes] = useState('')
  const [anio, setAnio] = useState('')
  const [cvv, setCvv] = useState('')
  const [email, setEmail] = useState('')
  const [dni, setDni] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [girada, setGirada] = useState(false)
  const [comprobante, setComprobante] = useState(null)

  const numeroLimpio = numero.replace(/\s/g, '')
  const marca = detectarMarcaPorPrefijo(numeroLimpio)
  const montoNum = parseFloat(monto) || 0

  useEffect(() => {
    if (comprobante) lanzarConfetti()
  }, [comprobante])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY
    if (!publicKey || typeof window.MercadoPago === 'undefined') {
      setError('Mercado Pago no está configurado.')
      return
    }

    setLoading(true)
    try {
      const mp = new window.MercadoPago(publicKey, { locale: 'es-PE' })

      // Resuelve la marca de la tarjeta (Visa/Mastercard/etc.) a partir del BIN.
      // Si la búsqueda por BIN de Mercado Pago falla, cae al prefijo del número como respaldo.
      let paymentMethodId = null
      let paymentTypeId = 'credit_card'
      try {
        const metodos = await mp.getPaymentMethods({ bin: numeroLimpio.slice(0, 6) })
        paymentMethodId = metodos.results?.[0]?.id || null
        paymentTypeId = metodos.results?.[0]?.payment_type_id || 'credit_card'
      } catch {
        paymentMethodId = null
      }
      if (!paymentMethodId) {
        paymentMethodId = marca
      }
      if (!paymentMethodId) {
        setError('No se reconoció la tarjeta. Verifica el número.')
        setLoading(false)
        return
      }

      // Tokenización vía SDK de Mercado Pago — cifra la tarjeta en el navegador,
      // nunca pasa por nuestro backend.
      const tokenResp = await mp.createCardToken({
        cardNumber: numeroLimpio,
        cardholderName: nombreTitular,
        cardExpirationMonth: mes,
        cardExpirationYear: anio,
        securityCode: cvv,
        email,
        identificationType: 'DNI',
        identificationNumber: dni,
      })

      if (!tokenResp.id) {
        setError('La tarjeta fue rechazada')
        setLoading(false)
        return
      }

      const res = await api.post('/billetera/depositar', null, {
        params: { monto, mp_token: tokenResp.id, payment_method_id: paymentMethodId, identification_number: dni, payer_email: email, payment_type_id: paymentTypeId },
      })
      setComprobante({
        referencia: res.data.referencia,
        fecha: res.data.fecha ? new Date(res.data.fecha) : new Date(),
        saldo: res.data.saldo,
        monto: montoNum,
        marca: NOMBRE_MARCA[marca] || 'Tarjeta',
        ultimos4: numeroLimpio.slice(-4),
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo procesar el depósito')
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
        style={{ maxWidth: '420px', width: '100%', position: 'relative', animation: 'none' }}
        initial={{ opacity: 0, y: 26, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {comprobante ? (
            /* ── Comprobante (detalle de la recarga, requerido por normativa) ── */
            <motion.div
              key="comprobante"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: 'center' }}
            >
              <div className="check-circle"><Check size={28} strokeWidth={2.5} /></div>
              <h3 style={{ fontFamily: 'Syne', fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>
                ¡Recarga exitosa!
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text2)', marginBottom: '18px' }}>
                Tu saldo ya está disponible en tu billetera.
              </p>

              <div className="detalle-box" style={{ textAlign: 'left' }}>
                <p className="label" style={{ marginBottom: '8px' }}>Detalle de la recarga</p>
                <div className="detalle-row" style={{ alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0 }}>N° de operación</span>
                  <span style={{ fontSize: '10.5px', wordBreak: 'break-all', textAlign: 'right', maxWidth: '62%', lineHeight: 1.4 }}>{comprobante.referencia}</span>
                </div>
                <div className="detalle-row"><span>Fecha y hora</span><span>{comprobante.fecha.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                <div className="detalle-row"><span>Medio de pago</span><span>{comprobante.marca} •••• {comprobante.ultimos4}</span></div>
                <div className="detalle-row"><span>Monto recargado</span><span>S/ {comprobante.monto.toFixed(2)}</span></div>
                <div className="detalle-row"><span>Comisión</span><span>S/ 0.00</span></div>
                <div className="detalle-row total"><span>Nuevo saldo</span><span>S/ {Number(comprobante.saldo).toFixed(2)}</span></div>
              </div>

              <button onClick={() => onSuccess()} className="btn-primary">
                <Check size={13} /> Listo
              </button>

              <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <ShieldCheck size={12} /> Procesado de forma segura por Mercado Pago
              </p>
            </motion.div>
          ) : (
            /* ── Formulario ── */
            <motion.div
              key="form"
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <button
                onClick={onClose}
                className="btn-ghost"
                style={{ position: 'absolute', top: '14px', right: '14px', padding: '6px', zIndex: 2 }}
              >
                <X size={16} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <CreditCard size={16} color="var(--green)" />
                <h3 style={{ fontFamily: 'Syne', fontSize: '16px', fontWeight: 700 }}>Recargar saldo</h3>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' }}>
                Tu tarjeta se cifra en tu navegador y nunca pasa por nuestros servidores.
              </p>

              {/* Tarjeta en vivo: refleja lo que se escribe y gira al enfocar el CVV */}
              <div className="cc-scene">
                <div className={`cc-card ${girada ? 'flipped' : ''}`}>
                  <div className="cc-face">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="cc-chip" />
                      {marca && <span className="cc-brand" key={marca}>{NOMBRE_MARCA[marca]}</span>}
                    </div>
                    <div className="cc-number">{numero || '•••• •••• •••• ••••'}</div>
                    <div className="cc-meta">
                      <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                        <span className="cc-label">Titular</span>
                        {nombreTitular || 'NOMBRE DEL TITULAR'}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="cc-label">Vence</span>
                        {(mes || 'MM')}/{(anio || 'AAAA').slice(-2)}
                      </div>
                    </div>
                  </div>
                  <div className="cc-face cc-back">
                    <div className="cc-stripe" />
                    <span className="cc-label" style={{ fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.55, display: 'block', marginBottom: '4px' }}>CVV</span>
                    <div className="cc-cvv-box">{cvv || '•••'}</div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group stagger" style={{ animationDelay: '0.03s' }}>
                  <label className="label">Monto a recargar (S/)</label>
                  <input
                    type="number" min="1" step="0.01" required
                    value={monto} onChange={e => setMonto(e.target.value)}
                  />
                </div>

                <div className="form-group stagger" style={{ animationDelay: '0.06s' }}>
                  <label className="label">Número de tarjeta</label>
                  <input
                    type="text" inputMode="numeric" placeholder="4111 1111 1111 1111" required
                    value={numero} onChange={e => setNumero(formatearNumero(e.target.value))}
                    maxLength={19}
                  />
                </div>

                <div className="form-group stagger" style={{ animationDelay: '0.09s' }}>
                  <label className="label">Nombre del titular</label>
                  <input
                    type="text" placeholder="Como aparece en la tarjeta" required
                    value={nombreTitular} onChange={e => setNombreTitular(e.target.value)}
                  />
                </div>

                <div className="stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', animationDelay: '0.12s' }}>
                  <div className="form-group">
                    <label className="label">Mes</label>
                    <input
                      type="text" inputMode="numeric" placeholder="MM" required
                      value={mes} onChange={e => setMes(soloDigitos(e.target.value, 2))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Año</label>
                    <input
                      type="text" inputMode="numeric" placeholder="AAAA" required
                      value={anio} onChange={e => setAnio(soloDigitos(e.target.value, 4))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">CVV</label>
                    <input
                      type="text" inputMode="numeric" placeholder="123" required
                      value={cvv} onChange={e => setCvv(soloDigitos(e.target.value, 4))}
                      onFocus={() => setGirada(true)} onBlur={() => setGirada(false)}
                    />
                  </div>
                </div>

                <div className="form-group stagger" style={{ animationDelay: '0.15s' }}>
                  <label className="label">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                <div className="form-group stagger" style={{ animationDelay: '0.18s' }}>
                  <label className="label">DNI del titular</label>
                  <input
                    type="text" inputMode="numeric" placeholder="12345678" required
                    value={dni} onChange={e => setDni(soloDigitos(e.target.value, 15))}
                  />
                </div>

                {/* Detalle de la recarga: desglose previo al cobro (transparencia / normativa) */}
                {montoNum > 0 && (
                  <div className="detalle-box">
                    <p className="label" style={{ marginBottom: '8px' }}>Detalle de la recarga</p>
                    <div className="detalle-row"><span>Monto a recargar</span><span>S/ {montoNum.toFixed(2)}</span></div>
                    <div className="detalle-row"><span>Comisión</span><span>S/ 0.00</span></div>
                    <div className="detalle-row"><span>Moneda</span><span>Soles (PEN)</span></div>
                    <div className="detalle-row total"><span>Total a pagar</span><span>S/ {montoNum.toFixed(2)}</span></div>
                  </div>
                )}

                {error && <p key={error} className="alert alert-error shake">{error}</p>}

                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? <span className="spinner" /> : <Lock size={13} />}
                  {loading ? 'Procesando pago...' : `Pagar S/ ${montoNum.toFixed(2)}`}
                </button>

                <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  <ShieldCheck size={12} /> Procesado de forma segura por Mercado Pago
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
