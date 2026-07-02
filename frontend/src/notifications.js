import { getToken, onMessage } from 'firebase/messaging'
import { messaging } from './firebase'
import api from './services/api'

export async function activarNotificaciones() {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
  if (!messaging || !vapidKey || typeof Notification === 'undefined') return

  try {
    const permiso = await Notification.requestPermission()
    if (permiso !== 'granted') return

    const token = await getToken(messaging, { vapidKey })
    if (!token) return

    await api.post('/perfil/fcm-token', { token })

    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {}
      if (title) new Notification(title, { body, icon: '/favicon.svg' })
    })
  } catch {
    // Sin permiso, navegador no compatible, o VAPID key inválida — no interrumpe el uso normal de la app.
  }
}
