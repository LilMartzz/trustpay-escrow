import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getMessaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export let auth = null
export let messaging = null

try {
  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  isSupported().then((soportado) => {
    if (soportado) messaging = getMessaging(app)
  })
} catch {
  console.error(
    'Firebase no está configurado: completa las variables VITE_FIREBASE_* en frontend/.env (ver frontend/.env.example).'
  )
}
