import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { Plus, FileText, Receipt, Settings, ArrowLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { db } from '../../core/database/db'
import { FeatureGate } from '../../shared/components/FeatureGate'
import type { Invoice, Receipt as ReceiptType } from '../../shared/types'

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  draft:           'bg-gray-100 text-gray-600',
  sent:            'bg-blue-100 text-blue-700',
  paid:            'bg-emerald-100 text-emerald-700',
  partially_paid:  'bg-yellow-100 text-yellow-700',
  overdue:         'bg-red-100 text-red-700',
  cancelled:       'bg-gray-100 text-gray-400',
  issued:          'bg-emerald-100 text-emerald-700',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

// ── Invoice row ───────────────────────────────────────────────────────────────

function InvoiceRow({ invoice, fmt }: { invoice: Invoice; fmt: (n: number) => string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/invoicing/invoice/${invoice.id}`)}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 text-left active:bg-gray-50"
    >
      <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
        <FileText size={18} className="text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">{invoice.invoiceNumber}</span>
          <StatusBadge status={invoice.status} />
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{invoice.buyerName}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-gray-900">{fmt(invoice.totalAmount)}</p>
        {invoice.amountDue > 0 && invoice.status !== 'draft' && (
          <p className="text-xs text-red-500">Due {fmt(invoice.amountDue)}</p>
        )}
        <p className="text-xs text-gray-400">{format(parseISO(invoice.issueDate), 'd MMM')}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 shrink-0" />
    </button>
  )
}

// ── Receipt row ───────────────────────────────────────────────────────────────

function ReceiptRow({ receipt, fmt }: { receipt: ReceiptType; fmt: (n: number) => string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/invoicing/receipt/${receipt.id}`)}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 text-left active:bg-gray-50"
    >
      <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
        <Receipt size={18} className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">{receipt.receiptNumber}</span>
          <StatusBadge status={receipt.status} />
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{receipt.buyerName}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-gray-900">{fmt(receipt.totalAmount)}</p>
        <p className="text-xs text-gray-400">{format(parseISO(receipt.date), 'd MMM')}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 shrink-0" />
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'invoices' | 'receipts'

export default function InvoicingPage() {
  const navigate       = useNavigate()
  const organizationId = useAuthStore(s => s.appUser?.organizationId)
  const { fmt }        = useCurrency()
  const [tab, setTab]  = useState<Tab>('invoices')

  const invoices = useLiveQuery(async () => {
    if (!organizationId) return []
    return db.invoices
      .where('organizationId').equals(organizationId)
      .reverse()
      .sortBy('issueDate')
  }, [organizationId], [])

  const receipts = useLiveQuery(async () => {
    if (!organizationId) return []
    return db.receipts
      .where('organizationId').equals(organizationId)
      .reverse()
      .sortBy('date')
  }, [organizationId], [])

  // Summary metrics
  const totalOutstanding = (invoices ?? [])
    .filter(i => i.status === 'sent' || i.status === 'partially_paid' || i.status === 'overdue')
    .reduce((s, i) => s + i.amountDue, 0)
  const overdue = (invoices ?? []).filter(i => i.status === 'overdue')

  return (
    <FeatureGate feature="invoicing" softLock>
      <div className="min-h-dvh bg-gray-50 flex flex-col safe-top safe-bottom">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="touch-target text-gray-500">
                <ArrowLeft size={22} />
              </button>
              <h1 className="text-lg font-bold text-gray-900">Invoicing</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/invoicing/settings')}
                className="touch-target text-gray-500"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={() => navigate(tab === 'invoices' ? '/invoicing/create-invoice' : '/invoicing/create-receipt')}
                className="flex items-center gap-1 bg-primary-600 text-white text-sm font-semibold px-3 py-2 rounded-lg active:bg-primary-700"
              >
                <Plus size={16} />
                {tab === 'invoices' ? 'Invoice' : 'Receipt'}
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1 bg-blue-50 rounded-xl px-3 py-2">
              <p className="text-xs text-blue-600 font-medium">Outstanding</p>
              <p className="text-base font-bold text-blue-800">{fmt(totalOutstanding)}</p>
            </div>
            <div className="flex-1 bg-red-50 rounded-xl px-3 py-2">
              <p className="text-xs text-red-600 font-medium">Overdue</p>
              <p className="text-base font-bold text-red-800">{overdue.length} invoice{overdue.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(['invoices', 'receipts'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${
                  tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'invoices' && (
            <>
              {(invoices ?? []).length === 0 ? (
                <EmptyState
                  icon={<FileText size={32} className="text-gray-300" />}
                  title="No invoices yet"
                  action="Create Invoice"
                  onAction={() => navigate('/invoicing/create-invoice')}
                />
              ) : (
                (invoices ?? []).map(inv => (
                  <InvoiceRow key={inv.id} invoice={inv} fmt={fmt} />
                ))
              )}
            </>
          )}
          {tab === 'receipts' && (
            <>
              {(receipts ?? []).length === 0 ? (
                <EmptyState
                  icon={<Receipt size={32} className="text-gray-300" />}
                  title="No receipts yet"
                  action="Create Receipt"
                  onAction={() => navigate('/invoicing/create-receipt')}
                />
              ) : (
                (receipts ?? []).map(rec => (
                  <ReceiptRow key={rec.id} receipt={rec} fmt={fmt} />
                ))
              )}
            </>
          )}
        </div>
      </div>
    </FeatureGate>
  )
}

function EmptyState({
  icon, title, action, onAction,
}: {
  icon: React.ReactNode
  title: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
      <div className="mb-3">{icon}</div>
      <p className="text-gray-500 text-sm mb-4">{title}</p>
      <button
        onClick={onAction}
        className="bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:bg-primary-700"
      >
        {action}
      </button>
    </div>
  )
}
