import * as fs from 'fs'
import PDFDocument from 'pdfkit'

export type StatementPdfMode = 'latest' | 'history'

export interface StatementPdfConcept {
  code: string
  name: string
  type: string
  amount: number
}

export interface StatementPdfFee {
  id: string
  period: string
  amount: number
  paidAmount: number
  balance: number
  status: string
  dueDate: Date | string
  concepts: StatementPdfConcept[]
}

export interface StatementPdfData {
  unit: { id: string; code: string; condominiumId: string }
  owner?: {
    id: string
    name: string
    phone: string | null
    email: string | null
  } | null
  summary: {
    totalCharged: number
    totalPaid: number
    balance: number
    pendingFees: number
  }
  fees: StatementPdfFee[]
}

export interface StatementPdfContext {
  buildingName: string
  buildingCode: string
  organizationName: string
}

export interface StatementPdfOptions {
  mode: StatementPdfMode
}

const MARGIN = 40
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const FOOTER_Y = PAGE_HEIGHT - MARGIN - 16

const COLORS = {
  gradientStart: '#5b21b6',
  gradientEnd: '#e11d48',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  rowAlt: '#f8fafc',
  white: '#ffffff',
  paid: '#15803d',
  debt: '#b91c1c',
}

const TABLE = {
  padX: 12,
  numW: 34,
  typeW: 72,
  amountW: 88,
  get x () { return MARGIN + this.padX },
  get width () { return CONTENT_WIDTH - this.padX * 2 },
  get conceptW () { return this.width - this.numW - this.typeW - this.amountW },
  get colWidths (): number[] {
    return [this.numW, this.conceptW, this.typeW, this.amountW]
  },
}

export async function renderAccountStatementPdf (
  filePath: string,
  statement: StatementPdfData,
  context: StatementPdfContext,
  options: StatementPdfOptions,
): Promise<void> {
  const fees = resolveFees(statement.fees, options.mode)

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', autoFirstPage: true })
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    if (!fees.length) {
      drawEmptyInvoicePage(doc, statement, context, options.mode)
    } else {
      fees.forEach((fee, index) => {
        if (index > 0) doc.addPage()
        drawInvoicePage(doc, fee, statement, context, {
          page: index + 1,
          totalPages: fees.length,
          mode: options.mode,
        })
      })
    }

    doc.end()
    stream.on('finish', () => resolve())
    stream.on('error', reject)
  })
}

function resolveFees (fees: StatementPdfFee[], mode: StatementPdfMode): StatementPdfFee[] {
  const sorted = [...fees].sort((a, b) => b.period.localeCompare(a.period))
  if (mode === 'latest') {
    return sorted.length ? [sorted[0]] : []
  }
  return [...fees].sort((a, b) => a.period.localeCompare(b.period))
}

function drawEmptyInvoicePage (
  doc: PDFKit.PDFDocument,
  statement: StatementPdfData,
  context: StatementPdfContext,
  mode: StatementPdfMode,
) {
  drawWatermark(doc, null)
  drawGradientHeader(doc, {
    title: mode === 'latest' ? 'RECIBO — ÚLTIMO MES' : 'RECIBO — HISTORIAL',
    subtitle: context.buildingName,
    periodLabel: 'Sin periodos',
    unitCode: statement.unit.code,
    ownerName: statement.owner?.name ?? '—',
    totalLabel: 'Total',
    totalValue: formatMoney(0),
    dueDate: '—',
  })

  const panelY = MARGIN + 112
  doc.save()
  doc.roundedRect(MARGIN, panelY, CONTENT_WIDTH, 72, 8).fill(COLORS.white)
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(11)
  doc.text(
    'No hay cuotas publicadas para esta unidad. Genere y publique el cuadro mensual en Finanzas.',
    MARGIN + 24,
    panelY + 28,
    { width: CONTENT_WIDTH - 48, align: 'center' },
  )
  doc.restore()
  drawPageFooter(doc, context, 1, 1)
}

