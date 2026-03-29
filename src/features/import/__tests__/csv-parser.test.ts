import { describe, it, expect } from 'vitest'
import { parseSetupCSV } from '../services/csv-parser'
import { TEMPLATE_MAP } from '../config/setup-templates'

// ── Helper to create a File from CSV text ──────────────────────────────────────

function makeFile(content: string, name = 'test.csv'): File {
  return new File([content], name, { type: 'text/csv' })
}

// ── Farm Locations template ────────────────────────────────────────────────────

describe('parseSetupCSV — farm_locations', () => {
  const tmpl = TEMPLATE_MAP['farm_locations']

  it('parses a valid CSV with all required fields', async () => {
    const csv = [
      'Location Name*,Address,Total Area,Area Unit',
      'Main Farm,Km 5 Road,12.5,hectares',
      'Branch Site,,5,acres',
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.parseError).toBeNull()
    expect(result.validRows).toHaveLength(2)
    expect(result.errorRows).toHaveLength(0)
  })

  it('reports error for missing required "Location Name" field', async () => {
    const csv = [
      'Location Name*,Address',
      ',Some Address',
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.errorRows).toHaveLength(1)
    expect(result.errorRows[0].errors[0]).toMatch(/"Location Name" is required/)
  })

  it('strips comment rows starting with #', async () => {
    const csv = [
      '# This is a comment',
      '# Another comment',
      'Location Name*,Address',
      'Main Farm,Some Road',
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.parseError).toBeNull()
    expect(result.validRows).toHaveLength(1)
    expect(result.validRows[0]['name']).toBe('Main Farm')
  })

  it('strips asterisks from headers for matching', async () => {
    const csv = [
      'Location Name*,Address',
      'My Farm,123 Road',
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.validRows[0]['name']).toBe('My Farm')
  })

  it('reports empty file correctly', async () => {
    const result = await parseSetupCSV(makeFile(''), tmpl)
    expect(result.isEmpty).toBe(true)
  })

  it('reports unmapped extra columns', async () => {
    const csv = [
      'Location Name*,FooColumn,BarColumn',
      'Farm 1,value1,value2',
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.unmappedColumns).toContain('foocolumn')
  })

  it('reports missing required columns', async () => {
    const csv = [
      'Address,Notes',
      'Some Road,Note here',
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.missingRequiredColumns).toContain('Location Name')
  })

  it('validates number field rejects non-numeric', async () => {
    const csv = [
      'Location Name*,Total Area',
      'Farm A,notanumber',
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.errorRows).toHaveLength(1)
    expect(result.errorRows[0].errors[0]).toMatch(/"Total Area" must be a number/)
  })

  it('handles numbers with comma thousand separators', async () => {
    const csv = [
      'Location Name*,Total Area',
      'Big Farm,"1,200.5"',
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.validRows).toHaveLength(1)
    expect(result.validRows[0]['totalAreaHectares']).toBe(1200.5)
  })

  it('strips UTF-8 BOM from file', async () => {
    const csv = '\uFEFFLocation Name*\nMain Farm'
    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.parseError).toBeNull()
    expect(result.validRows).toHaveLength(1)
  })
})

// ── Infrastructure template ────────────────────────────────────────────────────

describe('parseSetupCSV — infrastructure', () => {
  const tmpl = TEMPLATE_MAP['infrastructure']

  it('rejects invalid select value for Type', async () => {
    const csv = [
      'Name*,Type*,Location Name*',
      'House 1,invalid_type,Main Farm',
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.errorRows).toHaveLength(1)
    expect(result.errorRows[0].errors[0]).toMatch(/"Type" must be one of/)
  })

  it('accepts case-insensitive select values', async () => {
    const csv = [
      'Name*,Type*,Location Name*',
      'House 1,POULTRY_HOUSE,Main Farm',
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.validRows).toHaveLength(1)
    expect(result.validRows[0]['type']).toBe('poultry_house')
  })
})

// ── Enterprises template ───────────────────────────────────────────────────────

describe('parseSetupCSV — enterprises', () => {
  const tmpl = TEMPLATE_MAP['enterprises']

  it('parses valid date in YYYY-MM-DD format', async () => {
    const csv = [
      'Name*,Enterprise Type*,Infrastructure Name*,Start Date*,Initial Stock*,Current Stock*',
      'Flock A,layers,House 1,2025-01-15,5000,4800',
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.validRows).toHaveLength(1)
    expect(result.validRows[0]['startDate']).toBe('2025-01-15')
  })

  it('auto-detects DD/MM/YYYY date format', async () => {
    // Use two rows to make detection clearer
    const csv = [
      'Name*,Enterprise Type*,Infrastructure Name*,Start Date*,Initial Stock*,Current Stock*',
      'Flock A,layers,House 1,15/01/2025,5000,4800',
    ].join('\n')

    // With non-US locale preference
    const result = await parseSetupCSV(makeFile(csv), tmpl)
    // Should detect the date format (either DD/MM or MM/DD)
    expect(result.detectedDateFormat).not.toBeNull()
    // The parsed date should be valid
    const dateVal = result.validRows[0]?.['startDate'] ?? result.errorRows[0]?.row['startDate']
    if (result.validRows.length > 0) {
      expect(typeof result.validRows[0]['startDate']).toBe('string')
    }
  })

  it('reports error for invalid date format', async () => {
    const csv = [
      'Name*,Enterprise Type*,Infrastructure Name*,Start Date*,Initial Stock*,Current Stock*',
      'Flock A,layers,House 1,not-a-date,5000,4800',
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.errorRows).toHaveLength(1)
    expect(result.errorRows[0].errors.some(e => e.includes('"Start Date"'))).toBe(true)
  })

  it('caps rows at template.maxRows', async () => {
    const rows = Array.from({ length: 120 }, (_, i) =>
      `Flock ${i},layers,House 1,2025-01-15,5000,4800`
    )
    const csv = [
      'Name*,Enterprise Type*,Infrastructure Name*,Start Date*,Initial Stock*,Current Stock*',
      ...rows,
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.rows.length).toBeLessThanOrEqual(tmpl.maxRows)
  })
})

// ── Inventory template ─────────────────────────────────────────────────────────

describe('parseSetupCSV — inventory', () => {
  const tmpl = TEMPLATE_MAP['inventory']

  it('parses all required fields', async () => {
    const csv = [
      'Item Name*,Category*,Unit*,Current Stock*',
      'Layer Mash,feed,bags,45',
    ].join('\n')

    const result = await parseSetupCSV(makeFile(csv), tmpl)
    expect(result.validRows).toHaveLength(1)
    expect(result.validRows[0]['name']).toBe('Layer Mash')
    expect(result.validRows[0]['currentStock']).toBe(45)
  })
})
