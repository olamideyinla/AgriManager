import { describe, it, expect } from 'vitest'
import {
  lineItemTotal,
  computeItemTotals,
  calculateDocumentTotals,
  calculateChangeDue,
  updateInvoiceStatus,
} from '../services/document-calculator'
import type { Invoice, InvoicePayment } from '../../../shared/types'

// ── lineItemTotal ─────────────────────────────────────────────────────────────

describe('lineItemTotal', () => {
  it('multiplies quantity × unitPrice', () => {
    expect(lineItemTotal(10, 5)).toBe(50)
  })

  it('rounds to 2 decimals', () => {
    expect(lineItemTotal(3, 1.005)).toBe(3.01)
  })

  it('handles fractional quantities', () => {
    expect(lineItemTotal(1.5, 100)).toBe(150)
  })
})

// ── computeItemTotals ─────────────────────────────────────────────────────────

describe('computeItemTotals', () => {
  it('returns lineTotal', () => {
    expect(computeItemTotals({ quantity: 4, unitPrice: 25 })).toEqual({ lineTotal: 100 })
  })
})

// ── calculateDocumentTotals ───────────────────────────────────────────────────

describe('calculateDocumentTotals', () => {
  const items = [
    { quantity: 10, unitPrice: 100 },
    { quantity: 5,  unitPrice: 50  },
  ]

  it('calculates subtotal with no tax no discount', () => {
    const result = calculateDocumentTotals(items, null, false, null, null)
    expect(result.subtotal).toBe(1250)
    expect(result.taxAmount).toBe(0)
    expect(result.discountAmount).toBe(0)
    expect(result.totalAmount).toBe(1250)
  })

  it('applies percentage discount', () => {
    const result = calculateDocumentTotals(items, null, false, 10, 'percentage')
    expect(result.discountAmount).toBe(125)
    expect(result.totalAmount).toBe(1125)
  })

  it('applies flat discount', () => {
    const result = calculateDocumentTotals(items, null, false, 50, 'flat')
    expect(result.discountAmount).toBe(50)
    expect(result.totalAmount).toBe(1200)
  })

  it('applies tax after discount', () => {
    const result = calculateDocumentTotals(items, 16, true, 0, null)
    expect(result.taxAmount).toBe(200)
    expect(result.totalAmount).toBe(1450)
  })

  it('applies tax on discounted subtotal', () => {
    const result = calculateDocumentTotals(items, 10, true, 250, 'flat')
    // subtotal=1250, discount=250, taxable=1000, tax=100
    expect(result.taxAmount).toBe(100)
    expect(result.totalAmount).toBe(1100)
  })

  it('tax = 0 when taxEnabled = false', () => {
    const result = calculateDocumentTotals(items, 16, false, null, null)
    expect(result.taxAmount).toBe(0)
  })

  it('flat discount capped at subtotal', () => {
    const result = calculateDocumentTotals(items, null, false, 9999, 'flat')
    expect(result.discountAmount).toBe(1250)
    expect(result.totalAmount).toBe(0)
  })

  it('handles empty items list', () => {
    const result = calculateDocumentTotals([], 16, true, null, null)
    expect(result.subtotal).toBe(0)
    expect(result.totalAmount).toBe(0)
  })
})

// ── calculateChangeDue ────────────────────────────────────────────────────────

describe('calculateChangeDue', () => {
  it('returns change when overpaid', () => {
    expect(calculateChangeDue(100, 150)).toBe(50)
  })

  it('returns 0 when exact amount', () => {
    expect(calculateChangeDue(100, 100)).toBe(0)
  })

  it('returns 0 when underpaid (no negative change)', () => {
    expect(calculateChangeDue(100, 80)).toBe(0)
  })
})

// ── updateInvoiceStatus ───────────────────────────────────────────────────────

describe('updateInvoiceStatus', () => {
  const invoice = { totalAmount: 1000, status: 'sent' as Invoice['status'] }

  it('status = paid when fully paid', () => {
    const payments: Pick<InvoicePayment, 'amount'>[] = [{ amount: 1000 }]
    const result = updateInvoiceStatus(invoice, payments)
    expect(result.status).toBe('paid')
    expect(result.amountDue).toBe(0)
  })

  it('status = partially_paid when partial payment', () => {
    const payments: Pick<InvoicePayment, 'amount'>[] = [{ amount: 500 }]
    const result = updateInvoiceStatus(invoice, payments)
    expect(result.status).toBe('partially_paid')
    expect(result.amountPaid).toBe(500)
    expect(result.amountDue).toBe(500)
  })

  it('status = sent with no payments', () => {
    const result = updateInvoiceStatus(invoice, [])
    expect(result.status).toBe('sent')
    expect(result.amountPaid).toBe(0)
  })

  it('preserves cancelled status', () => {
    const cancelled = { totalAmount: 500, status: 'cancelled' as Invoice['status'] }
    const result = updateInvoiceStatus(cancelled, [{ amount: 500 }])
    expect(result.status).toBe('cancelled')
  })

  it('handles multiple payments', () => {
    const payments: Pick<InvoicePayment, 'amount'>[] = [
      { amount: 300 },
      { amount: 400 },
      { amount: 300 },
    ]
    const result = updateInvoiceStatus(invoice, payments)
    expect(result.status).toBe('paid')
    expect(result.amountPaid).toBe(1000)
  })
})
