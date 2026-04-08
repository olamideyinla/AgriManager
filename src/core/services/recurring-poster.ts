import { db } from '../database/db'
import { newId, nowIso } from '../../shared/types/base'
import type { FinancialCategory } from '../../shared/types'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

function advanceNextDueDate(nextDueDate: string, frequency: string): string {
  switch (frequency) {
    case 'daily':     return addDays(nextDueDate, 1)
    case 'weekly':    return addDays(nextDueDate, 7)
    case 'monthly':   return addMonths(nextDueDate, 1)
    case 'quarterly': return addMonths(nextDueDate, 3)
    default:          return addMonths(nextDueDate, 1)
  }
}

/**
 * Posts all recurring transactions that are due on or before today.
 * Returns the count of transactions posted.
 */
export async function postDueRecurringTransactions(organizationId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]

  // Dexie compound index: [organizationId+isActive] — isActive stored as boolean
  const active = await db.recurringTransactions
    .where('[organizationId+isActive]')
    .equals([organizationId, 1])
    .toArray()

  const due = active.filter(r => r.nextDueDate <= today)

  let posted = 0

  for (const rec of due) {
    // Post every due date from nextDueDate up to today (catch up if multiple missed)
    let cursor = rec.nextDueDate
    let updatedRec = { ...rec }

    while (cursor <= today) {
      const txnDate = cursor

      // Create the financial transaction
      await db.financialTransactions.add({
        id:                   newId(),
        organizationId,
        enterpriseInstanceId: rec.enterpriseInstanceId,
        date:                 txnDate,
        type:                 rec.type as 'income' | 'expense',
        category:             rec.category as FinancialCategory,
        amount:               rec.amountCents / 100,
        paymentMethod:        'bank',
        notes:                rec.description + (rec.notes ? ` · ${rec.notes}` : ''),
        syncStatus:           'pending',
        createdAt:            nowIso(),
        updatedAt:            nowIso(),
      })
      posted++

      const nextDate = advanceNextDueDate(cursor, rec.frequency)

      // If endDate is set and the next date would exceed it, deactivate
      if (rec.endDate && nextDate > rec.endDate) {
        updatedRec = { ...updatedRec, nextDueDate: nextDate, isActive: false, updatedAt: nowIso() }
        break
      }

      updatedRec = { ...updatedRec, nextDueDate: nextDate, updatedAt: nowIso() }
      cursor = nextDate
    }

    await db.recurringTransactions.put(updatedRec)
  }

  return posted
}
