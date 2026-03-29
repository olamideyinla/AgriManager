import Papa from 'papaparse'
import type { SetupTemplate, ColumnDef } from '../config/setup-templates'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ParsedRow = Record<string, string | number | boolean | null>

export interface ParseResult {
  templateId: string
  headers: string[]
  rows: ParsedRow[]
  validRows: ParsedRow[]
  errorRows: { rowNumber: number; row: ParsedRow; errors: string[] }[]
  warningRows: { rowNumber: number; row: ParsedRow; warnings: string[] }[]
  unmappedColumns: string[]
  missingRequiredColumns: string[]
  detectedDateFormat: string | null
  isEmpty: boolean
  parseError: string | null
}

// ── Date parsing ───────────────────────────────────────────────────────────────

type DateFormat = 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'DD-MM-YYYY' | 'MM-DD-YYYY'

function preferDDMMYYYY(): boolean {
  // Prefer DD/MM/YYYY for non-US locales
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en-US'
  return !lang.startsWith('en-US')
}

function detectDateFormat(samples: string[]): DateFormat | null {
  // Try unambiguous YYYY-MM-DD first
  const isoPattern = /^\d{4}-\d{2}-\d{2}$/
  if (samples.some(s => isoPattern.test(s.trim()))) return 'YYYY-MM-DD'

  const dmySlash = /^\d{1,2}\/\d{1,2}\/\d{4}$/
  const dmyDash  = /^\d{1,2}-\d{1,2}-\d{4}$/

  if (samples.some(s => dmySlash.test(s.trim()))) {
    return preferDDMMYYYY() ? 'DD/MM/YYYY' : 'MM/DD/YYYY'
  }
  if (samples.some(s => dmyDash.test(s.trim()))) {
    return preferDDMMYYYY() ? 'DD-MM-YYYY' : 'MM-DD-YYYY'
  }
  return null
}

function parseDate(value: string, format: DateFormat | null): string | null {
  const v = value.trim()
  if (!v) return null

  // Always accept YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : v
  }

  const slashParts = v.split('/')
  const dashParts  = v.split('-')

  let day: number, month: number, year: number

  if (slashParts.length === 3) {
    const [a, b, c] = slashParts.map(Number)
    if (format === 'DD/MM/YYYY') { day = a; month = b; year = c }
    else { month = a; day = b; year = c } // MM/DD/YYYY
  } else if (dashParts.length === 3 && dashParts[0].length <= 2) {
    const [a, b, c] = dashParts.map(Number)
    if (format === 'DD-MM-YYYY') { day = a; month = b; year = c }
    else { month = a; day = b; year = c }
  } else {
    return null
  }

  if (!day! || !month! || !year!) return null
  const d = new Date(year, month - 1, day)
  if (isNaN(d.getTime()) || d.getMonth() !== month - 1) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ── Number parsing ─────────────────────────────────────────────────────────────

function parseNumber(value: string): number | null {
  if (!value.trim()) return null
  // Remove thousand separators (commas or spaces)
  const clean = value.trim().replace(/[ ,]/g, '')
  const n = Number(clean)
  return isNaN(n) ? null : n
}

// ── Boolean parsing ────────────────────────────────────────────────────────────

function parseBoolean(value: string): boolean | null {
  const v = value.trim().toLowerCase()
  if (['yes', 'true', '1', 'y'].includes(v)) return true
  if (['no', 'false', '0', 'n'].includes(v)) return false
  return null
}

// ── Header normalisation ───────────────────────────────────────────────────────

function normaliseHeader(h: string): string {
  return h.replace(/\*$/, '').trim().toLowerCase()
}

function matchColumn(csvHeader: string, columns: ColumnDef[]): ColumnDef | undefined {
  const norm = normaliseHeader(csvHeader)
  return columns.find(col => col.header.toLowerCase() === norm)
}

// ── Row validator ──────────────────────────────────────────────────────────────

function validateRow(
  rawRow: Record<string, string>,
  template: SetupTemplate,
  colMap: Map<string, ColumnDef>,
  dateFormat: DateFormat | null,
  rowIndex: number,
  allRows: Record<string, string>[],
): { parsed: ParsedRow; errors: string[]; warnings: string[] } {
  const parsed: ParsedRow = {}
  const errors: string[] = []
  const warnings: string[] = []

  for (const col of template.columns) {
    // Find the raw value by matching CSV header → column def
    let rawValue = ''
    for (const [csvH] of colMap) {
      const def = colMap.get(csvH)
      if (def?.field === col.field) {
        rawValue = (rawRow[csvH] ?? '').trim()
        break
      }
    }

    if (!rawValue) {
      if (col.required) {
        errors.push(`"${col.header}" is required`)
      }
      parsed[col.field] = null
      continue
    }

    switch (col.type) {
      case 'text': {
        if (col.validation?.maxLength && rawValue.length > col.validation.maxLength) {
          errors.push(`"${col.header}" exceeds ${col.validation.maxLength} characters`)
        }
        parsed[col.field] = rawValue
        break
      }

      case 'number': {
        const n = parseNumber(rawValue)
        if (n === null) {
          errors.push(`"${col.header}" must be a number (got "${rawValue}")`)
          parsed[col.field] = null
        } else {
          if (col.validation?.min !== undefined && n < col.validation.min) {
            errors.push(`"${col.header}" must be at least ${col.validation.min}`)
          }
          if (col.validation?.max !== undefined && n > col.validation.max) {
            errors.push(`"${col.header}" must be at most ${col.validation.max}`)
          }
          // Warn for suspiciously large values
          if (col.field === 'capacity' && n > 100000) {
            warnings.push(`"${col.header}" value ${n} is unusually large — is this correct?`)
          }
          parsed[col.field] = n
        }
        break
      }

      case 'date': {
        const parsed2 = parseDate(rawValue, dateFormat)
        if (!parsed2) {
          errors.push(`"${col.header}" is not a valid date (got "${rawValue}"). Use YYYY-MM-DD format.`)
          parsed[col.field] = null
        } else {
          // Warn for dates far in the future
          const diffMs = new Date(parsed2).getTime() - Date.now()
          if (diffMs > 365 * 24 * 3600 * 1000) {
            warnings.push(`"${col.header}" date ${parsed2} is more than 1 year in the future`)
          }
          parsed[col.field] = parsed2
        }
        break
      }

      case 'select': {
        const options = col.options ?? []
        const matched = options.find(o => o.toLowerCase() === rawValue.toLowerCase())
        if (!matched) {
          errors.push(`"${col.header}" must be one of: ${options.join(', ')} (got "${rawValue}")`)
          parsed[col.field] = null
        } else {
          parsed[col.field] = matched
        }
        break
      }

      case 'boolean': {
        const b = parseBoolean(rawValue)
        if (b === null) {
          errors.push(`"${col.header}" must be yes/no/true/false/1/0 (got "${rawValue}")`)
          parsed[col.field] = null
        } else {
          parsed[col.field] = b
        }
        break
      }
    }
  }

  // Duplicate check for unique-ish fields
  const nameField = parsed['name'] ?? parsed['tagNumber'] ?? parsed['locationName']
  if (nameField && rowIndex > 0) {
    const dupes = allRows.slice(0, rowIndex).filter(r => {
      const other = (r['Name'] ?? r['Tag Number'] ?? '').trim().toLowerCase()
      return other && other === String(nameField).toLowerCase()
    })
    if (dupes.length > 0) {
      warnings.push(`Duplicate name "${nameField}" — this row may be skipped on import`)
    }
  }

  return { parsed, errors, warnings }
}

