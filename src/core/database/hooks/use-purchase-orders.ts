import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { PurchaseOrder, PurchaseOrderItem } from '../../../shared/types'

// ── usePurchaseOrders ─────────────────────────────────────────────────────────

/** All POs for the org, sorted by orderDate descending */
export function usePurchaseOrders(orgId: string | undefined): PurchaseOrder[] | undefined {
  return useLiveQuery(async () => {
    if (!orgId) return []
    const orders = await db.purchaseOrders
      .where('organizationId').equals(orgId)
      .sortBy('orderDate')
    return orders.reverse()
  }, [orgId])
}

// ── usePurchaseOrder ──────────────────────────────────────────────────────────

/** Single PO by id */
export function usePurchaseOrder(id: string | undefined): PurchaseOrder | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null
    return (await db.purchaseOrders.get(id)) ?? null
  }, [id])
}

// ── usePurchaseOrderItems ─────────────────────────────────────────────────────

/** All line items for a purchase order */
export function usePurchaseOrderItems(poId: string | undefined): PurchaseOrderItem[] | undefined {
  return useLiveQuery(async () => {
    if (!poId) return []
    return db.purchaseOrderItems
      .where('purchaseOrderId').equals(poId).toArray()
  }, [poId])
}

// ── usePendingPOCount ─────────────────────────────────────────────────────────

/** Count of POs with status 'ordered' (awaiting delivery) */
export function usePendingPOCount(orgId: string | undefined): number {
  return useLiveQuery(async () => {
    if (!orgId) return 0
    return db.purchaseOrders
      .where('[organizationId+status]').equals([orgId, 'ordered'])
      .count()
  }, [orgId]) ?? 0
}
