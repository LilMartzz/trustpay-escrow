import { ExternalLink, Paperclip, Link2, Package } from 'lucide-react'

export default function EvidenciasTab({
  esComprador, esVendedor, evidencias,
  link, setLink, descLink, setDescLink,
  setArchivo, descArchivo, setDescArchivo,
  subirLink, subirArchivo, abrirArchivo,
}) {
  return (
    <>
      {esVendedor && (
        <>
          <p className="label" style={{ marginBottom: '14px' }}>Subir evidencia del producto</p>

          <form onSubmit={subirLink} style={{ marginBottom: '18px' }}>
            <div className="form-group">
              <label className="label">
                <Link2 size={11} style={{ display: 'inline', marginRight: '4px' }} />
                Link (YouTube, Drive, etc.)
              </label>
              <input placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Descripción</label>
              <input placeholder="Video del empaque" value={descLink} onChange={e => setDescLink(e.target.value)} />
            </div>
            <button type="submit" className="btn-secondary" style={{ width: 'auto', padding: '7px 14px', fontSize: '12px' }}>
              <Link2 size={12} /> Registrar link
            </button>
          </form>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <form onSubmit={subirArchivo}>
              <div className="form-group">
                <label className="label">
                  <Paperclip size={11} style={{ display: 'inline', marginRight: '4px' }} />
                  Subir archivo
                </label>
                <input type="file" accept="image/*,video/*" onChange={e => setArchivo(e.target.files[0])} style={{ padding: '6px 10px' }} />
              </div>
              <div className="form-group">
                <label className="label">Descripción</label>
                <input placeholder="Descripción del archivo" value={descArchivo} onChange={e => setDescArchivo(e.target.value)} />
              </div>
              <button type="submit" className="btn-secondary" style={{ width: 'auto', padding: '7px 14px', fontSize: '12px' }}>
                <Paperclip size={12} /> Subir archivo
              </button>
            </form>
          </div>
        </>
      )}

      {esComprador && evidencias.length === 0 && (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)', fontSize: '12.5px' }}>
          <Package size={28} color="var(--border2)" style={{ marginBottom: '10px' }} />
          <p>El vendedor aún no ha subido evidencia</p>
        </div>
      )}

      {evidencias.length > 0 && (
        <div style={{ marginTop: esVendedor ? '16px' : '0' }}>
          {esVendedor && <p className="label" style={{ marginBottom: '10px' }}>Evidencias subidas</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {evidencias.map(ev => (
              <div key={ev.id} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '10px 12px',
              }}>
                <div style={{ fontSize: '12.5px', fontWeight: 500, marginBottom: '5px' }}>
                  {ev.descripcion || 'Sin descripción'}
                </div>
                {ev.tipo === 'archivo' ? (
                  <button type="button" onClick={() => abrirArchivo(ev)} className="btn-ghost" style={{
                    fontSize: '11.5px', color: 'var(--green)', padding: 0,
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <Paperclip size={11} /> Ver archivo adjunto
                  </button>
                ) : (
                  <a href={ev.url} target="_blank" rel="noreferrer" style={{
                    fontSize: '11.5px', color: 'var(--green)', wordBreak: 'break-all',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <ExternalLink size={11} /> {ev.url.substring(0, 40)}{ev.url.length > 40 ? '…' : ''}
                  </a>
                )}
                <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '5px' }}>
                  {new Date(ev.fecha).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
