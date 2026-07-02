import { useState } from 'react'
import { X, CreditCard, Lock } from 'lucide-react'
import api from '../services/api'

export default function DepositoModal({ montoInicial, onClose, onSuccess }) {
  const [monto, setMonto] = useState(montoInicial || '')
  const [numero, setNumero] = useState('')
  const [mes, setMes] = useState('')
  const [anio, setAnio] = useState('')
  const [cvv, setCvv] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const publicKey = import.meta.env.VITE_CULQI_PUBLIC_KEY
    if (!publicKey) {
      setError('Culqi no está configurado.')
      return
    }

    setLoading(true)
    try {
      // Tokenización directa contra la API de Culqi con la llave pública —
      // la tarjeta viaja del navegador a Culqi, nunca pasa por nuestro backend.
      const tokenResp = await fetch('https://secure.culqi.com/v2/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicKey}`,
        },
        body: JSON.stringify({
          card_number: numero.replace(/\s/g, ''),
          cvv,
          expiration_month: mes,
          expiration_year: anio,
          email,
        }),
      })
      const tokenData = await tokenResp.json()

      if (tokenData.object !== 'token') {
        setError(tokenData.user_message || tokenData.merchant_message || 'La tarjeta fue rechazada')
        setLoading(false)
        return
      }

      const res = await api.post('/billetera/depositar', null, {
        params: { monto, culqi_token: tokenData.id },
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
          Procesado de forma segura por Culqi. Tu tarjeta nunca pasa por nuestros servidores.
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
