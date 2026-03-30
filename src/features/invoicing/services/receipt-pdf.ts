import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'
import { formatCurrency } from '../../../core/utils/number'
import type { ReceiptWithItems, InvoiceSettings } from '../../../shared/types'

// ── Colors ────────────────────────────────────────────────────────────────────

const GREEN:  [number, number, number] = [45, 106, 79]
const WHITE:  [number, number, number] = [255, 255, 255]
const GRAY:   [number, number, number] = [107, 114, 128]
const DARK:   [number, number, number] = [17, 24, 39]
const LGRAY:  [number, number, number] = [249, 250, 251]
const NEUTRAL:[number, number, number] = [127, 140, 141]

function fmt(amount: number, currency: string): string {
  return formatCurrency(amount, currency)
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateReceiptPDF(
  receipt: ReceiptWithItems,
  settings: InvoiceSettings,
  farmName: string,
  linkedInvoiceNumber?: string,
): Blob {
  // A5 portrait: 148 × 210 mm
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
  const pw  = doc.internal.pageSize.getWidth()  // 148
  const lm  = 12
  const rm  = pw - lm

  // ── Header band ─────────────────────────────────────────────────────────────
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pw, 28, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text(settings.farmName ?? farmName, lm, 11)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  if (settings.farmPhone) doc.text(settings.farmPhone, lm, 17)
  if (settings.farmAddress) doc.text(settings.farmAddress, lm, 22)

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('RECEIPT', rm, 12, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(receipt.receiptNumber, rm, 20, { align: 'right' })

  // ── CANCELLED watermark ──────────────────────────────────────────────────────
  if (receipt.status === 'cancelled') {
    doc.setFontSize(50)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38)
    doc.setGState(new (doc as any).GState({ opacity: 0.10 }))
    doc.text('CANCELLED', pw / 2, 130, { align: 'center', angle: 45 })
    doc.setGState(new (doc as any).GState({ opacity: 1 }))
    doc.setTextColor(...DARK)
  }

  // ── Customer info + date ─────────────────────────────────────────────────────
  let y = 36
  doc.setTextColor(...GRAY)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('RECEIVED FROM', lm, y)
  y += 4
  doc.setTextColor(...DARK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(receipt.buyerName, lm, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  if (receipt.buyerPhone) { doc.text(receipt.buyerPhone, lm, y); y += 4 }

  // Date / type on right
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('Date:', 95, 36)
  doc.setTextColor(...DARK)
  doc.text(format(parseISO(receipt.date), 'd MMM yyyy'), rm, 36, { align: 'right' })
  doc.setTextColor(...GRAY)
  doc.text('Type:', 95, 42)
  doc.setTextColor(...DARK)
  doc.text(receipt.type.replace('_', ' ').toUpperCase(), rm, 42, { align: 'right' })
  if (linkedInvoiceNumber) {
    doc.setTextColor(...GRAY)
    doc.text('Invoice:', 95, 48)
    doc.setTextColor(...DARK)
    doc.text(linkedInvoiceNumber, rm, 48, { align: 'right' })
  }

  // ── Line items ───────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y + 4,
    margin: { left: lm, right: lm },
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: receipt.items.length > 0
      ? receipt.items.map(item => [
          item.description,
          String(item.quantity),
          fmt(item.unitPrice, receipt.currency),
          fmt(item.total, receipt.currency),
        ])
      : [['—', '', '', '']],
    headStyles:         { fillColor: GREEN, textColor: WHITE, fontSize: 8 },
    bodyStyles:         { fontSize: 8 },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { halign: 'right', cellWidth: 14 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 22 },
    },
  })

  // ── Totals ───────────────────────────────────────────────────────────────────
  let ty = (doc as any).lastAutoTable.finalY + 5
  const tx = 85

  const totalsRows: [string, string][] = [['Subtotal', fmt(receipt.subtotal, receipt.currency)]]
  if (receipt.discountAmount && receipt.discountAmount > 0) {
    const label = receipt.discountType === 'percentage'
      ? `Discount (${receipt.discount}%)`
      : 'Discount'
    totalsRows.push([label, `- ${fmt(receipt.discountAmount, receipt.currency)}`])
  }
  if (receipt.taxAmount && receipt.taxAmount > 0) {
    totalsRows.push([
      `${receipt.taxLabel ?? 'Tax'} (${receipt.taxRate}%)`,
      fmt(receipt.taxAmount, receipt.currency),
    ])
  }

  doc.setFontSize(8)
  for (const [label, value] of totalsRows) {
    doc.setTextColor(...GRAY)
    doc.text(label, tx, ty)
    doc.setTextColor(...DARK)
    doc.text(value, rm, ty, { align: 'right' })
    ty += 5
  }

  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.3)
  doc.line(tx, ty, rm, ty)
  ty += 3

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...GREEN)
  doc.text('TOTAL', tx, ty)
  doc.text(fmt(receipt.totalAmount, receipt.currency), rm, ty, { align: 'right' })
  ty += 6

  // Payment method + change
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('Payment Method:', tx, ty)
  doc.setTextColor(...DARK)
  doc.text(receipt.paymentMethod.replace('_', ' ').toUpperCase(), rm, ty, { align: 'right' })
  ty += 5

  if (receipt.amountReceived >= receipt.totalAmount) {
    doc.setTextColor(...GRAY)
    doc.text('Amount Received:', tx, ty)
    doc.setTextColor(...DARK)
    doc.text(fmt(receipt.amountReceived, receipt.currency), rm, ty, { align: 'right' })
    ty += 5
    doc.setTextColor(...GRAY)
    doc.text('Change:', tx, ty)
    doc.setTextColor(...DARK)
    doc.text(fmt(receipt.changeDue, receipt.currency), rm, ty, { align: 'right' })
    ty += 5
  }

  if (receipt.paymentReference) {
    doc.setTextColor(...GRAY)
    doc.text('Reference:', tx, ty)
    doc.setTextColor(...DARK)
    doc.text(receipt.paymentReference, rm, ty, { align: 'right' })
    ty += 5
  }

  // ── Footer note ──────────────────────────────────────────────────────────────
  const footer = receipt.notes ?? settings.receiptFooter ?? 'Thank you for your business!'
  ty += 4
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...NEUTRAL)
  const lines = doc.splitTextToSize(footer, rm - lm)
  doc.text(lines, pw / 2, ty, { align: 'center' })

  return doc.output('blob')
}
