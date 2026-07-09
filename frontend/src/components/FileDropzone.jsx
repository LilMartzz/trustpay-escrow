import { useState, useRef, useEffect, useMemo } from 'react'
import { CheckCircle2, AlertTriangle, X, RotateCcw } from 'lucide-react'

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatEta(seconds) {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return null
  if (seconds < 1) return 'menos de 1 s'
  if (seconds < 60) return `${Math.ceil(seconds)} s restantes`
  return `${Math.ceil(seconds / 60)} min restantes`
}

/**
 * Zona de carga con drag & drop real, feedback de progreso honesto
 * (porcentaje + tiempo estimado, nunca un spinner ciego), y reintento
 * en línea que conserva el archivo ya seleccionado.
 *
 * progress: { percent, etaSeconds } | null — progreso de subida en curso
 * error: string | null — si hay error, el archivo permanece y se puede reintentar sin volver a elegirlo
 */
export default function FileDropzone({
  label, file, onPick, accept, Icon, progress = null, error = null, onRetry, disabled = false,
}) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const previewUrl = useMemo(
    () => (file && file.type?.startsWith('image/') ? URL.createObjectURL(file) : null),
    [file],
  )
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const uploading = progress != null
  // Estancado cerca del final: nunca se reinicia, solo se avisa.
  const estancado = uploading && progress.percent >= 90 && progress.percent < 100 && progress.stalled

  const handleFiles = (files) => {
    if (disabled) return
    const f = files?.[0]
    if (f) onPick(f)
  }

  return (
    <div>
      {label && <div className="label" style={{ marginBottom: '8px' }}>{label}</div>}
      <div
        className={`dropzone${dragging ? ' dropzone--dragging' : ''}${error ? ' dropzone--error' : ''}`}
        onClick={() => !disabled && !uploading && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        style={{
          background: error ? 'var(--red-bg)' : file ? 'var(--green-bg)' : 'var(--surface2)',
          border: `1px dashed ${error ? 'var(--red)' : file ? 'var(--green)' : 'var(--border2)'}`,
          padding: '20px 14px',
          textAlign: 'center',
          cursor: disabled || uploading ? 'default' : 'pointer',
          opacity: disabled && !uploading ? 0.6 : 1,
        }}
      >
        {!file && (
          <>
            <Icon size={22} color="var(--text3)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '11.5px', color: 'var(--text3)' }}>
              Arrastra un archivo aquí o haz clic
            </div>
          </>
        )}

        {file && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-xs)', flexShrink: 0, border: '1px solid var(--border)' }}
              />
            ) : (
              <div style={{
                width: '40px', height: '40px', borderRadius: 'var(--radius-xs)', flexShrink: 0,
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color="var(--text3)" />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '12px', fontWeight: 500, color: error ? 'var(--red)' : 'var(--text)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {file.name}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '2px' }}>
                {(file.type || 'archivo').split('/')[1] || file.type || 'archivo'} · {formatBytes(file.size)}
              </div>

              {uploading && (
                <div style={{ marginTop: '6px' }}>
                  <div className="dropzone-progress-track">
                    <div className="dropzone-progress-bar" style={{ width: `${progress.percent}%` }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '3px' }}>
                    {progress.percent}%{formatEta(progress.etaSeconds) ? ` · ${formatEta(progress.etaSeconds)}` : ''}
                  </div>
                  {estancado && (
                    <div style={{ fontSize: '10px', color: 'var(--amber)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={10} /> Tomando más tiempo de lo normal, puedes esperar o reintentar luego
                    </div>
                  )}
                </div>
              )}

              {!uploading && !error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', fontSize: '10.5px', color: 'var(--green)' }}>
                  <CheckCircle2 size={11} /> Listo
                </div>
              )}

              {error && !uploading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={11} /> {error}
                  </span>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRetry() }}
                      className="btn-ghost"
                      style={{ fontSize: '10.5px', color: 'var(--green)', padding: 0, display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <RotateCcw size={11} /> Reintentar
                    </button>
                  )}
                </div>
              )}
            </div>
            {!uploading && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onPick(null) }}
                className="btn-ghost"
                style={{ padding: '4px', color: 'var(--text3)', flexShrink: 0 }}
                title="Quitar archivo"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />
    </div>
  )
}
