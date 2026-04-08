import type { BaseEntity } from './base'

export type BudgetPeriodType = 'batch' | 'monthly'

export interface EnterpriseBudget extends BaseEntity {
  enterpriseInstanceId: string
  organizationId: string
  periodType: BudgetPeriodType
  periodLabel: string             // 'Batch Jan-2025' or '2025-01'
  revenueTargetCents: number
  totalCostBudgetCents: number
  feedCostBudgetCents?: number
  laborCostBudgetCents?: number
  medicationBudgetCents?: number
  otherCostBudgetCents?: number
  notes?: string
}
