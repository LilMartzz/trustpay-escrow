import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Package, User, LogOut,
  ChevronLeft, ChevronRight, Sun, Moon, Shield, Menu,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard',        path: '/dashboard',    icon: LayoutDashboard },
  { label: 'Mis operaciones',  path: '/operaciones',  icon: Package },
  { label: 'Perfil',           path: '/perfil',       icon: User },
]

export default function Sidebar() {
  const [collapsed, setCollapsed]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate   = useNavigate()
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()
  const { logout: signOut } = useAuth()

  const nav = (path) => { navigate(path); setMobileOpen(false) }
  const logout = () => { signOut(); navigate('/login') }

  const sidebarStyle = {
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    overflow: 'hidden',
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="mobile-ham"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu size={18} />
      </button>

      {/* Overlay for mobile */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}
        style={sidebarStyle}
      >
        {/* Logo row */}
        <div style={{
          padding: collapsed ? '16px 0' : '16px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: '58px',
        }}>
          {!collapsed && (
            <div
              onClick={() => nav('/dashboard')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '9px' }}
            >
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'var(--green-bg)',
                border: '1px solid rgba(34,197,94,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Shield size={15} color="var(--green)" strokeWidth={2.5} />
              </div>
              <span style={{
                fontFamily: 'Syne', fontSize: '15px', fontWeight: 700,
                letterSpacing: '-0.02em', color: 'var(--text)',
              }}>
                Trust<span style={{ color: 'var(--green)' }}>Pay</span>
              </span>
            </div>
          )}

          {collapsed && (
            <div
              onClick={() => nav('/dashboard')}
              style={{
                cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px',
                background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Shield size={16} color="var(--green)" strokeWidth={2.5} />
            </div>
          )}

          <button
            onClick={() => setCollapsed(c => !c)}
            className="btn-ghost hide-mobile"
            style={{ padding: '5px', borderRadius: '6px', flexShrink: 0, color: 'var(--text3)' }}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed
              ? <ChevronRight size={14} />
              : <ChevronLeft size={14} />
            }
          </button>
        </div>

        {/* Nav items */}
        <nav style={{
          flex: 1, padding: '10px 8px',
          display: 'flex', flexDirection: 'column', gap: '2px',
        }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.path
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => nav(item.path)}
                className={`nav-item${active ? ' active' : ''}`}
                title={collapsed ? item.label : ''}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div style={{
          padding: '10px 8px',
          borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '2px',
        }}>
          <button
            onClick={toggle}
            className="nav-item"
            title={collapsed ? (theme === 'dark' ? 'Modo claro' : 'Modo oscuro') : ''}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            {theme === 'dark'
              ? <Sun size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
              : <Moon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
            }
            {!collapsed && (
              <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
            )}
          </button>

          <button
            onClick={logout}
            className="nav-item"
            title={collapsed ? 'Cerrar sesión' : ''}
            style={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: 'var(--red)',
            }}
          >
            <LogOut size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
