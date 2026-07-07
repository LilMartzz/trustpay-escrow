import { jsPDF } from 'jspdf'
import syneBoldUrl from '../assets/fonts/Syne-Bold.ttf'

// Paletas espejo de los tokens CSS de index.css, en RGB para jsPDF.
const PALETAS = {
  dark: {
    bg:      [9, 9, 11],
    surface: [24, 24, 27],
    border:  [42, 42, 46],
    text:    [250, 250, 250],
    text2:   [161, 161, 170],
    text3:   [113, 113, 122],
    green:   [34, 197, 94],
  },
  light: {
    bg:      [244, 244, 245],
    surface: [255, 255, 255],
    border:  [228, 228, 231],
    text:    [9, 9, 11],
    text2:   [113, 113, 122],
    text3:   [161, 161, 170],
    green:   [22, 163, 74],
  },
}

const ANCHO = 420
const MARGEN = 26
const PAD = 26

let syneBase64 = null

async function obtenerSyne() {
  if (syneBase64) return syneBase64
  const buf = await fetch(syneBoldUrl).then(r => r.arrayBuffer())
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  syneBase64 = btoa(bin)
  return syneBase64
}

function registrarSyne(doc, b64) {
  doc.addFileToVFS('Syne-Bold.ttf', b64)
  doc.addFont('Syne-Bold.ttf', 'Syne', 'bold')
}

function dibujar(doc, { titulo, subtitulo, filas, total, nota }, pal, altoPagina) {
  const x0 = MARGEN + PAD
  const xFin = ANCHO - MARGEN - PAD
  const anchoContenido = ANCHO - 2 * (MARGEN + PAD)

  // Fondo y tarjeta solo en la pasada final, cuando ya se conoce la altura.
  if (altoPagina) {
    doc.setFillColor(...pal.bg)
    doc.rect(0, 0, ANCHO, altoPagina, 'F')
    doc.setFillColor(...pal.surface)
    doc.setDrawColor(...pal.border)
    doc.setLineWidth(1)
    doc.roundedRect(MARGEN, MARGEN, ANCHO - 2 * MARGEN, altoPagina - 2 * MARGEN, 12, 12, 'FD')
  }

  let y = MARGEN + PAD + 14

  doc.setFont('Syne', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...pal.green)
  doc.text('TrustPay', x0, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...pal.text3)
  doc.text('COMPROBANTE', xFin, y, { align: 'right', charSpace: 1.5 })
  y += 30

  doc.setFont('Syne', 'bold')
  doc.setFontSize(13.5)
  doc.setTextColor(...pal.text)
  doc.text(titulo, x0, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...pal.text2)
  doc.text(subtitulo, x0, y)
  y += 18

  doc.setDrawColor(...pal.border)
  doc.setLineWidth(0.8)
  doc.line(x0, y, xFin, y)
  y += 20

  for (const fila of filas) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...pal.text2)
    doc.text(fila.label, x0, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...pal.text)
    const lineas = doc.splitTextToSize(String(fila.valor), anchoContenido * 0.55)
    lineas.forEach((linea, i) => doc.text(linea, xFin, y + i * 11.5, { align: 'right' }))
    y += Math.max(1, lineas.length) * 11.5 + 6.5
  }

  y += 4
  doc.line(x0, y, xFin, y)
  y += 22

  doc.setFont('Syne', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...pal.text)
  doc.text(total.label, x0, y)
  doc.setFontSize(14)
  doc.setTextColor(...pal.green)
  doc.text(String(total.valor), xFin, y, { align: 'right' })
  y += 26

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...pal.text3)
  if (nota) {
    doc.text(nota, ANCHO / 2, y, { align: 'center' })
    y += 11
  }
  const emitido = new Date().toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' })
  doc.text(`Generado el ${emitido}`, ANCHO / 2, y, { align: 'center' })

  return y + PAD + MARGEN
}

/**
 * Genera y descarga un comprobante en PDF con el estilo de la app.
 * `filas`: [{ label, valor }] · `total`: { label, valor } · `nota`: pie opcional.
 * El tema se toma del atributo data-theme activo salvo que se pase `tema`.
 */
export async function descargarComprobantePDF(opciones) {
  const tema = opciones.tema || document.documentElement.dataset.theme || 'dark'
  const pal = PALETAS[tema] || PALETAS.dark
  const b64 = await obtenerSyne()

  // Primera pasada sobre un lienzo alto solo para medir la altura real del contenido
  // (jsPDF no permite redimensionar la página después de crearla).
  const medidor = new jsPDF({ unit: 'pt', format: [ANCHO, 2000] })
  registrarSyne(medidor, b64)
  const alto = dibujar(medidor, opciones, pal)

  // jsPDF intercambia ancho/alto si no coinciden con la orientación declarada:
  // si el comprobante es más ancho que alto hay que declararlo apaisado.
  const doc = new jsPDF({ unit: 'pt', format: [ANCHO, alto], orientation: alto >= ANCHO ? 'portrait' : 'landscape' })
  registrarSyne(doc, b64)
  dibujar(doc, opciones, pal, alto)
  doc.save(opciones.nombreArchivo)
}
