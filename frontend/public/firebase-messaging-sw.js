importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

// Config pública del proyecto Firebase (no son secretos, se embeben en el bundle del cliente igual).
firebase.initializeApp({
  apiKey: 'AIzaSyD9Eg-sgUIBfxZosHl7-LAuJ-UgYhFLE7E',
  authDomain: 'trustpay-fa685.firebaseapp.com',
  projectId: 'trustpay-fa685',
  storageBucket: 'trustpay-fa685.firebasestorage.app',
  messagingSenderId: '105245928205',
  appId: '1:105245928205:web:8ab204c8e4e45ab2171e44',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  self.registration.showNotification(title || 'TrustPay', {
    body: body || '',
    icon: '/favicon.svg',
  })
})
