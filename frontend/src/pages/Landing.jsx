import { useNavigate } from 'react-router-dom'
import { Shield, Lock, Package, MessageSquare, CreditCard, Zap, BadgeCheck, Sun, Moon, ArrowRight, ChevronRight } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const FEATURES = [
  {
    icon: Lock,
    title: 'Dinero protegido',
    desc: 'Tu saldo queda retenido en escrow hasta que ambas partes estén satisfechas. Cero riesgo de estafas.',
  },
  {
    icon: Package,
    title: 'Seguimiento de envío',
    desc: 'El vendedor registra empresa de courier y número de guía. Ambos ven el estado en tiempo real.',
  },
  {
    icon: MessageSquare,
    title: 'Chat integrado',
    desc: 'Comunícate directamente con la contraparte dentro de cada operación, sin salir de la plataforma.',
  },
  {
    icon: BadgeCheck,
    title: 'Verificación de identidad',
    desc: 'Validamos el DNI de cada usuario con RENIEC para garantizar que negocies con personas reales.',
  },
  {
    icon: CreditCard,
    title: 'Evidencia del producto',
    desc: 'El vendedor sube fotos, videos o links para demostrar el estado del artículo antes del envío.',
  },
  {
    icon: Zap,
    title: 'Liberación instantánea',
    desc: 'Cuando el comprador confirma la recepción, los fondos se transfieren de inmediato al vendedor.',
  },
]

