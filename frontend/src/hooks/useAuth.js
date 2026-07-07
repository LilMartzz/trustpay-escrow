import { useContext } from 'react'
import { AuthCtx } from '../contexts/auth-context'

export const useAuth = () => useContext(AuthCtx)
