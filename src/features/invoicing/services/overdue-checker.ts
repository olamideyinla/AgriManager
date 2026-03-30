import { db } from '../../../core/database/db'
import { nowIso } from '../../../shared/types/base'

/**
 * Marks any 'sent' or 'partially_paid' invoices whose dueDate has passed as 'overdue'.
 * Called on app start and once per day.
 */
export async function checkOverdueInvoices(organizationId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  const overdueInvoices = await db.invoices
    .where('[organizationId+status]')
    .anyOf(
      [organizationId, 'sent'],
      [organizationId, 'partially_paid'],
    )
    .and(invoice => invoice.dueDate < today)
    .toArray()

  if (overdueInvoices.length === 0) return

  const ts = nowIso()
  await db.transaction('rw', db.invoices, async () => {
    for (const invoice of overdueInvoices) {
      await db.invoices.update(invoice.id, {
        status:     'overdue',
        updatedAt:  ts,
        syncStatus: 'pending',
      })
    }
  })
}
