import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Download, Share2, Loader2, Check, X } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { db } from '../../core/database/db'
import { nowIso } from '../../shared/types/base'
import { generateReceiptPDF } from './services/receipt-pdf'
import { getOrCreateInvoiceSettings } from './services/document-numbers'

const STATUS_STYLE: Record<string, string> = {
  issued:    'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-400',
}

export default function ReceiptDetailPage() {
  const { id }          = useParams<{ id: string }>()
  const navigate        = useNavigate()
  const appUser         = useAuthStore(s => s.appUser)
  const { fmt }         = useCurrency()
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied]           = useState(false)

  const receipt  = useLiveQuery(() => id ? db.receipts.get(id) : undefined, [id])
  const items    = useLiveQuery(() => id ? db.receiptItems.where('receiptId').equals(id).toArray() : [], [id], [])
  const settings = useLiveQuery(async () => {
    if (!appUser?.organizationId) return null
    return getOrCreateInvoiceSettings(appUser.organizationId)
  }, [appUser?.organizationId])
  const org = useLiveQuery(() => appUser?.organizationId ? db.organizations.get(appUser.organizationId) : undefined, [appUser?.organizationId])

  const linkedInvoice = useLiveQuery(async () => {
    if (!receipt?.linkedInvoiceId) return null
    return db.invoices.get(receipt.linkedInvoiceId) ?? null
  }, [receipt?.linkedInvoiceId])

  if (!receipt) {
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
      const blob = generateReceiptPDF(
        { ...receipt, items: items ?? [] },
        settings,
        org.name,
        linkedInvoice?.invoiceNumber,
      )
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href    = url
      a.download= `${receipt.receiptNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this receipt?')) return
    await db.receipts.update(receipt.id, { status: 'cancelled', updatedAt: nowIso(), syncStatus: 'pending' })
  }

  const shareText = async () => {
    const text = [
      `Receipt ${receipt.receiptNumber}`,
      `From: ${org?.name ?? ''}`,
      `To: ${receipt.buyerName}`,
      `Total: ${fmt(receipt.totalAmount)}`,
      `Payment: ${receipt.paymentMethod.replace('_', ' ')}`,
      format(parseISO(receipt.date), 'd MMM yyyy'),
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
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="touch-target text-gray-500">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">{receipt.receiptNumber}</h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[receipt.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {receipt.status.toUpperCase()}
            </span>
          </div>
          <button onClick={handleDownload} disabled={downloading} className="touch-target text-gray-500">
            {downloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          </button>
          <button onClick={shareText} className="touch-target text-gray-500">
            {copied ? <Check size={20} className="text-emerald-500" /> : <Share2 size={20} />}
          </button>
          {receipt.status === 'issued' && (
            <button onClick={handleCancel} className="text-red-400 touch-target">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-gray-400">Received From</p>
              <p className="text-base font-bold text-gray-900">{receipt.buyerName}</p>
              {receipt.buyerPhone && <p className="text-xs text-gray-500">{receipt.buyerPhone}</p>}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary-700">{fmt(receipt.totalAmount)}</p>
              <p className="text-xs text-gray-400 capitalize">{receipt.type.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Date</p>
              <p className="font-medium text-gray-800">{format(parseISO(receipt.date), 'd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Payment Method</p>
              <p className="font-medium text-gray-800 capitalize">{receipt.paymentMethod.replace('_', ' ')}</p>
            </div>
            {receipt.paymentReference && (
              <div>
                <p className="text-xs text-gray-400">Reference</p>
                <p className="font-medium text-gray-800">{receipt.paymentReference}</p>
              </div>
            )}
            {linkedInvoice && (
              <div>
                <p className="text-xs text-gray-400">Invoice</p>
                <button
                  onClick={() => navigate(`/invoicing/invoice/${linkedInvoice.id}`)}
                  className="text-primary-600 font-medium text-sm underline"
                >
                  {linkedInvoice.invoiceNumber}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        {(items ?? []).length > 0 && (
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

            <div className="px-4 py-3 bg-gray-50 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{fmt(receipt.subtotal)}</span></div>
              {receipt.discountAmount && receipt.discountAmount > 0 && (
                <div className="flex justify-between text-orange-600"><span>Discount</span><span>- {fmt(receipt.discountAmount)}</span></div>
              )}
              {receipt.taxAmount && receipt.taxAmount > 0 && (
                <div className="flex justify-between text-gray-600"><span>{receipt.taxLabel ?? 'Tax'} ({receipt.taxRate}%)</span><span>{fmt(receipt.taxAmount)}</span></div>
              )}
              <div className="border-t border-gray-200 pt-1.5 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span><span>{fmt(receipt.totalAmount)}</span>
              </div>
              {receipt.amountReceived > receipt.totalAmount && (
                <>
                  <div className="flex justify-between text-gray-600"><span>Received</span><span>{fmt(receipt.amountReceived)}</span></div>
                  <div className="flex justify-between text-emerald-600 font-medium"><span>Change</span><span>{fmt(receipt.changeDue)}</span></div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {receipt.notes && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">Notes</p>
            <p className="text-sm text-gray-700">{receipt.notes}</p>
          </div>
        )}

      </div>
    </div>
  )
}
