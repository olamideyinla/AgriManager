import { describe, it, expect } from 'vitest'
import { generateCSVTemplate } from '../services/template-generator'
import { SETUP_TEMPLATES, TEMPLATE_MAP } from '../config/setup-templates'

describe('generateCSVTemplate', () => {
  it('generates CSV with instruction comment rows', () => {
    const t = TEMPLATE_MAP['farm_locations']
    const csv = generateCSVTemplate(t)
    const lines = csv.split('\n')
    expect(lines[0]).toMatch(/^# AgriManagerX Setup Template:/)
    expect(lines[1]).toMatch(/^# /)
    expect(lines[2]).toMatch(/^# Required columns/)
  })

  it('marks required columns with asterisk in header row', () => {
    const t = TEMPLATE_MAP['farm_locations']
    const csv = generateCSVTemplate(t)
    const lines = csv.split('\n')
    const headerLine = lines.find(l => !l.startsWith('#'))!
    expect(headerLine).toContain('Location Name*')
    expect(headerLine).not.toContain('Address*')
  })

  it('generates two example rows after header', () => {
    const t = TEMPLATE_MAP['farm_locations']
    const csv = generateCSVTemplate(t)
    const dataLines = csv.split('\n').filter(l => !l.startsWith('#') && l.trim())
    expect(dataLines.length).toBeGreaterThanOrEqual(3) // header + 2 rows
  })

  it('generates all 6 templates without throwing', () => {
    for (const t of SETUP_TEMPLATES) {
      expect(() => generateCSVTemplate(t)).not.toThrow()
    }
  })

  it('escapes values containing commas', () => {
    const t = TEMPLATE_MAP['farm_locations']
    const csv = generateCSVTemplate(t)
    // Address example has a comma — should be quoted
    if (t.columns.find(c => c.field === 'address')?.example.includes(',')) {
      const lines = csv.split('\n').filter(l => !l.startsWith('#'))
      const exampleRow = lines[1]
      expect(exampleRow).toContain('"')
    }
  })
})
