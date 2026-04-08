import { db } from '../database/db'
import type { AlertSeverity } from '../../shared/types'

interface AlertCreationParams {
  ruleId: string
  severity: AlertSeverity
  message: string
  enterpriseId?: string
  actionRoute?: string
  actionLabel?: string
  dedupHours?: number
}

/**
 * Checks monthly category budgets and fires alerts at 80% and 100% thresholds.
 * Called from alert-engine.ts checkAlerts().
 */
export async function checkBudgetAlerts(
  orgId: string,
  maybeCreateAlert: (params: AlertCreationParams) => Promise<void>,
): Promise<void> {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const budgets = await db.financialBudgets
    .where('[organizationId+month]').equals([orgId, month])
    .toArray()

  if (budgets.length === 0) return

  // Build date range for the current month
  const from    = `${month}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const to      = `${month}-${String(lastDay).padStart(2, '0')}`

  const txns = await db.financialTransactions
    .where('organizationId').equals(orgId)
    .filter(t => t.type === 'expense' && t.date >= from && t.date <= to)
    .toArray()

  // Sum actuals by category in cents
  const actualByCat = new Map<string, number>()
  for (const t of txns) {
    const cents = Math.round(t.amount * 100)
    actualByCat.set(t.category, (actualByCat.get(t.category) ?? 0) + cents)
  }

  for (const budget of budgets) {
    if (budget.budgetAmountCents <= 0) continue
    const actualCents = actualByCat.get(budget.category) ?? 0
    const pct = (actualCents / budget.budgetAmountCents) * 100

    if (pct >= 100) {
      await maybeCreateAlert({
        ruleId: `budget-exceeded-${budget.category}`,
        severity: 'high',
        message: `Budget exceeded: ${budget.category} at ${pct.toFixed(0)}% (spent $${(actualCents / 100).toFixed(2)} of $${(budget.budgetAmountCents / 100).toFixed(2)} budget)`,
        actionRoute: '/financials/budget',
        actionLabel: 'View Budget',
        dedupHours: 24,
      })
    } else if (pct >= 80) {
      await maybeCreateAlert({
        ruleId: `budget-80-${budget.category}`,
        severity: 'medium',
        message: `Budget warning: ${budget.category} at ${pct.toFixed(0)}% of monthly budget`,
        actionRoute: '/financials/budget',
        actionLabel: 'View Budget',
        dedupHours: 24,
      })
    }
  }
}
