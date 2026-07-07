import { useState, useEffect } from 'react'
import { ThemeCtx } from './theme-context'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('tp-theme') || 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('tp-theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>
}
