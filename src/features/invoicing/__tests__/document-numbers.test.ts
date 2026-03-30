import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InvoiceSettings } from '../../../shared/types'

// ── Mocks (factories must not reference outer variables — hoisting) ────────────

const BASE_SETTINGS: InvoiceSettings = {
  id:                      'settings-1',
  organizationId:          'org-1',
  nextInvoiceNumber:       1,
  invoicePrefix:           'INV',
  nextReceiptNumber:       5,
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
  createdAt:               '2025-01-01T00:00:00.000Z',
  updatedAt:               '2025-01-01T00:00:00.000Z',
  syncStatus:              'pending',
}

vi.mock('../../../core/database/db', () => ({
  db: {
    invoiceSettings: {
      where:  vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      first:  vi.fn(),
      add:    vi.fn().mockResolvedValue('settings-1'),
      update: vi.fn().mockResolvedValue(1),
    },
  },
}))

vi.mock('../../../shared/types/base', () => ({
  newId:  vi.fn(() => 'new-settings-id'),
  nowIso: vi.fn(() => '2025-06-01T10:00:00.000Z'),
}))

// ── Import after mocks ────────────────────────────────────────────────────────

import {
  getNextInvoiceNumber,
  getNextReceiptNumber,
  getOrCreateInvoiceSettings,
} from '../services/document-numbers'
import { db } from '../../../core/database/db'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getOrCreateInvoiceSettings', () => {
  beforeEach(() => {
    vi.mocked(db.invoiceSettings.first).mockResolvedValue(BASE_SETTINGS)
  })

  it('returns existing settings when found', async () => {
    const result = await getOrCreateInvoiceSettings('org-1')
    expect(result.id).toBe('settings-1')
    expect(db.invoiceSettings.add).not.toHaveBeenCalled()
  })

  it('creates new settings when not found', async () => {
    vi.mocked(db.invoiceSettings.first).mockResolvedValue(undefined)
    const result = await getOrCreateInvoiceSettings('org-1')
    expect(db.invoiceSettings.add).toHaveBeenCalled()
    expect(result.id).toBe('new-settings-id')
  })
})

describe('getNextInvoiceNumber', () => {
  beforeEach(() => {
    vi.mocked(db.invoiceSettings.first).mockResolvedValue(BASE_SETTINGS)
    vi.mocked(db.invoiceSettings.update).mockResolvedValue(1)
  })

  it('formats number with prefix and 4-digit padding', async () => {
    const num = await getNextInvoiceNumber('org-1')
    expect(num).toBe('INV-0001')
  })

  it('increments nextInvoiceNumber in DB', async () => {
    await getNextInvoiceNumber('org-1')
    expect(db.invoiceSettings.update).toHaveBeenCalledWith(
      'settings-1',
      expect.objectContaining({ nextInvoiceNumber: 2 }),
    )
  })

  it('pads to 4 digits for 3-digit numbers', async () => {
    vi.mocked(db.invoiceSettings.first).mockResolvedValue({
      ...BASE_SETTINGS,
      nextInvoiceNumber: 100,
    })
    const num = await getNextInvoiceNumber('org-1')
    expect(num).toBe('INV-0100')
  })
})

describe('getNextReceiptNumber', () => {
  beforeEach(() => {
    vi.mocked(db.invoiceSettings.first).mockResolvedValue(BASE_SETTINGS)
    vi.mocked(db.invoiceSettings.update).mockResolvedValue(1)
  })

  it('formats receipt number with prefix and 4-digit padding', async () => {
    const num = await getNextReceiptNumber('org-1')
    expect(num).toBe('RCT-0005')
  })

  it('increments nextReceiptNumber in DB', async () => {
    await getNextReceiptNumber('org-1')
    expect(db.invoiceSettings.update).toHaveBeenCalledWith(
      'settings-1',
      expect.objectContaining({ nextReceiptNumber: 6 }),
    )
  })
})
