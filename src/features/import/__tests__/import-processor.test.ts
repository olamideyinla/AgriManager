import { describe, it, expect, beforeEach } from 'vitest'
import { processSetupImport } from '../services/import-processor'
import type { ParseResult } from '../services/csv-parser'

// ── Mock db ────────────────────────────────────────────────────────────────────
// We use in-memory stores to simulate IndexedDB without fake-indexeddb complexity

const mockLocations: any[] = []
const mockInfra: any[] = []
const mockEnterprises: any[] = []
const mockInventoryItems: any[] = []
const mockInventoryTxns: any[] = []
const mockContacts: any[] = []

import { vi } from 'vitest'

vi.mock('../../../core/database/db', () => ({
  db: {
    farmLocations: {
      where: (field: string) => ({
        equals: (val: string) => ({
          toArray: async () => mockLocations.filter((l: any) => l[field] === val),
        }),
      }),
      add: async (record: any) => { mockLocations.push(record); return record.id },
    },
    infrastructures: {
      toArray: async () => mockInfra,
      add: async (record: any) => { mockInfra.push(record); return record.id },
    },
    enterpriseInstances: {
      filter: (fn: (e: any) => boolean) => ({
        toArray: async () => mockEnterprises.filter(fn),
      }),
      add: async (record: any) => { mockEnterprises.push(record); return record.id },
    },
    inventoryItems: {
      where: (field: string) => ({
        equals: (val: string) => ({
          toArray: async () => mockInventoryItems.filter((i: any) => i[field] === val),
        }),
      }),
      add: async (record: any) => { mockInventoryItems.push(record); return record.id },
    },
    inventoryTransactions: {
      add: async (record: any) => { mockInventoryTxns.push(record); return record.id },
    },
    contacts: {
      where: (field: string) => ({
        equals: (val: string) => ({
          toArray: async () => mockContacts.filter((c: any) => c[field] === val),
        }),
      }),
      add: async (record: any) => { mockContacts.push(record); return record.id },
    },
  },
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeParseResult(templateId: string, validRows: Record<string, unknown>[]): ParseResult {
  return {
    templateId,
    headers: [],
    rows: validRows as any,
    validRows: validRows as any,
    errorRows: [],
    warningRows: [],
    unmappedColumns: [],
    missingRequiredColumns: [],
    detectedDateFormat: null,
    isEmpty: validRows.length === 0,
    parseError: null,
  }
}

const ORG_ID = 'org-test-123'
const DEFAULT_LOC_ID = 'loc-default-456'

beforeEach(() => {
  mockLocations.length = 0
  mockInfra.length = 0
  mockEnterprises.length = 0
  mockInventoryItems.length = 0
  mockInventoryTxns.length = 0
  mockContacts.length = 0
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('processSetupImport', () => {
  it('imports farm locations and tracks count', async () => {
    const parsedFiles = {
      farm_locations: makeParseResult('farm_locations', [
        { name: 'Main Farm', address: 'Some Road', totalAreaHectares: 10, areaUnit: 'hectares' },
        { name: 'Branch Site', address: null, totalAreaHectares: 5, areaUnit: 'acres' },
      ]),
    }

    const result = await processSetupImport(parsedFiles, ORG_ID, DEFAULT_LOC_ID, 'pro')

    expect(result.created.locations).toBe(2)
    expect(mockLocations).toHaveLength(2)
    expect(mockLocations[0].name).toBe('Main Farm')
  })

  it('converts acres to hectares on import', async () => {
    const parsedFiles = {
      farm_locations: makeParseResult('farm_locations', [
        { name: 'Branch Site', totalAreaHectares: 5, areaUnit: 'acres' },
      ]),
    }

    await processSetupImport(parsedFiles, ORG_ID, DEFAULT_LOC_ID, 'pro')
    // 5 acres × 0.404686 ≈ 2.023 hectares
    expect(mockLocations[0].totalAreaHectares).toBeCloseTo(2.023, 2)
  })

  it('skips duplicate location names', async () => {
    // Pre-populate with existing location
    mockLocations.push({ id: 'loc-1', organizationId: ORG_ID, name: 'Main Farm' })

    const parsedFiles = {
      farm_locations: makeParseResult('farm_locations', [
        { name: 'Main Farm' }, // duplicate
        { name: 'New Site' },
      ]),
    }

    const result = await processSetupImport(parsedFiles, ORG_ID, DEFAULT_LOC_ID, 'pro')
    expect(result.created.locations).toBe(1) // only New Site created
    expect(result.warnings.some(w => w.includes('Main Farm') && w.includes('skipped'))).toBe(true)
  })

  it('links infrastructure to imported location by name', async () => {
    const parsedFiles = {
      farm_locations: makeParseResult('farm_locations', [
        { name: 'Main Farm' },
      ]),
      infrastructure: makeParseResult('infrastructure', [
        { name: 'House 1', type: 'poultry_house', locationName: 'Main Farm', capacity: 5000, status: 'active' },
      ]),
    }

    const result = await processSetupImport(parsedFiles, ORG_ID, DEFAULT_LOC_ID, 'pro')
    expect(result.created.locations).toBe(1)
    expect(result.created.infrastructure).toBe(1)
    // Infrastructure should be linked to the created location
    const createdLoc = mockLocations[0]
    const createdInfra = mockInfra[0]
    expect(createdInfra.farmLocationId).toBe(createdLoc.id)
  })

  it('falls back to default location when infrastructure location not found', async () => {
    const parsedFiles = {
      infrastructure: makeParseResult('infrastructure', [
        { name: 'Orphan House', type: 'poultry_house', locationName: 'Unknown Location', capacity: 100, status: 'active' },
      ]),
    }

    const result = await processSetupImport(parsedFiles, ORG_ID, DEFAULT_LOC_ID, 'pro')
    expect(result.created.infrastructure).toBe(1)
    expect(mockInfra[0].farmLocationId).toBe(DEFAULT_LOC_ID)
  })

  it('links enterprises to imported infrastructure by name', async () => {
    const parsedFiles = {
      infrastructure: makeParseResult('infrastructure', [
        { name: 'House 1', type: 'poultry_house', locationName: 'Main Farm', capacity: 5000, status: 'active' },
      ]),
      enterprises: makeParseResult('enterprises', [
        { name: 'Flock A', enterpriseType: 'layers', infrastructureName: 'House 1', startDate: '2025-01-15', initialStockCount: 5000, currentStockCount: 4850 },
      ]),
    }

    const result = await processSetupImport(parsedFiles, ORG_ID, DEFAULT_LOC_ID, 'pro')
    expect(result.created.enterprises).toBe(1)
    const ent = mockEnterprises[0]
    const infra = mockInfra[0]
    expect(ent.infrastructureId).toBe(infra.id)
  })

  it('creates opening stock transaction for inventory', async () => {
    const parsedFiles = {
      inventory: makeParseResult('inventory', [
        { name: 'Layer Mash', category: 'feed', unitOfMeasurement: 'bags', currentStock: 45 },
      ]),
    }

    await processSetupImport(parsedFiles, ORG_ID, DEFAULT_LOC_ID, 'pro')
    expect(mockInventoryItems).toHaveLength(1)
    expect(mockInventoryTxns).toHaveLength(1)
    expect(mockInventoryTxns[0].type).toBe('stockIn')
    expect(mockInventoryTxns[0].quantity).toBe(45)
  })

  it('auto-creates supplier contact from inventory supplier name', async () => {
    const parsedFiles = {
      inventory: makeParseResult('inventory', [
        { name: 'Layer Mash', category: 'feed', unitOfMeasurement: 'bags', currentStock: 10, supplierName: 'Unga Feeds Ltd' },
      ]),
    }

    const result = await processSetupImport(parsedFiles, ORG_ID, DEFAULT_LOC_ID, 'pro')
    expect(result.created.contacts).toBe(1)
    expect(mockContacts[0].name).toBe('Unga Feeds Ltd')
    expect(mockContacts[0].type).toBe('supplier')
  })

  it('enforces free-tier enterprise limit', async () => {
    // Simulate 3 existing active enterprises (free limit = 3)
    mockEnterprises.push(
      { id: 'e1', status: 'active', name: 'Existing Flock 1' },
      { id: 'e2', status: 'active', name: 'Existing Flock 2' },
      { id: 'e3', status: 'active', name: 'Existing Flock 3' },
    )

    const parsedFiles = {
      enterprises: makeParseResult('enterprises', [
        { name: 'Flock A', enterpriseType: 'layers', infrastructureName: 'House 1', startDate: '2025-01-15', initialStockCount: 100, currentStockCount: 100 },
      ]),
    }

    const result = await processSetupImport(parsedFiles, ORG_ID, DEFAULT_LOC_ID, 'free')
    expect(result.created.enterprises).toBe(0) // limit already reached
    expect(result.warnings.some(w => w.includes('limit'))).toBe(true)
  })

  it('skips duplicate inventory items', async () => {
    mockInventoryItems.push({ id: 'inv-1', organizationId: ORG_ID, name: 'layer mash', category: 'feed' })

    const parsedFiles = {
      inventory: makeParseResult('inventory', [
        { name: 'Layer Mash', category: 'feed', unitOfMeasurement: 'bags', currentStock: 20 },
      ]),
    }

    const result = await processSetupImport(parsedFiles, ORG_ID, DEFAULT_LOC_ID, 'pro')
    expect(result.created.inventory).toBe(0)
    expect(result.warnings.some(w => w.includes('Layer Mash') && w.includes('skipped'))).toBe(true)
  })
})
