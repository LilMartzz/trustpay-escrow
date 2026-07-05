import { useNavigate } from 'react-router-dom'
import {
  Shield, Lock, Package, MessageSquare, CreditCard,
  Zap, BadgeCheck, Sun, Moon, ArrowRight, ChevronRight,
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import useReveal from '../hooks/useInView'
import useCounter from '../hooks/useCounter'

/* Helper — inline transition */
const fade = (on, delay = 0) => ({
  opacity: on ? 1 : 0,
  transform: on ? 'none' : 'translateY(36px)',
  transition: `opacity 0.75s ease ${delay}ms, transform 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
})

/* ─────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Lock,          title: 'Dinero protegido',          desc: 'Tu saldo queda retenido en escrow hasta que ambas partes estén satisfechas. Cero riesgo de estafas.' },
  { icon: Package,       title: 'Seguimiento de envío',      desc: 'El vendedor registra la empresa courier y número de guía. Ambos ven el estado en tiempo real.' },
  { icon: MessageSquare, title: 'Chat integrado',            desc: 'Comunícate directamente con la contraparte dentro de cada operación, sin salir de la plataforma.' },
  { icon: BadgeCheck,    title: 'Verificación de identidad', desc: 'Validamos el DNI de cada usuario con RENIEC para garantizar que negocies con personas reales.' },
  { icon: CreditCard,    title: 'Evidencia del producto',    desc: 'El vendedor sube fotos, videos o links para demostrar el estado del artículo antes del envío.' },
  { icon: Zap,           title: 'Liberación instantánea',    desc: 'Cuando el comprador confirma la recepción, los fondos se transfieren de inmediato al vendedor.' },
]

const STEPS = [
  { n: '01', title: 'Comprador inicia el pago',        desc: 'El comprador deposita el monto en TrustPay. Los fondos quedan retenidos de forma segura y nunca llegan al vendedor todavía.' },
  { n: '02', title: 'Vendedor envía el producto',      desc: 'El vendedor despacha el artículo y registra la empresa de courier y número de guía dentro de la operación.' },
  { n: '03', title: 'Comprador confirma la recepción', desc: 'Una vez recibido el producto conforme, el comprador libera los fondos y el vendedor recibe su dinero al instante.' },
]

/* ─────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────── */
export default function Landing() {
  const navigate   = useNavigate()
  const { user: token } = useAuth()
  const { theme, toggle } = useTheme()

  /* Reveal refs per section */
  const [statsRef,    statsOn]    = useReveal(0.2)
  const [stepsRef,    stepsOn]    = useReveal(0.08)
  const [featuresRef, featuresOn] = useReveal(0.06)
  const [ctaRef,      ctaOn]      = useReveal(0.2)

  /* Animated counters — trigger on statsOn */
  const c100  = useCounter(100, 1600, statsOn)   // → 100%
  const c24   = useCounter(24,  1200, statsOn)   // → 24h
  const cRisk = useCounter(100, 2200, statsOn)   // counts 0→100, displayed as 100-cRisk → 0%

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ══ NAV ══ */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: '60px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0,
        background: theme === 'dark' ? 'rgba(9,9,11,0.9)' : 'rgba(244,244,245,0.92)',
        backdropFilter: 'blur(14px)',
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
            <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ width: 'auto', padding: '8px 18px' }}>
              Ir al panel
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="btn-secondary" style={{ width: 'auto', padding: '7px 16px', fontSize: '13px' }}>
                Iniciar sesión
              </button>
              <button onClick={() => navigate('/register')} className="btn-primary" style={{ width: 'auto', padding: '7px 16px', fontSize: '13px' }}>
                Registrarse gratis
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ══ HERO — tipografía más grande y atrevida ══ */}
      <section style={{
        textAlign: 'center', padding: '108px 24px 88px',
        maxWidth: '860px', margin: '0 auto', position: 'relative',
      }}>
        <div className="orb" style={{
          width: '800px', height: '500px',
          background: 'var(--green)', opacity: 0.045,
          top: 0, left: '50%', transform: 'translateX(-50%)',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.22)',
          borderRadius: '99px', padding: '6px 16px',
          fontSize: '11.5px', color: 'var(--green)',
          fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: '36px',
          animation: 'fadeIn 0.6s ease both',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s ease infinite' }} />
          Plataforma de escrow digital para Perú
        </div>

        {/* ── Headline más grande ── */}
        <h1 style={{
          fontFamily: 'Syne',
          fontSize: 'clamp(52px, 9.5vw, 92px)',
          fontWeight: 800,
          lineHeight: 0.96,
          letterSpacing: '-0.055em',
          marginBottom: '28px',
          position: 'relative',
          animation: 'fadeUp 0.7s ease 0.1s both',
        }}>
          Compra y vende<br />
          <span className="gradient-text-anim">sin miedo</span>
        </h1>

        <p style={{
          fontSize: '17px', color: 'var(--text2)', lineHeight: 1.78,
          maxWidth: '500px', margin: '0 auto 44px',
          animation: 'fadeUp 0.7s ease 0.2s both',
        }}>
          TrustPay retiene el dinero de forma segura hasta que ambas partes
          confirmen la operación. Sin riesgo de estafas.
        </p>

        <div style={{
          display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap',
          marginBottom: '22px',
          animation: 'fadeUp 0.7s ease 0.3s both',
        }}>
          <button
            onClick={() => navigate(token ? '/dashboard' : '/register')}
            className="btn-primary"
            style={{ width: 'auto', padding: '14px 32px', fontSize: '15px', fontWeight: 700 }}
          >
            Empezar gratis <ArrowRight size={16} />
          </button>
          <button
            onClick={() => document.getElementById('como-funciona').scrollIntoView({ behavior: 'smooth' })}
            className="btn-secondary"
            style={{ width: 'auto', padding: '14px 26px', fontSize: '15px' }}
          >
            Cómo funciona <ChevronRight size={15} />
          </button>
        </div>

        <p style={{ fontSize: '11.5px', color: 'var(--text3)', animation: 'fadeIn 0.6s ease 0.4s both' }}>
          Sin comisiones ocultas · Registro en segundos · Tu dinero siempre protegido
        </p>
      </section>

      {/* ══ STATS — contadores animados ══ */}
      <section
        ref={statsRef}
        style={{ padding: '0 24px 100px', maxWidth: '860px', margin: '0 auto' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }} className="grid-1-mobile">
          {[
            { value: `${c100}%`,        label: 'Dinero protegido hasta confirmar',      color: 'var(--green)' },
            { value: `${c24}h`,         label: 'Auto-liberación si no hay respuesta',   color: 'var(--amber)' },
            { value: `${100 - cRisk}%`, label: 'Riesgo de estafa para ambas partes',   color: 'var(--blue)'  },
          ].map((s, i) => (
            <div key={s.label} className="card stat-card" style={{ textAlign: 'center', padding: '34px 20px', ...fade(statsOn, i * 100) }}>
              <div style={{
                fontFamily: 'Syne', fontSize: 'clamp(42px, 6vw, 58px)', fontWeight: 800,
                color: s.color, letterSpacing: '-0.055em', lineHeight: 1, marginBottom: '12px',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.5 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS — scroll reveal con stagger ══ */}
      <section
        id="como-funciona"
        ref={stepsRef}
        style={{ padding: '60px 24px 100px', maxWidth: '800px', margin: '0 auto' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '64px', ...fade(stepsOn) }}>
          <div className="label" style={{ marginBottom: '12px' }}>Proceso simple</div>
          <h2 style={{
            fontFamily: 'Syne',
            fontSize: 'clamp(30px, 5vw, 46px)',
            fontWeight: 800, letterSpacing: '-0.045em',
          }}>
            Cómo funciona TrustPay
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '24px', ...fade(stepsOn, 100 + i * 160) }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '52px' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Syne', fontWeight: 800, fontSize: '13px', color: 'var(--green)',
                  flexShrink: 0,
                }}>
                  {step.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: '1px', flex: 1, background: 'var(--border)', margin: '10px 0' }} />
                )}
              </div>
              <div style={{ paddingBottom: i < STEPS.length - 1 ? '44px' : '0', paddingTop: '13px', flex: 1 }}>
                <div style={{ fontSize: '19px', fontWeight: 700, fontFamily: 'Syne', marginBottom: '8px', letterSpacing: '-0.025em' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.78 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FEATURES — scroll reveal con stagger ══ */}
      <section
        ref={featuresRef}
        style={{ padding: '60px 24px 100px', maxWidth: '920px', margin: '0 auto' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '56px', ...fade(featuresOn) }}>
          <div className="label" style={{ marginBottom: '12px' }}>Todo incluido</div>
          <h2 style={{
            fontFamily: 'Syne',
            fontSize: 'clamp(30px, 5vw, 46px)',
            fontWeight: 800, letterSpacing: '-0.045em',
          }}>
            Diseñado para operaciones seguras
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }} className="grid-3-mobile">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="card" style={{ padding: '24px', ...fade(featuresOn, i * 75) }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '11px',
                  background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <Icon size={18} color="var(--green)" strokeWidth={2} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'Syne', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                  {f.title}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.65 }}>
                  {f.desc}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ══ CTA — scroll reveal ══ */}
      <section
        ref={ctaRef}
        style={{ padding: '40px 24px 108px', maxWidth: '620px', margin: '0 auto', textAlign: 'center' }}
      >
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)', padding: '60px 40px',
          position: 'relative', overflow: 'hidden',
          ...fade(ctaOn),
        }}>
          <div className="orb" style={{ width: '320px', height: '320px', background: 'var(--green)', opacity: 0.06, top: '-90px', left: '-70px' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 22px',
            }}>
              <Shield size={26} color="var(--green)" strokeWidth={2} />
            </div>
            <h2 style={{
              fontFamily: 'Syne', fontSize: 'clamp(24px, 4vw, 34px)',
              fontWeight: 800, letterSpacing: '-0.045em', marginBottom: '14px',
            }}>
              ¿Listo para operar con confianza?
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '32px', lineHeight: 1.75 }}>
              Únete a TrustPay y realiza tus compras y ventas sabiendo que
              tu dinero siempre está protegido en todo momento.
            </p>
            <button
              onClick={() => navigate(token ? '/dashboard' : '/register')}
              className="btn-primary"
              style={{ width: 'auto', padding: '14px 38px', fontSize: '15px', fontWeight: 700 }}
            >
              {token ? 'Ir a mi panel' : 'Crear cuenta gratis'} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '22px 48px',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: '12px',
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
