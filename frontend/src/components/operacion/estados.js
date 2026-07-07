/* Mapa de estados de una operación escrow (colores, fondo y etiqueta). */
export const ESTADO_MAP = {
  retenido:  { color: 'var(--amber)', bg: 'var(--amber-bg)',       label: 'Retenido' },
  liberado:  { color: 'var(--green)', bg: 'var(--green-bg)',       label: 'Liberado' },
  cancelado: { color: 'var(--red)',   bg: 'rgba(248,113,113,0.1)', label: 'Cancelado' },
  expirado:  { color: 'var(--text3)', bg: 'rgba(82,82,91,0.15)',   label: 'Expirado' },
}
