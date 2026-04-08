import type { BaseEntity } from './base'

export type PurchaseOrderStatus =
  | 'draft'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'cancelled'

export interface PurchaseOrder extends BaseEntity {
  organizationId: string
  supplierId?: string           // contactId where contact.type === 'supplier'
  status: PurchaseOrderStatus
  orderDate: string             // YYYY-MM-DD
  expectedDeliveryDate?: string
  actualDeliveryDate?: string
  notes?: string
  totalAmountCents: number      // denormalized sum of line items
}

export interface PurchaseOrderItem extends BaseEntity {
  purchaseOrderId: string
  inventoryItemId: string
  orderedQuantity: number
  receivedQuantity: number      // 0 until partial/full receive
  unitCostCents: number
  notes?: string
}
