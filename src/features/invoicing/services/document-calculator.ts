import type { Invoice, InvoiceItem, InvoicePayment, ReceiptItem, DiscountType } from '../../../shared/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocumentTotals {
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
}

// ── Line item helpers ─────────────────────────────────────────────────────────

export function lineItemTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100
}

export function computeItemTotals(item: Pick<InvoiceItem | ReceiptItem, 'quantity' | 'unitPrice'>): {
  lineTotal: number
} {
  return { lineTotal: lineItemTotal(item.quantity, item.unitPrice) }
}

// ── Document totals ───────────────────────────────────────────────────────────

export function calculateDocumentTotals(
  items: Pick<InvoiceItem | ReceiptItem, 'quantity' | 'unitPrice'>[],
  taxRate: number | null,
  taxEnabled: boolean,
  discount: number | null,
  discountType: DiscountType | null,
): DocumentTotals {
  const subtotal = items.reduce((sum, item) => sum + lineItemTotal(item.quantity, item.unitPrice), 0)

  let discountAmount = 0
  if (discount && discount > 0) {
    if (discountType === 'percentage') {
      discountAmount = Math.round(subtotal * (discount / 100) * 100) / 100
    } else {
      discountAmount = Math.min(discount, subtotal)
    }
  }

  const taxableAmount = subtotal - discountAmount
  let taxAmount = 0
  if (taxEnabled && taxRate && taxRate > 0) {
    taxAmount = Math.round(taxableAmount * (taxRate / 100) * 100) / 100
  }

  const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100

  return { subtotal, taxAmount, discountAmount, totalAmount }
}

// ── Receipt helpers ───────────────────────────────────────────────────────────

export function calculateChangeDue(totalAmount: number, amountReceived: number): number {
  return Math.max(0, Math.round((amountReceived - totalAmount) * 100) / 100)
}

// ── Invoice payment status ────────────────────────────────────────────────────

export function updateInvoiceStatus(
  invoice: Pick<Invoice, 'totalAmount' | 'status'>,
  payments: Pick<InvoicePayment, 'amount'>[],
): { amountPaid: number; amountDue: number; status: Invoice['status'] } {
  const amountPaid = Math.round(payments.reduce((s, p) => s + p.amount, 0) * 100) / 100
  const amountDue  = Math.max(0, Math.round((invoice.totalAmount - amountPaid) * 100) / 100)

  let status: Invoice['status']
  if (invoice.status === 'cancelled') {
    status = 'cancelled'
  } else if (amountDue <= 0 && amountPaid > 0) {
    status = 'paid'
  } else if (amountPaid > 0) {
    status = 'partially_paid'
  } else {
    status = invoice.status === 'draft' ? 'draft' : 'sent'
  }

  return { amountPaid, amountDue, status }
}
