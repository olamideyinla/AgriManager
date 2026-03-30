import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'
import { formatCurrency } from '../../../core/utils/number'
import type { InvoiceWithItems, InvoiceSettings } from '../../../shared/types'

// ── Colors ────────────────────────────────────────────────────────────────────

const GREEN:  [number, number, number] = [45, 106, 79]
const WHITE:  [number, number, number] = [255, 255, 255]
const GRAY:   [number, number, number] = [107, 114, 128]
const DARK:   [number, number, number] = [17, 24, 39]
const LGRAY:  [number, number, number] = [249, 250, 251]
const NEUTRAL:[number, number, number] = [127, 140, 141]

// ── Helper ────────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string): string {
  return formatCurrency(amount, currency)
}

function addPageFooter(doc: jsPDF, farmName: string): void {
  const count = doc.getNumberOfPages()
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const ts = format(new Date(), 'dd MMM yyyy HH:mm')
  for (let i = 1; i <= count; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...NEUTRAL)
    doc.text(
      `${farmName}  •  Page ${i} of ${count}  •  Generated ${ts}`,
      w / 2, h - 5, { align: 'center' },
    )
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateInvoicePDF(
  invoice: InvoiceWithItems,
  settings: InvoiceSettings,
  farmName: string,
): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw  = doc.internal.pageSize.getWidth()
  const lm  = 15
  const rm  = pw - lm

  // ── Header band ─────────────────────────────────────────────────────────────
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pw, 34, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(settings.farmName ?? farmName, lm, 13)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  if (settings.farmAddress) doc.text(settings.farmAddress, lm, 19)
  if (settings.farmPhone)   doc.text(settings.farmPhone,   lm, 25)
  if (settings.farmEmail)   doc.text(settings.farmEmail,   lm, 31)

  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', rm, 15, { align: 'right' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.invoiceNumber, rm, 24, { align: 'right' })

  // ── Watermark ────────────────────────────────────────────────────────────────
  if (invoice.status === 'paid') {
    doc.setFontSize(60)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(45, 106, 79)
    doc.setGState(new (doc as any).GState({ opacity: 0.10 }))
    doc.text('PAID', pw / 2, 150, { align: 'center', angle: 45 })
    doc.setGState(new (doc as any).GState({ opacity: 1 }))
    doc.setTextColor(...DARK)
  } else if (invoice.status === 'cancelled') {
    doc.setFontSize(60)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38)
    doc.setGState(new (doc as any).GState({ opacity: 0.10 }))
    doc.text('CANCELLED', pw / 2, 150, { align: 'center', angle: 45 })
    doc.setGState(new (doc as any).GState({ opacity: 1 }))
    doc.setTextColor(...DARK)
  }

  // ── Bill-to + dates ──────────────────────────────────────────────────────────
  let y = 44
  doc.setTextColor(...GRAY)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO', lm, y)
  y += 5
  doc.setTextColor(...DARK)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.buyerName, lm, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  if (invoice.buyerPhone)   { doc.text(invoice.buyerPhone,   lm, y); y += 4 }
  if (invoice.buyerEmail)   { doc.text(invoice.buyerEmail,   lm, y); y += 4 }
  if (invoice.buyerAddress) { doc.text(invoice.buyerAddress, lm, y) }

  const dateRows: [string, string][] = [
    ['Issue Date:', format(parseISO(invoice.issueDate), 'd MMM yyyy')],
    ['Due Date:',   format(parseISO(invoice.dueDate),   'd MMM yyyy')],
    ['Status:',     invoice.status.replace('_', ' ').toUpperCase()],
  ]
  let dy = 44
  for (const [label, value] of dateRows) {
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text(label, 125, dy)
    doc.setTextColor(...DARK)
    doc.text(value, rm, dy, { align: 'right' })
    dy += 6
  }

  // ── Line items ───────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: 78,
    margin: { left: lm, right: lm },
    head: [['Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
    body: invoice.items.map(item => [
      item.description,
      String(item.quantity),
      item.unit,
      fmt(item.unitPrice, invoice.currency),
      fmt(item.total, invoice.currency),
    ]),
    headStyles:         { fillColor: GREEN, textColor: WHITE, fontSize: 9 },
    bodyStyles:         { fontSize: 9 },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { halign: 'right', cellWidth: 14 },
      2: { cellWidth: 18 },
      3: { halign: 'right', cellWidth: 34 },
      4: { halign: 'right', cellWidth: 34 },
    },
  })

  // ── Totals ───────────────────────────────────────────────────────────────────
  let ty = (doc as any).lastAutoTable.finalY + 6
  const tx = 125

  const subtotalRows: [string, string][] = [['Subtotal', fmt(invoice.subtotal, invoice.currency)]]
  if (invoice.discountAmount && invoice.discountAmount > 0) {
    const discLabel = invoice.discountType === 'percentage'
      ? `Discount (${invoice.discount}%)`
      : 'Discount'
    subtotalRows.push([discLabel, `- ${fmt(invoice.discountAmount, invoice.currency)}`])
  }
  if (invoice.taxAmount && invoice.taxAmount > 0) {
    subtotalRows.push([
      `${invoice.taxLabel ?? 'Tax'} (${invoice.taxRate}%)`,
      fmt(invoice.taxAmount, invoice.currency),
    ])
  }

  doc.setFontSize(9)
  for (const [label, value] of subtotalRows) {
    doc.setTextColor(...GRAY)
    doc.text(label, tx, ty)
    doc.setTextColor(...DARK)
    doc.text(value, rm, ty, { align: 'right' })
    ty += 6
  }

  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.4)
  doc.line(tx, ty, rm, ty)
  ty += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...GREEN)
  doc.text('TOTAL', tx, ty)
  doc.text(fmt(invoice.totalAmount, invoice.currency), rm, ty, { align: 'right' })
  ty += 6

  if (invoice.amountPaid > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text('Amount Paid', tx, ty)
    doc.setTextColor(39, 174, 96)
    doc.text(fmt(invoice.amountPaid, invoice.currency), rm, ty, { align: 'right' })
    ty += 5
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38)
    doc.text('BALANCE DUE', tx, ty)
    doc.text(fmt(invoice.amountDue, invoice.currency), rm, ty, { align: 'right' })
    ty += 5
  }

  // ── Payment history ───────────────────────────────────────────────────────────
  if (invoice.payments.length > 0) {
    ty += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text('Payment History', lm, ty)
    ty += 4
    autoTable(doc, {
      startY: ty,
      margin: { left: lm, right: lm },
      head: [['Date', 'Method', 'Reference', 'Amount']],
      body: invoice.payments.map(p => [
        format(parseISO(p.date), 'd MMM yyyy'),
        p.paymentMethod.replace('_', ' '),
        p.reference ?? '-',
        fmt(p.amount, invoice.currency),
      ]),
      headStyles: { fillColor: LGRAY, textColor: GRAY, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 3: { halign: 'right' } },
    })
    ty = (doc as any).lastAutoTable.finalY + 4
  }

  // ── Footer: bank/mobile money/notes/terms ─────────────────────────────────────
  const footerBlocks: [string, string][] = []
  if (settings.bankDetails) footerBlocks.push(['Bank Details', settings.bankDetails])
  if (settings.mobileMoney) footerBlocks.push(['Mobile Money', settings.mobileMoney])
  if (invoice.notes)        footerBlocks.push(['Notes',        invoice.notes])
  const terms = invoice.terms ?? settings.defaultTerms
  if (terms)                footerBlocks.push(['Terms & Conditions', terms])

  if (footerBlocks.length > 0) {
    ty += 4
    for (const [label, text] of footerBlocks) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      doc.text(label.toUpperCase(), lm, ty)
      ty += 4
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...DARK)
      const lines = doc.splitTextToSize(text, rm - lm)
      doc.text(lines, lm, ty)
      ty += (lines as string[]).length * 4 + 4
    }
  }

  addPageFooter(doc, settings.farmName ?? farmName)
  return doc.output('blob')
}
