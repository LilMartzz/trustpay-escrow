import { useState } from 'react'
import { X, CreditCard, Lock } from 'lucide-react'
import api from '../services/api'

// Detección de marca por prefijo, como respaldo si la búsqueda por BIN de Mercado Pago falla.
function detectarMarcaPorPrefijo(numero) {
  if (/^4/.test(numero)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(numero)) return 'master'
  if (/^3[47]/.test(numero)) return 'amex'
  return null
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
      const numeroLimpio = numero.replace(/\s/g, '')

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
        paymentMethodId = detectarMarcaPorPrefijo(numeroLimpio)
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
      onSuccess(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo procesar el depósito')
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px',
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', position: 'relative' }}>
        <button
          onClick={onClose}
          className="btn-ghost"
          style={{ position: 'absolute', top: '14px', right: '14px', padding: '6px' }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <CreditCard size={16} color="var(--green)" />
          <h3 style={{ fontFamily: 'Syne', fontSize: '16px', fontWeight: 700 }}>Depositar con tarjeta</h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '18px' }}>
          Procesado de forma segura por Mercado Pago. Tu tarjeta nunca pasa por nuestros servidores.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Monto (S/)</label>
            <input
              type="number" min="1" step="0.01" required
              value={monto} onChange={e => setMonto(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">Número de tarjeta</label>
            <input
              type="text" placeholder="4111 1111 1111 1111" required
              value={numero} onChange={e => setNumero(e.target.value)}
              maxLength={19}
            />
          </div>

          <div className="form-group">
            <label className="label">Nombre del titular</label>
            <input
              type="text" placeholder="Como aparece en la tarjeta" required
              value={nombreTitular} onChange={e => setNombreTitular(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div className="form-group">
              <label className="label">Mes</label>
              <input type="text" placeholder="MM" required value={mes} onChange={e => setMes(e.target.value)} maxLength={2} />
            </div>
            <div className="form-group">
              <label className="label">Año</label>
              <input type="text" placeholder="AAAA" required value={anio} onChange={e => setAnio(e.target.value)} maxLength={4} />
            </div>
            <div className="form-group">
              <label className="label">CVV</label>
              <input type="text" placeholder="123" required value={cvv} onChange={e => setCvv(e.target.value)} maxLength={4} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="label">DNI del titular</label>
            <input type="text" placeholder="12345678" required value={dni} onChange={e => setDni(e.target.value)} maxLength={15} />
          </div>

          {error && <p className="alert alert-error">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '4px' }}>
            <Lock size={13} />
            {loading ? 'Procesando...' : `Depositar S/ ${monto || '0.00'}`}
          </button>
        </form>
      </div>
    </div>
  )
}
