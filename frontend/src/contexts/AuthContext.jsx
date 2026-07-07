import { useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase'
import api from '../services/api'
import { AuthCtx } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!auth)

  const sync = async (nombre, telefono) => {
    // Fuerza refrescar el ID token: el claim email_verified queda desactualizado
    // en el token cacheado hasta que se pide uno nuevo tras verificar el correo.
    await auth?.currentUser?.getIdToken(true)
    await api.post('/auth/sync', { nombre, telefono })
  }

  useEffect(() => {
    if (!auth) return
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    // Mantiene email_verificado al día en la BD también cuando la sesión
    // se restaura sola (no solo en login/registro explícitos).
    if (user) sync(user.displayName || '', null).catch(() => {})
  }, [user])

  const register = async (nombre, email, password, telefono) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: nombre })
    await sendEmailVerification(cred.user)
    await sync(nombre, telefono)
    return cred.user
  }

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await sync(cred.user.displayName || '', null)
    return cred.user
  }

  const logout = () => signOut(auth)

  const resendVerification = () => {
    if (auth?.currentUser) return sendEmailVerification(auth.currentUser)
  }

  const refreshEmailVerified = async () => {
    if (!auth?.currentUser) return false
    await auth.currentUser.reload()
    setUser({ ...auth.currentUser })
    return auth.currentUser.emailVerified
  }

  const value = {
    user,
    loading,
    emailVerified: !!user?.emailVerified,
    register,
    login,
    logout,
    resendVerification,
    refreshEmailVerified,
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
