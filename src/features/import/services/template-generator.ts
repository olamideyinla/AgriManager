import JSZip from 'jszip'
import type { SetupTemplate } from '../config/setup-templates'
import { SETUP_TEMPLATES } from '../config/setup-templates'

// ── CSV string builder ─────────────────────────────────────────────────────────

function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildRow(values: string[]): string {
  return values.map(escapeCSVValue).join(',')
}

export function generateCSVTemplate(template: SetupTemplate): string {
  const lines: string[] = []

  // Instruction comment rows
  lines.push(`# AgriManagerX Setup Template: ${template.name}`)
  lines.push(`# ${template.instructions.join(' ')}`)
  lines.push('# Required columns are marked with * in the header row. Lines starting with # are instructions — you can delete them or leave them.')

  // Header row — required columns get asterisk
  const headers = template.columns.map(col =>
    col.required ? `${col.header}*` : col.header
  )
  lines.push(buildRow(headers))

  // Example row 1 — all example values
  const row1 = template.columns.map(col => col.example)
  lines.push(buildRow(row1))

  // Example row 2 — required fields only (partial example to show what's optional)
  const row2 = template.columns.map(col => col.required ? `(your ${col.header.toLowerCase()})` : '')
  lines.push(buildRow(row2))

  return lines.join('\n')
}

// ── Download single template ───────────────────────────────────────────────────

export function downloadTemplate(template: SetupTemplate): void {
  const csvString = generateCSVTemplate(template)
  // BOM for Excel compatibility
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = template.filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── Download all templates as ZIP ─────────────────────────────────────────────

const README_TEXT = `AgriManagerX Farm Setup Templates
===================================

Fill in each CSV file with your farm data, then upload them in the app.

Upload order:
1. agrimanagerx_farm_locations.csv       — your farm sites
2. agrimanagerx_infrastructure.csv      — houses, ponds, fields, pens
3. agrimanagerx_active_enterprises.csv  — current batches, flocks, herds, crops
4. agrimanagerx_inventory.csv           — feed, medication, supplies on hand
5. agrimanagerx_contacts.csv            — buyers, suppliers, vets, employees
6. agrimanagerx_animals.csv             — cattle/pigs only (skip if not applicable)

Tips:
- Lines starting with # are instructions — delete them before uploading, or leave them (the app will ignore them).
- Columns marked with * are required.
- Dates must be YYYY-MM-DD format (e.g., 2025-09-15).
- Keep the header row exactly as-is — don't rename columns.
- Save files as CSV (not .xlsx) with UTF-8 encoding.
- You don't need to fill in all templates — upload only what you have.
`

export async function downloadAllTemplates(): Promise<void> {
  const zip = new JSZip()
  zip.file('README.txt', README_TEXT)

  for (const template of SETUP_TEMPLATES) {
    const csvString = generateCSVTemplate(template)
    zip.file(template.filename, '\uFEFF' + csvString)
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'agrimanagerx_setup_templates.zip'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