function drawInvoicePage (
  doc: PDFKit.PDFDocument,
  fee: StatementPdfFee,
  statement: StatementPdfData,
  context: StatementPdfContext,
  meta: { page: number; totalPages: number; mode: StatementPdfMode },
) {
  drawWatermark(doc, fee)

  const periodLabel = formatPeriodLabel(fee.period)
  const isPaid = fee.status === 'PAID' && fee.balance <= 0
  const totalLabel = isPaid ? 'Total pagado' : 'Total adeudado'
  const totalValue = isPaid ? formatMoney(fee.paidAmount) : formatMoney(fee.balance)

  drawGradientHeader(doc, {
    title: meta.mode === 'history' ? `RECIBO ${meta.page}/${meta.totalPages}` : 'RECIBO MENSUAL',
    subtitle: context.organizationName.toUpperCase(),
    periodLabel,
    unitCode: statement.unit.code,
    ownerName: statement.owner?.name ?? '—',
    ownerPhone: statement.owner?.phone ?? undefined,
    ownerEmail: statement.owner?.email ?? undefined,
    totalLabel,
    totalValue,
    dueDate: formatDate(fee.dueDate),
    buildingName: context.buildingName,
  })

  const panelY = MARGIN + 112
  const concepts = fee.concepts.filter((c) => c.amount > 0)
  const rows = concepts.length
    ? concepts
    : [{ code: 'FEE', name: 'Cuota de mantenimiento', type: 'FIXED', amount: fee.amount }]

  const rowH = 26
  const headerH = 24
  const summaryBlockH = fee.balance > 0 ? 78 : 60
  const panelH = headerH + rows.length * rowH + summaryBlockH + 12
  const colWidths = TABLE.colWidths

  doc.save()
  doc.roundedRect(MARGIN, panelY, CONTENT_WIDTH, panelH, 10).fill(COLORS.white)
  doc.roundedRect(MARGIN, panelY, CONTENT_WIDTH, panelH, 10).lineWidth(1).strokeColor(COLORS.border).stroke()

  let tableY = panelY + 6
  tableY = drawTableHeader(doc, TABLE.x, tableY, colWidths, ['#', 'Concepto', 'Tipo', 'Monto'])

  rows.forEach((concept, idx) => {
    tableY = drawTableRow(
      doc,
      TABLE.x,
      tableY,
      colWidths,
      [
        String(idx + 1),
        concept.name,
        concept.type === 'FIXED' ? 'Fijo' : concept.type === 'VARIABLE' ? 'Variable' : '—',
        formatMoney(concept.amount),
      ],
      idx % 2 === 1,
    )
  })

  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9)
  doc.text(`Subtotal mes: ${formatMoney(fee.amount)}`, TABLE.x + 4, tableY + 8)
  doc.text(`Pagado: ${formatMoney(fee.paidAmount)}`, TABLE.x + 190, tableY + 8)

  const barY = tableY + 26
  drawGradientBar(doc, TABLE.x, barY, TABLE.width, 26)
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(11)
  doc.text('TOTAL DEL MES', TABLE.x + 12, barY + 8, { lineBreak: false })
  doc.text(formatMoney(fee.amount), TABLE.x, barY + 8, {
    width: TABLE.width - 12,
    align: 'right',
    lineBreak: false,
  })

  if (fee.balance > 0) {
    doc.fillColor(COLORS.debt).font('Helvetica-Bold').fontSize(10)
    doc.text(`Saldo pendiente: ${formatMoney(fee.balance)}`, TABLE.x, barY + 34, {
      width: TABLE.width,
      align: 'right',
      lineBreak: false,
    })
  }

  doc.restore()

  const notesY = panelY + panelH + 10
  if (notesY < FOOTER_Y - 14) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
    doc.text(
      `Edificio: ${context.buildingName} (${context.buildingCode}) · Unidad ${statement.unit.code} · Periodo ${fee.period} · ${translateStatus(fee.status)}`,
      MARGIN,
      notesY,
      { width: CONTENT_WIDTH, lineBreak: false },
    )
  }

  drawPageFooter(doc, context, meta.page, meta.totalPages)
}

