import { useNavigate } from 'react-router-dom'

const STEPS = [
  {
    n: '01',
    title: 'Comprador inicia el pago',
    desc: 'El comprador deposita el dinero en TrustPay. Los fondos quedan retenidos de forma segura, nunca llegan al vendedor todavía.',
  },
  {
    n: '02',
    title: 'Vendedor envía el producto',
    desc: 'El vendedor despacha el producto y registra la empresa de courier y número de guía dentro de la operación.',
  },
  {
    n: '03',
    title: 'Comprador confirma la recepción',
    desc: 'Una vez recibido el producto conforme, el comprador libera los fondos. El vendedor recibe su dinero al instante.',
  },
]

const FEATURES = [
  {
    icon: '🔒',
    title: 'Dinero protegido',
    desc: 'Tu saldo queda retenido hasta que ambas partes estén satisfechas. Sin riesgos de estafas.',
  },
  {
    icon: '📦',
    title: 'Seguimiento de envío',
    desc: 'El vendedor registra empresa de courier y número de guía. Ambos pueden ver el estado en tiempo real.',
  },
  {
    icon: '💬',
    title: 'Chat integrado',
    desc: 'Comunícate directamente con la contraparte dentro de cada operación, sin salir de la plataforma.',
  },
  {
    icon: '🪪',
    title: 'Verificación de identidad',
    desc: 'Validamos el DNI y selfie de cada usuario para garantizar que estás negociando con personas reales.',
  },
  {
    icon: '📋',
    title: 'Evidencia del producto',
    desc: 'El vendedor puede subir fotos, videos o links antes del envío para demostrar el estado del artículo.',
  },
  {
    icon: '⚡',
    title: 'Liberación instantánea',
    desc: 'Cuando el comprador confirma, los fondos se transfieren de inmediato. Sin demoras bancarias.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* NAV */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 48px',
        borderBottom: '0.5px solid var(--border)',
        position: 'sticky',
        top: 0,
        background: 'rgba(14,15,17,0.92)',
        backdropFilter: 'blur(10px)',
        zIndex: 10,
      }}>
        <div style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 700, color: '#E8F4FF', letterSpacing: '-0.02em' }}>
          Trust<span style={{ color: 'var(--green)' }}>Pay</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {token ? (
            <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }}>
              Ir al panel
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="btn-secondary" style={{ width: 'auto', padding: '8px 20px' }}>
                Iniciar sesión
              </button>
              <button onClick={() => navigate('/register')} className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }}>
                Registrarse gratis
              </button>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '100px 24px 80px', maxWidth: '680px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-block',
          background: 'var(--green-bg)',
          border: '0.5px solid rgba(46,204,138,0.25)',
          borderRadius: '20px',
          padding: '5px 16px',
          fontSize: '11px',
          color: 'var(--green)',
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '28px',
        }}>
          Plataforma de escrow digital para Perú
        </div>

        <h1 style={{
          fontFamily: 'Syne',
          fontSize: '52px',
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          marginBottom: '20px',
          color: 'var(--text)',
        }}>
          Compra y vende<br />
          <span style={{ color: 'var(--green)' }}>con total confianza</span>
        </h1>

        <p style={{
          fontSize: '16px',
          color: 'var(--text2)',
          lineHeight: 1.7,
          marginBottom: '36px',
          maxWidth: '520px',
          margin: '0 auto 36px',
        }}>
          TrustPay retiene el dinero de forma segura hasta que ambas partes estén satisfechas.
          Elimina el riesgo de estafas en compras y ventas entre personas.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(token ? '/dashboard' : '/register')}
            className="btn-primary"
            style={{ width: 'auto', padding: '13px 32px', fontSize: '14px', fontWeight: 600 }}
          >
            Empezar ahora — es gratis
          </button>
          <button
            onClick={() => document.getElementById('como-funciona').scrollIntoView({ behavior: 'smooth' })}
            className="btn-secondary"
            style={{ width: 'auto', padding: '13px 28px', fontSize: '14px' }}
          >
            Cómo funciona
          </button>
        </div>

        <p style={{ marginTop: '20px', fontSize: '11px', color: 'var(--muted)' }}>
          Sin comisiones ocultas · Registro en segundos · Tu dinero siempre protegido
        </p>
      </section>

      {/* STATS */}
      <section style={{ padding: '0 24px 80px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {[
            { value: '100%', label: 'Dinero protegido hasta confirmar' },
            { value: '24h', label: 'Auto-liberación si el comprador no responde' },
            { value: '0%', label: 'Riesgo de estafa para ambas partes' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontFamily: 'Syne', fontSize: '36px', fontWeight: 700, color: 'var(--green)', marginBottom: '6px' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" style={{ padding: '60px 24px 80px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <div className="label" style={{ marginBottom: '10px' }}>Proceso simple</div>
          <h2 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Cómo funciona TrustPay
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '24px', paddingBottom: i < STEPS.length - 1 ? '0' : '0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--green-bg)',
                  border: '0.5px solid rgba(46,204,138,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Syne',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: 'var(--green)',
                }}>
                  {step.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: '1px', height: '48px', background: 'var(--border)', margin: '8px 0' }} />
                )}
              </div>
              <div style={{ paddingBottom: i < STEPS.length - 1 ? '32px' : '0', paddingTop: '10px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'Syne', marginBottom: '6px' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7, maxWidth: '520px' }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '60px 24px 80px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="label" style={{ marginBottom: '10px' }}>Todo incluido</div>
          <h2 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Diseñado para operaciones seguras
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>{f.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Syne', marginBottom: '6px' }}>{f.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '60px 24px 100px' }}>
        <div style={{
          maxWidth: '560px',
          margin: '0 auto',
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: '16px',
          padding: '48px 40px',
        }}>
          <h2 style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            ¿Listo para operar con confianza?
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '28px', lineHeight: 1.7 }}>
            Únete a TrustPay y realiza tus compras y ventas sabiendo que tu dinero siempre está protegido.
          </p>
          <button
            onClick={() => navigate(token ? '/dashboard' : '/register')}
            className="btn-primary"
            style={{ width: 'auto', padding: '13px 36px', fontSize: '14px', fontWeight: 600 }}
          >
            {token ? 'Ir a mi panel' : 'Crear cuenta gratis'}
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '0.5px solid var(--border)',
        padding: '24px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontFamily: 'Syne', fontSize: '15px', fontWeight: 700, color: '#E8F4FF' }}>
          Trust<span style={{ color: 'var(--green)' }}>Pay</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
          © 2026 TrustPay — Escrow digital para Perú
        </div>
      </footer>
    </div>
  )
}