// ── Main parser ────────────────────────────────────────────────────────────────

export async function parseSetupCSV(file: File, template: SetupTemplate): Promise<ParseResult> {
  const base: ParseResult = {
    templateId: template.id,
    headers: [],
    rows: [],
    validRows: [],
    errorRows: [],
    warningRows: [],
    unmappedColumns: [],
    missingRequiredColumns: [],
    detectedDateFormat: null,
    isEmpty: false,
    parseError: null,
  }

  let text: string
  try {
    const buf = await file.arrayBuffer()
    // Try UTF-8 first; if that fails, fall back to windows-1252
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
    } catch {
      text = new TextDecoder('windows-1252').decode(buf)
    }
  } catch {
    return { ...base, parseError: "This file couldn't be read. Please save it as CSV with UTF-8 encoding in your spreadsheet app." }
  }

  // Strip BOM
  if (text.startsWith('\uFEFF')) text = text.slice(1)

  // Remove comment rows
  const filteredLines = text.split('\n').filter(line => !line.trimStart().startsWith('#'))
  const filteredText = filteredLines.join('\n')

  if (!filteredText.trim()) {
    return { ...base, isEmpty: true }
  }

  // PapaParse
  const parsed = Papa.parse<Record<string, string>>(filteredText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => normaliseHeader(h),
  })

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { ...base, parseError: `CSV parsing error: ${parsed.errors[0].message}` }
  }

  // Restore original (non-normalised) headers for display by re-parsing first line
  const originalHeaderLine = filteredLines.find(l => !l.trimStart().startsWith('#') && l.trim())
  const originalHeaders: string[] = originalHeaderLine
    ? Papa.parse(originalHeaderLine).data[0] as string[]
    : []

  base.headers = originalHeaders

  // Map CSV headers → column defs
  const colMap = new Map<string, ColumnDef>()
  const unmapped: string[] = []

  for (const csvHeader of parsed.meta.fields ?? []) {
    const def = matchColumn(csvHeader, template.columns)
    if (def) {
      colMap.set(csvHeader, def)
    } else if (csvHeader) {
      unmapped.push(csvHeader)
    }
  }

  base.unmappedColumns = unmapped

  // Check required columns
  const missing: string[] = []
  for (const col of template.columns.filter(c => c.required)) {
    const found = [...colMap.values()].some(def => def.field === col.field)
    if (!found) missing.push(col.header)
  }
  base.missingRequiredColumns = missing

  // If key required columns are missing, stop
  if (missing.length > 0 && missing.length === template.columns.filter(c => c.required).length) {
    return {
      ...base,
      parseError: `Required columns not found: ${missing.join(', ')}. Make sure you're uploading the correct template file.`,
    }
  }

  // Detect date format from date columns
  const dateColFields = template.columns.filter(c => c.type === 'date').map(c => c.field)
  const dateSamples: string[] = []
  for (const row of parsed.data.slice(0, 10)) {
    for (const [h, def] of colMap) {
      if (dateColFields.includes(def.field)) {
        const v = row[h]?.trim()
        if (v) dateSamples.push(v)
      }
    }
  }
  const dateFormat = detectDateFormat(dateSamples)
  base.detectedDateFormat = dateFormat

  // Cap at maxRows
  const rows = parsed.data.slice(0, template.maxRows)

  // Validate each row
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    const { parsed: rowParsed, errors, warnings } = validateRow(
      raw,
      template,
      colMap,
      dateFormat,
      i,
      rows,
    )

    base.rows.push(rowParsed)

    if (errors.length > 0) {
      base.errorRows.push({ rowNumber: i + 2, row: rowParsed, errors }) // +2: skip header
    } else {
      base.validRows.push(rowParsed)
      if (warnings.length > 0) {
        base.warningRows.push({ rowNumber: i + 2, row: rowParsed, warnings })
      }
    }
  }

  base.isEmpty = base.rows.length === 0
  return base
}
