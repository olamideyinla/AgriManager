import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Download, Share2, Plus, Loader2, Check, X } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { db } from '../../core/database/db'
import { newId, nowIso } from '../../shared/types/base'
import { updateInvoiceStatus } from './services/document-calculator'
import { generateInvoicePDF } from './services/invoice-pdf'
import { getOrCreateInvoiceSettings } from './services/document-numbers'
import type { InvoicePayment, InvoicePaymentMethod } from '../../shared/types'

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  draft:          'bg-gray-100 text-gray-600',
  sent:           'bg-blue-100 text-blue-700',
  paid:           'bg-emerald-100 text-emerald-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  overdue:        'bg-red-100 text-red-700',
  cancelled:      'bg-gray-100 text-gray-400',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  )
}

// ── Record payment sheet ──────────────────────────────────────────────────────

function RecordPaymentSheet({
  invoiceId,
  amountDue,
  currency,
  onClose,
  onSaved,
}: {
  invoiceId: string
  amountDue: number
  currency: string
  onClose: () => void
  onSaved: () => void
}) {
  const { fmt } = useCurrency()
  const [amount, setAmount]         = useState(String(amountDue))
  const [method, setMethod]         = useState<InvoicePaymentMethod>('cash')
  const [reference, setReference]   = useState('')
  const [date, setDate]             = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving]         = useState(false)

  const handleSave = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setSaving(true)
    try {
      const ts = nowIso()
      const payment: InvoicePayment = {
        id:                           newId(),
        invoiceId,
        receiptId:                    null,
        date,
        amount:                       amt,
        paymentMethod:                method,
        reference:                    reference || null,
        notes:                        null,
        linkedFinancialTransactionId: null,
        createdAt:                    ts,
        updatedAt:                    ts,
        syncStatus:                   'pending',
      }

      const [invoice, allPayments] = await Promise.all([
        db.invoices.get(invoiceId),
        db.invoicePayments.where('invoiceId').equals(invoiceId).toArray(),
      ])

      if (!invoice) throw new Error('Invoice not found')

      const updatedPayments = [...allPayments, payment]
      const { amountPaid, amountDue: newDue, status } = updateInvoiceStatus(invoice, updatedPayments)

      await db.transaction('rw', [db.invoices, db.invoicePayments], async () => {
        await db.invoicePayments.add(payment)
        await db.invoices.update(invoiceId, {
          amountPaid,
          amountDue:  newDue,
          status,
          updatedAt:  ts,
          syncStatus: 'pending',
        })
      })

      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl p-6 safe-bottom"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Record Payment</h2>
          <button onClick={onClose} className="touch-target text-gray-400"><X size={20} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label-sm">Amount <span className="text-gray-400">(due: {fmt(amountDue)})</span></label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="input-base text-right text-lg font-semibold"
              step="any"
            />
          </div>
          <div>
            <label className="label-sm">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-sm">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value as InvoicePaymentMethod)} className="input-base">
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label-sm">Reference</label>
            <input value={reference} onChange={e => setReference(e.target.value)} className="input-base" placeholder="e.g. Mpesa code" />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary-600 text-white font-semibold py-3.5 rounded-xl disabled:opacity-50"
          >
            {saving ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { id }          = useParams<{ id: string }>()
  const navigate        = useNavigate()
  const appUser         = useAuthStore(s => s.appUser)
  const { fmt, currency } = useCurrency()
  const [showPaySheet, setShowPaySheet] = useState(false)
  const [downloading, setDownloading]   = useState(false)
  const [copied, setCopied]             = useState(false)

  const invoice = useLiveQuery(() => id ? db.invoices.get(id) : undefined, [id])
  const items   = useLiveQuery(() => id ? db.invoiceItems.where('invoiceId').equals(id).toArray() : [], [id], [])
  const payments= useLiveQuery(() => id ? db.invoicePayments.where('invoiceId').equals(id).toArray() : [], [id], [])
  const settings= useLiveQuery(async () => {
    if (!appUser?.organizationId) return null
    return getOrCreateInvoiceSettings(appUser.organizationId)
  }, [appUser?.organizationId])
  const org     = useLiveQuery(() => appUser?.organizationId ? db.organizations.get(appUser.organizationId) : undefined, [appUser?.organizationId])

  if (!invoice) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary-500" />
      </div>
    )
  }

  const handleDownload = async () => {
    if (!settings || !org) return
    setDownloading(true)
    try {
      const blob = generateInvoicePDF(
        { ...invoice, items: items ?? [], payments: payments ?? [] },
        settings,
        org.name,
      )
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href    = url
      a.download= `${invoice.invoiceNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  const handleMarkSent = async () => {
    const ts = nowIso()
    await db.invoices.update(invoice.id, { status: 'sent', updatedAt: ts, syncStatus: 'pending' })
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this invoice?')) return
    const ts = nowIso()
    await db.invoices.update(invoice.id, { status: 'cancelled', updatedAt: ts, syncStatus: 'pending' })
  }

  const shareText = async () => {
    const text = [
      `Invoice ${invoice.invoiceNumber}`,
      `From: ${org?.name ?? ''}`,
      `To: ${invoice.buyerName}`,
      `Total: ${fmt(invoice.totalAmount)}`,
      invoice.amountDue > 0 ? `Balance Due: ${fmt(invoice.amountDue)}` : 'PAID',
      `Due: ${format(parseISO(invoice.dueDate), 'd MMM yyyy')}`,
    ].join('\n')

    if (navigator.share) {
      await navigator.share({ text })
    } else {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col safe-top safe-bottom">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="touch-target text-gray-500">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">{invoice.invoiceNumber}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <button onClick={handleDownload} disabled={downloading} className="touch-target text-gray-500">
            {downloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          </button>
          <button onClick={shareText} className="touch-target text-gray-500">
            {copied ? <Check size={20} className="text-emerald-500" /> : <Share2 size={20} />}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {invoice.status === 'draft' && (
            <button onClick={handleMarkSent} className="flex-1 bg-blue-50 text-blue-700 text-sm font-semibold py-2 rounded-xl">
              Mark as Sent
            </button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'partially_paid' || invoice.status === 'overdue') && (
            <button onClick={() => setShowPaySheet(true)} className="flex-1 bg-primary-600 text-white text-sm font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
              <Plus size={16} /> Record Payment
            </button>
          )}
          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <button onClick={handleCancel} className="bg-red-50 text-red-600 text-sm font-medium py-2 px-3 rounded-xl">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Summary card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-gray-400">Billed to</p>
              <p className="text-base font-bold text-gray-900">{invoice.buyerName}</p>
              {invoice.buyerPhone && <p className="text-xs text-gray-500">{invoice.buyerPhone}</p>}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary-700">{fmt(invoice.totalAmount)}</p>
              {invoice.amountDue > 0 && (
                <p className="text-xs text-red-500">Due {fmt(invoice.amountDue)}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Issue Date</p>
              <p className="font-medium text-gray-800">{format(parseISO(invoice.issueDate), 'd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Due Date</p>
              <p className="font-medium text-gray-800">{format(parseISO(invoice.dueDate), 'd MMM yyyy')}</p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Items</h2>
          </div>
          {(items ?? []).map(item => (
            <div key={item.id} className="flex items-start justify-between px-4 py-3 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.description}</p>
                <p className="text-xs text-gray-400">{item.quantity} {item.unit} × {fmt(item.unitPrice)}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900 ml-3">{fmt(item.total)}</p>
            </div>
          ))}

          {/* Totals */}
          <div className="px-4 py-3 bg-gray-50 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
            {invoice.discountAmount && invoice.discountAmount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>{invoice.discountType === 'percentage' ? `Discount (${invoice.discount}%)` : 'Discount'}</span>
                <span>- {fmt(invoice.discountAmount)}</span>
              </div>
            )}
            {invoice.taxAmount && invoice.taxAmount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>{invoice.taxLabel ?? 'Tax'} ({invoice.taxRate}%)</span>
                <span>{fmt(invoice.taxAmount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-1.5 flex justify-between font-bold text-gray-900 text-base">
              <span>Total</span><span>{fmt(invoice.totalAmount)}</span>
            </div>
            {invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{fmt(invoice.amountPaid)}</span></div>
                <div className="flex justify-between font-semibold text-red-600"><span>Balance Due</span><span>{fmt(invoice.amountDue)}</span></div>
              </>
            )}
          </div>
        </div>

        {/* Payment history */}
        {(payments ?? []).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Payments</h2>
            </div>
            {(payments ?? []).map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{fmt(p.amount)}</p>
                  <p className="text-xs text-gray-400">{format(parseISO(p.date), 'd MMM yyyy')} · {p.paymentMethod.replace('_', ' ')}</p>
                  {p.reference && <p className="text-xs text-gray-400">Ref: {p.reference}</p>}
                </div>
                <Check size={16} className="text-emerald-500 shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {(invoice.notes || invoice.terms) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            {invoice.notes && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Terms</p>
                <p className="text-sm text-gray-700">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}

      </div>

      {showPaySheet && (
        <RecordPaymentSheet
          invoiceId={invoice.id}
          amountDue={invoice.amountDue}
          currency={currency}
          onClose={() => setShowPaySheet(false)}
          onSaved={() => {}}
        />
      )}
    </div>
  )
}
