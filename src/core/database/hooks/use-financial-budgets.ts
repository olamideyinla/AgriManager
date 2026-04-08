import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { FinancialBudget, FinancialCategory } from '../../../shared/types'

// ── BudgetVsActual ────────────────────────────────────────────────────────────

export interface BudgetVsActual {
  category: FinancialCategory
  budgetCents: number
  actualCents: number
  pct: number
  status: 'ok' | 'warning' | 'exceeded'
}

// ── useBudgetsForMonth ────────────────────────────────────────────────────────

/** All financial budgets for the given org + month (YYYY-MM) */
export function useBudgetsForMonth(
  orgId: string | undefined,
  month: string,
): FinancialBudget[] | undefined {
  return useLiveQuery(async () => {
    if (!orgId) return []
    return db.financialBudgets
      .where('[organizationId+month]').equals([orgId, month])
      .toArray()
  }, [orgId, month])
}

// ── useBudgetVsActual ─────────────────────────────────────────────────────────

/**
 * Joins budgets + expenses for the given org + month.
 * Only categories that have a budget > 0 are included.
 */
export function useBudgetVsActual(
  orgId: string | undefined,
  month: string,
): BudgetVsActual[] | undefined {
  return useLiveQuery(async () => {
    if (!orgId) return []

    const budgets = await db.financialBudgets
      .where('[organizationId+month]').equals([orgId, month])
      .toArray()

    if (budgets.length === 0) return []

    // Build date range for the month
    const [year, mo] = month.split('-').map(Number)
    const from    = `${month}-01`
    const lastDay = new Date(year, mo, 0).getDate()
    const to      = `${month}-${String(lastDay).padStart(2, '0')}`

    const txns = await db.financialTransactions
      .where('organizationId').equals(orgId)
      .filter(t => t.type === 'expense' && t.date >= from && t.date <= to)
      .toArray()

    // Sum actuals by category (in cents)
    const actualByCat = new Map<FinancialCategory, number>()
    for (const t of txns) {
      const cents = Math.round(t.amount * 100)
      actualByCat.set(t.category, (actualByCat.get(t.category) ?? 0) + cents)
    }

    return budgets
      .filter(b => b.budgetAmountCents > 0)
      .map(b => {
        const actualCents = actualByCat.get(b.category) ?? 0
        const pct = b.budgetAmountCents > 0 ? (actualCents / b.budgetAmountCents) * 100 : 0
        const status: BudgetVsActual['status'] =
          pct >= 100 ? 'exceeded' : pct >= 70 ? 'warning' : 'ok'
        return {
          category: b.category,
          budgetCents: b.budgetAmountCents,
          actualCents,
          pct,
          status,
        }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [orgId, month])
}