const STEPS = [
  { n: '01', title: 'Comprador inicia el pago', desc: 'El comprador deposita el monto en TrustPay. Los fondos quedan retenidos de forma segura y nunca llegan al vendedor todavía.' },
  { n: '02', title: 'Vendedor envía el producto', desc: 'El vendedor despacha el artículo y registra la empresa de courier y número de guía dentro de la operación.' },
  { n: '03', title: 'Comprador confirma la recepción', desc: 'Una vez recibido el producto conforme, el comprador libera los fondos y el vendedor recibe su dinero al instante.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const { theme, toggle } = useTheme()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── NAV ── */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 48px',
        height: '60px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        background: theme === 'dark' ? 'rgba(9,9,11,0.88)' : 'rgba(244,244,245,0.9)',
        backdropFilter: 'blur(12px)',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={14} color="var(--green)" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'Syne', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Trust<span style={{ color: 'var(--green)' }}>Pay</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={toggle} className="btn-ghost" style={{ padding: '7px', color: 'var(--text3)' }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {token ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
              style={{ width: 'auto', padding: '8px 18px' }}
            >
              Ir al panel
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="btn-secondary"
                style={{ width: 'auto', padding: '7px 16px', fontSize: '13px' }}
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => navigate('/register')}
                className="btn-primary"
                style={{ width: 'auto', padding: '7px 16px', fontSize: '13px' }}
              >
                Registrarse gratis
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ textAlign: 'center', padding: '96px 24px 80px', maxWidth: '720px', margin: '0 auto', position: 'relative' }}>
        {/* Background glow */}
        <div className="orb" style={{
          width: '600px', height: '400px',
          background: 'var(--green)', opacity: 0.04,
          top: '0', left: '50%', transform: 'translateX(-50%)',
        }} />

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--green-bg)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '99px',
          padding: '5px 14px',
          fontSize: '11.5px',
          color: 'var(--green)',
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: '28px',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)' }} />
          Plataforma de escrow digital para Perú
        </div>

        <h1 style={{
          fontFamily: 'Syne',
          fontSize: 'clamp(36px, 6vw, 58px)',
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: '-0.04em',
          marginBottom: '22px',
          position: 'relative',
        }}>
          Compra y vende<br />
          <span className="gradient-text">con total confianza</span>
        </h1>

        <p style={{
          fontSize: '16px',
          color: 'var(--text2)',
          lineHeight: 1.75,
          marginBottom: '38px',
          maxWidth: '520px',
          margin: '0 auto 38px',
        }}>
          TrustPay retiene el dinero de forma segura hasta que ambas partes estén satisfechas.
          Elimina el riesgo de estafas en compras y ventas entre personas.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button
            onClick={() => navigate(token ? '/dashboard' : '/register')}
            className="btn-primary"
            style={{ width: 'auto', padding: '12px 28px', fontSize: '14px', fontWeight: 600 }}
          >
            Empezar gratis <ArrowRight size={15} />
          </button>
          <button
            onClick={() => document.getElementById('como-funciona').scrollIntoView({ behavior: 'smooth' })}
            className="btn-secondary"
            style={{ width: 'auto', padding: '12px 24px', fontSize: '14px' }}
          >
            Cómo funciona <ChevronRight size={14} />
          </button>
        </div>

        <p style={{ fontSize: '11.5px', color: 'var(--text3)' }}>
          Sin comisiones ocultas · Registro en segundos · Dinero siempre protegido
        </p>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '0 24px 80px', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }} className="grid-1-mobile">
          {[
            { value: '100%', label: 'Dinero protegido hasta confirmar', color: 'var(--green)' },
            { value: '24h',  label: 'Auto-liberación si no hay respuesta', color: 'var(--amber)' },
            { value: '0%',   label: 'Riesgo de estafa para ambas partes', color: 'var(--blue)' },
          ].map(s => (
            <div key={s.label} className="card stat-card" style={{ textAlign: 'center', padding: '28px 20px' }}>
              <div style={{
                fontFamily: 'Syne', fontSize: '42px', fontWeight: 800,
                color: s.color, letterSpacing: '-0.04em', lineHeight: 1,
                marginBottom: '10px',
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text2)', lineHeight: 1.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" style={{ padding: '60px 24px 80px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="label" style={{ marginBottom: '12px' }}>Proceso simple</div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
            Cómo funciona TrustPay
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '20px' }}>
              {/* Timeline column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '48px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'var(--green-bg)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Syne', fontWeight: 700, fontSize: '12px',
                  color: 'var(--green)', flexShrink: 0,
                }}>
                  {step.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: '1px', flex: 1, background: 'var(--border)', margin: '8px 0' }} />
                )}
              </div>

              {/* Content */}
              <div style={{ paddingBottom: i < STEPS.length - 1 ? '36px' : '0', paddingTop: '11px', flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'Syne', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '13.5px', color: 'var(--text2)', lineHeight: 1.7 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '60px 24px 80px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <div className="label" style={{ marginBottom: '12px' }}>Todo incluido</div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
            Diseñado para operaciones seguras
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }} className="grid-3-mobile">
          {FEATURES.map(f => {
            const Icon = f.icon
            return (
              <div key={f.title} className="card" style={{ padding: '22px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '14px', flexShrink: 0,
                }}>
                  <Icon size={17} color="var(--green)" strokeWidth={2} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Syne', marginBottom: '7px' }}>
                  {f.title}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text2)', lineHeight: 1.65 }}>
                  {f.desc}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '40px 24px 100px', maxWidth: '620px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '52px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div className="orb" style={{
            width: '300px', height: '300px',
            background: 'var(--green)', opacity: 0.05,
            top: '-80px', left: '-60px',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Shield size={24} color="var(--green)" strokeWidth={2} />
            </div>
            <h2 style={{
              fontFamily: 'Syne', fontSize: '26px', fontWeight: 700,
              letterSpacing: '-0.03em', marginBottom: '12px',
            }}>
              ¿Listo para operar con confianza?
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text2)', marginBottom: '28px', lineHeight: 1.7 }}>
              Únete a TrustPay y realiza tus compras y ventas sabiendo que
              tu dinero siempre está protegido en todo momento.
            </p>
            <button
              onClick={() => navigate(token ? '/dashboard' : '/register')}
              className="btn-primary"
              style={{ width: 'auto', padding: '13px 36px', fontSize: '14px', fontWeight: 600 }}
            >
              {token ? 'Ir a mi panel' : 'Crear cuenta gratis'}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '22px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={14} color="var(--green)" />
          <span style={{ fontFamily: 'Syne', fontSize: '14px', fontWeight: 700 }}>
            Trust<span style={{ color: 'var(--green)' }}>Pay</span>
          </span>
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--text3)' }}>
          © 2026 TrustPay — Escrow digital para Perú
        </div>
      </footer>

    </div>
  )
}
