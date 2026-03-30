import type { BaseEntity } from './base'

// Invoice

export type InvoiceStatus =
  | 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled'

export type InvoicePaymentMethod = 'cash' | 'bank' | 'mobile_money' | 'cheque' | 'other'

export type DiscountType = 'flat' | 'percentage'

export interface Invoice extends BaseEntity {
  organizationId: string
  invoiceNumber: string            // e.g. "INV-0001"
  status: InvoiceStatus
  buyerId: string | null
  buyerName: string
  buyerPhone: string | null
  buyerEmail: string | null
  buyerAddress: string | null
  issueDate: string                // YYYY-MM-DD
  dueDate: string                  // YYYY-MM-DD
  subtotal: number
  taxRate: number | null
  taxLabel: string | null
  taxAmount: number | null
  discount: number | null
  discountType: DiscountType | null
  discountAmount: number | null
  totalAmount: number
  amountPaid: number
  amountDue: number
  currency: string
  notes: string | null
  terms: string | null
  enterpriseInstanceId: string | null
}

export interface InvoiceItem extends BaseEntity {
  invoiceId: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
}

export interface InvoicePayment extends BaseEntity {
  invoiceId: string
  receiptId: string | null
  date: string
  amount: number
  paymentMethod: InvoicePaymentMethod
  reference: string | null
  notes: string | null
  linkedFinancialTransactionId: string | null
}

// Receipt

export type ReceiptType = 'sale' | 'payment_received' | 'deposit'
export type ReceiptStatus = 'issued' | 'cancelled'

export interface Receipt extends BaseEntity {
  organizationId: string
  receiptNumber: string            // e.g. "RCT-0001"
  type: ReceiptType
  status: ReceiptStatus
  buyerId: string | null
  buyerName: string
  buyerPhone: string | null
  date: string
  subtotal: number
  taxRate: number | null
  taxLabel: string | null
  taxAmount: number | null
  discount: number | null
  discountType: DiscountType | null
  discountAmount: number | null
  totalAmount: number
  amountReceived: number
  changeDue: number
  paymentMethod: InvoicePaymentMethod
  paymentReference: string | null
  linkedInvoiceId: string | null
  linkedFinancialTransactionId: string | null
  enterpriseInstanceId: string | null
  currency: string
  notes: string | null
}

export interface ReceiptItem extends BaseEntity {
  receiptId: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
}

// Invoice Settings

export interface InvoiceSettings extends BaseEntity {
  organizationId: string
  nextInvoiceNumber: number
  invoicePrefix: string
  nextReceiptNumber: number
  receiptPrefix: string
  defaultPaymentTermsDays: number
  defaultNotes: string | null
  defaultTerms: string | null
  taxEnabled: boolean
  defaultTaxRate: number | null
  taxLabel: string
  farmLogo: string | null
  farmName: string | null
  farmAddress: string | null
  farmPhone: string | null
  farmEmail: string | null
  bankDetails: string | null
  mobileMoney: string | null
  receiptFooter: string | null
}

// UI composite types

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
  payments: InvoicePayment[]
}

export interface ReceiptWithItems extends Receipt {
  items: ReceiptItem[]
}
