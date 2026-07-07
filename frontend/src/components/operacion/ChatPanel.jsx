import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send } from 'lucide-react'

export default function ChatPanel({ mensajes, esComprador, chatInput, setChatInput, enviarMensaje }) {
  const chatRef = useRef(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes])

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <MessageSquare size={14} color="var(--text3)" />
        <span className="label" style={{ margin: 0 }}>
          Chat con {esComprador ? 'el vendedor' : 'el comprador'}
        </span>
      </div>

      {/* Messages */}
      <div ref={chatRef} style={{
        height: '220px', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '8px',
        marginBottom: '10px',
      }}>
        {mensajes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)', fontSize: '12.5px' }}>
            <MessageSquare size={22} color="var(--border2)" style={{ marginBottom: '8px' }} />
            <p>No hay mensajes aún</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {mensajes.map(m => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                style={{
                  display: 'flex', flexDirection: 'column', flexShrink: 0,
                  alignItems: m.es_propio ? 'flex-end' : 'flex-start',
                  transformOrigin: m.es_propio ? 'bottom right' : 'bottom left',
                }}
              >
                <div className={`chat-bubble ${m.es_propio ? 'own' : 'other'}`}>
                  {m.contenido}
                </div>
                <div style={{ fontSize: '9.5px', color: 'var(--text3)', marginTop: '3px', padding: '0 4px' }}>
                  {m.remitente_nombre} · {new Date(m.creado_en).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Input */}
      <form onSubmit={enviarMensaje} style={{ display: 'flex', gap: '8px' }}>
        <input
          placeholder="Escribe un mensaje..."
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn-primary"
          style={{ width: 'auto', padding: '9px 14px', flexShrink: 0 }}
          disabled={!chatInput.trim()}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
