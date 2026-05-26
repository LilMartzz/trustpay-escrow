import { useNavigate, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Mis operaciones', path: '/operaciones' },
  { label: 'Perfil', path: '/perfil' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const logout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div style={{
      width: '190px',
      background: 'var(--surface)',
      borderRight: '0.5px solid var(--border)',
      padding: '20px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      flexShrink: 0,
      minHeight: '100vh',
    }}>
      <div style={{
        fontFamily: 'Syne',
        fontSize: '17px',
        fontWeight: 700,
        color: '#E8F4FF',
        padding: '4px 10px 18px',
        marginBottom: '6px',
        borderBottom: '0.5px solid var(--border)',
        letterSpacing: '-0.01em',
        cursor: 'pointer',
      }} onClick={() => navigate('/dashboard')}>
        Trust<span style={{ color: 'var(--green)' }}>Pay</span>
        <div style={{
          fontSize: '9px',
          fontWeight: 400,
          color: 'var(--muted)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginTop: '2px',
          fontFamily: 'Inter',
        }}>
          escrow digital
        </div>
      </div>

      {NAV_ITEMS.map(item => {
        const active = pathname === item.path
        return (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '12.5px',
              cursor: 'pointer',
              color: active ? 'var(--text)' : 'var(--muted)',
              background: active ? 'var(--surface2)' : 'transparent',
              fontWeight: active ? 500 : 400,
              transition: 'background 0.15s',
            }}
          >
            {item.label}
          </div>
        )
      })}

      <div
        onClick={logout}
        style={{
          padding: '8px 10px',
          borderRadius: '8px',
          fontSize: '12.5px',
          color: 'var(--red)',
          cursor: 'pointer',
          marginTop: 'auto',
        }}
      >
        Cerrar sesión
      </div>
    </div>
  )
}