function drawGradientHeader (
  doc: PDFKit.PDFDocument,
  data: {
    title: string
    subtitle: string
    periodLabel: string
    unitCode: string
    ownerName: string
    ownerPhone?: string
    ownerEmail?: string
    totalLabel: string
    totalValue: string
    dueDate: string
    buildingName?: string
  },
) {
  const headerH = 108
  const y = MARGIN
  const leftW = CONTENT_WIDTH * 0.54
  const rightW = CONTENT_WIDTH * 0.42
  const rightX = MARGIN + CONTENT_WIDTH - rightW

  doc.save()
  const grad = doc.linearGradient(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
  grad.stop(0, COLORS.gradientStart)
  grad.stop(1, COLORS.gradientEnd)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, headerH, 10).fill(grad)

  doc.fillColor('#fce7f3').font('Helvetica-Bold').fontSize(8)
  doc.text(data.subtitle, MARGIN + 18, y + 14, { width: leftW, lineBreak: false })

  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(20)
  doc.text(data.title, MARGIN + 18, y + 28, { width: leftW, lineBreak: false })

  doc.font('Helvetica').fontSize(11)
  doc.text(data.periodLabel, MARGIN + 18, y + 54, { width: leftW, lineBreak: false })

  doc.fontSize(8).fillColor('#fce7f3')
  doc.text(
    [data.buildingName, `Dpto. ${data.unitCode}`, `Vence: ${data.dueDate}`].filter(Boolean).join('  ·  '),
    MARGIN + 18,
    y + 72,
    { width: leftW, lineBreak: false },
  )

  doc.fillColor('#fce7f3').font('Helvetica-Bold').fontSize(8)
  doc.text('RECIBO A', rightX, y + 14, { width: rightW, align: 'right', lineBreak: false })

  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(10)
  doc.text(truncate(data.ownerName, 34), rightX, y + 28, { width: rightW, align: 'right', lineBreak: false })

  doc.font('Helvetica').fontSize(7).fillColor('#fce7f3')
  const contact = [data.ownerPhone, data.ownerEmail].filter(Boolean).join(' · ')
  if (contact) {
    doc.text(truncate(contact, 42), rightX, y + 44, { width: rightW, align: 'right', lineBreak: false })
  }

  doc.font('Helvetica-Bold').fontSize(8)
  doc.text(data.totalLabel.toUpperCase(), rightX, y + 62, { width: rightW, align: 'right', lineBreak: false })

  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(15)
  doc.text(data.totalValue, rightX, y + 76, { width: rightW, align: 'right', lineBreak: false })

  doc.restore()
  doc.fillColor(COLORS.text)
}

function drawGradientBar (doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  const grad = doc.linearGradient(x, y, x + w, y)
  grad.stop(0, COLORS.gradientStart)
  grad.stop(1, COLORS.gradientEnd)
  doc.roundedRect(x, y, w, h, 6).fill(grad)
}

function drawWatermark (doc: PDFKit.PDFDocument, fee: StatementPdfFee | null) {
  const isPaid = fee ? fee.status === 'PAID' && fee.balance <= 0 : false
  const text = fee ? (isPaid ? 'PAGADO' : 'DEUDA PENDIENTE') : 'SIN RECIBOS'
  const color = isPaid ? COLORS.paid : COLORS.debt

  doc.save()
  doc.opacity(0.09)
  doc.fillColor(color)
  doc.font('Helvetica-Bold').fontSize(52)

  const cx = PAGE_WIDTH / 2
  const cy = PAGE_HEIGHT / 2 + 40
  doc.rotate(-30, { origin: [cx, cy] })
  doc.text(text, cx - 220, cy - 16, { width: 440, align: 'center', lineBreak: false })
  doc.rotate(30, { origin: [cx, cy] })
  doc.opacity(1)
  doc.restore()
  doc.fillColor(COLORS.text)
}

