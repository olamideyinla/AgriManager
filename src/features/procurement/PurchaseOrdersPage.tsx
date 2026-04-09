import { useNavigate } from 'react-router-dom'
import { Plus, ShoppingCart, ChevronRight, Package, ArrowLeft } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAuthStore } from '../../stores/auth-store'
import { usePurchaseOrders } from '../../core/database/hooks/use-purchase-orders'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/database/db'
import { useCurrency } from '../../shared/hooks/useCurrency'
import type { PurchaseOrder, PurchaseOrderStatus } from '../../shared/types'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; cls: string }> = {
  draft:              { label: 'Draft',          cls: 'bg-gray-100 text-gray-600' },
  ordered:            { label: 'Ordered',        cls: 'bg-blue-100 text-blue-700' },
  partially_received: { label: 'Partial',        cls: 'bg-amber-100 text-amber-700' },
  received:           { label: 'Received',       cls: 'bg-emerald-100 text-emerald-700' },
  cancelled:          { label: 'Cancelled',      cls: 'bg-red-100 text-red-600' },
}

const STATUS_ORDER: PurchaseOrderStatus[] = [
  'ordered', 'partially_received', 'draft', 'received', 'cancelled',
]

// ── PO row ────────────────────────────────────────────────────────────────────

function PORow({ po, supplierName, itemCount }: {
  po: PurchaseOrder
  supplierName: string | undefined
  itemCount: number
}) {
  const navigate = useNavigate()
  const { fmt } = useCurrency()
  const cfg = STATUS_CONFIG[po.status]

  return (
    <button
      onClick={() => navigate(`/procurement/orders/${po.id}`)}
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
        <ShoppingCart size={18} className="text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {supplierName ?? 'No supplier'}
          </p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {format(parseISO(po.orderDate), 'd MMM yyyy')}
          {' · '}{itemCount} item{itemCount !== 1 ? 's' : ''}
          {' · '}{fmt(po.totalAmountCents / 100)}
        </p>
      </div>
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const orgId = useAuthStore(s => s.appUser?.organizationId)
  const orders = usePurchaseOrders(orgId)

  // Load supplier names + item counts
  const meta = useLiveQuery(async () => {
    if (!orders) return null
    const poIds = orders.map(o => o.id)
    const supplierIds = [...new Set(orders.map(o => o.supplierId).filter((id): id is string => !!id))]

    const [allItems, contacts] = await Promise.all([
      poIds.length > 0
        ? db.purchaseOrderItems.where('purchaseOrderId').anyOf(poIds).toArray()
        : Promise.resolve([]),
      supplierIds.length > 0
        ? db.contacts.bulkGet(supplierIds)
        : Promise.resolve([]),
    ])

    const itemCountMap = new Map<string, number>()
    for (const item of allItems) {
      itemCountMap.set(item.purchaseOrderId, (itemCountMap.get(item.purchaseOrderId) ?? 0) + 1)
    }

    const supplierMap = new Map<string, string>()
    for (const c of contacts) {
      if (c) supplierMap.set(c.id, c.name)
    }

    return { itemCountMap, supplierMap }
  }, [orders])

  if (!orders) {
    return (
      <div className="min-h-dvh bg-gray-50 flex flex-col">
        <Header navigate={navigate} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    )
  }

  // Group by status in display order
  const grouped = STATUS_ORDER.reduce<Record<PurchaseOrderStatus, PurchaseOrder[]>>(
    (acc, s) => {
      acc[s] = orders.filter(o => o.status === s)
      return acc
    },
    {} as Record<PurchaseOrderStatus, PurchaseOrder[]>,
  )

  const hasAny = orders.length > 0

  return (
    <div className="min-h-dvh bg-gray-50 pb-28 fade-in">
      <Header navigate={navigate} />

      <div className="px-4 pt-4 space-y-6">
        {!hasAny && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
              <Package size={28} className="text-primary-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No purchase orders yet</p>
            <p className="text-xs text-gray-400 mb-4">
              Create a PO to track what you've ordered from suppliers
            </p>
            <button
              onClick={() => navigate('/procurement/orders/new')}
              className="btn-primary text-sm"
            >
              Create first PO
            </button>
          </div>
        )}

        {hasAny && STATUS_ORDER.map(status => {
          const group = grouped[status]
          if (group.length === 0) return null
          const cfg = STATUS_CONFIG[status]
          return (
            <div key={status}>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">
                {cfg.label} ({group.length})
              </h2>
              <div className="space-y-2">
                {group.map(po => (
                  <PORow
                    key={po.id}
                    po={po}
                    supplierName={po.supplierId ? meta?.supplierMap.get(po.supplierId) : undefined}
                    itemCount={meta?.itemCountMap.get(po.id) ?? 0}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/procurement/orders/new')}
        className="fixed bottom-24 right-4 bg-primary-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-20"
        aria-label="Create PO"
      >
        <Plus size={26} />
      </button>
    </div>
  )
}

function Header({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center text-gray-500 active:scale-95 -ml-1"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-xs text-gray-500">Track supplier orders and deliveries</p>
        </div>
      </div>
    </div>
  )
}
