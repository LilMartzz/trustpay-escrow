import { createContext } from 'react'

export const ThemeCtx = createContext({ theme: 'dark', toggle: () => {} })
