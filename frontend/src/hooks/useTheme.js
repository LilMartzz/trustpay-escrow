import { useContext } from 'react'
import { ThemeCtx } from '../contexts/theme-context'

export const useTheme = () => useContext(ThemeCtx)
