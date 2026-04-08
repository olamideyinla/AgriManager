import type { BaseEntity } from './base'
import type { FinancialCategory } from './financial'

export interface FinancialBudget extends BaseEntity {
  organizationId: string
  month: string                  // YYYY-MM
  category: FinancialCategory
  budgetAmountCents: number
}
