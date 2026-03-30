import { db } from '../../../core/database/db'
import { newId, nowIso } from '../../../shared/types/base'
import type { InvoiceSettings } from '../../../shared/types'

// ── Get or create invoice settings ───────────────────────────────────────────

export async function getOrCreateInvoiceSettings(organizationId: string): Promise<InvoiceSettings> {
  const existing = await db.invoiceSettings.where('organizationId').equals(organizationId).first()
  if (existing) return existing

  const settings: InvoiceSettings = {
    id:                      newId(),
    organizationId,
    nextInvoiceNumber:       1,
    invoicePrefix:           'INV',
    nextReceiptNumber:       1,
    receiptPrefix:           'RCT',
    defaultPaymentTermsDays: 30,
    defaultNotes:            null,
    defaultTerms:            null,
    taxEnabled:              false,
    defaultTaxRate:          null,
    taxLabel:                'Tax',
    farmLogo:                null,
    farmName:                null,
    farmAddress:             null,
    farmPhone:               null,
    farmEmail:               null,
    bankDetails:             null,
    mobileMoney:             null,
    receiptFooter:           null,
    createdAt:               nowIso(),
    updatedAt:               nowIso(),
    syncStatus:              'pending',
  }

  await db.invoiceSettings.add(settings)
  return settings
}

// ── Sequential number generators ─────────────────────────────────────────────

export async function getNextInvoiceNumber(organizationId: string): Promise<string> {
  const settings = await getOrCreateInvoiceSettings(organizationId)
  const num      = settings.nextInvoiceNumber
  const padded   = String(num).padStart(4, '0')
  await db.invoiceSettings.update(settings.id, {
    nextInvoiceNumber: num + 1,
    updatedAt:         nowIso(),
    syncStatus:        'pending',
  })
  return `${settings.invoicePrefix}-${padded}`
}

export async function getNextReceiptNumber(organizationId: string): Promise<string> {
  const settings = await getOrCreateInvoiceSettings(organizationId)
  const num      = settings.nextReceiptNumber
  const padded   = String(num).padStart(4, '0')
  await db.invoiceSettings.update(settings.id, {
    nextReceiptNumber: num + 1,
    updatedAt:         nowIso(),
    syncStatus:        'pending',
  })
  return `${settings.receiptPrefix}-${padded}`
}