function drawTableHeader (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  widths: number[],
  headers: string[],
): number {
  const totalWidth = widths.reduce((s, w) => s + w, 0)
  doc.save()
  doc.rect(x, y, totalWidth, 24).fill('#f1f5f9')
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8)

  let cx = x
  headers.forEach((header, i) => {
    const w = widths[i]
    const pad = 6
    doc.text(header, cx + pad, y + 8, {
      width: w - pad * 2,
      align: i === headers.length - 1 ? 'right' : 'left',
      lineBreak: false,
    })
    cx += w
  })

  doc.restore()
  return y + 24
}

function drawTableRow (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  widths: number[],
  cells: string[],
  alt: boolean,
): number {
  const totalWidth = widths.reduce((s, w) => s + w, 0)
  const rowH = 26

  doc.save()
  if (alt) doc.rect(x, y, totalWidth, rowH).fill(COLORS.rowAlt)

  let cx = x
  cells.forEach((cell, i) => {
    const w = widths[i]
    const pad = 6
    const isAmount = i === cells.length - 1
    doc.fillColor(COLORS.text)
    doc.font(isAmount || i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
    doc.text(cell, cx + pad, y + 8, {
      width: w - pad * 2,
      align: isAmount ? 'right' : 'left',
      lineBreak: false,
    })
    cx += w
  })

  doc.moveTo(x, y + rowH).lineTo(x + totalWidth, y + rowH).lineWidth(0.5).strokeColor(COLORS.border).stroke()
  doc.restore()
  return y + rowH
}

function drawPageFooter (
  doc: PDFKit.PDFDocument,
  context: StatementPdfContext,
  page: number,
  totalPages: number,
) {
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
  doc.text(
    `${context.organizationName} · ${context.buildingName} · Página ${page} de ${totalPages} · ${formatDate(new Date())}`,
    MARGIN,
    FOOTER_Y,
    { width: CONTENT_WIDTH, align: 'center', lineBreak: false },
  )
}

function truncate (value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function formatMoney (value: number) {
  return `S/ ${value.toFixed(2)}`
}

function formatDate (value: Date | string) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-PE')
}

function formatPeriodLabel (period: string) {
  const [y, m] = period.split('-')
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const idx = parseInt(m, 10) - 1
  return `${months[idx] ?? m} ${y}`
}

function translateStatus (status: string) {
  const map: Record<string, string> = {
    PAID: 'Pagado',
    PENDING: 'Pendiente',
    PARTIAL: 'Parcial',
    OVERDUE: 'Vencido',
  }
  return map[status] ?? status
}

export function buildStatementForPdfMode (
  statement: StatementPdfData & {
    paidPeriods?: unknown[]
    pendingDebts?: unknown[]
  },
  mode: StatementPdfMode,
): StatementPdfData {
  const sorted = [...statement.fees].sort((a, b) => b.period.localeCompare(a.period))
  const fees = mode === 'latest'
    ? (sorted.length ? [sorted[0]] : [])
    : [...statement.fees].sort((a, b) => a.period.localeCompare(b.period))

  if (mode === 'latest' && fees.length === 1) {
    const fee = fees[0]
    return {
      unit: statement.unit,
      owner: statement.owner,
      fees,
      summary: {
        totalCharged: fee.amount,
        totalPaid: fee.paidAmount,
        balance: fee.balance,
        pendingFees: fee.balance > 0 ? 1 : 0,
      },
    }
  }

  return {
    unit: statement.unit,
    owner: statement.owner,
    fees,
    summary: statement.summary,
  }
}
