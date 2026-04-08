import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit2, CheckCircle, Package, Truck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { useAuthStore } from '../../stores/auth-store'
import { useUIStore } from '../../stores/ui-store'
import { usePurchaseOrder, usePurchaseOrderItems } from '../../core/database/hooks/use-purchase-orders'
import { db } from '../../core/database/db'
import { useCurrency } from '../../shared/hooks/useCurrency'
import type { PurchaseOrderStatus } from '../../shared/types'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; cls: string }> = {
  draft:              { label: 'Draft',    cls: 'bg-gray-100 text-gray-600' },
  ordered:            { label: 'Ordered',  cls: 'bg-blue-100 text-blue-700' },
  partially_received: { label: 'Partial',  cls: 'bg-amber-100 text-amber-700' },
  received:           { label: 'Received', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled:          { label: 'Cancelled',cls: 'bg-red-100 text-red-600' },
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PurchaseOrderDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const po = usePurchaseOrder(id)
  const items = usePurchaseOrderItems(id)
  const userId = useAuthStore(s => s.user?.id) ?? ''
  const addToast = useUIStore(s => s.addToast)
  const { fmt } = useCurrency()

  const [partialQtys, setPartialQtys] = useState<Record<string, string>>({})
  const [showPartial, setShowPartial] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load supplier name + item names
  const meta = useLiveQuery(async () => {
    if (!po || !items) return null
    const supplierContact = po.supplierId ? await db.contacts.get(po.supplierId) : null
    const inventoryItems = items.length > 0
      ? await db.inventoryItems.bulkGet(items.map(i => i.inventoryItemId))
      : []
    const itemNameMap = new Map<string, string>()
    for (const inv of inventoryItems) {
      if (inv) itemNameMap.set(inv.id, `${inv.name} (${inv.unitOfMeasurement})`)
    }
    return { supplierName: supplierContact?.name, itemNameMap }
  }, [po, items])

  if (po === undefined || items === undefined) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  if (!po) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Purchase order not found.</p>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[po.status]

  // ── Actions ────────────────────────────────────────────────────────────────

  const markOrdered = async () => {
    await db.purchaseOrders.update(po.id, {
      status: 'ordered',
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    })
    addToast({ message: 'Marked as ordered', type: 'success' })
  }

  const receiveAll = async () => {
    setIsSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()

      await Promise.all(
        items.map(async item => {
          const remaining = item.orderedQuantity - item.receivedQuantity
          if (remaining <= 0) return

          // 1. Stock-in transaction
          await db.inventoryTransactions.add({
            id: nanoid(),
            inventoryItemId: item.inventoryItemId,
            type: 'in',
            quantity: remaining,
            unitCost: item.unitCostCents / 100,
            date: today,
            recordedBy: userId,
            notes: `Received via PO #${po.id.slice(0, 8)}`,
            syncStatus: 'pending',
            createdAt: now,
            updatedAt: now,
          })

          // 2. Update inventory stock
          await db.inventoryItems
            .where('id').equals(item.inventoryItemId)
            .modify(i => { i.currentStock += remaining })

          // 3. Update received qty on item
          await db.purchaseOrderItems.update(item.id, {
            receivedQuantity: item.orderedQuantity,
            updatedAt: now,
            syncStatus: 'pending',
          })
        }),
      )

      await db.purchaseOrders.update(po.id, {
        status: 'received',
        actualDeliveryDate: today,
        updatedAt: now,
        syncStatus: 'pending',
      })

      addToast({ message: 'All items received — stock updated', type: 'success' })
    } catch {
      addToast({ message: 'Failed to receive items', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const receivePartial = async () => {
    setIsSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()
      let allReceived = true

      await Promise.all(
        items.map(async item => {
          const qty = parseFloat(partialQtys[item.id] ?? String(item.orderedQuantity - item.receivedQuantity)) || 0
          if (qty <= 0) {
            if (item.receivedQuantity < item.orderedQuantity) allReceived = false
            return
          }

          await db.inventoryTransactions.add({
            id: nanoid(),
            inventoryItemId: item.inventoryItemId,
            type: 'in',
            quantity: qty,
            unitCost: item.unitCostCents / 100,
            date: today,
            recordedBy: userId,
            notes: `Partial receive via PO #${po.id.slice(0, 8)}`,
            syncStatus: 'pending',
            createdAt: now,
            updatedAt: now,
          })

          await db.inventoryItems
            .where('id').equals(item.inventoryItemId)
            .modify(i => { i.currentStock += qty })

          const newReceived = item.receivedQuantity + qty
          if (newReceived < item.orderedQuantity) allReceived = false

          await db.purchaseOrderItems.update(item.id, {
            receivedQuantity: newReceived,
            updatedAt: now,
            syncStatus: 'pending',
          })
        }),
      )

      const newStatus = allReceived ? 'received' : 'partially_received'
      await db.purchaseOrders.update(po.id, {
        status: newStatus,
        actualDeliveryDate: allReceived ? today : po.actualDeliveryDate,
        updatedAt: now,
        syncStatus: 'pending',
      })

      setShowPartial(false)
      addToast({ message: 'Items received — stock updated', type: 'success' })
    } catch {
      addToast({ message: 'Failed to receive items', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const cancelPO = async () => {
    if (!confirm('Cancel this purchase order?')) return
    await db.purchaseOrders.update(po.id, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    })
    addToast({ message: 'Purchase order cancelled', type: 'info' })
    navigate(-1)
  }

  const canReceive = po.status === 'ordered' || po.status === 'partially_received'

  return (
    <div className="min-h-dvh bg-gray-50 pb-10 fade-in">
      {/* Header */}
      <div className="bg-primary-600 px-4 pt-3 pb-4 safe-top">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white active:scale-95"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-lg leading-tight truncate">
              {meta?.supplierName ?? 'No supplier'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                {cfg.label}
              </span>
              <p className="text-white/60 text-xs">
                {format(parseISO(po.orderDate), 'd MMM yyyy')}
              </p>
            </div>
          </div>
          {po.status !== 'received' && po.status !== 'cancelled' && (
            <button
              onClick={() => navigate(`/procurement/orders/${po.id}/edit`)}
              className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white active:scale-95"
            >
              <Edit2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Order Total</span>
            <span className="text-sm font-bold text-gray-800">{fmt(po.totalAmountCents / 100)}</span>
          </div>
          {po.expectedDeliveryDate && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Expected Delivery</span>
              <span className="text-xs text-gray-700">{format(parseISO(po.expectedDeliveryDate), 'd MMM yyyy')}</span>
            </div>
          )}
          {po.actualDeliveryDate && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Actual Delivery</span>
              <span className="text-xs text-emerald-600 font-medium">{format(parseISO(po.actualDeliveryDate), 'd MMM yyyy')}</span>
            </div>
          )}
          {po.notes && (
            <p className="text-xs text-gray-500 pt-1 border-t border-gray-50">{po.notes}</p>
          )}
        </div>

        {/* Line items table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Line Items ({items.length})
            </p>
          </div>
          {items.length === 0 && (
            <div className="p-4 text-center text-xs text-gray-400">No items</div>
          )}
          {items.map(item => {
            const name = meta?.itemNameMap.get(item.inventoryItemId) ?? 'Unknown'
            const lineTotal = (item.orderedQuantity * item.unitCostCents) / 100
            const allRcvd = item.receivedQuantity >= item.orderedQuantity
            return (
              <div key={item.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fmt(item.unitCostCents / 100)}/unit
                    </p>
                    {showPartial && canReceive && (
                      <div className="mt-2">
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Receive qty (pending: {item.orderedQuantity - item.receivedQuantity})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={String(item.orderedQuantity - item.receivedQuantity)}
                          value={partialQtys[item.id] ?? String(item.orderedQuantity - item.receivedQuantity)}
                          onChange={e => setPartialQtys(p => ({ ...p, [item.id]: e.target.value }))}
                          className="input-base w-28"
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-700">{fmt(lineTotal)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.receivedQuantity}/{item.orderedQuantity} rcvd
                    </p>
                    {allRcvd && (
                      <CheckCircle size={12} className="text-emerald-500 ml-auto mt-1" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {po.status === 'draft' && (
            <button
              onClick={markOrdered}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 text-white font-semibold text-sm active:bg-blue-700 transition-colors"
            >
              <Truck size={18} /> Mark as Ordered
            </button>
          )}

          {canReceive && !showPartial && (
            <>
              <button
                onClick={receiveAll}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-sm active:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle size={18} /> {isSaving ? 'Processing…' : 'Receive All'}
              </button>
              <button
                onClick={() => setShowPartial(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold text-sm active:bg-gray-50 transition-colors"
              >
                <Package size={18} /> Partial Receive
              </button>
            </>
          )}

          {showPartial && (
            <div className="space-y-2">
              <button
                onClick={receivePartial}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-sm active:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle size={18} /> {isSaving ? 'Processing…' : 'Save Received Quantities'}
              </button>
              <button
                onClick={() => setShowPartial(false)}
                className="w-full py-3 rounded-2xl bg-white border border-gray-200 text-gray-600 font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          )}

          {po.status !== 'cancelled' && po.status !== 'received' && (
            <button
              onClick={cancelPO}
              className="w-full py-3 rounded-2xl text-red-500 font-medium text-sm bg-white border border-red-100 active:bg-red-50 transition-colors"
            >
              Cancel PO
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
