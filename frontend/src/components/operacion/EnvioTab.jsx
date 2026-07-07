import { Truck } from 'lucide-react'

const EMPRESAS = [
  'Serpost', 'Olva Courier', 'Shalom', 'Cruz del Sur',
  'DHL', 'FedEx', 'GLS', 'Motorizado propio', 'Otro',
]

export default function EnvioTab({ envio, envioForm, setEnvioForm, registrarEnvio }) {
  return (
    <>
      {envio && (
        <div className="alert alert-success" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '14px' }}>
          <Truck size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <span style={{ fontWeight: 600 }}>Envío ya registrado: </span>
            {envio.empresa} · <span style={{ fontFamily: 'monospace' }}>{envio.numero_guia}</span>
            <p style={{ fontSize: '11px', marginTop: '4px', color: 'var(--green)' }}>
              Puedes actualizar los datos si hubo un error.
            </p>
          </div>
        </div>
      )}

      {!envio && (
        <p style={{ fontSize: '12.5px', color: 'var(--text2)', marginBottom: '16px', lineHeight: 1.6 }}>
          Registra la empresa de courier y número de guía para que el comprador pueda hacer seguimiento.
        </p>
      )}

      <form onSubmit={registrarEnvio}>
        <div className="form-group">
          <label className="label">Empresa de envío</label>
          <select value={envioForm.empresa} onChange={e => setEnvioForm({ ...envioForm, empresa: e.target.value })}>
            {EMPRESAS.map(emp => <option key={emp} value={emp}>{emp}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Número de guía / tracking</label>
          <input placeholder="Ej: SP0123456789" value={envioForm.numero_guia} onChange={e => setEnvioForm({ ...envioForm, numero_guia: e.target.value })} required />
        </div>
        <div className="form-group">
          <label className="label">Descripción del producto <span style={{ color: 'var(--text3)' }}>(opcional)</span></label>
          <input placeholder="iPhone 14 Pro 256GB negro" value={envioForm.descripcion_producto} onChange={e => setEnvioForm({ ...envioForm, descripcion_producto: e.target.value })} />
        </div>
        <button type="submit" className="btn-primary">
          <Truck size={14} /> {envio ? 'Actualizar envío' : 'Registrar envío'}
        </button>
      </form>
    </>
  )
}
