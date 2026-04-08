import type { BaseEntity } from './base'

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly'

export interface RecurringTransaction extends BaseEntity {
  organizationId: string
  enterpriseInstanceId?: string
  type: 'expense' | 'income'
  category: string               // matches FinancialTransaction.category
  description: string
  amountCents: number
  frequency: RecurringFrequency
  startDate: string              // YYYY-MM-DD
  endDate?: string               // YYYY-MM-DD — omit = indefinite
  nextDueDate: string            // YYYY-MM-DD — updated after each posting
  isActive: boolean
  notes?: string
}
