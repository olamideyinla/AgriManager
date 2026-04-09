import type { BaseEntity } from './base'

export type PurchaseOrderStatus =
  | 'draft'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'cancelled'

export interface PurchaseOrder extends BaseEntity {
  organizationId: string
  /** Auto-generated reference, e.g. PO-20240415-A3B2 */
  poNumber: string
  supplierId?: string           // contactId where contact.type === 'supplier'
  supplierName?: string         // free-text display name (stored for offline display)
  status: PurchaseOrderStatus
  orderDate: string             // YYYY-MM-DD
  expectedDeliveryDate?: string
  actualDeliveryDate?: string
  notes?: string
  totalAmountCents: number      // denormalized sum of line items
}

export interface PurchaseOrderItem extends BaseEntity {
  purchaseOrderId: string
  inventoryItemId?: string      // set when linked to an existing inventory item
  itemName: string              // free-text item name — always set
  unitOfMeasurement?: string
  orderedQuantity: number
  receivedQuantity: number      // 0 until partial/full receive
  unitCostCents: number
  notes?: string
}
